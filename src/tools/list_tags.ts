import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerListTags(server: McpServer): void {
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
}
