import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetEmailFile(server: McpServer): void {
  server.registerTool(
    "get_email_file",
    {
      title: "Get Archived Email (genesisWorld)",
      description:
        "Fetch the body of an archived email. Maps to " +
        "GET /v7.0/type/emailstore/{dataObjectGGUID}/file.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the archived email."),
        htmlFilter: z
          .number()
          .optional()
          .describe("HTML filter level (API param 'html-filter')."),
        includeAttachments: z
          .boolean()
          .optional()
          .describe("Include attachments in the response."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/emailstore/${encodeURIComponent(args.dataObjectGGUID)}/file`,
          {
            "html-filter": args.htmlFilter,
            "include-attachments": args.includeAttachments,
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
  name: "get_email_file",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/emailstore/{dataObjectGGUID}/file"],
  register: registerGetEmailFile,
};
