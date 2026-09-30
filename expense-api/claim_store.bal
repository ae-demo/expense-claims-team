import ballerina/sql;
import ballerina/uuid;

function assembleClaim(ClaimRow row) returns Claim|error {
    Flag[] flags = check listFlagsForClaim(row.id);
    Decision? decision = check getDecisionForClaim(row.id);
    ClaimCategory category = check row.category.ensureType();
    ClaimStatusValue status = check row.status.ensureType();
    Claim claim = {
        id: row.id,
        merchant: row.merchant,
        claimDate: row.claimDate,
        total: row.total,
        currency: row.currency,
        category,
        note: row.note,
        status,
        employeeId: row.employeeId,
        submittedAt: row.submittedAt,
        flags,
        decision
    };
    return claim;
}

function getClaimById(string claimId) returns Claim?|error {
    ClaimRow|sql:Error row = dbClient->queryRow(`
        SELECT id, employee_id AS "employeeId", merchant, claim_date AS "claimDate",
               total, currency, category, note, status, submitted_at AS "submittedAt"
        FROM claim WHERE id = ${claimId}
    `);
    if row is sql:NoRowsError {
        return ();
    }
    if row is sql:Error {
        return row;
    }
    return check assembleClaim(row);
}

// Persists a new claim in `submitted` status and returns it, with no flags.
function createClaim(string employeeId, ClaimInput input, string submittedAt) returns Claim|error {
    string id = uuid:createRandomUuid();
    string? note = input?.note;
    _ = check dbClient->execute(`
        INSERT INTO claim (id, employee_id, merchant, claim_date, total, currency, category, note, status, submitted_at)
        VALUES (${id}, ${employeeId}, ${input.merchant}, ${input.claimDate}, ${input.total}, ${input.currency},
                ${input.category}, ${note}, ${"submitted"}, ${submittedAt})
    `);
    Claim created = {
        id,
        merchant: input.merchant,
        claimDate: input.claimDate,
        total: input.total,
        currency: input.currency,
        category: input.category,
        note,
        status: "submitted",
        employeeId,
        submittedAt,
        flags: [],
        decision: ()
    };
    return created;
}

function markClaimDecided(string claimId, string outcome) returns error? {
    _ = check dbClient->execute(`UPDATE claim SET status = ${outcome} WHERE id = ${claimId}`);
}

// A where-clause builder for the two collection reads that filter on
// employeeId/status (listMyClaims, listAllClaims). `1=1` keeps the clause
// non-empty when neither filter is given.
function buildClaimsWhere(string? employeeId, string? status) returns sql:ParameterizedQuery {
    sql:ParameterizedQuery whereClause = `1=1`;
    if employeeId is string {
        whereClause = sql:queryConcat(whereClause, ` AND employee_id = ${employeeId}`);
    }
    if status is string {
        whereClause = sql:queryConcat(whereClause, ` AND status = ${status}`);
    }
    return whereClause;
}

function countClaims(sql:ParameterizedQuery whereClause) returns int|error {
    sql:ParameterizedQuery query = sql:queryConcat(`SELECT COUNT(*) AS "total" FROM claim WHERE `, whereClause);
    record {| int total; |} row = check dbClient->queryRow(query);
    return row.total;
}

function queryClaimRows(sql:ParameterizedQuery whereClause, int 'limit, int offset) returns ClaimRow[]|error {
    sql:ParameterizedQuery query = sql:queryConcat(
        `SELECT id, employee_id AS "employeeId", merchant, claim_date AS "claimDate",
               total, currency, category, note, status, submitted_at AS "submittedAt"
         FROM claim WHERE `,
        whereClause,
        ` ORDER BY submitted_at DESC LIMIT ${'limit} OFFSET ${offset}`
    );
    stream<ClaimRow, sql:Error?> rows = dbClient->query(query);
    return check from ClaimRow r in rows select r;
}

// employeeId = ANY(reportIds) AND status = 'submitted' — the manager's own
// team's pending claims. An empty reportIds array matches nothing, which is
// the correct (empty) result for a manager with no reports on file yet.
function queryTeamPendingClaimRows(string[] reportIds, int 'limit, int offset) returns ClaimRow[]|error {
    stream<ClaimRow, sql:Error?> rows = dbClient->query(`
        SELECT id, employee_id AS "employeeId", merchant, claim_date AS "claimDate",
               total, currency, category, note, status, submitted_at AS "submittedAt"
        FROM claim
        WHERE employee_id = ANY(${reportIds}) AND status = ${"submitted"}
        ORDER BY submitted_at DESC LIMIT ${'limit} OFFSET ${offset}
    `);
    return check from ClaimRow r in rows select r;
}

function countTeamPendingClaims(string[] reportIds) returns int|error {
    record {| int total; |} row = check dbClient->queryRow(`
        SELECT COUNT(*) AS "total" FROM claim
        WHERE employee_id = ANY(${reportIds}) AND status = ${"submitted"}
    `);
    return row.total;
}

// Sum of this employee's OTHER claims in the same category and calendar
// month as `yearMonth` ("YYYY-MM"), excluding `excludeClaimId` when given
// (there is none for a policy-check draft, which is not itself a row yet).
// Rejected claims are not counted — see policy.bal's REJECTED_STATUS comment.
function sumOtherClaimsInMonth(string employeeId, string category, string yearMonth,
        string? excludeClaimId) returns decimal|error {
    sql:ParameterizedQuery whereClause = `
        employee_id = ${employeeId} AND category = ${category}
        AND claim_date LIKE ${yearMonth + "%"} AND status != ${REJECTED_STATUS}
    `;
    if excludeClaimId is string {
        whereClause = sql:queryConcat(whereClause, ` AND id != ${excludeClaimId}`);
    }
    sql:ParameterizedQuery query = sql:queryConcat(`SELECT COALESCE(SUM(total), 0) AS "total" FROM claim WHERE `, whereClause);
    record {| decimal total; |} row = check dbClient->queryRow(query);
    return row.total;
}
