import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListObjectPermissions(server: McpServer): void {
  server.registerTool(
    "list_object_permissions",
    {
      title: "List Object Permissions (genesisWorld)",
      description:
        "List the permissions set on a data object. Maps to " +
        "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/permission/full.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z.string().describe("Object/table type (path segment)."),
        dataObjectGGUID: z.string().describe("GGUID of the data object (path segment)."),
        page: z.number().optional().describe("Page number."),
        entriesPerPage: z.number().optional().describe("Page size."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
            `/${encodeURIComponent(args.dataObjectGGUID)}/permission/full`,
          { page: args.page, "entries-per-page": args.entriesPerPage }
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "list_object_permissions",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/permission/full"],
  register: registerListObjectPermissions,
};
