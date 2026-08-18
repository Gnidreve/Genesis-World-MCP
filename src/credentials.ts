/**
 * Per-request credentials for `--client-credentials` mode (ROADMAP P12).
 *
 * Normal mode: one fixed genesisWorld identity for the whole process, read
 * once from Environments (GENESISWORLD_USERNAME/PASSWORD/PRODUCT_KEY).
 *
 * Client-credentials mode: the server holds no fixed identity. Each HTTP
 * client supplies its own Basic Auth credentials (and optionally its own
 * product key) via request headers; the server is a stateless bridge that
 * forwards them to genesisWorld. HTTP-only — see index.ts.
 *
 * Threading per-request credentials down into `lib.ts`'s `authHeaders()`
 * (called deep inside every tool handler, none of which know about HTTP
 * request context) uses Node's AsyncLocalStorage rather than a context
 * parameter — that would mean touching every tool file for a concern that
 * belongs entirely to the HTTP transport layer.
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestCredentials {
  username: string;
  password: string;
  /** Optional — falls back to the server's GENESISWORLD_PRODUCT_KEY Environment when omitted. */
  productKey?: string;
}

export const credentialsStorage = new AsyncLocalStorage<RequestCredentials>();

const USERNAME_HEADER = "x-genesisworld-username";
const PASSWORD_HEADER = "x-genesisworld-password";
const PRODUCT_KEY_HEADER = "x-genesisworld-product-key";

export const CREDENTIAL_HEADERS = {
  username: USERNAME_HEADER,
  password: PASSWORD_HEADER,
  productKey: PRODUCT_KEY_HEADER,
} as const;

function firstHeaderValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * Extract client-supplied credentials from HTTP request headers.
 * Returns undefined (not a partial object) unless BOTH username and
 * password are present — client-credentials mode has no partial-identity
 * concept, and callers should treat undefined as "reject the request",
 * not "fall back to something".
 */
export function credentialsFromHeaders(
  headers: Record<string, string | string[] | undefined>
): RequestCredentials | undefined {
  const username = firstHeaderValue(headers[USERNAME_HEADER]);
  const password = firstHeaderValue(headers[PASSWORD_HEADER]);
  const productKey = firstHeaderValue(headers[PRODUCT_KEY_HEADER]);
  if (!username || !password) return undefined;
  return productKey ? { username, password, productKey } : { username, password };
}
