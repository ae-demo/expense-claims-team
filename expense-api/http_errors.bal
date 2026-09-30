// Small builders for the contract's Error-bodied responses. gateway_assertion.bal's
// `requireGatewayCaller` returns a bare `http:Unauthorized` (its own generic
// body) — that is not the same type as this contract's `ErrorUnauthorized`
// (body: Error, required), so every call site maps the failure through
// `unauthorized(...)` rather than returning the interceptor's value as-is.

function unauthorized(string message) returns ErrorUnauthorized {
    return { body: { code: 401, message } };
}

function badRequest(string message) returns ErrorBadRequest {
    return { body: { code: 400, message } };
}

function notFound(string message) returns ErrorNotFound {
    return { body: { code: 404, message } };
}
