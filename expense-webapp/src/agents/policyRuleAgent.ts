// policy-rule-agent — turns a Finance/Admin's plain-language description of a
// policy rule into a saved, structured one, via expense-api's policy-rules
// tools (specs/design/components/policy-rule-agent/agent.afm.md). No
// x-aep.attachments block, so no attach control in DescribePolicyRule.
import { chatTurn, type ChatResponse } from "./chat";

const BASE_PATH = "/policy-rule-agent";

export async function describePolicyRule(
  message: string,
  conversationId?: string,
): Promise<ChatResponse> {
  return chatTurn(BASE_PATH, { conversationId, message });
}
