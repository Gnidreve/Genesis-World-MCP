import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerDeleteObjectPermission(server: McpServer): void {
  server.registerTool(
    "delete_object_permission",
    {
      title: "Delete Object Permission (genesisWorld)",
      description:
        "Remove a permission entry from a data object. Maps to DELETE " +
        "/v7.0/type/{dataObjectType}/{dataObjectGGUID}/permission/{permissionGGUID}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z.string().describe("Object/table type (path segment)."),
        dataObjectGGUID: z.string().describe("GGUID of the data object (path segment)."),
        permissionGGUID: z.string().describe("GGUID of the permission entry to remove (path segment)."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "DELETE",
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
            `/${encodeURIComponent(args.dataObjectGGUID)}` +
            `/permission/${encodeURIComponent(args.permissionGGUID)}`,
          {}
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "delete_object_permission",
  mode: "write",
  kind: "atomic",
  ops: ["DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}/permission/{permissionGGUID}"],
  register: registerDeleteObjectPermission,
};
