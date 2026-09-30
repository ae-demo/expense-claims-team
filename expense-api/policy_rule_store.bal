import ballerina/sql;
import ballerina/uuid;

function toPolicyRule(PolicyRuleRow row) returns PolicyRule|error {
    ClaimCategory category = check row.category.ensureType();
    return {
        id: row.id,
        category,
        monthlyCapAmount: row.monthlyCapAmount,
        description: row.description,
        active: row.active
    };
}

function listActivePolicyRules() returns PolicyRule[]|error {
    stream<PolicyRuleRow, sql:Error?> rows = dbClient->query(`
        SELECT id, category, monthly_cap_amount AS "monthlyCapAmount", description, active
        FROM policy_rule WHERE active = true ORDER BY category
    `);
    PolicyRule[] result = [];
    check from PolicyRuleRow r in rows
        do {
            PolicyRule rule = check toPolicyRule(r);
            result.push(rule);
        };
    return result;
}

// The active rule for a category, or () when none is configured.
function findActiveRuleForCategory(string category) returns PolicyRule?|error {
    PolicyRuleRow|sql:Error row = dbClient->queryRow(`
        SELECT id, category, monthly_cap_amount AS "monthlyCapAmount", description, active
        FROM policy_rule WHERE category = ${category} AND active = true
        ORDER BY id LIMIT 1
    `);
    if row is sql:NoRowsError {
        return ();
    }
    if row is sql:Error {
        return row;
    }
    return check toPolicyRule(row);
}

function createPolicyRuleRow(PolicyRuleInput input) returns PolicyRule|error {
    string id = uuid:createRandomUuid();
    string? description = input?.description;
    boolean active = input.active;
    _ = check dbClient->execute(`
        INSERT INTO policy_rule (id, category, monthly_cap_amount, description, active)
        VALUES (${id}, ${input.category}, ${input.monthlyCapAmount}, ${description}, ${active})
    `);
    return { id, category: input.category, monthlyCapAmount: input.monthlyCapAmount, description, active };
}

// Returns () when no rule with that id exists.
function updatePolicyRuleRow(string ruleId, PolicyRuleInput input) returns PolicyRule?|error {
    string? description = input?.description;
    boolean active = input.active;
    sql:ExecutionResult result = check dbClient->execute(`
        UPDATE policy_rule
        SET category = ${input.category}, monthly_cap_amount = ${input.monthlyCapAmount},
            description = ${description}, active = ${active}
        WHERE id = ${ruleId}
    `);
    int? affected = result.affectedRowCount;
    if affected is int && affected == 0 {
        return ();
    }
    return { id: ruleId, category: input.category, monthlyCapAmount: input.monthlyCapAmount, description, active };
}

function deletePolicyRuleRow(string ruleId) returns boolean|error {
    sql:ExecutionResult result = check dbClient->execute(`DELETE FROM policy_rule WHERE id = ${ruleId}`);
    int? affected = result.affectedRowCount;
    return affected is int && affected > 0;
}
