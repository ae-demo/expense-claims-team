// receipt-agent — reads an uploaded receipt (photo or PDF) and reports the
// merchant, date, total and category (specs/design/components/receipt-agent/agent.afm.md).
// x-aep.attachments: types [image/jpeg, image/png, application/pdf], maxFiles 1,
// maxFileSizeMB 5 — the picker in NewClaim compiles those in as constants.
import { chatTurn, type ChatAttachment, type ChatResponse } from "./chat";

const BASE_PATH = "/receipt-agent";

export const RECEIPT_ATTACHMENT_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export const RECEIPT_MAX_FILES = 1;
export const RECEIPT_MAX_FILE_SIZE_MB = 5;

export async function readReceipt(
  attachment: ChatAttachment,
  conversationId?: string,
): Promise<ChatResponse> {
  return chatTurn(BASE_PATH, {
    conversationId,
    message: "Read this receipt and report the merchant, date, total and category.",
    attachments: [attachment],
  });
}

/** Reads a browser File into the base64 payload the chat contract carries. */
export async function fileToAttachment(file: File): Promise<ChatAttachment> {
  const data = await new Promise<string>((resolvePromise, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:<mime>;base64,<payload>" — keep only the payload.
      resolvePromise(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  return { name: file.name, mediaType: file.type, data };
}
