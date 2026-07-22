import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerAddAppointmentParticipant(server: McpServer): void {
  server.registerTool(
    "add_appointment_participant",
    {
      title: "Add Appointment Participant (genesisWorld)",
      description:
        "Add a participant (user/address GGUID) to an appointment. Maps to " +
        "POST /v7.0/type/appointment/{dataObjectGGUID}/participant.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the appointment (path segment)."),
        participantGGUID: z.string().describe("GGUID of the participant to add (API param 'gguid')."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "POST",
          `/v7.0/type/appointment/${encodeURIComponent(args.dataObjectGGUID)}/participant`,
          { gguid: args.participantGGUID }
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "add_appointment_participant",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/appointment/{dataObjectGGUID}/participant"],
  register: registerAddAppointmentParticipant,
};
