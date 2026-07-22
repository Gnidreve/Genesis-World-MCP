import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerSetContactPersonsActive(server: McpServer): void {
  server.registerTool(
    "set_contact_persons_active",
    {
      title: "Activate/Deactivate Contact Persons (genesisWorld)",
      description:
        "Activate or deactivate ALL contact persons of a company address. " +
        "Maps to POST /v7.0/type/address/{dataObjectGGUID}/contactperson/" +
        "activate (or .../deactivate).",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the company address."),
        active: z
          .boolean()
          .describe("true = activate all contact persons, false = deactivate."),
      },
    },
    async (args) => {
      try {
        const action = args.active ? "activate" : "deactivate";
        const text = await apiSend(
          "POST",
          `/v7.0/type/address/${encodeURIComponent(args.dataObjectGGUID)}` +
            `/contactperson/${action}`,
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
  name: "set_contact_persons_active",
  mode: "write",
  kind: "atomic",
  ops: [
    "POST /v7.0/type/address/{dataObjectGGUID}/contactperson/activate",
    "POST /v7.0/type/address/{dataObjectGGUID}/contactperson/deactivate",
  ],
  register: registerSetContactPersonsActive,
};
