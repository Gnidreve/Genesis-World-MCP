import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetTicketServiceAgreements(server: McpServer): void {
  server.registerTool(
    "get_ticket_service_agreements",
    {
      title: "Get Ticket Service Agreements (genesisWorld)",
      description:
        "List service agreements for tickets (task/ticket extension of " +
        "genesisWorld Helpdesk). Maps to " +
        "GET /v7.0/type/task/ticket/serviceagreements.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        search: z.string().optional().describe("Full-text filter."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated field projection."),
        orderBy: z.string().optional().describe("Sort clause."),
        teamFilter: z
          .string()
          .optional()
          .describe("Team filter (API param 'team-filter')."),
        submitterGGUID: z
          .string()
          .optional()
          .describe("Filter by submitter (API param 'submitter-gguid')."),
        customerGGUID: z
          .string()
          .optional()
          .describe("Filter by customer (API param 'customer-gguid')."),
        page: z.number().optional().describe("Page number."),
        entriesPerPage: z.number().optional().describe("Page size."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet("/v7.0/type/task/ticket/serviceagreements", {
          search: args.search,
          fields: args.fields,
          "order-by": args.orderBy,
          "team-filter": args.teamFilter,
          "submitter-gguid": args.submitterGGUID,
          "customer-gguid": args.customerGGUID,
          page: args.page,
          "entries-per-page": args.entriesPerPage,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "get_ticket_service_agreements",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/task/ticket/serviceagreements"],
  register: registerGetTicketServiceAgreements,
};
