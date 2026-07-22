import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListViews(server: McpServer): void {
  server.registerTool(
    "list_views",
    {
      title: "List Views (genesisWorld)",
      description:
        "Read-only list of views available for a given data object type. " +
        "Returns view metadata including view IDs that can be used with " +
        "list_data_objects_by_view. Maps to " +
        "GET /v7.0/type/{dataObjectType}/view/list.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe(
            "Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."
          ),
        viewKind: z
          .string()
          .optional()
          .describe(
            "Optional filter for view kind (API param 'view-kind')."
          ),
        includeDisplaySettings: z
          .boolean()
          .optional()
          .describe(
            "Include display mode settings of a view (API param 'include-display-settings')."
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
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}/view/list`;
        const text = await apiGet(path, {
          "view-kind": args.viewKind,
          "include-display-settings": args.includeDisplaySettings,
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
  name: "list_views",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/{dataObjectType}/view/list"],
  register: registerListViews,
};
