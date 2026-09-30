// The policy-check logic shared by checkClaimPolicy (a draft, nothing
// persisted) and submitClaim (a persisted claim, flagged at the same time).
//
// For the claim's category, sum this employee's OTHER claims in the same
// calendar month as claimDate, add the new claim's own total, and flag when
// that combined total exceeds the category's active monthly cap.

// Claims already rejected are not counted toward the cap: a claim a manager
// turned down never represented real spend against it. Submitted and
// approved claims both count.
const string REJECTED_STATUS = "rejected";

function evaluatePolicy(string employeeId, string category, string claimDate, decimal total,
        string? excludeClaimId) returns PolicyFlag[]|error {
    PolicyRule? rule = check findActiveRuleForCategory(category);
    if rule is () {
        return [];
    }
    string yearMonth = claimDate.length() >= 7 ? claimDate.substring(0, 7) : claimDate;
    decimal otherTotal = check sumOtherClaimsInMonth(employeeId, category, yearMonth, excludeClaimId);
    decimal combinedTotal = otherTotal + total;
    if combinedTotal <= rule.monthlyCapAmount {
        return [];
    }
    string reason = buildFlagReason(category, combinedTotal, rule.monthlyCapAmount);
    return [{ ruleId: rule.id, reason }];
}

function buildFlagReason(string category, decimal total, decimal cap) returns string {
    return categoryLabel(category) + " claims this month total " + formatMoney(total) +
        " LKR, over the " + formatMoney(cap) + " LKR cap";
}

function categoryLabel(string category) returns string {
    if category == "office-supplies" {
        return "Office supplies";
    }
    string head = category.substring(0, 1).toUpperAscii();
    string tail = category.substring(1);
    return head + tail;
}

// "21300" -> "21,300"; "21300.5" -> "21,300.5". Comma-grouped thousands, the
// fractional part (if any) untouched.
function formatMoney(decimal amount) returns string {
    string raw = amount.toString();
    string sign = "";
    string body = raw;
    if body.startsWith("-") {
        sign = "-";
        body = body.substring(1);
    }
    string intPart = body;
    string fracPart = "";
    int? dotIndex = body.indexOf(".");
    if dotIndex is int {
        intPart = body.substring(0, dotIndex);
        fracPart = body.substring(dotIndex);
        if fracPart == ".0" {
            fracPart = "";
        }
    }
    string reversedGrouped = "";
    int digitsSeen = 0;
    int i = intPart.length() - 1;
    while i >= 0 {
        if digitsSeen > 0 && digitsSeen % 3 == 0 {
            reversedGrouped = reversedGrouped + ",";
        }
        reversedGrouped = reversedGrouped + intPart.substring(i, i + 1);
        digitsSeen += 1;
        i -= 1;
    }
    string grouped = "";
    int j = reversedGrouped.length() - 1;
    while j >= 0 {
        grouped = grouped + reversedGrouped.substring(j, j + 1);
        j -= 1;
    }
    return sign + grouped + fracPart;
}
