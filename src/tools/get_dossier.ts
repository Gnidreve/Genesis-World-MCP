import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerGetDossier(server: McpServer): void {
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
}
