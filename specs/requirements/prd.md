# Expense Claims Team — PRD

## Problem Statement

Employees currently file expense claims manually — typing in merchant, date,
total and category by hand from a paper or photographed receipt — which is
slow and error-prone. Managers must then check each claim against the team's
spending policy by memory, and approvals happen ad hoc with no consistent
record of what was checked or why a claim was flagged. Finance has no single
place to see approved spend or to adjust policy limits as they change.

## Solution

A web app where employees submit expense claims by uploading a receipt photo
or PDF, with the key fields read automatically from the receipt; each claim is
checked against the team's spending policy and flagged in plain language when
it breaks a rule; managers review and decide their team's pending claims; and
Finance keeps the policy limits current and can see spend across teams.

## Actors

- **Employee** — signs in, submits expense claims from receipts, corrects
auto-filled fields, adds a business-purpose note, and sees the status of
their own claims.
- **Manager** — sees pending claims from their own team, including any policy
flags, and approves or rejects each with a comment.
- **Finance/Admin** — maintains the spending policy's limits and can see
claims across every team, not just one.

## User Stories

1. As an Employee, I want to sign in securely, so that my claims are tied to
my identity.
2. As an Employee, I want to upload a photo or PDF of a receipt, so that I
don't have to type its details from scratch.
3. As an Employee, I want the merchant, date, total and category read
automatically from my uploaded receipt, so that filing a claim is fast.
4. As an Employee, I want to correct any auto-filled field before submitting,
so that mistakes in the automatic reading don't become mistakes on my
claim.
5. As an Employee, I want to add a short note on the business purpose of a
claim, so that my manager has the context to decide it.
6. As an Employee, I want to see whether my claim breaks the team's spending
policy before I submit it, with a plain-language reason shown when it does,
so that I understand upfront why it might be questioned.
7. As an Employee, I want to see my own claims and each one's status, so that
I know what's pending, approved or rejected.
8. As a Manager, I want to see pending claims from my own team, with any
policy flags, so that I can review what needs my decision.
9. As a Manager, I want to approve or reject each claim with a comment, so
that my decision and its reasoning are on record.
10. As a Finance/Admin, I want to edit the spending policy's limits, so that
they stay current without needing a new release of the app.
11. As a Finance/Admin, I want to see claims across every team, so that I have
a single view of organization-wide spend.

## Product Decisions

- Sign-in: every user signs in via the organization's single sign-on
(Thunder), per organization default.
- Receipt reading: an agent reads the uploaded receipt image or PDF and fills
in merchant, date, total and category; the employee can correct any field
before submitting.
- Receipt categories are fixed: meals, travel, accommodation, office
supplies, other.
- Spending policy: expressed as a set of rules (e.g. a per-category monthly
cap, such as team outings capped at 20,000 LKR per month); Finance/Admin can
edit the limits at any time, and a claim breaking a rule is flagged with a
plain-language reason while the employee is still filling in the claim, before
they submit it — not only after.
- The initial policy rule set is seeded with the team-outing example (up to
20,000 LKR per month); Finance/Admin can add, change or remove rules from
there.
- Each employee has a single assigned manager, and a manager's "team" is the
set of employees assigned to them; this assignment is maintained as part of
user setup, not by employees themselves.
- All amounts are in LKR (Sri Lankan Rupees), matching the example policy
given.
- Notifications: none by email — employees and managers see claim and
approval status in the app itself, not via email or SMS.

## Out of Scope

- Multi-currency claims or currency conversion.
- Reimbursement/payout processing once a claim is approved (this app tracks
approval status only, not payment).
- Email or SMS notifications of claim status changes.
- Self-service sign-up — user accounts (including manager assignment) are
provisioned outside this app.
- Editing or withdrawing a claim after it has been decided (approved or
rejected).

## Open Questions

*(none — the interview converged; the marked assumptions above are the only
open judgment calls, and each can be revisited without affecting the rest of
the document)*