import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerListDataObjects(server: McpServer): void {
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
}
