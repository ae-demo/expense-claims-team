// The HTTP surface: two routes on node:http, and no more. POST /chat and
// GET /healthz. Per agent-building's references/building.md.
import "./tracing.js"; // side effects only — must load before any model client
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { config, missingRequiredEnv, ATTACHMENTS } from "./config.js";
import { initStore, ensureStore, isStoreReady, loadConversation, saveConversation } from "./store.js";
import { runTurn } from "./agent.js";
import { traceTurn } from "./tracing.js";
import { callContext } from "./tools.js";
import type { ModelMessage } from "ai";

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

const BODY_CAP = 24 * 1024 * 1024;

// Keep at most BODY_CAP. Past it, answer 413 ONCE and keep reading without
// keeping anything, so the client finishes sending and actually sees the 413
// — destroying the request or closing the socket mid-upload resets the
// connection and the caller gets a network error instead. Past twice the
// cap, stop draining and drop it. Resolves null when the request was refused.
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
type UserPart = { type: "text"; text: string } | { type: "file"; data: string; mediaType: string; filename: string };

// The whole request vocabulary. A field outside it is refused, so a caller
// speaking a newer contract than this agent was built for hears so, instead
// of having the field silently ignored.
const BODY_FIELDS = new Set(["conversationId", "message", "attachments"]);

function validate(body: any): { conversationId?: string; message: string; attachments: Attachment[] } | { error: string } {
  const unknown = Object.keys(body ?? {}).find((key) => !BODY_FIELDS.has(key));
  if (unknown) return { error: `unknown field: ${unknown}` };
  const message = typeof body?.message === "string" ? body.message.trim() : null;
  const attachments: Attachment[] = Array.isArray(body?.attachments) ? body.attachments : [];
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined;
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
    const m = JSON.parse(body)?.message;
    if (m?.action !== "GUARDRAIL_INTERVENED") return null;
    return { name: m.interveningGuardrail ?? "guardrail", reason: m.actionReason ?? "refused by policy" };
  } catch {
    return null;
  }
}

const genAiSystem = config.modelApiFormat === "openai-compatible" ? "openai" : "anthropic";

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === "GET" && req.url === "/healthz") {
    const missing = missingRequiredEnv();
    if (missing.length > 0 || !isStoreReady()) {
      sendJson(res, missing.length > 0 ? 503 : 200, {
        ok: missing.length === 0,
        ...(missing.length > 0 ? { missing } : {}),
        store: isStoreReady() ? "ready" : "initialising",
      });
      return;
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (!(req.method === "POST" && req.url === "/chat")) {
    sendJson(res, 404, { error: "not found" });
    return;
  }

  // 1. Reject callers the gateway did not vouch for.
  const userId = req.headers["x-user-id"];
  if (typeof userId !== "string" || userId === "") {
    res.statusCode = 401;
    res.end();
    return;
  }

  // 2. Read and validate the body.
  const raw = await readBody(req, res);
  if (raw === null) return;
  let parsedBody: unknown;
  try {
    parsedBody = raw ? JSON.parse(raw) : {};
  } catch {
    sendJson(res, 400, { error: "expected { message: string }" });
    return;
  }
  const v = validate(parsedBody);
  if ("error" in v) {
    sendJson(res, 400, { error: v.error });
    return;
  }
  const { message, attachments } = v;

  await callContext.run({ authorization: req.headers.authorization }, async () => {
    // 3. Ensure the store is ready, then load or start the conversation.
    try {
      await ensureStore();
    } catch (err) {
      console.error("store not ready:", err);
      sendJson(res, 500, { error: "internal error" });
      return;
    }

    let conversationId: string;
    let history: ModelMessage[];
    if (v.conversationId !== undefined) {
      const loaded = await loadConversation(v.conversationId, userId);
      if (loaded === null) {
        sendJson(res, 404, { error: "conversation not found" });
        return;
      }
      conversationId = v.conversationId;
      history = loaded;
    } else {
      conversationId = randomUUID();
      history = [];
    }

    // 4. The user message: text plus one file part per attachment (this
    // agent declares no x-aep.attachments, so `attachments` is always empty
    // — validate() above refuses any that arrive — but the shape is kept
    // general per the contract).
    const userParts: UserPart[] = [
      ...(message ? [{ type: "text" as const, text: message }] : []),
      ...attachments.map((a) => ({ type: "file" as const, data: a.data, mediaType: a.mediaType, filename: a.name })),
    ];
    const user: ModelMessage = { role: "user", content: userParts };
    const full = [...history, user];

    try {
      // 5. Run the turn, traced.
      const turn = await traceTurn(
        { conversationId, model: config.modelName ?? "", system: genAiSystem, message },
        (hooks) => runTurn(full, hooks),
      );

      // 6. Store text, not files — each file part becomes a note naming it.
      const storedParts: UserPart[] = userParts.map((p) =>
        p.type === "file" ? { type: "text", text: `[attached: ${p.filename} (${p.mediaType})]` } : p,
      );
      const stored: ModelMessage = { role: "user", content: storedParts };
      await saveConversation(conversationId, userId, [...history, stored, ...turn.steps.flatMap((s) => s.response.messages)]);

      // 7. Reply.
      sendJson(res, 200, { conversationId, text: turn.text, toolCalls: turn.toolCalls });
    } catch (err) {
      const g = guardrailBlock(err);
      if (g) {
        sendJson(res, 422, { error: g.reason, guardrail: g.name });
        return;
      }
      const status = (err as { statusCode?: number })?.statusCode;
      if (attachments.length > 0 && (status === 400 || status === 413 || status === 415)) {
        console.error("model rejected attached files:", attachments.map((a) => `${a.name} (${a.mediaType})`), err);
        sendJson(res, 422, { error: "the model could not read the attached file(s)", files: attachments.map((a) => a.name) });
        return;
      }
      console.error("chat turn failed:", err);
      sendJson(res, 500, { error: "internal error" });
    }
  });
}

const server = createServer();
server.on("request", (req, res) => {
  void handle(req, res).catch((err) => { // the last line of defence
    console.error("chat turn failed:", err);
    if (!res.headersSent) sendJson(res, 500, { error: "internal error" });
    else res.destroy(); // already streaming: cut it
  });
});

// Fire-and-forget: the DB may not be reachable yet at startup. Never awaited
// before listen() — see "Never await initStore() before listen()".
initStore();

server.listen(config.port, () => {
  console.log(`policy-rule-agent listening on ${config.port}`);
});
