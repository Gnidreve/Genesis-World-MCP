import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListDocumentVersions(server: McpServer): void {
  server.registerTool(
    "list_document_versions",
    {
      title: "List Document Versions (genesisWorld)",
      description:
        "List the file versions of a document. Maps to " +
        "GET /v7.0/type/document/{dataObjectGGUID}/file/version/list.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the document."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/document/${encodeURIComponent(args.dataObjectGGUID)}/file/version/list`,
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
  name: "list_document_versions",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/document/{dataObjectGGUID}/file/version/list"],
  register: registerListDocumentVersions,
};
