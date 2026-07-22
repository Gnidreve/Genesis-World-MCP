import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerDeleteDataObject(server: McpServer): void {
  server.registerTool(
    "delete_data_object",
    {
      title: "Delete Data Object (genesisWorld)",
      description:
        "Delete a genesisWorld data object (moves it to the recycle bin; " +
        "restore_data_object can undo). Maps to " +
        "DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment), e.g. 'TASK', 'ADDRESS'."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the data object to delete (path segment)."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}`;
        const text = await apiSend("DELETE", path, {});
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "delete_data_object",
  mode: "write",
  kind: "atomic",
  ops: ["DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}"],
  register: registerDeleteDataObject,
};
