import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerDeleteRecurrence(server: McpServer): void {
  server.registerTool(
    "delete_recurrence",
    {
      title: "Delete Recurrent Event (genesisWorld)",
      description:
        "Delete a recurrent event series period. Maps to " +
        "DELETE /v7.0/type/{dataObjectType}/recurrence/{periodGuid}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z.string().describe("Object/table type, e.g. 'appointment'."),
        periodGuid: z.string().describe("GUID of the recurrence period (path segment)."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "DELETE",
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
            `/recurrence/${encodeURIComponent(args.periodGuid)}`,
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
  name: "delete_recurrence",
  mode: "write",
  kind: "atomic",
  ops: ["DELETE /v7.0/type/{dataObjectType}/recurrence/{periodGuid}"],
  register: registerDeleteRecurrence,
};
