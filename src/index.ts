#!/usr/bin/env node
/**
 * CAS genesisWorld REST Webservice — MCP server (read-only).
 *
 * Exposes a curated, GET-only subset of the CAS genesisWorld REST API v7.0
 * as MCP tools. See AGENTS.md for the scope/classification rules and
 * swagger.json (repo root) for the full API surface used as cross-reference.
 *
 * Configuration is provided at startup via environment variables:
 *   GENESISWORLD_BASE_URL   (required)  e.g. http://demo.cas.de/genesisrest.svc
 *   GENESISWORLD_USERNAME   (Basic Auth user)
 *   GENESISWORLD_PASSWORD   (Basic Auth password)
 *   GENESISWORLD_PRODUCT_KEY (optional) sent as X-CAS-PRODUCT-KEY if set
 *
 * The base URL is NOT hardcoded — the demo URL above is only an example.
 */

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const BASE_URL = process.env.GENESISWORLD_BASE_URL?.replace(/\/+$/, "");
const USERNAME = process.env.GENESISWORLD_USERNAME ?? "";
const PASSWORD = process.env.GENESISWORLD_PASSWORD ?? "";
const PRODUCT_KEY = process.env.GENESISWORLD_PRODUCT_KEY; // optional

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

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = Record<string, QueryValue | QueryValue[]>;

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
async function apiGet(path: string, query: QueryParams): Promise<string> {
  const url = new URL(`${BASE_URL}${path}`);
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

function jsonResult(text: string) {
  let body = text;
  try {
    body = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // Not JSON — return the raw body unchanged.
  }
  return { content: [{ type: "text" as const, text: body }] };
}

function errorResult(err: unknown) {
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

function buildServer(): McpServer {
const server = new McpServer({
  name: "cas-genesisworld-mcp",
  version: "0.1.0",
});

/* ------------------------------------------------------------------ *
 * Tool 1: smart_search                                               *
 * GET /v7.0/smartsearch                                              *
 * ------------------------------------------------------------------ */
server.registerTool(
  "smart_search",
  {
    title: "Smart Search (genesisWorld)",
    description:
      "Read-only smart (full-text) search across CAS genesisWorld data " +
      "objects. Maps to GET /v7.0/smartsearch. Returns the raw " +
      "SearchResponse JSON (the response shape is marked 'undocumented' " +
      "in the OpenAPI spec, so results are passed through as-is).",
    inputSchema: {
      query: z.string().optional().describe("The search term."),
      objectType: z
        .string()
        .optional()
        .describe(
          "Restrict the search to a single object type (API param 'object-type'), e.g. 'ADDRESS' or 'APPOINTMENT'."
        ),
      objectTypes: z
        .string()
        .optional()
        .describe(
          "Restrict to multiple object types (API param 'object-types')."
        ),
      page: z
        .number()
        .int()
        .optional()
        .describe("Page number. The first page is index 1."),
      entriesPerPage: z
        .number()
        .int()
        .optional()
        .describe("Page size (API param 'entries-per-page')."),
    },
  },
  async (args) => {
    try {
      const text = await apiGet("/v7.0/smartsearch", {
        query: args.query,
        "object-type": args.objectType,
        "object-types": args.objectTypes,
        page: args.page,
        "entries-per-page": args.entriesPerPage,
      });
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 2: get_data_object                                            *
 * GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}                  *
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_data_object",
  {
    title: "Get Data Object (genesisWorld)",
    description:
      "Read-only fetch of a single genesisWorld data object by type and " +
      "GGUID. Maps to GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe(
          "Object/table type (path segment), e.g. 'ADDRESS', 'APPOINTMENT', 'OPPORTUNITY'."
        ),
      dataObjectGGUID: z
        .string()
        .describe("GGUID of the data object (path segment)."),
      fields: z
        .string()
        .optional()
        .describe(
          "Comma-separated list of fields to return (API param 'fields'). Omit to return the default field set."
        ),
      includePermissions: z
        .boolean()
        .optional()
        .describe("Include object permissions in the response."),
      includeSyncrecordPermissions: z
        .boolean()
        .optional()
        .describe(
          "Include sync-record permissions. Implies includePermissions=true. Only valid if sync is enabled for the type."
        ),
      tagAsRecentlyUsed: z
        .boolean()
        .optional()
        .describe("Track this load as a 'recently used' usage."),
    },
  },
  async (args) => {
    try {
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
        `/${encodeURIComponent(args.dataObjectGGUID)}`;
      const text = await apiGet(path, {
        fields: args.fields,
        "include-permissions": args.includePermissions,
        "include-syncrecord-permissions": args.includeSyncrecordPermissions,
        "tag-as-recently-used": args.tagAsRecentlyUsed,
      });
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 3: get_dossier                                                *
 * GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier/full     *
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_dossier",
  {
    title: "Get Dossier (genesisWorld)",
    description:
      "Read-only fetch of all dossier entries (linked records / activities " +
      "/ documents) for a single data object. Maps to " +
      "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier/full.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe(
          "Object/table type of the parent object (path segment), e.g. 'ADDRESS'."
        ),
      dataObjectGGUID: z
        .string()
        .describe("GGUID of the parent data object (path segment)."),
      objectTypes: z
        .string()
        .optional()
        .describe(
          "Restrict dossier entries to these linked object types (API param 'object-types')."
        ),
      search: z
        .string()
        .optional()
        .describe(
          "Filter entries by search term, using the user's configured search fields."
        ),
      includeAttributes: z
        .boolean()
        .optional()
        .describe("Include attributes in the dossier entries (API param 'include-attributes')."),
      page: z
        .number()
        .int()
        .optional()
        .describe("Page number. The first page is index 1."),
      entriesPerPage: z
        .number()
        .int()
        .optional()
        .describe("Page size (API param 'entries-per-page')."),
    },
  },
  async (args) => {
    try {
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
        `/${encodeURIComponent(args.dataObjectGGUID)}/dossier/full`;
      const text = await apiGet(path, {
        "object-types": args.objectTypes,
        search: args.search,
        "include-attributes": args.includeAttributes,
        page: args.page,
        "entries-per-page": args.entriesPerPage,
      });
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 4: list_available_data_object_types                          *
 * GET /v7.0/user/self/dataobjecttypepermission/list                 *
 * ------------------------------------------------------------------ */
server.registerTool(
  "list_available_data_object_types",
  {
    title: "List Available Data Object Types (genesisWorld)",
    description:
      "Read-only list of the data object types the authenticated user is " +
      "permitted to access, together with their permissions. Use this to " +
      "discover valid values for the 'dataObjectType' / 'object-type(s)' " +
      "arguments of the other tools. Maps to " +
      "GET /v7.0/user/self/dataobjecttypepermission/list. Takes no parameters.",
    inputSchema: {},
  },
  async () => {
    try {
      const text = await apiGet(
        "/v7.0/user/self/dataobjecttypepermission/list",
        {}
      );
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 5: get_data_object_types_metadata                            *
 * GET /v7.0/metadata                                                *
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_data_object_types_metadata",
  {
    title: "Get Data Object Types Metadata (genesisWorld)",
    description:
      "Read-only description and field schema for data object types, in a " +
      "single call. Useful to discover which fields a type exposes (e.g. to " +
      "fill the 'fields' argument of get_data_object). Maps to GET /v7.0/metadata.",
    inputSchema: {
      objectTypes: z
        .array(z.string())
        .optional()
        .describe(
          "Restrict to these object types (API param 'object-types', sent as repeated query params). Omit to get metadata for all types."
        ),
      includeSemantics: z
        .boolean()
        .optional()
        .describe("Include semantic information (API param 'include-semantics')."),
    },
  },
  async (args) => {
    try {
      const text = await apiGet("/v7.0/metadata", {
        "object-types": args.objectTypes,
        "include-semantics": args.includeSemantics,
      });
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

return server;
}

function createServer(): McpServer {
  return buildServer();
}

async function main() {
  const transport = process.env.MCP_TRANSPORT ?? "stdio";

  if (transport === "http") {
    const host = process.env.MCP_HOST ?? "0.0.0.0";
    const port = parseInt(process.env.MCP_PORT ?? "3000", 10);
    const endpoint = "/mcp";

    const app = createMcpExpressApp({ host });
    const transports = new Map<string, StreamableHTTPServerTransport | SSEServerTransport>();

    const connectSession = async (t: StreamableHTTPServerTransport | SSEServerTransport) => {
      const s = createServer();
      let closing = false;
      t.onclose = () => {
        if (closing) return;
        closing = true;
        if (t.sessionId) transports.delete(t.sessionId);
        s.close().catch(() => {});
      };
      await s.connect(t as Parameters<McpServer["connect"]>[0]);
    };

    app.all(endpoint, async (req: any, res: any) => {
      try {
        const sessionId = req.headers["mcp-session-id"];
        let t: StreamableHTTPServerTransport;
        if (typeof sessionId === "string") {
          const existing = transports.get(sessionId);
          if (existing instanceof StreamableHTTPServerTransport) {
            t = existing;
          } else {
            res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Unknown session" }, id: null });
            return;
          }
        } else if (req.method === "POST" && isInitializeRequest(req.body)) {
          t = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id) => { transports.set(id, t); },
          });
          await connectSession(t);
        } else {
          res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "No session" }, id: null });
          return;
        }
        await t.handleRequest(req, res, req.body);
      } catch (err) {
        if (!res.headersSent) res.status(500).end();
      }
    });

    app.get("/sse", async (req: any, res: any) => {
      const t = new SSEServerTransport("/messages", res);
      transports.set(t.sessionId, t);
      await connectSession(t);
    });

    app.post("/messages", async (req: any, res: any) => {
      const sessionId = req.query?.sessionId as string | undefined;
      const existing = sessionId ? transports.get(sessionId) : undefined;
      if (existing instanceof SSEServerTransport) {
        await existing.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).end();
      }
    });

    await new Promise<void>((resolve, reject) => {
      const srv = app.listen(port, host, () => resolve());
      srv.once("error", reject);
    });

    console.error(`[cas-genesisworld-mcp] running on http://${host}:${port}${endpoint} (base_url=${BASE_URL})`);
  } else {
    const t = new StdioServerTransport();
    await buildServer().connect(t);
    console.error(`[cas-genesisworld-mcp] running on stdio (base_url=${BASE_URL})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
