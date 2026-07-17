import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerListRecentDataObjects(server: McpServer): void {
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
}
