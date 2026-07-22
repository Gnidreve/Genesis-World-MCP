import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerDeleteLink(server: McpServer): void {
  server.registerTool(
    "delete_link",
    {
      title: "Delete Link (genesisWorld)",
      description:
        "Remove a link between two genesisWorld data objects. The objects " +
        "themselves are untouched. Maps to DELETE /v7.0/type/" +
        "{dataObjectType}/{dataObjectGGUID}/link/{objecttype2}/{guid2}/{attribute}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Type of the source object (path segment)."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the source object (path segment)."),
        targetType: z
          .string()
          .describe("Type of the linked target object (path segment)."),
        targetGGUID: z
          .string()
          .describe("GGUID of the linked target object (path segment)."),
        attribute: z
          .string()
          .optional()
          .describe(
            "Link attribute (path segment). Omit to delete the unqualified link."
          ),
      },
    },
    async (args) => {
      try {
        let path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}/link` +
          `/${encodeURIComponent(args.targetType)}` +
          `/${encodeURIComponent(args.targetGGUID)}`;
        if (args.attribute !== undefined) {
          path += `/${encodeURIComponent(args.attribute)}`;
        }
        const text = await apiSend("DELETE", path, {});
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "delete_link",
  mode: "write",
  kind: "atomic",
  ops: [
    "DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/{objecttype2}/{guid2}/{attribute}",
  ],
  register: registerDeleteLink,
};
