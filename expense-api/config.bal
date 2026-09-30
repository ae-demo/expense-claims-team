import ballerina/os;

// Every setting has a sensible default so the service starts with no required
// environment variable; the platform overrides these at deploy time with the
// `expense-db` (postgres-cnpg) dependency's envBindings.
configurable string dbHost = os:getEnv("EXPENSE_DB_HOST");
configurable string dbPortRaw = os:getEnv("EXPENSE_DB_PORT");
configurable string dbUser = os:getEnv("EXPENSE_DB_USER");
configurable string dbPassword = os:getEnv("EXPENSE_DB_PASSWORD");
configurable string dbName = os:getEnv("EXPENSE_DB_DBNAME");

final string resolvedDbHost = dbHost == "" ? "localhost" : dbHost;
final int resolvedDbPort = parsePort(dbPortRaw);
final string resolvedDbUser = dbUser == "" ? "postgres" : dbUser;
final string? resolvedDbPassword = dbPassword == "" ? () : dbPassword;
final string resolvedDbName = dbName == "" ? "expense_api" : dbName;

function parsePort(string raw) returns int {
    if raw == "" {
        return 5432;
    }
    int|error parsed = int:fromString(raw);
    if parsed is int {
        return parsed;
    }
    return 5432;
}
