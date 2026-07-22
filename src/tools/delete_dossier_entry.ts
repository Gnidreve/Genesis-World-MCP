import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerDeleteDossierEntry(server: McpServer): void {
  server.registerTool(
    "delete_dossier_entry",
    {
      title: "Delete Dossier Entry (genesisWorld)",
      description:
        "Remove an entry from an object's dossier (the referenced object " +
        "itself is untouched). Maps to DELETE /v7.0/type/{dataObjectType}/" +
        "{dataObjectGGUID}/dossier/{dossierEntryGGUID}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Type of the dossier owner (path segment)."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the dossier owner (path segment)."),
        dossierEntryGGUID: z
          .string()
          .describe("GGUID of the dossier entry to remove (path segment)."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}` +
          `/dossier/${encodeURIComponent(args.dossierEntryGGUID)}`;
        const text = await apiSend("DELETE", path, {});
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "delete_dossier_entry",
  mode: "write",
  kind: "atomic",
  ops: [
    "DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier/{dossierEntryGGUID}",
  ],
  register: registerDeleteDossierEntry,
};
