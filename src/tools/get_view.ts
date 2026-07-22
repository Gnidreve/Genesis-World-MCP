import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGetView(server: McpServer): void {
  server.registerTool(
    "get_view",
    {
      title: "Get View (genesisWorld)",
      description:
        "Read-only details of a specific view, including its configuration " +
        "and filter criteria. Maps to " +
        "GET /v7.0/type/{dataObjectType}/view/{viewID}.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."),
        viewId: z
          .string()
          .describe("View ID (path segment). Use list_views to discover available IDs."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/view/${encodeURIComponent(args.viewId)}`;
        const text = await apiGet(path, {});
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "get_view",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/{dataObjectType}/view/{viewID}"],
  register: registerGetView,
};
