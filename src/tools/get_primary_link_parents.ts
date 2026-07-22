import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetPrimaryLinkParents(server: McpServer): void {
  server.registerTool(
    "get_primary_link_parents",
    {
      title: "Get Primary Link Parents (genesisWorld)",
      description:
        "Read-only fetch of primary linked parent objects for a data " +
        "object. For example, which ADDRESS is the primary account for an " +
        "opportunity. Maps to " +
        "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/primarylinkparents.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment), e.g. 'GWOPPORTUNITY', 'TASK'."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the data object (path segment)."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}/primarylinkparents`;
        const text = await apiGet(path, {});
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "get_primary_link_parents",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/primarylinkparents"],
  register: registerGetPrimaryLinkParents,
};
