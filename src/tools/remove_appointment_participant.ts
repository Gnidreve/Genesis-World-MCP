import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerRemoveAppointmentParticipant(server: McpServer): void {
  server.registerTool(
    "remove_appointment_participant",
    {
      title: "Remove Appointment Participant (genesisWorld)",
      description:
        "Remove a participant from an appointment. Maps to DELETE " +
        "/v7.0/type/appointment/{dataObjectGGUID}/participant/{participantGGUID}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the appointment (path segment)."),
        participantGGUID: z.string().describe("GGUID of the participant to remove (path segment)."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "DELETE",
          `/v7.0/type/appointment/${encodeURIComponent(args.dataObjectGGUID)}` +
            `/participant/${encodeURIComponent(args.participantGGUID)}`,
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
  name: "remove_appointment_participant",
  mode: "write",
  kind: "atomic",
  ops: ["DELETE /v7.0/type/appointment/{dataObjectGGUID}/participant/{participantGGUID}"],
  register: registerRemoveAppointmentParticipant,
};
