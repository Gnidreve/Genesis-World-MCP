import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerFormatPhoneNumber(server: McpServer): void {
  server.registerTool(
    "format_phone_number",
    {
      title: "Format Phone Number (genesisWorld)",
      description:
        "Normalize/format a phone number the way genesisWorld stores it. " +
        "Read-only despite using POST. Maps to " +
        "POST /v7.0/type/address/formatphonenumber.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        phoneNumber: z.string().describe("The phone number to format."),
        countryCode: z
          .string()
          .optional()
          .describe("ISO country code used for normalization, e.g. 'DE'."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend("POST", "/v7.0/type/address/formatphonenumber", {}, {
          phoneNumber: args.phoneNumber,
          countryCode: args.countryCode,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "format_phone_number",
  mode: "read",
  kind: "atomic",
  ops: ["POST /v7.0/type/address/formatphonenumber"],
  register: registerFormatPhoneNumber,
};
