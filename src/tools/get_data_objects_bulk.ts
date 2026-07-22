import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetDataObjectsBulk(server: McpServer): void {
  server.registerTool(
    "get_data_objects_bulk",
    {
      title: "Get Data Objects Bulk (genesisWorld)",
      description:
        "Load multiple data objects of one type by a list of GGUIDs in a " +
        "single call — cheaper than N × get_data_object. Read-only despite " +
        "using POST. Maps to POST /v7.0/type/{dataObjectType}/records.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment)."),
        gguids: z
          .array(z.string())
          .describe("GGUIDs of the objects to load (request body)."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated list of fields to return (API param 'fields')."),
        includePermissions: z
          .boolean()
          .optional()
          .describe("Include object permissions in the response."),
        includeSyncrecordPermissions: z
          .boolean()
          .optional()
          .describe("Include sync-record permissions (implies includePermissions)."),
      },
    },
    async (args) => {
      try {
        const path = `/v7.0/type/${encodeURIComponent(args.dataObjectType)}/records`;
        const text = await apiSend(
          "POST",
          path,
          {
            fields: args.fields,
            "include-permissions": args.includePermissions,
            "include-syncrecord-permissions": args.includeSyncrecordPermissions,
          },
          args.gguids
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "get_data_objects_bulk",
  mode: "read",
  kind: "atomic",
  ops: ["POST /v7.0/type/{dataObjectType}/records"],
  register: registerGetDataObjectsBulk,
};
