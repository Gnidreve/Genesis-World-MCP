import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, errorResult } from "../lib.js";
import { parseMaybe, flowResult } from "./util.js";
import type { ToolDef } from "../types.js";

/** Best-effort GGUID extraction from a create-response payload. */
export function extractGGUID(parsed: unknown): string | undefined {
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const obj = parsed as Record<string, any>;
  const candidate =
    obj.fields?.GGUID ?? obj.GGUID ?? obj.gguid ?? obj.id ?? undefined;
  return typeof candidate === "string" && candidate ? candidate : undefined;
}

export function registerCreateTask(server: McpServer): void {
  server.registerTool(
    "create_task",
    {
      title: "Create Task (flow)",
      description:
        "Create a task and optionally link it to another object (e.g. an " +
        "address) in one call. Field names must match the installation's " +
        "task schema — check genesisworld://metadata/task; 'KEYWORD' is the " +
        "subject field. Bundles POST /v7.0/type/task and POST .../link.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        fields: z
          .record(z.any())
          .describe(
            "Field values for the new task, keyed by API field name " +
            "(e.g. {\"KEYWORD\": \"Call customer\"})."
          ),
        linkToType: z
          .string()
          .optional()
          .describe("Type of an object to link the new task to."),
        linkToGGUID: z
          .string()
          .optional()
          .describe("GGUID of the object to link the new task to."),
        linkAttribute: z
          .string()
          .optional()
          .describe("Optional link attribute, e.g. 'PRIMARY'."),
      },
    },
    async (args) => {
      try {
        const createdText = await apiSend(
          "POST",
          "/v7.0/type/task",
          { "tag-as-recently-used": false },
          { fields: args.fields }
        );
        const created = parseMaybe(createdText);

        if (!args.linkToType || !args.linkToGGUID) {
          return flowResult({ task: created });
        }

        const gguid = extractGGUID(created);
        if (!gguid) {
          return flowResult({
            task: created,
            warning:
              "Task created, but no GGUID could be extracted from the " +
              "response — link was NOT created. Link manually via create_link.",
          });
        }

        const linkFields: Record<string, string> = {
          OBJECTTYPE1: "task",
          GGUID1: gguid,
          OBJECTTYPE2: args.linkToType,
          GGUID2: args.linkToGGUID,
        };
        if (args.linkAttribute !== undefined) {
          linkFields.ATTRIBUTE = args.linkAttribute;
        }
        const linkText = await apiSend(
          "POST",
          `/v7.0/type/task/${encodeURIComponent(gguid)}/link`,
          {},
          { fields: linkFields }
        );

        return flowResult({ task: created, link: parseMaybe(linkText) });
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "create_task",
  mode: "write",
  kind: "flow",
  ops: [
    "POST /v7.0/type/{dataObjectType}",
    "POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link",
  ],
  register: registerCreateTask,
};
