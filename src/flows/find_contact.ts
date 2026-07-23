import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, errorResult } from "../lib.js";
import { parseMaybe, flowResult } from "./util.js";
import type { ToolDef } from "../types.js";

export function registerFindContact(server: McpServer): void {
  server.registerTool(
    "find_contact",
    {
      title: "Find Contact (flow)",
      description:
        "Find addresses/contacts by name and/or phone number in one call. " +
        "Runs the full-text smart search (restricted to addresses) and the " +
        "phone-number search in parallel when both inputs are given. " +
        "Bundles GET /v7.0/smartsearch and " +
        "GET /v7.0/type/address/search/phonenumber.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("Full-text query (name, company, …)."),
        phoneNumber: z
          .string()
          .optional()
          .describe("Phone number to search for."),
        defaultCountryCallingCode: z
          .number()
          .optional()
          .describe("Country calling code used to normalize the phone number, e.g. 49."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated field projection for phone-search hits."),
        page: z.number().optional().describe("Page number."),
        entriesPerPage: z
          .number()
          .optional()
          .describe("Page size (default 25)."),
        compact: z
          .boolean()
          .optional()
          .describe("Prune null/empty fields from the result (default true)."),
      },
    },
    async (args) => {
      try {
        const fr = (r: Record<string, unknown>) =>
          flowResult(r, args.compact ?? true);
        if (!args.query && !args.phoneNumber) {
          return errorResult(
            new Error("Provide at least one of 'query' or 'phoneNumber'.")
          );
        }
        const epp = args.entriesPerPage ?? 25;

        const [textText, phoneText] = await Promise.all([
          args.query
            ? apiGet("/v7.0/smartsearch", {
                query: args.query,
                "object-type": "address",
                page: args.page,
                "entries-per-page": epp,
              })
            : Promise.resolve(undefined),
          args.phoneNumber
            ? apiGet("/v7.0/type/address/search/phonenumber", {
                phoneNumber: args.phoneNumber,
                defaultCountryCallingCode: args.defaultCountryCallingCode,
                fields: args.fields,
                page: args.page,
                "entries-per-page": epp,
              })
            : Promise.resolve(undefined),
        ]);

        return fr({
          textHits: textText === undefined ? undefined : parseMaybe(textText),
          phoneHits: phoneText === undefined ? undefined : parseMaybe(phoneText),
        });
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "find_contact",
  mode: "read",
  kind: "flow",
  ops: ["GET /v7.0/smartsearch", "GET /v7.0/type/address/search/phonenumber"],
  register: registerFindContact,
};
