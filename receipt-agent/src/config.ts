// Config, read from the environment once, in one place. Every other module
// reads through this file — never a scattered `process.env` per call site.

export const PORT = Number(process.env.PORT ?? 9090);

export interface ModelSettings {
  format: string; // MODEL_API_FORMAT
  baseURL: string; // MODEL_ENDPOINT
  apiKey: string; // MODEL_API_KEY
  modelName: string; // MODEL_NAME
  keyHeader?: string; // MODEL_API_KEY_HEADER — normally unset
  authScheme?: string; // MODEL_API_AUTH_SCHEME
}

export const config = {
  modelEndpoint: process.env.MODEL_ENDPOINT,
  modelName: process.env.MODEL_NAME,
  modelApiKey: process.env.MODEL_API_KEY,
  modelApiFormat: process.env.MODEL_API_FORMAT,
  modelApiAuthScheme: process.env.MODEL_API_AUTH_SCHEME,
  modelApiKeyHeader: process.env.MODEL_API_KEY_HEADER,
};

// From agent.afm.md's x-aep.attachments — copied exactly. `null` would mean
// the document declares no attachments block; this agent's does.
export const ATTACHMENTS: { types: string[]; maxFiles: number; maxFileSizeMB: number } | null = {
  types: ["image/jpeg", "image/png", "application/pdf"],
  maxFiles: 1,
  maxFileSizeMB: 5,
};

// The MODEL_* variables required to serve a turn. None has a fallback — a
// default model id or endpoint would be right for one host and wrong for
// every other, so a missing one is reported, never guessed.
export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!config.modelEndpoint) missing.push("MODEL_ENDPOINT");
  if (!config.modelName) missing.push("MODEL_NAME");
  if (!config.modelApiKey) missing.push("MODEL_API_KEY");
  if (!config.modelApiFormat) missing.push("MODEL_API_FORMAT");
  return missing;
}

export function modelSettings(): ModelSettings {
  return {
    format: config.modelApiFormat ?? "",
    baseURL: config.modelEndpoint ?? "",
    apiKey: config.modelApiKey ?? "",
    modelName: config.modelName ?? "",
    keyHeader: config.modelApiKeyHeader,
    authScheme: config.modelApiAuthScheme,
  };
}
