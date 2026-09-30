/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Adapted from thunder-authentication's assets/screens.example.ts.
//
// THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS, and all it says about each
// one is which API operation it LOADS. security.json carries no screen table.
//
// THE ORDER OF THIS TABLE IS THE RAIL'S ORDER, and its first reachable row is
// the screen the app lands on. Ordered so each role's landing screen matches
// its named flow (specs/design/components/expense-webapp/wireframes.dsl):
// Approval Queue first lands a Manager on their queue (flow F2); an Employee,
// who cannot reach it, falls through to My Claims (flow F1); a FinanceAdmin,
// who can reach neither, falls through to Policy Rules (flow F3).
//
// `sidebar: true` marks the screens the sidebar actually shows a link for —
// ClaimDetail, ClaimReview, EditPolicyRule and DescribePolicyRule are reached
// by clicking a table row or a button, never from the rail itself, exactly as
// wireframes.dsl draws them.

import { canCall } from "./core";
import { OPERATIONS, isOperationKey, type OperationKey } from "./operations.gen";

export interface ScreenRoute {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly loads: OperationKey | null;
  readonly public?: boolean;
  /** Shown as a sidebar link. Screens reached only via a row/button omit this. */
  readonly sidebar?: boolean;
}

export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  {
    key: "approvals",
    label: "Approval Queue",
    path: "/approvals",
    loads: "GET /me/team/claims",
    sidebar: true,
  },
  { key: "myclaims", label: "My Claims", path: "/claims", loads: "GET /me/claims", sidebar: true },
  {
    key: "newclaim",
    label: "New Claim",
    path: "/claims/new",
    loads: "POST /me/claims",
    sidebar: true,
  },
  {
    key: "policyrules",
    label: "Policy Rules",
    path: "/policy-rules",
    loads: "POST /policy-rules",
    sidebar: true,
  },
  {
    key: "allclaims",
    label: "All Claims",
    path: "/claims/all",
    loads: "GET /claims",
    sidebar: true,
  },
  {
    key: "policyreadonly",
    label: "Policy",
    path: "/policy",
    loads: "GET /policy-rules",
    sidebar: true,
  },
  // Reached from a table row or a button, never from the sidebar.
  { key: "claimdetail", label: "Claim Detail", path: "/claims/:claimId", loads: "GET /me/claims" },
  {
    key: "claimreview",
    label: "Claim Review",
    path: "/approvals/:claimId",
    loads: "POST /claims/{claimId}/decision",
  },
  {
    key: "editpolicyrule",
    label: "Edit Policy Rule",
    path: "/policy-rules/:ruleId",
    loads: "PATCH /policy-rules/{ruleId}",
  },
  {
    key: "describepolicyrule",
    label: "Describe a Rule",
    path: "/policy-rules/describe",
    loads: "POST /policy-rules",
  },
];

// FAIL LOUDLY at module load: a committed operations.gen.ts that outlived its
// contract must not silently gate on nothing.
for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

export function reachableScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return SCREEN_ROUTES.filter((screen) => {
    if (screen.public) return true;
    if (screen.loads === null) return signedIn;
    return canCall(OPERATIONS[screen.loads], scopes, signedIn);
  });
}

export function hasScopedReach(scopes: ReadonlySet<string>, signedIn: boolean): boolean {
  return reachableScreens(scopes, signedIn).some(
    (screen) => !screen.public && screen.loads !== null,
  );
}
