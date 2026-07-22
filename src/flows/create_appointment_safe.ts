import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, apiSend, errorResult } from "../lib.js";
import { parseMaybe, flowResult } from "./util.js";
import { extractGGUID } from "./create_task.js";
import { looksLikeHits } from "./create_address_safe.js";
import type { ToolDef } from "../types.js";

export function registerCreateAppointmentSafe(server: McpServer): void {
  server.registerTool(
    "create_appointment_safe",
    {
      title: "Create Appointment — conflict-safe (flow)",
      description:
        "Create an appointment with an optional conflict check first and " +
        "optional participants after: when userOids + interval are given, " +
        "GET /v7.0/type/appointment/conflicts runs first — conflicts are " +
        "returned WITHOUT creating (force=true overrides). Then " +
        "POST /v7.0/type/appointment, then one POST per participant. " +
        "Field names must match the installation's appointment schema " +
        "(genesisworld://metadata/appointment).",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        fields: z
          .record(z.any())
          .describe("Field values for the new appointment, keyed by API field name."),
        userOids: z
          .array(z.string())
          .optional()
          .describe("User OIDs for the conflict check (skipped when omitted)."),
        intervalStart: z
          .string()
          .optional()
          .describe("Conflict-check window start, ISO 8601 (required with userOids)."),
        intervalEnd: z
          .string()
          .optional()
          .describe("Conflict-check window end, ISO 8601 (required with userOids)."),
        force: z
          .boolean()
          .optional()
          .describe("Create even when conflicts are found."),
        participantGGUIDs: z
          .array(z.string())
          .optional()
          .describe("Participants to add after creation."),
      },
    },
    async (args) => {
      try {
        let conflicts: unknown;
        if (args.userOids && args.userOids.length > 0) {
          if (!args.intervalStart || !args.intervalEnd) {
            return errorResult(
              new Error("intervalStart and intervalEnd are required for the conflict check.")
            );
          }
          const conflictText = await apiGet("/v7.0/type/appointment/conflicts", {
            "user-oids": args.userOids,
            "interval-start": args.intervalStart,
            "interval-end": args.intervalEnd,
          });
          conflicts = parseMaybe(conflictText);
          if (looksLikeHits(conflicts) !== false && !args.force) {
            return flowResult({
              created: false,
              reason:
                "Scheduling conflicts found — appointment NOT created. " +
                "Inspect 'conflicts' and retry with force=true to create anyway.",
              conflicts,
            });
          }
        }

        const createdText = await apiSend(
          "POST",
          "/v7.0/type/appointment",
          { "tag-as-recently-used": false },
          { fields: args.fields }
        );
        const created = parseMaybe(createdText);

        if (!args.participantGGUIDs || args.participantGGUIDs.length === 0) {
          return flowResult({ created: true, appointment: created, conflicts });
        }

        const gguid = extractGGUID(created);
        if (!gguid) {
          return flowResult({
            created: true,
            appointment: created,
            conflicts,
            warning:
              "Appointment created, but no GGUID could be extracted from the " +
              "response — participants were NOT added. Add them via " +
              "add_appointment_participant.",
          });
        }

        const participants: Record<string, unknown> = {};
        for (const pg of args.participantGGUIDs) {
          const pText = await apiSend(
            "POST",
            `/v7.0/type/appointment/${encodeURIComponent(gguid)}/participant`,
            { gguid: pg }
          );
          participants[pg] = parseMaybe(pText);
        }

        return flowResult({ created: true, appointment: created, conflicts, participants });
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "create_appointment_safe",
  mode: "write",
  kind: "flow",
  ops: [
    "GET /v7.0/type/appointment/conflicts",
    "POST /v7.0/type/{dataObjectType}",
    "POST /v7.0/type/appointment/{dataObjectGGUID}/participant",
  ],
  register: registerCreateAppointmentSafe,
};
