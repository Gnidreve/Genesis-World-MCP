import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSendBinary, capResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerGenerateReport(server: McpServer): void {
  server.registerTool(
    "generate_report",
    {
      title: "Generate Report (genesisWorld)",
      description:
        "Render a report template for one or more data objects and " +
        "return the document as base64. Read-only despite using POST — " +
        "no CRM data is changed. The output format depends on how the " +
        "template is configured server-side and on 'exportOptions', both " +
        "undocumented in the upstream spec (likely CAS genesisWorld's " +
        "report designer, historically Crystal Reports-based, but this " +
        "cannot be confirmed from the API alone) — discover a template's " +
        "GGUID via list_report_templates, and determine valid " +
        "exportOptions values by inspecting genesisWorld's report UI or " +
        "by trial. Maps to " +
        "POST /v7.0/type/report/template/{templateGGUID}.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        templateGGUID: z
          .string()
          .describe("GGUID of the report template (path segment, from list_report_templates)."),
        recordGGUIDs: z
          .array(z.string())
          .describe("GGUIDs of the data objects to include in the report."),
        exportOptions: z
          .string()
          .optional()
          .describe(
            "Export format option — undocumented in the spec, value " +
            "vocabulary unknown. Omit to use the template's default."
          ),
      },
    },
    async (args) => {
      try {
        const result = await apiSendBinary(
          "POST",
          `/v7.0/type/report/template/${encodeURIComponent(args.templateGGUID)}`,
          {},
          { exportOptions: args.exportOptions, records: args.recordGGUIDs }
        );
        const text = JSON.stringify(
          {
            contentType: result.contentType,
            byteLengthDecoded: result.byteLength,
            dataBase64: result.base64,
          },
          null,
          2
        );
        return { content: [{ type: "text" as const, text: capResult(text) }] };
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "generate_report",
  mode: "read",
  kind: "atomic",
  ops: ["POST /v7.0/type/report/template/{templateGGUID}"],
  register: registerGenerateReport,
};
