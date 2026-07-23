import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerAddDistributionAddresses(server: McpServer): void {
  server.registerTool(
    "add_distribution_addresses",
    {
      title: "Add Distribution Addresses (genesisWorld)",
      description:
        "Add one or more addresses to a distribution list. Maps to " +
        "POST /v7.0/type/gwdistribution/{distributionGuid}/address.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        distributionGuid: z.string().describe("GGUID of the distribution list (path segment)."),
        addressGGUIDs: z.array(z.string()).describe("Address GGUIDs to add (request body)."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "POST",
          `/v7.0/type/gwdistribution/${encodeURIComponent(args.distributionGuid)}/address`,
          {},
          args.addressGGUIDs
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "add_distribution_addresses",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/gwdistribution/{distributionGuid}/address"],
  register: registerAddDistributionAddresses,
};
