import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, errorResult } from "../lib.js";
import { parseMaybe, flowResult } from "./util.js";
import type { ToolDef } from "../types.js";

export function registerTaskOverview(server: McpServer): void {
  server.registerTool(
    "task_overview",
    {
      title: "Task Overview (flow)",
      description:
        "Everything about one task in a single call: the task itself plus " +
        "its links and tags, fetched in parallel. Bundles " +
        "GET /v7.0/type/task/{gguid}, .../link/list, and .../tags.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the task."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated field projection for the task record."),
        includeLinks: z
          .boolean()
          .optional()
          .describe("Include the task's links (default true)."),
        includeTags: z
          .boolean()
          .optional()
          .describe("Include the task's tags (default true)."),
        compact: z
          .boolean()
          .optional()
          .describe("Prune null/empty fields from the result (default true)."),
      },
    },
    async (args) => {
      try {
        const fr = (r: Record<string, unknown>) =>
          flowResult(r, args.compact ?? true);
        const base = `/v7.0/type/task/${encodeURIComponent(args.dataObjectGGUID)}`;
        const [taskText, linksText, tagsText] = await Promise.all([
          apiGet(base, { fields: args.fields }),
          args.includeLinks === false
            ? Promise.resolve(undefined)
            : apiGet(`${base}/link/list`, {}),
          args.includeTags === false
            ? Promise.resolve(undefined)
            : apiGet(`${base}/tags`, {}),
        ]);

        return fr({
          task: parseMaybe(taskText),
          links: linksText === undefined ? undefined : parseMaybe(linksText),
          tags: tagsText === undefined ? undefined : parseMaybe(tagsText),
        });
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "task_overview",
  mode: "read",
  kind: "flow",
  ops: [
    "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}",
    "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/list",
    "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags",
  ],
  register: registerTaskOverview,
};
