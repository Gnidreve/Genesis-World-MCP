import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, errorResult } from "../lib.js";
import { parseMaybe, flowResult } from "./util.js";
import type { ToolDef } from "../types.js";

export function registerMyOpenTasks(server: McpServer): void {
  server.registerTool(
    "my_open_tasks",
    {
      title: "My Open Tasks (flow)",
      description:
        "One call instead of several: resolves the current user and lists " +
        "their accessible tasks, optionally restricted to a due window or " +
        "a saved view. For true open-only filtering, pass a task view " +
        "(discover via genesisworld://views/task) — views can carry " +
        "whereString filters. Bundles GET /v7.0/user/self with " +
        "GET /v7.0/type/task/list (or .../view/{viewId}/list).",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dueWithinDays: z
          .number()
          .optional()
          .describe(
            "Only tasks whose interval ends within the next N days " +
            "(sets 'interval-end'; overdue tasks stay included)."
          ),
        viewId: z
          .string()
          .optional()
          .describe("Query this saved task view instead of the plain list."),
        whereString: z
          .string()
          .optional()
          .describe("Field-level filter — only valid together with viewId."),
        search: z.string().optional().describe("Full-text filter."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated field projection for the task list."),
        orderBy: z
          .string()
          .optional()
          .describe("Sort clause, e.g. 'KEYWORD ASC'."),
        page: z.number().optional().describe("Page number (default 1)."),
        entriesPerPage: z
          .number()
          .optional()
          .describe("Page size (default 25)."),
        includeUser: z
          .boolean()
          .optional()
          .describe("Include the resolved user profile (default true)."),
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
        const intervalEnd =
          args.dueWithinDays !== undefined
            ? new Date(Date.now() + args.dueWithinDays * 86_400_000).toISOString()
            : undefined;

        const taskParams = {
          "where-string": args.whereString,
          search: args.search,
          fields: args.fields,
          "order-by": args.orderBy,
          "interval-end": intervalEnd,
          page: args.page,
          "entries-per-page": args.entriesPerPage ?? 25,
        };
        const taskPath = args.viewId
          ? `/v7.0/type/task/view/${encodeURIComponent(args.viewId)}/list`
          : "/v7.0/type/task/list";

        const [userText, tasksText] = await Promise.all([
          args.includeUser === false ? Promise.resolve(undefined) : apiGet("/v7.0/user/self", {}),
          apiGet(taskPath, taskParams),
        ]);

        return fr({
          user: userText === undefined ? undefined : parseMaybe(userText),
          tasks: parseMaybe(tasksText),
        });
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "my_open_tasks",
  mode: "read",
  kind: "flow",
  ops: [
    "GET /v7.0/user/self",
    "GET /v7.0/type/task/list",
    "GET /v7.0/type/task/view/{viewID}/list",
  ],
  register: registerMyOpenTasks,
};
