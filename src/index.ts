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
  version: "0.2.0",
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
 * Tool 4: list_data_objects                                          *
 * GET /v7.0/type/{dataObjectType}/list                              *
 * ------------------------------------------------------------------ */
server.registerTool(
  "list_data_objects",
  {
    title: "List Data Objects (genesisWorld)",
    description:
      "Read-only list of data objects of a given type, with optional " +
      "filtering, field selection, and pagination. Maps to " +
      "GET /v7.0/type/{dataObjectType}/list.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe(
          "Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."
        ),
      search: z
        .string()
        .optional()
        .describe(
          "Filters the list for data objects matching the search term. " +
          "This uses the user's configured search fields defined in the " +
          "Desktop Client."
        ),
      fields: z
        .string()
        .optional()
        .describe(
          "Comma-separated list of fields to return (API param 'fields'). " +
          "Omit to return the default field set."
        ),
      orderBy: z
        .string()
        .optional()
        .describe(
          "Order specification (API param 'order-by'). " +
          "Format: comma-separated field names, optionally " +
          "with ' ASC' or ' DESC' suffix, e.g. 'KEYWORD ASC,UPDATETIMESTAMP DESC'."
        ),
      teamFilter: z
        .string()
        .optional()
        .describe(
          "Filters the list based on permission owners (API param 'team-filter')."
        ),
      updatedAfter: z
        .string()
        .optional()
        .describe(
          "Filters by UPDATETIMESTAMP (API param 'updated-after'). " +
          "Needs a datetime in ISO-format."
        ),
      insertedAfter: z
        .string()
        .optional()
        .describe(
          "Filters by INSERTTIMESTAMP (API param 'inserted-after'). " +
          "Needs a datetime in ISO-format."
        ),
      intervalStart: z
        .string()
        .optional()
        .describe(
          "Used together with intervalEnd. Filters data objects with " +
          "START_DT and END_DT for an interval (API param 'interval-start'). " +
          "Needs a datetime in ISO-format."
        ),
      intervalEnd: z
        .string()
        .optional()
        .describe(
          "Used together with intervalStart. Filters data objects with " +
          "START_DT and END_DT for an interval (API param 'interval-end'). " +
          "Needs a datetime in ISO-format."
        ),
      linkedToType: z
        .string()
        .optional()
        .describe(
          "Filters the list for data objects which are linked to the " +
          "given type (API param 'linked-to-type')."
        ),
      linkedTo: z
        .string()
        .optional()
        .describe(
          "Requires linkedToType. A comma-separated string of GGUIDs " +
          "(API param 'linked-to')."
        ),
      linkedToAttributes: z
        .string()
        .optional()
        .describe(
          "Requires linkedTo and linkedToType. Filters the links " +
          "additionally for the attributes (API param 'linked-to-attributes')."
        ),
      includeDeactivated: z
        .boolean()
        .optional()
        .describe(
          "If true, deactivated addresses will be returned for ADDRESS " +
          "views (API param 'include-deactivated')."
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
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}/list`;
      const text = await apiGet(path, {
        search: args.search,
        fields: args.fields,
        "order-by": args.orderBy,
        "team-filter": args.teamFilter,
        "updated-after": args.updatedAfter,
        "inserted-after": args.insertedAfter,
        "interval-start": args.intervalStart,
        "interval-end": args.intervalEnd,
        "linked-to-type": args.linkedToType,
        "linked-to": args.linkedTo,
        "linked-to-attributes": args.linkedToAttributes,
        "include-deactivated": args.includeDeactivated,
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
 * Tool 5: list_views                                                 *
 * GET /v7.0/type/{dataObjectType}/view/list                          *
 * ------------------------------------------------------------------ */
server.registerTool(
  "list_views",
  {
    title: "List Views (genesisWorld)",
    description:
      "Read-only list of views available for a given data object type. " +
      "Returns view metadata including view IDs that can be used with " +
      "list_data_objects_by_view. Maps to " +
      "GET /v7.0/type/{dataObjectType}/view/list.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe(
          "Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."
        ),
      viewKind: z
        .string()
        .optional()
        .describe(
          "Optional filter for view kind (API param 'view-kind')."
        ),
      includeDisplaySettings: z
        .boolean()
        .optional()
        .describe(
          "Include display mode settings of a view (API param 'include-display-settings')."
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
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}/view/list`;
      const text = await apiGet(path, {
        "view-kind": args.viewKind,
        "include-display-settings": args.includeDisplaySettings,
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
 * Tool 6: list_data_objects_by_view                                  *
 * GET /v7.0/type/{dataObjectType}/view/{viewID}/list                 *
 * ------------------------------------------------------------------ */
server.registerTool(
  "list_data_objects_by_view",
  {
    title: "List Data Objects by View (genesisWorld)",
    description:
      "Read-only list of data objects of a given type, filtered through " +
      "a specific view. Supports the powerful 'whereString' parameter " +
      "for field-level filtering. Maps to " +
      "GET /v7.0/type/{dataObjectType}/view/{viewID}/list.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe(
          "Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."
        ),
      viewId: z
        .string()
        .describe(
          "View ID (path segment). Use list_views to discover available IDs."
        ),
      whereString: z
        .string()
        .optional()
        .describe(
          "Field-level filter expression (API param 'where-string'). " +
          "Format depends on the genesisWorld API; common syntax is " +
          "FIELDNAME='value' or FIELDNAME LIKE 'pattern'."
        ),
      search: z
        .string()
        .optional()
        .describe(
          "Filters the list for data objects matching the search term. " +
          "This uses the user's configured search fields defined in the " +
          "Desktop Client."
        ),
      fields: z
        .string()
        .optional()
        .describe(
          "Comma-separated list of fields to return (API param 'fields'). " +
          "Omit to return the default field set."
        ),
      orderBy: z
        .string()
        .optional()
        .describe(
          "Order specification (API param 'order-by'). " +
          "Format: comma-separated field names, optionally " +
          "with ' ASC' or ' DESC' suffix."
        ),
      updatedAfter: z
        .string()
        .optional()
        .describe(
          "Filters by UPDATETIMESTAMP (API param 'updated-after'). " +
          "Needs a datetime in ISO-format."
        ),
      insertedAfter: z
        .string()
        .optional()
        .describe(
          "Filters by INSERTTIMESTAMP (API param 'inserted-after'). " +
          "Needs a datetime in ISO-format."
        ),
      intervalStart: z
        .string()
        .optional()
        .describe(
          "Used together with intervalEnd. Filters data objects with " +
          "START_DT and END_DT for an interval (API param 'interval-start'). " +
          "Needs a datetime in ISO-format."
        ),
      intervalEnd: z
        .string()
        .optional()
        .describe(
          "Used together with intervalStart. Filters data objects with " +
          "START_DT and END_DT for an interval (API param 'interval-end'). " +
          "Needs a datetime in ISO-format."
        ),
      includeDeactivated: z
        .boolean()
        .optional()
        .describe(
          "If true, deactivated addresses will be returned for ADDRESS " +
          "views (API param 'include-deactivated')."
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
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
        `/view/${encodeURIComponent(args.viewId)}/list`;
      const text = await apiGet(path, {
        "where-string": args.whereString,
        search: args.search,
        fields: args.fields,
        "order-by": args.orderBy,
        "updated-after": args.updatedAfter,
        "inserted-after": args.insertedAfter,
        "interval-start": args.intervalStart,
        "interval-end": args.intervalEnd,
        "include-deactivated": args.includeDeactivated,
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
 * Tool 7: list_available_data_object_types                          *
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
 * Tool 8: get_data_object_types_metadata                            *
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


/* ------------------------------------------------------------------ *
 * Tool 9: list_links                                                 *
 * GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/list        *
 * ------------------------------------------------------------------ */
server.registerTool(
  "list_links",
  {
    title: "List Links (genesisWorld)",
    description:
      "Read-only fetch of all links (relationships) for a data object. " +
      "Filters by object-type, gguid, attribute, and link-direction. " +
      "Maps to GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/list.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe("Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."),
      dataObjectGGUID: z
        .string()
        .describe("GGUID of the data object (path segment)."),
      objectType: z
        .string()
        .optional()
        .describe("Filters links by object type (API param 'object-type')."),
      gguid: z
        .string()
        .optional()
        .describe("Filters links by data object GUID (API param 'gguid')."),
      attribute: z
        .string()
        .optional()
        .describe("Filters links by link attribute (API param 'attribute')."),
      linkDirection: z
        .string()
        .optional()
        .describe("Filters links by link direction (API param 'link-direction')."),
    },
  },
  async (args) => {
    try {
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
        `/${encodeURIComponent(args.dataObjectGGUID)}/link/list`;
      const text = await apiGet(path, {
        "object-type": args.objectType,
        gguid: args.gguid,
        attribute: args.attribute,
        "link-direction": args.linkDirection,
      });
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 10: list_recent_data_objects                                  *
 * GET /v7.0/type/{dataObjectType}/recent/list                        *
 * ⚠️  Has whereString – no view required!                            *
 * ------------------------------------------------------------------ */
server.registerTool(
  "list_recent_data_objects",
  {
    title: "List Recent Data Objects (genesisWorld)",
    description:
      "Read-only list of recently used data objects of a given type. " +
      "Supports the 'whereString' parameter for field-level filtering " +
      "without needing a view. Maps to " +
      "GET /v7.0/type/{dataObjectType}/recent/list.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe("Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."),
      fields: z
        .string()
        .optional()
        .describe("Comma-separated list of fields to return (API param 'fields')."),
      whereString: z
        .string()
        .optional()
        .describe(
          "Field-level filter expression (API param 'where-string'). " +
          "Format depends on the genesisWorld API."
        ),
    },
  },
  async (args) => {
    try {
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}/recent/list`;
      const text = await apiGet(path, {
        fields: args.fields,
        "where-string": args.whereString,
      });
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 11: get_available_products                                    *
 * GET /v7.0/type/gwopportunity/availableproducts                     *
 * ⚠️  Has whereString!                                               *
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_available_products",
  {
    title: "Get Available Products (genesisWorld)",
    description:
      "Read-only list of available products for an opportunity. " +
      "Supports the 'whereString' parameter for field-level filtering. " +
      "Maps to GET /v7.0/type/gwopportunity/availableproducts.",
    inputSchema: {
      whereString: z
        .string()
        .optional()
        .describe(
          "Field-level filter expression (API param 'where-string')."
        ),
      search: z
        .string()
        .optional()
        .describe(
          "Filters the list for data objects matching the search term."
        ),
      fields: z
        .string()
        .optional()
        .describe("Comma-separated list of fields to return (API param 'fields')."),
      orderBy: z
        .string()
        .optional()
        .describe("Order specification (API param 'order-by')."),
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
      const path = "/v7.0/type/gwopportunity/availableproducts";
      const text = await apiGet(path, {
        "where-string": args.whereString,
        search: args.search,
        fields: args.fields,
        "order-by": args.orderBy,
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
 * Tool 12: get_data_object_count                                     *
 * GET /v7.0/type/{dataObjectType}/count                              *
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_data_object_count",
  {
    title: "Get Data Object Count (genesisWorld)",
    description:
      "Read-only count of data objects of a given type, with optional " +
      "search filter. Maps to GET /v7.0/type/{dataObjectType}/count.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe("Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."),
      search: z
        .string()
        .optional()
        .describe(
          "Filters the count for data objects matching the search term."
        ),
    },
  },
  async (args) => {
    try {
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}/count`;
      const text = await apiGet(path, {
        search: args.search,
      });
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 13: get_primary_link_parents                                  *
 * GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/primarylinkparents*
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_primary_link_parents",
  {
    title: "Get Primary Link Parents (genesisWorld)",
    description:
      "Read-only fetch of primary linked parent objects for a data " +
      "object. For example, which ADDRESS is the primary account for an " +
      "opportunity. Maps to " +
      "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/primarylinkparents.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe("Object/table type (path segment), e.g. 'GWOPPORTUNITY', 'TASK'."),
      dataObjectGGUID: z
        .string()
        .describe("GGUID of the data object (path segment)."),
    },
  },
  async (args) => {
    try {
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
        `/${encodeURIComponent(args.dataObjectGGUID)}/primarylinkparents`;
      const text = await apiGet(path, {});
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 14: list_users                                                *
 * GET /v7.0/user/list                                                *
 * ------------------------------------------------------------------ */
server.registerTool(
  "list_users",
  {
    title: "List Users (genesisWorld)",
    description:
      "Read-only list of all users with optional pagination. Useful to " +
      "resolve PERSONINCHARGE names to user details. Maps to " +
      "GET /v7.0/user/list.",
    inputSchema: {
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
      objectType: z
        .string()
        .optional()
        .describe("Filter by object type (API param 'object-type')."),
      domainGuid: z
        .string()
        .optional()
        .describe("Filter by domain GUID (API param 'domain-guid')."),
      minPermission: z
        .number()
        .int()
        .optional()
        .describe("Minimum permission level (API param 'min-permission')."),
    },
  },
  async (args) => {
    try {
      const path = "/v7.0/user/list";
      const text = await apiGet(path, {
        page: args.page,
        "entries-per-page": args.entriesPerPage,
        "object-type": args.objectType,
        "domain-guid": args.domainGuid,
        "min-permission": args.minPermission,
      });
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 15: get_user_self                                             *
 * GET /v7.0/user/self                                                *
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_user_self",
  {
    title: "Get User Self (genesisWorld)",
    description:
      "Read-only fetch of the authenticated user's own profile and meta " +
      "data. Maps to GET /v7.0/user/self.",
    inputSchema: {
      fields: z
        .string()
        .optional()
        .describe("Comma-separated list of fields to return (API param 'fields')."),
    },
  },
  async (args) => {
    try {
      const path = "/v7.0/user/self";
      const text = await apiGet(path, {
        fields: args.fields,
      });
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 16: get_view                                                  *
 * GET /v7.0/type/{dataObjectType}/view/{viewID}                      *
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_view",
  {
    title: "Get View (genesisWorld)",
    description:
      "Read-only details of a specific view, including its configuration " +
      "and filter criteria. Maps to " +
      "GET /v7.0/type/{dataObjectType}/view/{viewID}.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe("Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."),
      viewId: z
        .string()
        .describe("View ID (path segment). Use list_views to discover available IDs."),
    },
  },
  async (args) => {
    try {
      const path =
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
        `/view/${encodeURIComponent(args.viewId)}`;
      const text = await apiGet(path, {});
      return jsonResult(text);
    } catch (err) {
      return errorResult(err);
    }
  }
);

/* ------------------------------------------------------------------ *
 * Tool 17: list_tags                                                 *
 * GET /v7.0/tags                                                     *
 * ------------------------------------------------------------------ */
server.registerTool(
  "list_tags",
  {
    title: "List Tags (genesisWorld)",
    description:
      "Read-only list of all tags in the system, with optional " +
      "pagination. Maps to GET /v7.0/tags.",
    inputSchema: {
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
      const path = "/v7.0/tags";
      const text = await apiGet(path, {
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
 * Tool 18: get_object_tags                                           *
 * GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags             *
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_object_tags",
  {
    title: "Get Object Tags (genesisWorld)",
    description:
      "Read-only fetch of all tags assigned to a specific data object. " +
      "Maps to GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe("Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."),
      dataObjectGGUID: z
        .string()
        .describe("GGUID of the data object (path segment)."),
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
        `/${encodeURIComponent(args.dataObjectGGUID)}/tags`;
      const text = await apiGet(path, {
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
 * Tool 19: get_full_data_objects                                     *
 * GET /v7.0/type/{dataObjectType}/full                               *
 * ------------------------------------------------------------------ */
server.registerTool(
  "get_full_data_objects",
  {
    title: "Get Full Data Objects (genesisWorld)",
    description:
      "Read-only fetch of data objects of a given type in full view " +
      "(all fields). Supports the same filters as list_data_objects but " +
      "returns the complete field set. Maps to " +
      "GET /v7.0/type/{dataObjectType}/full.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe("Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."),
      search: z
        .string()
        .optional()
        .describe(
          "Filters the list for data objects matching the search term."
        ),
      fields: z
        .string()
        .optional()
        .describe("Comma-separated list of fields to return (API param 'fields')."),
      orderBy: z
        .string()
        .optional()
        .describe("Order specification (API param 'order-by')."),
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
        `/v7.0/type/${encodeURIComponent(args.dataObjectType)}/full`;
      const text = await apiGet(path, {
        search: args.search,
        fields: args.fields,
        "order-by": args.orderBy,
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
 * Tool 20: list_data_objects_by_view_full                            *
 * GET /v7.0/type/{dataObjectType}/view/{viewID}/full                 *
 * ------------------------------------------------------------------ */
server.registerTool(
  "list_data_objects_by_view_full",
  {
    title: "List Data Objects by View Full (genesisWorld)",
    description:
      "Read-only fetch of data objects of a given type, filtered " +
      "through a specific view, in full view (all fields). Supports " +
      "the 'whereString' parameter for field-level filtering. Maps to " +
      "GET /v7.0/type/{dataObjectType}/view/{viewID}/full.",
    inputSchema: {
      dataObjectType: z
        .string()
        .describe("Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."),
      viewId: z
        .string()
        .describe("View ID (path segment). Use list_views to discover available IDs."),
      whereString: z
        .string()
        .optional()
        .describe(
          "Field-level filter expression (API param 'where-string')."
        ),
      search: z
        .string()
        .optional()
        .describe(
          "Filters the list for data objects matching the search term."
        ),
      fields: z
        .string()
        .optional()
        .describe("Comma-separated list of fields to return (API param 'fields')."),
      orderBy: z
        .string()
        .optional()
        .describe("Order specification (API param 'order-by')."),
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
        `/view/${encodeURIComponent(args.viewId)}/full`;
      const text = await apiGet(path, {
        "where-string": args.whereString,
        search: args.search,
        fields: args.fields,
        "order-by": args.orderBy,
        page: args.page,
        "entries-per-page": args.entriesPerPage,
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
