import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerSetObjectTags(server: McpServer): void {
  server.registerTool(
    "set_object_tags",
    {
      title: "Set Object Tags (genesisWorld)",
      description:
        "Assign and/or unassign user tags on a single genesisWorld data " +
        "object in one call. Maps to " +
        "POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags/user.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment)."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the data object (path segment)."),
        assign: z
          .array(z.string())
          .optional()
          .describe("Tag names to assign."),
        unassign: z
          .array(z.string())
          .optional()
          .describe("Tag names to unassign."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}/tags/user`;
        const text = await apiSend("POST", path, {}, {
          assign: args.assign ?? [],
          unassign: args.unassign ?? [],
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "set_object_tags",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags/user"],
  register: registerSetObjectTags,
};
