import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetFullDataObjects(server: McpServer): void {
  server.registerTool(
    "get_full_data_objects",
    {
      title: "Get Full Data Objects (genesisWorld)",
      description:
        "Read-only fetch of data objects of a given type in full view " +
        "(all fields). Supports the same filters as list_data_objects but " +
        "returns the complete field set. Maps to " +
        "GET /v7.0/type/{dataObjectType}/full.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
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
}

export const tool: ToolDef = {
  name: "get_full_data_objects",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/{dataObjectType}/full"],
  register: registerGetFullDataObjects,
};
