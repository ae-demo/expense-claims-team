import ballerina/sql;
import ballerina/uuid;

function listFlagsForClaim(string claimId) returns Flag[]|error {
    stream<FlagRow, sql:Error?> rows = dbClient->query(`
        SELECT id, claim_id AS "claimId", rule_id AS "ruleId", reason
        FROM flag WHERE claim_id = ${claimId}
    `);
    FlagRow[] flagRows = check from FlagRow r in rows select r;
    return from FlagRow r in flagRows select { id: r.id, ruleId: r.ruleId, reason: r.reason };
}

// Persists a policy flag against an already-persisted claim.
function insertFlag(string claimId, string ruleId, string reason) returns Flag|error {
    string id = uuid:createRandomUuid();
    _ = check dbClient->execute(`
        INSERT INTO flag (id, claim_id, rule_id, reason) VALUES (${id}, ${claimId}, ${ruleId}, ${reason})
    `);
    return { id, ruleId, reason };
}
