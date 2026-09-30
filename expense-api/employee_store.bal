import ballerina/sql;

// There is no employee-directory service in this project, so this service
// keeps a minimal Employee row per caller it has ever seen a write from,
// keyed by the gateway assertion's `sub`. No operation in openapi.yaml ever
// sets managerId, so every row created here has no manager: `/me/team/claims`
// and `decideClaim`'s team-ownership check are both correct code against
// today's data, they just never match anything until something (out of this
// service's scope) populates managerId. Flagged in the final report.
function ensureEmployee(string employeeId) returns error? {
    _ = check dbClient->execute(`
        INSERT INTO employee (id) VALUES (${employeeId})
        ON CONFLICT (id) DO NOTHING
    `);
}

// The ids of employees this manager's own reports — Employee rows whose
// managerId is the caller's own sub.
function reportIdsOf(string managerId) returns string[]|error {
    stream<IdRow, sql:Error?> rows = dbClient->query(`SELECT id FROM employee WHERE manager_id = ${managerId}`);
    IdRow[] idRows = check from IdRow r in rows select r;
    return from IdRow r in idRows select r.id;
}

// Whether `employeeId` is one of `managerId`'s own reports.
function isReportOfManager(string employeeId, string managerId) returns boolean|error {
    IdRow|sql:Error row = dbClient->queryRow(`
        SELECT id FROM employee WHERE id = ${employeeId} AND manager_id = ${managerId}
    `);
    if row is sql:NoRowsError {
        return false;
    }
    if row is sql:Error {
        return row;
    }
    return true;
}
