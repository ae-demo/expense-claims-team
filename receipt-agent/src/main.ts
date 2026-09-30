// HTTP surface: POST /chat and GET /healthz on node:http, nothing else.
import "./tracing.js"; // side effects: OpenTelemetry setup, before any model client is built.
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { ModelMessage } from "ai";
import { runTurn } from "./agent.js";
import { ATTACHMENTS, PORT, missingEnv, modelSettings } from "./config.js";
import { traceTurn } from "./tracing.js";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(payload);
}

const BODY_CAP = 24 * 1024 * 1024;

// Keep at most BODY_CAP. Past it, answer 413 ONCE and keep reading without
// keeping anything, so the client finishes sending and actually sees the 413
// — destroying the request or closing the socket mid-upload resets the
// connection and the caller gets a network error instead. Past twice the cap,
// stop draining and drop it. Resolves null when the request was refused.
function readBody(req: IncomingMessage, res: ServerResponse): Promise<string | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let over = false;
    const refuse = () => { over = true; chunks.length = 0; sendJson(res, 413, { error: "request too large" }); };
    if (Number(req.headers["content-length"] ?? 0) > BODY_CAP) refuse();
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 2 * BODY_CAP) { req.destroy(); return; }
      if (over) return;
      if (size > BODY_CAP) { refuse(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(over ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => resolve(null));
    req.on("close", () => { if (!req.complete) resolve(null); });
  });
}

type Attachment = { name: string; mediaType: string; data: string };

// The whole request vocabulary. A field outside it is refused, so a caller
// speaking a newer contract than this agent was built for hears so, instead
// of having the field silently ignored.
const BODY_FIELDS = new Set(["conversationId", "message", "attachments"]);

function validate(
  body: unknown,
): { conversationId: string | null; message: string; attachments: Attachment[] } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const unknown = Object.keys(b).find((key) => !BODY_FIELDS.has(key));
  if (unknown) return { error: `unknown field: ${unknown}` };
  if (b.conversationId !== undefined && typeof b.conversationId !== "string") {
    return { error: "conversationId must be a string" };
  }
  const conversationId = typeof b.conversationId === "string" && b.conversationId.trim() !== "" ? b.conversationId : null;
  const message = typeof b.message === "string" ? b.message.trim() : null;
  const attachments: Attachment[] = Array.isArray(b.attachments) ? (b.attachments as Attachment[]) : [];
  if (message === null) return { error: "expected { message: string }" };
  if (attachments.length > 0 && !ATTACHMENTS) return { error: "this agent does not accept attachments" };
  if (message === "" && attachments.length === 0) return { error: "expected a message or attachments" };
  if (ATTACHMENTS && attachments.length > ATTACHMENTS.maxFiles) return { error: `at most ${ATTACHMENTS.maxFiles} files per message` };
  let total = 0;
  for (const a of attachments) {
    if (typeof a?.name !== "string" || typeof a?.mediaType !== "string" || typeof a?.data !== "string") return { error: "each attachment needs name, mediaType and data" };
    if (!ATTACHMENTS!.types.includes(a.mediaType)) return { error: `${a.name}: this agent does not accept ${a.mediaType}` };
    const bytes = Buffer.byteLength(a.data, "base64");
    if (bytes > ATTACHMENTS!.maxFileSizeMB * 1024 * 1024) return { error: `${a.name}: larger than ${ATTACHMENTS!.maxFileSizeMB} MB` };
    total += bytes;
  }
  if (total > 15 * 1024 * 1024) return { error: "the files together are over 15 MB" };
  return { conversationId, message, attachments };
}

// Reads the AI SDK's APICallError body; returns null for anything else.
function guardrailBlock(err: unknown): { name: string; reason: string } | null {
  const body = (err as { responseBody?: string; data?: unknown })?.responseBody;
  if (!body) return null;
  try {
    const m = (JSON.parse(body) as { message?: Record<string, unknown> })?.message;
    if (m?.action !== "GUARDRAIL_INTERVENED") return null;
    return { name: String(m.interveningGuardrail ?? "guardrail"), reason: String(m.actionReason ?? "refused by policy") };
  } catch { return null; }
}

const genAiSystem = modelSettings().format === "openai-compatible" ? "openai" : "anthropic";

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === "GET" && req.url === "/healthz") {
    const missing = missingEnv();
    if (missing.length > 0) {
      sendJson(res, 503, { ok: false, missing, store: "ready" });
      return;
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/chat") {
    sendJson(res, 404, { error: "not found" });
    return;
  }

  // Inbound: who is calling me. The API Platform Gateway has already
  // validated the caller's token (this agent's identity mode is
  // on-behalf-of) and hands the result on as a header. A header Node saw
  // TWICE arrives as string[] — accepting it would key the turn by a joined
  // "victim, attacker" value, so a non-string is refused rather than coerced.
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || userId === "") {
    sendJson(res, 401, { error: "missing caller identity" });
    return;
  }

  const raw = await readBody(req, res);
  if (raw === null) return; // readBody already answered (413) or the client dropped

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    sendJson(res, 400, { error: "expected { message: string }" });
    return;
  }

  const v = validate(parsed);
  if ("error" in v) {
    sendJson(res, 400, { error: v.error });
    return;
  }
  const { message, attachments } = v;

  // Memory is client-type (x-aep.memory.type: "client") — there is no
  // server-side conversation store. Each call is self-contained: one receipt
  // in, one answer out, nothing to continue. conversationId is a courtesy
  // echo for the caller's own bookkeeping, never looked up here.
  const conversationId = v.conversationId ?? randomUUID();

  const user: ModelMessage = {
    role: "user",
    content: [
      ...(message ? [{ type: "text" as const, text: message }] : []),
      ...attachments.map((a) => ({ type: "file" as const, data: a.data, mediaType: a.mediaType, filename: a.name })),
    ],
  };

  try {
    const settings = modelSettings();
    const turn = await traceTurn(
      { conversationId, model: settings.modelName, system: genAiSystem, message },
      (hooks) => runTurn([user], settings, hooks),
    );
    sendJson(res, 200, { conversationId, text: turn.text, toolCalls: [] });
  } catch (err) {
    const g = guardrailBlock(err);
    if (g) {
      sendJson(res, 422, { error: g.reason, guardrail: g.name });
      return;
    }
    // A provider rejecting a turn that carried files: say which files, in a
    // FIXED message. The provider body stays in the log — never forward it.
    const status = (err as { statusCode?: number })?.statusCode;
    if (attachments.length > 0 && (status === 400 || status === 413 || status === 415)) {
      console.error("model rejected attached files:", attachments.map((a) => `${a.name} (${a.mediaType})`), err);
      sendJson(res, 422, { error: "the model could not read the attached file(s)", files: attachments.map((a) => a.name) });
      return;
    }
    console.error("chat turn failed:", err);
    sendJson(res, 500, { error: "internal error" });
  }
}

const server = createServer();
server.on("request", (req, res) => {
  void handle(req, res).catch((err) => { // the last line of defence:
    console.error("chat turn failed:", err); // `void handle(...)` alone
    if (!res.headersSent) sendJson(res, 500, { error: "internal error" });
    else res.destroy(); // already streaming: cut it
  });
});

server.listen(PORT, () => {
  console.log(`receipt-agent listening on ${PORT}`);
});
