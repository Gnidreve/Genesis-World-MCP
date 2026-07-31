import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListReportTemplates(server: McpServer): void {
  server.registerTool(
    "list_report_templates",
    {
      title: "List Report Templates (genesisWorld)",
      description:
        "List report templates available for a given template type " +
        "(commonly a data-object type, e.g. 'ADDRESS'). Use a returned " +
        "template's GGUID with generate_report. The response shape is " +
        "undocumented in the upstream spec — inspect the result to find " +
        "the template GGUID field. Maps to " +
        "GET /v7.0/type/report/template/{templateType}.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        templateType: z
          .string()
          .describe(
            "Template type (path segment), commonly a data-object type " +
            "like 'ADDRESS' or 'TASK'."
          ),
      },
    },
    async (args) => {
      try {
        const text = await apiGet(
          `/v7.0/type/report/template/${encodeURIComponent(args.templateType)}`,
          {}
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "list_report_templates",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/type/report/template/{templateType}"],
  register: registerListReportTemplates,
};
