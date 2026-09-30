// GENERATED from specs/design/components/policy-rule-agent/agent.afm.md's
// `x-aep.tools.openapi` allow-list (component: expense-api — allow:
// [listPolicyRules, createPolicyRule, updatePolicyRule]) and from
// specs/design/components/expense-api/openapi.yaml, which is this tool set's
// only source of truth for paths, parameters and schemas. Never add an
// operation beyond the allow-list, however useful it looks — omission from
// `allow` is the security boundary, not a hint.

import { AsyncLocalStorage } from "node:async_hooks";
import { tool } from "ai";
import { z } from "zod";
import { config } from "./config.js";

// Per-request credential, reachable from a tool without the model ever
// seeing or selecting it. Set once per /chat turn in main.ts.
export const callContext = new AsyncLocalStorage<{ authorization?: string }>();

const CATEGORY = z.enum(["meals", "travel", "accommodation", "office-supplies", "other"]);

// Joins a path onto the injected base address with `new URL` — never string
// concatenation — so a base that ends in `/` is handled either way. Parses
// the response body defensively: a provider that returns HTML or an empty
// body on error still produces a tool result, never a throw.
async function call(method: string, path: string, body?: unknown): Promise<{ ok: boolean; status: number; body: unknown }> {
  const base = config.expenseApiUrl ?? "";
  const url = new URL(path.replace(/^\//, ""), base.endsWith("/") ? base : `${base}/`);
  const { authorization } = callContext.getStore() ?? {};
  const response = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...(authorization ? { authorization } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { ok: response.ok, status: response.status, body: parsed };
}

export const tools = {
  listPolicyRules: tool({
    description: "The active policy rules",
    inputSchema: z.object({}),
    execute: () => call("GET", "/policy-rules"),
  }),

  createPolicyRule: tool({
    description: "Add a policy rule",
    inputSchema: z.object({
      category: CATEGORY.describe("which spending category this rule applies to"),
      monthlyCapAmount: z.number().describe("the monthly cap amount for this category"),
      description: z.string().optional().describe("a short description of the rule, if given"),
      active: z.boolean().optional().describe("defaults to true"),
    }),
    execute: ({ category, monthlyCapAmount, description, active }) =>
      call("POST", "/policy-rules", { category, monthlyCapAmount, description, active }),
  }),

  updatePolicyRule: tool({
    description: "Change or deactivate a policy rule",
    inputSchema: z.object({
      ruleId: z.string().describe("the id of the existing policy rule to update"),
      category: CATEGORY.describe("which spending category this rule applies to"),
      monthlyCapAmount: z.number().describe("the monthly cap amount for this category"),
      description: z.string().optional().describe("a short description of the rule, if given"),
      active: z.boolean().optional().describe("defaults to true"),
    }),
    execute: ({ ruleId, ...body }) => call("PATCH", `/policy-rules/${encodeURIComponent(ruleId)}`, body),
  }),
};
