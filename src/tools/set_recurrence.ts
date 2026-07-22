import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerSetRecurrence(server: McpServer): void {
  server.registerTool(
    "set_recurrence",
    {
      title: "Create/Update Recurrent Event (genesisWorld)",
      description:
        "Create a recurrent event series (omit periodGuid) or update an " +
        "existing one (pass periodGuid). The event body is passed through " +
        "as the API's RecurrentEvent shape: { referencePeriodicEvent, " +
        "exceptionDates, tagsToAssign, tagsToUnassign, linksToAssign, " +
        "linksToUnassign, periodicEventUpdateType }. Maps to " +
        "POST /v7.0/type/{dataObjectType}/recurrence or PUT " +
        ".../recurrence/{periodGuid}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type, e.g. 'appointment'."),
        periodGuid: z
          .string()
          .optional()
          .describe("Existing recurrence period GUID — update instead of create."),
        event: z
          .record(z.any())
          .describe("RecurrentEvent request body (passed through 1:1)."),
      },
    },
    async (args) => {
      try {
        const base = `/v7.0/type/${encodeURIComponent(args.dataObjectType)}/recurrence`;
        const text = args.periodGuid
          ? await apiSend("PUT", `${base}/${encodeURIComponent(args.periodGuid)}`, {}, args.event)
          : await apiSend("POST", base, {}, args.event);
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "set_recurrence",
  mode: "write",
  kind: "atomic",
  ops: [
    "POST /v7.0/type/{dataObjectType}/recurrence",
    "PUT /v7.0/type/{dataObjectType}/recurrence/{periodGuid}",
  ],
  register: registerSetRecurrence,
};
