import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerGetDataObjectCount(server: McpServer): void {
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
}
