import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerCheckAppointmentConflicts(server: McpServer): void {
  server.registerTool(
    "check_appointment_conflicts",
    {
      title: "Check Appointment Conflicts (genesisWorld)",
      description:
        "Check for scheduling conflicts of one or more users in a time " +
        "window. Maps to GET /v7.0/type/appointment/conflicts.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        userOids: z
          .array(z.string())
          .describe("User OIDs to check (API param 'user-oids')."),
        intervalStart: z
          .string()
          .describe("Window start, ISO 8601 (API param 'interval-start')."),
        intervalEnd: z
          .string()
          .describe("Window end, ISO 8601 (API param 'interval-end')."),
        excludeGGUID: z
          .string()
          .optional()
          .describe(
            "GGUID of an appointment to exclude from the check (API param " +
            "'gguid') — e.g. the appointment being rescheduled."
          ),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated field projection for conflicting records."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet("/v7.0/type/appointment/conflicts", {
          "user-oids": args.userOids,
          "interval-start": args.intervalStart,
          "interval-end": args.intervalEnd,
          gguid: args.excludeGGUID,
          fields: args.fields,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "check_appointment_conflicts",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/appointment/conflicts"],
  register: registerCheckAppointmentConflicts,
};
