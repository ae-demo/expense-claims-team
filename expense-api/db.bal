import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

final postgresql:Client dbClient = check new (
    host = resolvedDbHost,
    username = resolvedDbUser,
    password = resolvedDbPassword,
    database = resolvedDbName,
    port = resolvedDbPort
);

// Runs before any listener starts, so a schema failure fails the service fast
// rather than 500ing the first request.
final () schemaReady = check initSchema();

function initSchema() returns error? {
    // Every signed-in caller this service has ever seen, and (when known) who
    // manages them. Nothing in this API sets managerId today — see the
    // ensureEmployee doc comment.
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS employee (
            id TEXT PRIMARY KEY,
            manager_id TEXT NULL,
            name TEXT NULL,
            email TEXT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS claim (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL,
            merchant TEXT NOT NULL,
            claim_date TEXT NOT NULL,
            total NUMERIC NOT NULL,
            currency TEXT NOT NULL DEFAULT 'LKR',
            category TEXT NOT NULL,
            note TEXT NULL,
            status TEXT NOT NULL,
            submitted_at TEXT NOT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS policy_rule (
            id TEXT PRIMARY KEY,
            category TEXT NOT NULL,
            monthly_cap_amount NUMERIC NOT NULL,
            description TEXT NULL,
            active BOOLEAN NOT NULL DEFAULT TRUE
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS flag (
            id TEXT PRIMARY KEY,
            claim_id TEXT NOT NULL REFERENCES claim(id) ON DELETE CASCADE,
            rule_id TEXT NOT NULL,
            reason TEXT NOT NULL
        )
    `);
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS decision (
            claim_id TEXT PRIMARY KEY REFERENCES claim(id) ON DELETE CASCADE,
            manager_id TEXT NOT NULL,
            outcome TEXT NOT NULL,
            comment TEXT NOT NULL,
            decided_at TEXT NOT NULL
        )
    `);
}
