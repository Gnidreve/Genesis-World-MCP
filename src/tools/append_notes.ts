import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerAppendNotes(server: McpServer): void {
  server.registerTool(
    "append_notes",
    {
      title: "Append Notes (genesisWorld)",
      description:
        "Append (or prepend) text to a formatted notes field of a data " +
        "object without overwriting the existing content. Maps to " +
        "POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/notes/{fieldName}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment)."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the data object (path segment)."),
        fieldName: z
          .string()
          .describe("Name of the formatted field, typically 'NOTES'."),
        text: z.string().describe("The affix to add."),
        html: z
          .boolean()
          .optional()
          .describe("Treat the affix as text/html instead of text/plain."),
        prepend: z
          .boolean()
          .optional()
          .describe("Prepend instead of append (API param 'prepend')."),
        withTimestamp: z
          .boolean()
          .optional()
          .describe("Let the server add a timestamp line (API param 'with-timestamp')."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}` +
          `/notes/${encodeURIComponent(args.fieldName)}`;
        const text = await apiSend(
          "POST",
          path,
          { prepend: args.prepend, "with-timestamp": args.withTimestamp },
          args.text,
          args.html ? "text/html" : "text/plain"
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "append_notes",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/notes/{fieldName}"],
  register: registerAppendNotes,
};
