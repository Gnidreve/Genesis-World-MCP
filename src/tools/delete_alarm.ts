import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerDeleteAlarm(server: McpServer): void {
  server.registerTool(
    "delete_alarm",
    {
      title: "Delete Own Alarm (genesisWorld)",
      description:
        "Delete the current user's alarm on a data object. Maps to " +
        "DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}/alarm/self.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z.string().describe("Object/table type (path segment)."),
        dataObjectGGUID: z.string().describe("GGUID of the data object (path segment)."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "DELETE",
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
            `/${encodeURIComponent(args.dataObjectGGUID)}/alarm/self`,
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
  name: "delete_alarm",
  mode: "write",
  kind: "atomic",
  ops: ["DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}/alarm/self"],
  register: registerDeleteAlarm,
};
