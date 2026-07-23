import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerConvertLead(server: McpServer): void {
  server.registerTool(
    "convert_lead",
    {
      title: "Convert Lead (genesisWorld)",
      description:
        "Convert a sales lead (gwsllead) into an opportunity. Maps to " +
        "POST /v7.0/type/gwsllead/{dataObjectGGUID}/convert.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the lead to convert (path segment)."),
        objectType: z.string().optional().describe("Target object type (API param 'object-type')."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "POST",
          `/v7.0/type/gwsllead/${encodeURIComponent(args.dataObjectGGUID)}/convert`,
          { "object-type": args.objectType }
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "convert_lead",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/gwsllead/{dataObjectGGUID}/convert"],
  register: registerConvertLead,
};
