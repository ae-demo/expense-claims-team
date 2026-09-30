// The one fixed chat contract every platform ai-agent speaks (react-webapp's
// ai-agent client guidance). There is no OpenAPI document for an agent, so this
// is hand-written against the shape every agent.afm.md commits to:
//
//   POST /chat
//   in:  { conversationId?: string, message: string,
//          attachments?: [{ name: string, mediaType: string, data: string /* base64 */ }] }
//   out: { conversationId: string, text: string, toolCalls: unknown[] }
//
// Reached same-origin, never through a window._env_ URL — an agent is a
// sibling like any other component-kind dependency, addressed only by its
// nginx proxy location. Both receipt-agent and policy-rule-agent are EXTRA
// siblings here (expense-api is the primary, proxied at plain /api), so each
// gets its own /api/<component-name>/ prefix.
import { apiFetch } from "../authz/client";

export interface ChatAttachment {
  name: string;
  mediaType: string;
  /** base64-encoded file content. */
  data: string;
}

export interface ChatRequest {
  conversationId?: string;
  message: string;
  attachments?: ChatAttachment[];
}

export interface ChatResponse {
  conversationId: string;
  text: string;
  toolCalls: unknown[];
}

/**
 * One /chat turn against an agent sibling proxied at `basePath` (e.g.
 * "/receipt-agent" or "/policy-rule-agent"). Uses the same bearer + 401 rule
 * as any other sibling call — `apiFetch` prefixes `/api` itself.
 */
export async function chatTurn(basePath: string, body: ChatRequest): Promise<ChatResponse> {
  const response = await apiFetch(`${basePath}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await response.json()) as ChatResponse;
}
