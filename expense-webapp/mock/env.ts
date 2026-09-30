// mock mode's window._env_ — exactly the keys src/env.ts declares, the auth
// dependency's four browser-visible ones. A sibling's address is never a
// browser key (same-origin /api instead), so none is added here.
export const mockEnv = {
  USER_AUTH_CLIENT_ID: "mock-client",
  USER_AUTH_ISSUER: "https://mock-idp.test",
  USER_AUTH_SCOPES:
    "openid profile email group ou claims:read claims:read-team claims:read-all " +
    "claims:submit claims:decide policy-rules:read policy-rules:manage",
  USER_AUTH_RESOURCE: "https://mock-idp.test/resources/expense-claims-team",
};
