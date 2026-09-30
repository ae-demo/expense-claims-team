import ballerina/sql;

function getDecisionForClaim(string claimId) returns Decision?|error {
    DecisionRow|sql:Error row = dbClient->queryRow(`
        SELECT claim_id AS "claimId", manager_id AS "managerId", outcome, comment, decided_at AS "decidedAt"
        FROM decision WHERE claim_id = ${claimId}
    `);
    if row is sql:NoRowsError {
        return ();
    }
    if row is sql:Error {
        return row;
    }
    DecisionOutcome outcome = check row.outcome.ensureType();
    Decision decision = {
        outcome,
        comment: row.comment,
        managerId: row.managerId,
        decidedAt: row.decidedAt
    };
    return decision;
}

function insertDecision(string claimId, string managerId, string outcome, string comment, string decidedAt) returns error? {
    _ = check dbClient->execute(`
        INSERT INTO decision (claim_id, manager_id, outcome, comment, decided_at)
        VALUES (${claimId}, ${managerId}, ${outcome}, ${comment}, ${decidedAt})
    `);
}
