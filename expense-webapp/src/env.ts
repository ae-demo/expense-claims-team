// Typed read of window._env_, the platform's runtime config (mounted as
// /env-config.js, BEFORE the bundle, per react-webapp). Throws at module load
// when it never arrived — never default a key this table says is set.
//
// Only the auth dependency's four browser-visible keys are declared: this app
// has no `configurations.env` defaults and no `external`-kind dependency, so
// there is nothing else window._env_ carries. <DEP>_JWKS_URL is emitted too,
// but the browser never validates a token — the API gateway does — so it is
// deliberately absent here.
type Env = {
  USER_AUTH_CLIENT_ID: string;
  USER_AUTH_ISSUER: string;
  USER_AUTH_SCOPES: string;
  USER_AUTH_RESOURCE: string;
};

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

export const env: Env = window._env_;
