import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerGetAvailableProducts(server: McpServer): void {
  server.registerTool(
    "get_available_products",
    {
      title: "Get Available Products (genesisWorld)",
      description:
        "Read-only list of available products for an opportunity. " +
        "Supports the 'whereString' parameter for field-level filtering. " +
        "Maps to GET /v7.0/type/gwopportunity/availableproducts.",
      inputSchema: {
        whereString: z
          .string()
          .optional()
          .describe(
            "Field-level filter expression (API param 'where-string')."
          ),
        search: z
          .string()
          .optional()
          .describe(
            "Filters the list for data objects matching the search term."
          ),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated list of fields to return (API param 'fields')."),
        orderBy: z
          .string()
          .optional()
          .describe("Order specification (API param 'order-by')."),
        page: z
          .number()
          .int()
          .optional()
          .describe("Page number. The first page is index 1."),
        entriesPerPage: z
          .number()
          .int()
          .optional()
          .describe("Page size (API param 'entries-per-page')."),
      },
    },
    async (args) => {
      try {
        const path = "/v7.0/type/gwopportunity/availableproducts";
        const text = await apiGet(path, {
          "where-string": args.whereString,
          search: args.search,
          fields: args.fields,
          "order-by": args.orderBy,
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
