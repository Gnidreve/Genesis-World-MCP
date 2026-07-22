import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, errorResult } from "../lib.js";
import { parseMaybe, flowResult } from "./util.js";
import type { ToolDef } from "../types.js";

export function registerContact360(server: McpServer): void {
  server.registerTool(
    "contact_360",
    {
      title: "Contact 360° (flow)",
      description:
        "The full picture of one address/contact in a single call: the " +
        "record itself, its collection dossier (activity file incl. " +
        "contact persons for companies), tags, and links — fetched in " +
        "parallel. Bundles GET /v7.0/type/address/{gguid}, " +
        ".../collectiondossier/full, .../tags, and .../link/list.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectGGUID: z.string().describe("GGUID of the address."),
        fields: z
          .string()
          .optional()
          .describe("Comma-separated field projection for the address record."),
        dossierObjectTypes: z
          .string()
          .optional()
          .describe(
            "Restrict dossier entries to these object types " +
            "(comma-separated, API param 'object-types')."
          ),
        includeCorporateGroup: z
          .boolean()
          .optional()
          .describe("Include the corporate group in the dossier."),
        dossierEntriesPerPage: z
          .number()
          .optional()
          .describe("Dossier page size (default 25)."),
        includeDossier: z
          .boolean()
          .optional()
          .describe("Include the collection dossier (default true)."),
        includeTags: z
          .boolean()
          .optional()
          .describe("Include tags (default true)."),
        includeLinks: z
          .boolean()
          .optional()
          .describe("Include links (default true)."),
      },
    },
    async (args) => {
      try {
        const base = `/v7.0/type/address/${encodeURIComponent(args.dataObjectGGUID)}`;
        const [addressText, dossierText, tagsText, linksText] = await Promise.all([
          apiGet(base, { fields: args.fields }),
          args.includeDossier === false
            ? Promise.resolve(undefined)
            : apiGet(`${base}/collectiondossier/full`, {
                "object-types": args.dossierObjectTypes,
                "include-corporate-group": args.includeCorporateGroup,
                "entries-per-page": args.dossierEntriesPerPage ?? 25,
              }),
          args.includeTags === false
            ? Promise.resolve(undefined)
            : apiGet(`${base}/tags`, {}),
          args.includeLinks === false
            ? Promise.resolve(undefined)
            : apiGet(`${base}/link/list`, {}),
        ]);

        return flowResult({
          address: parseMaybe(addressText),
          dossier: dossierText === undefined ? undefined : parseMaybe(dossierText),
          tags: tagsText === undefined ? undefined : parseMaybe(tagsText),
          links: linksText === undefined ? undefined : parseMaybe(linksText),
        });
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "contact_360",
  mode: "read",
  kind: "flow",
  ops: [
    "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}",
    "GET /v7.0/type/address/{dataObjectGGUID}/collectiondossier/full",
    "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags",
    "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/list",
  ],
  register: registerContact360,
};
