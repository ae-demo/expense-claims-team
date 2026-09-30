// Env read once, at startup, in one place. Every other module reads through
// this file rather than calling process.env itself.

export interface ModelSettings {
  format: string; // MODEL_API_FORMAT
  baseURL: string; // MODEL_ENDPOINT
  apiKey: string; // MODEL_API_KEY
  modelName: string; // MODEL_NAME
  keyHeader?: string; // MODEL_API_KEY_HEADER — normally unset
  authScheme?: string; // MODEL_API_AUTH_SCHEME
}

export const config = {
  port: Number(process.env.PORT ?? 9090),

  // Model access — see agent-building's "Model access".
  modelEndpoint: process.env.MODEL_ENDPOINT,
  modelName: process.env.MODEL_NAME,
  modelApiKey: process.env.MODEL_API_KEY,
  modelApiFormat: process.env.MODEL_API_FORMAT,
  modelApiAuthScheme: process.env.MODEL_API_AUTH_SCHEME,
  modelApiKeyHeader: process.env.MODEL_API_KEY_HEADER,

  // expense-api — the only component dependency this agent's tools call.
  expenseApiUrl: process.env.EXPENSE_API_URL,

  // policy-memory-db — this agent's own conversation store. Its absence is
  // not a fault: the in-memory backing covers build-time evaluation and a
  // local run. See "Conversation store" / "Which backing, and when".
  memoryDbHost: process.env.POLICY_MEMORY_DB_HOST,
  memoryDbPort: process.env.POLICY_MEMORY_DB_PORT,
  memoryDbName: process.env.POLICY_MEMORY_DB_DBNAME,
  memoryDbUser: process.env.POLICY_MEMORY_DB_USER,
  memoryDbPassword: process.env.POLICY_MEMORY_DB_PASSWORD,
};

// The required model variables. None has a fallback: a default id or host is
// right for one connection and wrong for every other, so a missing one is
// reported, never guessed.
export function missingRequiredEnv(): string[] {
  const missing: string[] = [];
  if (!config.modelEndpoint) missing.push("MODEL_ENDPOINT");
  if (!config.modelName) missing.push("MODEL_NAME");
  if (!config.modelApiKey) missing.push("MODEL_API_KEY");
  if (!config.modelApiFormat) missing.push("MODEL_API_FORMAT");
  return missing;
}

// From agent.afm.md front matter: x-aep.attachments. The document declares no
// such block, so this agent takes no attachments.
export const ATTACHMENTS: { types: string[]; maxFiles: number; maxFileSizeMB: number } | null = null;

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
