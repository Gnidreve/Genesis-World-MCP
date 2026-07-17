import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerGetObjectTags(server: McpServer): void {
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
}
