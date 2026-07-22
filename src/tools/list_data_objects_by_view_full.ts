import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListDataObjectsByViewFull(server: McpServer): void {
  server.registerTool(
    "list_data_objects_by_view_full",
    {
      title: "List Data Objects by View Full (genesisWorld)",
      description:
        "Read-only fetch of data objects of a given type, filtered " +
        "through a specific view, in full view (all fields). Supports " +
        "the 'whereString' parameter for field-level filtering. Maps to " +
        "GET /v7.0/type/{dataObjectType}/view/{viewID}/full.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
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
}

export const tool: ToolDef = {
  name: "list_data_objects_by_view_full",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/{dataObjectType}/view/{viewID}/full"],
  register: registerListDataObjectsByViewFull,
};
