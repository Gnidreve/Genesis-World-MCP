import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetDocumentFile(server: McpServer): void {
  server.registerTool(
    "get_document_file",
    {
      title: "Get Document File (genesisWorld)",
      description:
        "Fetch the file content of a document record (optionally a " +
        "specific version). Always requested without acquiring a lock. " +
        "Maps to GET /v7.0/type/document/{dataObjectGGUID}/file.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the document."),
        version: z
          .number()
          .optional()
          .describe("Specific document version (default: latest)."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/document/${encodeURIComponent(args.dataObjectGGUID)}/file`,
          { version: args.version, "read-only": true }
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "get_document_file",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/document/{dataObjectGGUID}/file"],
  register: registerGetDocumentFile,
};
