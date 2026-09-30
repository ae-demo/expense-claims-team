// Expense Claims — three roles: Employee, Manager, FinanceAdmin

screen MyClaims "Employee sees their own claims and each one's status"
  navbar "ExpenseClaims"
  sidebar "My Claims -> MyClaims | New Claim -> NewClaim | Policy -> PolicyRulesReadOnly"
  row
    heading "My Claims"
    right
    button "New claim" primary -> NewClaim
  tabs "All | Submitted | Approved | Rejected"
  table "Merchant | Date | Total | Category | Status" -> ClaimDetail
    row "Spice Garden Restaurant | 2026-09-12 | 8,500 LKR | Meals | Submitted"
    row "Kandy Rail Travel | 2026-09-05 | 4,200 LKR | Travel | Approved"
    row "Highland Outing Resort | 2026-08-28 | 22,000 LKR | Meals | Rejected"

screen NewClaim "Employee uploads a receipt, corrects auto-filled fields, adds a note and submits"
  navbar "ExpenseClaims"
  sidebar "My Claims -> MyClaims | New Claim -> NewClaim | Policy -> PolicyRulesReadOnly"
  breadcrumb "My Claims / New claim"
  heading "New Claim"
  card "Receipt"
    image "Uploaded receipt preview"
    button "Upload photo or PDF"
    text "Reading receipt… fields below are filled in automatically"
  row
    input "Merchant — e.g. Spice Garden Restaurant"
    input "Date — YYYY-MM-DD"
  row
    input "Total — e.g. 8500"
    select "Category: Meals"
  textarea "Business purpose note"
  row
    right
    button "Cancel" -> MyClaims
    button "Submit claim" primary -> ClaimDetail

screen ClaimDetail "Employee reviews one claim's status and any policy flag"
  navbar "ExpenseClaims"
  sidebar "My Claims -> MyClaims | New Claim -> NewClaim | Policy -> PolicyRulesReadOnly"
  breadcrumb "My Claims / Spice Garden Restaurant"
  row
    heading "Spice Garden Restaurant"
    badge "Submitted" info
  text "8,500 LKR — Meals — 2026-09-12"
  card "Policy flag"
    badge "Over monthly cap" warning
    text "Meals claims this month total 21,300 LKR, over the 20,000 LKR cap"
  text "Note: Team lunch with the design contractors"

screen ApprovalQueue "Manager sees pending claims from their team, with any flags"
  navbar "ExpenseClaims"
  sidebar "Approval Queue -> ApprovalQueue | My Claims -> MyClaims | Policy -> PolicyRulesReadOnly"
  row
    heading "Approval Queue"
    right
    select "Team: all"
  row
    card "Pending | 6 | awaiting your decision"
    card "Flagged | 2 | broke a policy rule"
  table "Employee | Merchant | Total | Category | Flag" -> ClaimReview
    row "R. Perera | Spice Garden Restaurant | 8,500 LKR | Meals | —"
    row "N. Silva | Highland Outing Resort | 22,000 LKR | Meals | Over monthly cap"
    row "A. Fernando | Ceylon Cabs | 3,100 LKR | Travel | —"

screen ClaimReview "Manager approves or rejects a claim with a comment"
  navbar "ExpenseClaims"
  sidebar "Approval Queue -> ApprovalQueue | My Claims -> MyClaims | Policy -> PolicyRulesReadOnly"
  breadcrumb "Approval Queue / Highland Outing Resort"
  row
    heading "Highland Outing Resort"
    badge "Meals" info
  text "N. Silva — 22,000 LKR — 2026-08-28"
  card "Policy flag"
    badge "Over monthly cap" warning
    text "Meals claims this month total 22,000 LKR, over the 20,000 LKR cap"
  text "Note: Team outing at Highland Resort"
  textarea "Comment"
  row
    right
    button "Reject" danger -> ApprovalQueue
    button "Approve" primary -> ApprovalQueue

screen PolicyRules "Finance/Admin edits the spending policy's limits"
  navbar "ExpenseClaims"
  sidebar "Policy Rules -> PolicyRules | All Claims -> AllClaims"
  row
    heading "Policy Rules"
    right
    button "Add rule" primary -> EditPolicyRule
  table "Category | Monthly cap | Description | Active" -> EditPolicyRule
    row "Meals | 20,000 LKR | Team outings and meals | Yes"
    row "Travel | 15,000 LKR | Local travel and transport | Yes"
    row "Accommodation | 30,000 LKR | Overnight stays | Yes"

screen EditPolicyRule "Finance/Admin adds or edits one policy rule"
  navbar "ExpenseClaims"
  sidebar "Policy Rules -> PolicyRules | All Claims -> AllClaims"
  breadcrumb "Policy Rules / Meals"
  heading "Edit Policy Rule"
  select "Category: Meals"
  input "Monthly cap — e.g. 20000"
  input "Description — e.g. Team outings and meals"
  checkbox "Active" active
  row
    right
    button "Cancel" -> PolicyRules
    button "Save rule" primary -> PolicyRules

screen AllClaims "Finance/Admin sees claims across every team"
  navbar "ExpenseClaims"
  sidebar "Policy Rules -> PolicyRules | All Claims -> AllClaims"
  row
    heading "All Claims"
    right
    search "Search by employee or merchant"
    select "Status: all"
  table "Employee | Merchant | Total | Category | Status"
    row "R. Perera | Spice Garden Restaurant | 8,500 LKR | Meals | Submitted"
    row "N. Silva | Highland Outing Resort | 22,000 LKR | Meals | Rejected"
    row "A. Fernando | Ceylon Cabs | 3,100 LKR | Travel | Approved"

screen PolicyRulesReadOnly "Employee and Manager see the active policy rules"
  navbar "ExpenseClaims"
  sidebar "My Claims -> MyClaims | New Claim -> NewClaim | Policy -> PolicyRulesReadOnly"
  heading "Policy Rules"
  text "These limits are maintained by Finance and apply to every claim."
  table "Category | Monthly cap | Description"
    row "Meals | 20,000 LKR | Team outings and meals"
    row "Travel | 15,000 LKR | Local travel and transport"
    row "Accommodation | 30,000 LKR | Overnight stays"

flow "File and track claims"
  role "Employee"
  description "An employee submits a claim from a receipt and follows its status"
  MyClaims
  NewClaim
  ClaimDetail

flow "Approval queue"
  role "Manager"
  description "A manager reviews their team's pending claims and decides each one"
  ApprovalQueue
  ClaimReview

flow "Policy management"
  role "FinanceAdmin"
  description "Finance/Admin maintains policy limits and sees spend across every team"
  PolicyRules
  EditPolicyRule
  AllClaims
