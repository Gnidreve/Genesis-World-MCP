import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerGetUserSelf(server: McpServer): void {
  server.registerTool(
    "get_user_self",
    {
      title: "Get User Self (genesisWorld)",
      description:
        "Read-only fetch of the authenticated user's own profile and meta " +
        "data. Maps to GET /v7.0/user/self.",
      inputSchema: {
        fields: z
          .string()
          .optional()
          .describe("Comma-separated list of fields to return (API param 'fields')."),
      },
    },
    async (args) => {
      try {
        const path = "/v7.0/user/self";
        const text = await apiGet(path, {
          fields: args.fields,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}
