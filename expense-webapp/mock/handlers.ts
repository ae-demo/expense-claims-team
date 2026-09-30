// Mock mode — the SERVICE half (mock/authz/gateway.ts is the gateway half;
// see its header for the split). Seed data mirrors
// specs/design/components/expense-webapp/wireframes.dsl's demo rows so the
// screen and its wireframe agree on what a reviewer sees. State lives in
// module scope, so it behaves like an app (a create shows up in the next
// list, a decision persists) but resets on every full page load — only
// in-app navigation carries a change forward.
import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/expense-api";

type Claim = components["schemas"]["Claim"];
type Flag = components["schemas"]["Flag"];
type PolicyRule = components["schemas"]["PolicyRule"];

/**
 * The caller's mock identity, resolved from the same bearer
 * mock/authz/session.ts mints (`mock:<role names>;<scopes>`). The role
 * segment is what src/authz/screens.ts's operations cannot see and a `/me/…`
 * handler needs: whose rows these are.
 */
function callerSub(request: Request): string {
  const header = request.headers.get("authorization");
  const token = header?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token.startsWith("mock:")) return "mock-visitor";
  const body = token.slice("mock:".length);
  const semicolon = body.indexOf(";");
  const roleSegment = semicolon >= 0 ? body.slice(0, semicolon) : body;
  const first = decodeURIComponent(roleSegment).split("+")[0] || "visitor";
  return `mock-${first.toLowerCase().replace(/\s+/g, "-")}`;
}

let nextId = 100;
function freshId(prefix: string): string {
  nextId += 1;
  return `${prefix}-${String(nextId)}`;
}

// --- claims ------------------------------------------------------------------
// mock-employee is the default (Employee-role) persona's own history; the
// other three employeeIds are the "team" a Manager's queue and a
// FinanceAdmin's every-row view both draw from — the API contract has no
// employee directory, so a name string stands in for a resolvable id here
// exactly as it would with none deployed.
let claims: Claim[] = [
  {
    id: "claim-1",
    employeeId: "mock-employee",
    merchant: "Spice Garden Restaurant",
    claimDate: "2026-09-12",
    total: 8500,
    currency: "LKR",
    category: "meals",
    status: "submitted",
    note: "Team lunch with the design contractors",
    submittedAt: "2026-09-12T12:00:00Z",
    flags: [
      {
        id: "flag-1",
        ruleId: "rule-meals",
        reason: "Meals claims this month total 21,300 LKR, over the 20,000 LKR cap",
      },
    ],
  },
  {
    id: "claim-2",
    employeeId: "mock-employee",
    merchant: "Kandy Rail Travel",
    claimDate: "2026-09-05",
    total: 4200,
    currency: "LKR",
    category: "travel",
    status: "approved",
    submittedAt: "2026-09-05T09:00:00Z",
    decision: {
      outcome: "approved",
      comment: "Within policy — approved.",
      managerId: "mock-manager",
      decidedAt: "2026-09-06T09:00:00Z",
    },
  },
  {
    id: "claim-3",
    employeeId: "mock-employee",
    merchant: "Highland Outing Resort",
    claimDate: "2026-08-28",
    total: 22000,
    currency: "LKR",
    category: "meals",
    status: "rejected",
    submittedAt: "2026-08-28T15:00:00Z",
    flags: [
      {
        id: "flag-2",
        ruleId: "rule-meals",
        reason: "Meals claims this month total 22,000 LKR, over the 20,000 LKR cap",
      },
    ],
    decision: {
      outcome: "rejected",
      comment: "Over the monthly cap without prior approval.",
      managerId: "mock-manager",
      decidedAt: "2026-08-29T10:00:00Z",
    },
  },
  {
    id: "claim-4",
    employeeId: "R. Perera",
    merchant: "Spice Garden Restaurant",
    claimDate: "2026-09-11",
    total: 8500,
    currency: "LKR",
    category: "meals",
    status: "submitted",
    submittedAt: "2026-09-11T11:00:00Z",
  },
  {
    id: "claim-5",
    employeeId: "N. Silva",
    merchant: "Highland Outing Resort",
    claimDate: "2026-09-09",
    total: 22000,
    currency: "LKR",
    category: "meals",
    status: "submitted",
    note: "Team outing at Highland Resort",
    submittedAt: "2026-09-09T14:00:00Z",
    flags: [
      {
        id: "flag-3",
        ruleId: "rule-meals",
        reason: "Meals claims this month total 22,000 LKR, over the 20,000 LKR cap",
      },
    ],
  },
  {
    id: "claim-6",
    employeeId: "A. Fernando",
    merchant: "Ceylon Cabs",
    claimDate: "2026-09-07",
    total: 3100,
    currency: "LKR",
    category: "travel",
    status: "submitted",
    submittedAt: "2026-09-07T08:00:00Z",
  },
];

// --- policy rules --------------------------------------------------------
let policyRules: PolicyRule[] = [
  {
    id: "rule-meals",
    category: "meals",
    monthlyCapAmount: 20000,
    description: "Team outings and meals",
    active: true,
  },
  {
    id: "rule-travel",
    category: "travel",
    monthlyCapAmount: 15000,
    description: "Local travel and transport",
    active: true,
  },
  {
    id: "rule-accommodation",
    category: "accommodation",
    monthlyCapAmount: 30000,
    description: "Overnight stays",
    active: true,
  },
];

function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function policyCheck(
  employeeId: string,
  claimDate: string,
  total: number,
  category: Claim["category"],
): Flag[] {
  const rule = policyRules.find((r) => r.category === category && r.active);
  if (!rule) return [];
  const month = monthOf(claimDate);
  const existing = claims
    .filter((c) => c.employeeId === employeeId && c.category === category && monthOf(c.claimDate) === month)
    .reduce((sum, c) => sum + c.total, 0);
  const projected = existing + total;
  if (projected <= rule.monthlyCapAmount) return [];
  return [
    {
      id: freshId("flag"),
      ruleId: rule.id,
      reason:
        `${categoryLabel(category)} claims this month would total ` +
        `${projected.toLocaleString("en-US")} LKR, over the ` +
        `${rule.monthlyCapAmount.toLocaleString("en-US")} LKR cap`,
    },
  ];
}

function categoryLabel(category: Claim["category"]): string {
  return category === "office-supplies"
    ? "Office Supplies"
    : category.charAt(0).toUpperCase() + category.slice(1);
}

export const handlers = [
  // --- claims ------------------------------------------------------------
  http.get("/api/me/claims", ({ request }) => {
    const who = callerSub(request);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    let rows = claims.filter((c) => c.employeeId === who);
    if (status) rows = rows.filter((c) => c.status === status);
    return HttpResponse.json({ count: rows.length, next: null, previous: null, data: rows });
  }),

  http.post("/api/me/claims", async ({ request }) => {
    const who = callerSub(request);
    const input = (await request.json()) as components["schemas"]["ClaimInput"];
    if (!input?.merchant || !input?.claimDate || input.total === undefined || !input?.category) {
      return HttpResponse.json(
        { code: 400, message: "invalid claim", description: "merchant, claimDate, total and category are required" },
        { status: 400 },
      );
    }
    const flags = policyCheck(who, input.claimDate, input.total, input.category);
    const claim: Claim = {
      id: freshId("claim"),
      employeeId: who,
      merchant: input.merchant,
      claimDate: input.claimDate,
      total: input.total,
      currency: input.currency || "LKR",
      category: input.category,
      note: input.note,
      status: "submitted",
      submittedAt: new Date().toISOString(),
      flags,
    };
    claims = [claim, ...claims];
    return HttpResponse.json(claim, { status: 201 });
  }),

  http.post("/api/me/claims/policy-check", async ({ request }) => {
    const who = callerSub(request);
    const input = (await request.json()) as components["schemas"]["PolicyCheckInput"];
    if (!input?.claimDate || input.total === undefined || !input?.category) {
      return HttpResponse.json(
        { code: 400, message: "invalid draft", description: "claimDate, total and category are required" },
        { status: 400 },
      );
    }
    const flags = policyCheck(who, input.claimDate, input.total, input.category);
    return HttpResponse.json({ flags });
  }),

  http.get("/api/me/team/claims", () => {
    // The manager's team: every pending claim not the caller's own history.
    // The API contract has no reporting-line lookup to resolve against, so
    // this stands in for "the team" exactly as ADR-0031 expects a mock to.
    const rows = claims.filter((c) => c.status === "submitted" && c.employeeId !== "mock-employee");
    return HttpResponse.json({ count: rows.length, next: null, previous: null, data: rows });
  }),

  http.get("/api/claims", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const employeeId = url.searchParams.get("employeeId");
    let rows = claims;
    if (status) rows = rows.filter((c) => c.status === status);
    if (employeeId) rows = rows.filter((c) => c.employeeId === employeeId);
    return HttpResponse.json({ count: rows.length, next: null, previous: null, data: rows });
  }),

  http.post("/api/claims/:claimId/decision", async ({ request, params }) => {
    const who = callerSub(request);
    const claimId = params.claimId as string;
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) {
      return HttpResponse.json({ code: 404, message: "no such claim" }, { status: 404 });
    }
    if (claim.status !== "submitted") {
      return HttpResponse.json(
        { code: 400, message: "already decided", description: `this claim is already ${claim.status}` },
        { status: 400 },
      );
    }
    const input = (await request.json()) as components["schemas"]["DecisionInput"];
    if (!input?.outcome || !input?.comment) {
      return HttpResponse.json(
        { code: 400, message: "invalid decision", description: "outcome and comment are required" },
        { status: 400 },
      );
    }
    claim.status = input.outcome;
    claim.decision = {
      outcome: input.outcome,
      comment: input.comment,
      managerId: who,
      decidedAt: new Date().toISOString(),
    };
    return HttpResponse.json(claim);
  }),

  // --- policy rules --------------------------------------------------------
  http.get("/api/policy-rules", () =>
    HttpResponse.json({ count: policyRules.length, next: null, previous: null, data: policyRules }),
  ),

  http.post("/api/policy-rules", async ({ request }) => {
    const input = (await request.json()) as components["schemas"]["PolicyRuleInput"];
    if (!input?.category || input.monthlyCapAmount === undefined) {
      return HttpResponse.json(
        { code: 400, message: "invalid policy rule", description: "category and monthlyCapAmount are required" },
        { status: 400 },
      );
    }
    const rule: PolicyRule = {
      id: freshId("rule"),
      category: input.category,
      monthlyCapAmount: input.monthlyCapAmount,
      description: input.description,
      active: input.active ?? true,
    };
    policyRules = [rule, ...policyRules];
    return HttpResponse.json(rule, { status: 201 });
  }),

  http.patch("/api/policy-rules/:ruleId", async ({ request, params }) => {
    const rule = policyRules.find((r) => r.id === params.ruleId);
    if (!rule) return HttpResponse.json({ code: 404, message: "no such policy rule" }, { status: 404 });
    const input = (await request.json()) as components["schemas"]["PolicyRuleInput"];
    if (!input?.category || input.monthlyCapAmount === undefined) {
      return HttpResponse.json(
        { code: 400, message: "invalid policy rule", description: "category and monthlyCapAmount are required" },
        { status: 400 },
      );
    }
    rule.category = input.category;
    rule.monthlyCapAmount = input.monthlyCapAmount;
    rule.description = input.description;
    rule.active = input.active ?? rule.active;
    return HttpResponse.json(rule);
  }),

  http.delete("/api/policy-rules/:ruleId", ({ params }) => {
    const before = policyRules.length;
    policyRules = policyRules.filter((r) => r.id !== params.ruleId);
    return before === policyRules.length
      ? HttpResponse.json({ code: 404, message: "no such policy rule" }, { status: 404 })
      : new HttpResponse(null, { status: 204 });
  }),

  // --- ai-agent siblings ---------------------------------------------------
  // No openapi.yaml exists for either agent, so mock/authz/gateway.ts's table
  // has no entry for these paths and lets them straight through — same as
  // production, where an agent's own identity handling isn't this app's scope
  // table to enforce.
  http.post("/api/receipt-agent/chat", () =>
    HttpResponse.json({
      conversationId: freshId("conv"),
      text: "Merchant: Spice Garden Restaurant\nDate: 2026-09-12\nTotal: 8500\nCategory: Meals",
      toolCalls: [],
    }),
  ),

  http.post("/api/policy-rule-agent/chat", async ({ request }) => {
    const input = (await request.json()) as { message?: string; conversationId?: string };
    const message = input?.message ?? "";
    const found = (
      ["meals", "travel", "accommodation", "office-supplies", "other"] as const
    ).find((c) => message.toLowerCase().includes(c.replace("-", " ")));
    const amountMatch = message.match(/[\d,]+(?:\.\d+)?/);
    if (!found || !amountMatch) {
      return HttpResponse.json({
        conversationId: input.conversationId ?? freshId("conv"),
        text: "Which category is this for, and what should the monthly cap be?",
        toolCalls: [],
      });
    }
    const monthlyCapAmount = Number(amountMatch[0].replace(/,/g, ""));
    const existing = policyRules.find((r) => r.category === found && r.active);
    const description = existing?.description ?? `Added via plain-language description.`;
    if (existing) {
      existing.monthlyCapAmount = monthlyCapAmount;
    } else {
      policyRules = [
        { id: freshId("rule"), category: found, monthlyCapAmount, description, active: true },
        ...policyRules,
      ];
    }
    return HttpResponse.json({
      conversationId: input.conversationId ?? freshId("conv"),
      text:
        `Category: ${categoryLabel(found)}\n` +
        `Monthly cap: ${monthlyCapAmount.toLocaleString("en-US")} LKR\n` +
        `Description: ${description}`,
      toolCalls: [],
    });
  }),
];
