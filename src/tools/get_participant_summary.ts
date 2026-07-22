import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetParticipantSummary(server: McpServer): void {
  server.registerTool(
    "get_participant_summary",
    {
      title: "Get Participant Summary (genesisWorld)",
      description:
        "Compact participant summary of an appointment. Maps to " +
        "GET /v7.0/type/appointment/{dataObjectGuid}/participant/summary.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the appointment (path segment)."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/appointment/${encodeURIComponent(args.dataObjectGGUID)}/participant/summary`,
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
  name: "get_participant_summary",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/appointment/{dataObjectGuid}/participant/summary"],
  register: registerGetParticipantSummary,
};
