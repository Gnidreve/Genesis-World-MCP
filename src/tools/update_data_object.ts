import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerUpdateDataObject(server: McpServer): void {
  server.registerTool(
    "update_data_object",
    {
      title: "Update Data Object (genesisWorld)",
      description:
        "Update fields of an existing genesisWorld data object. Only the " +
        "fields provided are changed. Maps to " +
        "PUT /v7.0/type/{dataObjectType}/{dataObjectGGUID}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment), e.g. 'TASK', 'ADDRESS'."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the data object to update (path segment)."),
        fields: z
          .record(z.any())
          .describe(
            "Field values to change, keyed by API field name " +
            "(e.g. {\"STATUS\": 2}). Unlisted fields stay untouched."
          ),
        tagAsRecentlyUsed: z
          .boolean()
          .optional()
          .describe("Track this update as 'recently used' (default false)."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}`;
        const text = await apiSend(
          "PUT",
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
  name: "update_data_object",
  mode: "write",
  kind: "atomic",
  ops: ["PUT /v7.0/type/{dataObjectType}/{dataObjectGGUID}"],
  register: registerUpdateDataObject,
};
