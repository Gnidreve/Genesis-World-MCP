import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListAppointmentParticipants(server: McpServer): void {
  server.registerTool(
    "list_appointment_participants",
    {
      title: "List Appointment Participants (genesisWorld)",
      description:
        "Full participant list of an appointment. Maps to " +
        "GET /v7.0/type/appointment/{dataObjectGGUID}/participant/full.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the appointment (path segment)."),
        domainGuid: z.string().optional().describe("Filter by domain (API param 'domain-guid')."),
        page: z.number().optional().describe("Page number."),
        entriesPerPage: z.number().optional().describe("Page size."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/appointment/${encodeURIComponent(args.dataObjectGGUID)}/participant/full`,
          {
            "domain-guid": args.domainGuid,
            page: args.page,
            "entries-per-page": args.entriesPerPage,
          }
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "list_appointment_participants",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/appointment/{dataObjectGGUID}/participant/full"],
  register: registerListAppointmentParticipants,
};
