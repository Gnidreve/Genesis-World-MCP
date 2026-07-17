import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerSmartSearch(server: McpServer): void {
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
}
