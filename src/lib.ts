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

/** Perform a read-only GET against the genesisWorld REST API. */
export async function apiGet(path: string, query: QueryParams): Promise<string> {
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

  const res = await fetch(url, { method: "GET", headers: authHeaders() });
  const text = await res.text();

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for GET ${url.pathname}${url.search}\n` +
        text.slice(0, 4000)
    );
  }
  return text;
}

export function jsonResult(text: string) {
  let body = text;
  try {
    body = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // Not JSON — return the raw body unchanged.
  }
  return { content: [{ type: "text" as const, text: body }] };
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
