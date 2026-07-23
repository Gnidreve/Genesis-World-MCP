import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListDistributionAddresses(server: McpServer): void {
  server.registerTool(
    "list_distribution_addresses",
    {
      title: "List Distribution Addresses (genesisWorld)",
      description:
        "List the addresses on a distribution list. Maps to " +
        "GET /v7.0/type/gwdistribution/{distributionGuid}/address/list.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        distributionGuid: z.string().describe("GGUID of the distribution list (path segment)."),
        whereString: z.string().optional().describe("Field-level filter (API param 'where-string')."),
        fields: z.string().optional().describe("Comma-separated field projection."),
        orderBy: z.string().optional().describe("Sort clause."),
        teamFilter: z.string().optional().describe("Team filter (API param 'team-filter')."),
        page: z.number().optional().describe("Page number."),
        entriesPerPage: z.number().optional().describe("Page size."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/gwdistribution/${encodeURIComponent(args.distributionGuid)}/address/list`,
          {
            "where-string": args.whereString,
            fields: args.fields,
            "order-by": args.orderBy,
            "team-filter": args.teamFilter,
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
  name: "list_distribution_addresses",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/gwdistribution/{distributionGuid}/address/list"],
  register: registerListDistributionAddresses,
};
