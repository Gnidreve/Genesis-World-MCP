import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerRestoreDataObject(server: McpServer): void {
  server.registerTool(
    "restore_data_object",
    {
      title: "Restore Data Object (genesisWorld)",
      description:
        "Restore deleted data objects of one type from the recycle bin " +
        "(undoes delete_data_object). Maps to " +
        "POST /v7.0/type/{dataObjectType}/rbin/undelete.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment)."),
        gguids: z
          .array(z.string())
          .describe("GGUIDs of the recycled objects to restore (request body)."),
      },
    },
    async (args) => {
      try {
        const path = `/v7.0/type/${encodeURIComponent(args.dataObjectType)}/rbin/undelete`;
        const text = await apiSend("POST", path, {}, args.gguids);
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "restore_data_object",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/{dataObjectType}/rbin/undelete"],
  register: registerRestoreDataObject,
};
