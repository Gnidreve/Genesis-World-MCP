import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListEmailAttachments(server: McpServer): void {
  server.registerTool(
    "list_email_attachments",
    {
      title: "List Email Attachments (genesisWorld)",
      description:
        "List the attachments of an archived email. Maps to " +
        "GET /v7.0/type/emailstore/{dataObjectGGUID}/attachment/list.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the archived email."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/emailstore/${encodeURIComponent(args.dataObjectGGUID)}/attachment/list`,
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
  name: "list_email_attachments",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/emailstore/{dataObjectGGUID}/attachment/list"],
  register: registerListEmailAttachments,
};
