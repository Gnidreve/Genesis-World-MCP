import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerSetAlarm(server: McpServer): void {
  server.registerTool(
    "set_alarm",
    {
      title: "Set Own Alarm (genesisWorld)",
      description:
        "Set the current user's alarm/reminder on a data object (e.g. an " +
        "appointment or task). Maps to " +
        "PUT /v7.0/type/{dataObjectType}/{dataObjectGGUID}/alarm/self.",
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
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the data object (path segment)."),
        alarm: z
          .string()
          .optional()
          .describe("Absolute alarm time, ISO 8601 (body field 'alarm')."),
        alarmRelative: z
          .number()
          .optional()
          .describe("Relative alarm offset (body field 'alarmRelative')."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "PUT",
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
            `/${encodeURIComponent(args.dataObjectGGUID)}/alarm/self`,
          {},
          { alarm: args.alarm, alarmRelative: args.alarmRelative }
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "set_alarm",
  mode: "write",
  kind: "atomic",
  ops: ["PUT /v7.0/type/{dataObjectType}/{dataObjectGGUID}/alarm/self"],
  register: registerSetAlarm,
};
