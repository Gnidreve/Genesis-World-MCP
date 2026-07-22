import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerCreateDataObject(server: McpServer): void {
  server.registerTool(
    "create_data_object",
    {
      title: "Create Data Object (genesisWorld)",
      description:
        "Create a new genesisWorld data object of any type (native or " +
        "custom). Field names must match the type's schema — check " +
        "genesisworld://metadata/{objectType} or " +
        "get_data_object_types_metadata first. Maps to " +
        "POST /v7.0/type/{dataObjectType}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment), e.g. 'TASK', 'ADDRESS'."),
        fields: z
          .record(z.any())
          .describe(
            "Field values for the new object, keyed by API field name " +
            "(e.g. {\"KEYWORD\": \"Follow-up\", \"NOTES\": \"...\"})."
          ),
        tagAsRecentlyUsed: z
          .boolean()
          .optional()
          .describe("Track the new object as 'recently used' (default false)."),
      },
    },
    async (args) => {
      try {
        const path = `/v7.0/type/${encodeURIComponent(args.dataObjectType)}`;
        const text = await apiSend(
          "POST",
          path,
          { "tag-as-recently-used": args.tagAsRecentlyUsed ?? false },
          { fields: args.fields }
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "create_data_object",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/{dataObjectType}"],
  register: registerCreateDataObject,
};
