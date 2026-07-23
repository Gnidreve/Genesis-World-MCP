import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerRecalculateOpportunityPositions(server: McpServer): void {
  server.registerTool(
    "recalculate_opportunity_positions",
    {
      title: "Recalculate Opportunity Positions (genesisWorld)",
      description:
        "Recalculate opportunity position values after a field change. " +
        "The body is the OpportunityContainer shape: " +
        "{ changedFieldName, newfieldValue, positions, addressGuid?, " +
        "opportunityCurrency?, considerRepricingOnQuantityChange? }. Maps to " +
        "PUT /v7.0/type/gwopportunitypos/recalculatevalues.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        container: z.record(z.any()).describe("OpportunityContainer request body (passed through 1:1; requires changedFieldName, newfieldValue, positions)."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "PUT",
          "/v7.0/type/gwopportunitypos/recalculatevalues",
          {},
          args.container
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "recalculate_opportunity_positions",
  mode: "write",
  kind: "atomic",
  ops: ["PUT /v7.0/type/gwopportunitypos/recalculatevalues"],
  register: registerRecalculateOpportunityPositions,
};
