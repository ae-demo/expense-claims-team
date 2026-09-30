// Internal row shapes and small aliases used only by the storage layer. The
// public API shapes (Claim, Flag, Decision, PolicyRule, ...) are the ones the
// OpenAPI generator produced in openapi_service.bal.

type ClaimCategory "meals"|"travel"|"accommodation"|"office-supplies"|"other";
type ClaimStatusValue "submitted"|"approved"|"rejected";
type DecisionOutcome "approved"|"rejected";

type IdRow record {|
    string id;
|};

type ClaimRow record {|
    string id;
    string employeeId;
    string merchant;
    string claimDate;
    decimal total;
    string currency;
    string category;
    string? note;
    string status;
    string submittedAt;
|};

type PolicyRuleRow record {|
    string id;
    string category;
    decimal monthlyCapAmount;
    string? description;
    boolean active;
|};

type FlagRow record {|
    string id;
    string claimId;
    string ruleId;
    string reason;
|};

type DecisionRow record {|
    string claimId;
    string managerId;
    string outcome;
    string comment;
    string decidedAt;
|};

// A flag the policy engine wants to raise, before it is either persisted
// (submitClaim) or handed back transient (checkClaimPolicy).
type PolicyFlag record {|
    string ruleId;
    string reason;
|};
