import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListUsers(server: McpServer): void {
  server.registerTool(
    "list_users",
    {
      title: "List Users (genesisWorld)",
      description:
        "Read-only list of all users with optional pagination. Useful to " +
        "resolve PERSONINCHARGE names to user details. Maps to " +
        "GET /v7.0/user/list.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
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
        objectType: z
          .string()
          .optional()
          .describe("Filter by object type (API param 'object-type')."),
        domainGuid: z
          .string()
          .optional()
          .describe("Filter by domain GUID (API param 'domain-guid')."),
        minPermission: z
          .number()
          .int()
          .optional()
          .describe("Minimum permission level (API param 'min-permission')."),
      },
    },
    async (args) => {
      try {
        const path = "/v7.0/user/list";
        const text = await apiGet(path, {
          page: args.page,
          "entries-per-page": args.entriesPerPage,
          "object-type": args.objectType,
          "domain-guid": args.domainGuid,
          "min-permission": args.minPermission,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "list_users",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/user/list"],
  register: registerListUsers,
};
