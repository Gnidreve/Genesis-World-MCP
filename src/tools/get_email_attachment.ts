import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetEmailAttachment(server: McpServer): void {
  server.registerTool(
    "get_email_attachment",
    {
      title: "Get Email Attachment (genesisWorld)",
      description:
        "Fetch one attachment of an archived email. Maps to " +
        "GET /v7.0/type/emailstore/{dataObjectGGUID}/attachment/{attachmentId}.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the archived email."),
        attachmentId: z.string().describe("ID of the attachment (path segment)."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/emailstore/${encodeURIComponent(args.dataObjectGGUID)}` +
            `/attachment/${encodeURIComponent(args.attachmentId)}`,
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
  name: "get_email_attachment",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/emailstore/{dataObjectGGUID}/attachment/{attachmentId}"],
  register: registerGetEmailAttachment,
};
