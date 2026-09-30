// The AI SDK loop. This agent's design (specs/design/components/receipt-agent
// /design.json) names no `component` dependency and its agent.afm.md carries
// no `x-aep.tools.openapi` allow-list, so there are no tools to generate and
// none to register here — every turn is a single model call over the
// attached receipt.
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, stepCountIs, type LanguageModel, type ModelMessage } from "ai";
import type { ModelSettings } from "./config.js";
import { MAX_ITERATIONS, SYSTEM_PROMPT } from "./prompt.js";
import type { TurnHooks } from "./tracing.js";

export function modelClient(
  { format, baseURL, apiKey, modelName, keyHeader, authScheme }: ModelSettings,
): LanguageModel {
  switch (format) {
    case "anthropic":
      return createAnthropic({
        baseURL,
        ...(keyHeader
          ? { apiKey: "unused", headers: { [keyHeader]: apiKey } } // SDK will not start without an apiKey
          : authScheme === "bearer"
            ? { authToken: apiKey } // Authorization: Bearer
            : { apiKey }), // x-api-key
      })(modelName);
    case "openai-compatible":
      return createOpenAICompatible({
        name: "model",
        baseURL,
        includeUsage: true, // a streamed turn reports usage only when asked
        // No apiKey under the override: this SDK sends Authorization only when
        // given one, so the key goes out once, under the named header.
        ...(keyHeader ? { headers: { [keyHeader]: apiKey } } : { apiKey }),
      })(modelName);
    default:
      throw new Error(`unsupported MODEL_API_FORMAT: ${format}`);
  }
}

export async function runTurn(
  messages: ModelMessage[],
  settings: ModelSettings,
  hooks: TurnHooks,
) {
  let failure: unknown;
  const result = streamText({
    model: modelClient(settings),
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(MAX_ITERATIONS),
    // A provider error arrives HERE, not as the rejection below.
    onError: ({ error }) => { failure ??= error; },
    // Opens and closes a span per model call — "Tracing".
    ...hooks,
  });
  // Awaiting these drives the stream, every step included, to its end.
  const [text, usage] = await Promise.all([
    result.text, result.totalUsage,
  ]).catch((err: unknown) => { throw failure ?? err; });
  if (failure !== undefined) throw failure;
  return { text, usage };
}
