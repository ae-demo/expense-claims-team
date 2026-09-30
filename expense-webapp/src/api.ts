// The expense-api client — generated types, same-origin baseUrl, and the
// authz middleware from src/authz/client.ts. Nothing here decides what a 401
// or 403 means; that is authz/client's whole job (see its header comment).
import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/expense-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

export const expenseApi = createClient<paths>({ baseUrl: "/api" });
expenseApi.use(authMiddleware);
