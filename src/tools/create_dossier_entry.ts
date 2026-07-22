import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerCreateDossierEntry(server: McpServer): void {
  server.registerTool(
    "create_dossier_entry",
    {
      title: "Create Dossier Entry (genesisWorld)",
      description:
        "Add another data object to an object's dossier (activity file). " +
        "Maps to POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Type of the dossier owner (path segment)."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the dossier owner (path segment)."),
        entryType: z
          .string()
          .describe("Type of the object to add (API param 'object-type2')."),
        entryGGUID: z
          .string()
          .describe("GGUID of the object to add (API param 'gguid2')."),
        attribute: z
          .string()
          .optional()
          .describe("Optional link attribute (API param 'attribute')."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}/dossier`;
        const text = await apiSend("POST", path, {
          gguid2: args.entryGGUID,
          "object-type2": args.entryType,
          attribute: args.attribute,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "create_dossier_entry",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier"],
  register: registerCreateDossierEntry,
};
