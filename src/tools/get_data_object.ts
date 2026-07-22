import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetDataObject(server: McpServer): void {
  server.registerTool(
    "get_data_object",
    {
      title: "Get Data Object (genesisWorld)",
      description:
        "Read-only fetch of a single genesisWorld data object by type and " +
        "GGUID. Maps to GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe(
            "Object/table type (path segment), e.g. 'ADDRESS', 'APPOINTMENT', 'OPPORTUNITY'."
          ),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the data object (path segment)."),
        fields: z
          .string()
          .optional()
          .describe(
            "Comma-separated list of fields to return (API param 'fields'). Omit to return the default field set."
          ),
        includePermissions: z
          .boolean()
          .optional()
          .describe("Include object permissions in the response."),
        includeSyncrecordPermissions: z
          .boolean()
          .optional()
          .describe(
            "Include sync-record permissions. Implies includePermissions=true. Only valid if sync is enabled for the type."
          ),
        tagAsRecentlyUsed: z
          .boolean()
          .optional()
          .describe("Track this load as a 'recently used' usage."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}`;
        const text = await apiGet(path, {
          fields: args.fields,
          "include-permissions": args.includePermissions,
          "include-syncrecord-permissions": args.includeSyncrecordPermissions,
          "tag-as-recently-used": args.tagAsRecentlyUsed,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "get_data_object",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}"],
  register: registerGetDataObject,
};
