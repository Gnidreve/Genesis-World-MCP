import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerRemoveDistributionAddress(server: McpServer): void {
  server.registerTool(
    "remove_distribution_address",
    {
      title: "Remove Distribution Address (genesisWorld)",
      description:
        "Remove an address from a distribution list (the address itself " +
        "is untouched). Maps to DELETE " +
        "/v7.0/type/gwdistribution/{distributionGuid}/address/{addressGGUID}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        distributionGuid: z.string().describe("GGUID of the distribution list (path segment)."),
        addressGGUID: z.string().describe("GGUID of the address to remove (path segment)."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "DELETE",
          `/v7.0/type/gwdistribution/${encodeURIComponent(args.distributionGuid)}` +
            `/address/${encodeURIComponent(args.addressGGUID)}`,
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
  name: "remove_distribution_address",
  mode: "write",
  kind: "atomic",
  ops: ["DELETE /v7.0/type/gwdistribution/{distributionGuid}/address/{addressGGUID}"],
  register: registerRemoveDistributionAddress,
};
