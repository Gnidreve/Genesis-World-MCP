import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerListDataObjectsByView(server: McpServer): void {
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
}
