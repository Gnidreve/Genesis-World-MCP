import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerCreateLink(server: McpServer): void {
  server.registerTool(
    "create_link",
    {
      title: "Create Link (genesisWorld)",
      description:
        "Link two genesisWorld data objects (e.g. a task to an address). " +
        "Maps to POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link " +
        "with a Link body ({fields: {OBJECTTYPE1, GGUID1, OBJECTTYPE2, " +
        "GGUID2, ATTRIBUTE}}).",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
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
          .describe("Type of the target object (body OBJECTTYPE2)."),
        targetGGUID: z
          .string()
          .describe("GGUID of the target object (body GGUID2)."),
        attribute: z
          .string()
          .optional()
          .describe("Link attribute (body ATTRIBUTE), e.g. 'PRIMARY'. Optional."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}/link`;
        const fields: Record<string, string> = {
          OBJECTTYPE1: args.dataObjectType,
          GGUID1: args.dataObjectGGUID,
          OBJECTTYPE2: args.targetType,
          GGUID2: args.targetGGUID,
        };
        if (args.attribute !== undefined) fields.ATTRIBUTE = args.attribute;
        const text = await apiSend("POST", path, {}, { fields });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "create_link",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link"],
  register: registerCreateLink,
};
