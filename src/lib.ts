/**
 * Shared utilities for the CAS genesisWorld MCP server.
 */

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

const BASE_URL = process.env.GENESISWORLD_BASE_URL?.replace(/\/+$/, "");
const USERNAME = process.env.GENESISWORLD_USERNAME ?? "";
const PASSWORD = process.env.GENESISWORLD_PASSWORD ?? "";
const PRODUCT_KEY = process.env.GENESISWORLD_PRODUCT_KEY;

export function ensureConfig(): void {
  if (!BASE_URL) {
    console.error(
      "[cas-genesisworld-mcp] FATAL: GENESISWORLD_BASE_URL is not set. " +
        "Provide it as an environment variable, e.g. " +
        "http://your-server/genesisrest.svc"
    );
    process.exit(1);
  }

  if (!USERNAME && !PASSWORD) {
    console.error(
      "[cas-genesisworld-mcp] WARNING: no Basic Auth credentials set " +
        "(GENESISWORLD_USERNAME / GENESISWORLD_PASSWORD). Requests will be " +
        "sent unauthenticated and will most likely fail."
    );
  }
}

export function getBaseUrl(): string {
  if (!BASE_URL) throw new Error("GENESISWORLD_BASE_URL not configured");
  return BASE_URL;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (USERNAME || PASSWORD) {
    const token = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
    headers["Authorization"] = `Basic ${token}`;
  }
  if (PRODUCT_KEY) {
    headers["X-CAS-PRODUCT-KEY"] = PRODUCT_KEY;
  }
  return headers;
}

function buildUrl(path: string, query: QueryParams): URL {
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== "") {
          url.searchParams.append(key, String(item));
        }
      }
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/** Log one upstream call to stderr unless GENESISWORLD_QUIET=true. */
function logCall(method: string, url: URL, status: number, startedAt: number): void {
  if ((process.env.GENESISWORLD_QUIET ?? "").toLowerCase() === "true") return;
  const ms = Date.now() - startedAt;
  console.error(
    `[cas-genesisworld-mcp] ${method} ${url.pathname}${url.search} -> ${status} (${ms}ms)`
  );
}

/** Perform a read-only GET against the genesisWorld REST API. */
export async function apiGet(path: string, query: QueryParams): Promise<string> {
  const url = buildUrl(path, query);
  const startedAt = Date.now();
  const res = await fetch(url, { method: "GET", headers: authHeaders() });
  const text = await res.text();
  logCall("GET", url, res.status, startedAt);

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for GET ${url.pathname}${url.search}\n` +
        text.slice(0, 4000)
    );
  }
  return text;
}

/**
 * Perform a POST/PUT/DELETE against the genesisWorld REST API.
 *
 * `body` is JSON-encoded unless a non-JSON `contentType` is given, in which
 * case it is sent as-is (e.g. the notes-affix endpoint takes text/plain or
 * text/html). An empty upstream response body is normalized to a small JSON
 * status object so tool results are never blank.
 */
export async function apiSend(
  method: "POST" | "PUT" | "DELETE",
  path: string,
  query: QueryParams,
  body?: unknown,
  contentType = "application/json"
): Promise<string> {
  const url = buildUrl(path, query);
  const headers = authHeaders();
  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = contentType;
    init.body = contentType === "application/json" ? JSON.stringify(body) : String(body);
  }

  const startedAt = Date.now();
  const res = await fetch(url, init);
  const text = await res.text();
  logCall(method, url, res.status, startedAt);

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for ${method} ${url.pathname}${url.search}\n` +
        text.slice(0, 4000)
    );
  }
  return text || JSON.stringify({ ok: true, status: res.status });
}

/**
 * Maximum characters a tool result may carry before being truncated
 * (guards against runaway payloads eating the agent's context). Configured
 * via GENESISWORLD_MAX_RESULT_CHARS; 0 disables truncation.
 */
export function maxResultChars(): number {
  const raw = process.env.GENESISWORLD_MAX_RESULT_CHARS;
  if (raw === undefined || raw === "") return 60_000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 60_000;
}

/** Truncate an outgoing result body with an actionable hint appended. */
export function capResult(body: string): string {
  const cap = maxResultChars();
  if (cap === 0 || body.length <= cap) return body;
  return (
    body.slice(0, cap) +
    `\n... [truncated: response was ${body.length} chars, cap is ${cap}. ` +
    "Narrow the result with 'fields', 'page'/'entriesPerPage', or a view; " +
    "raise/disable the cap via GENESISWORLD_MAX_RESULT_CHARS.]"
  );
}

export function jsonResult(text: string) {
  let body = text;
  try {
    body = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // Not JSON — return the raw body unchanged.
  }
  return { content: [{ type: "text" as const, text: capResult(body) }] };
}

export function errorResult(err: unknown) {
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: err instanceof Error ? err.message : String(err),
      },
    ],
  };
}
