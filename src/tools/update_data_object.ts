import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  apiGet,
  apiSend,
  extractEtag,
  formatIfMatch,
  jsonResult,
  errorResult,
} from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerUpdateDataObject(server: McpServer): void {
  server.registerTool(
    "update_data_object",
    {
      title: "Update Data Object (genesisWorld)",
      description:
        "Update fields of an existing genesisWorld data object. Only the " +
        "fields provided are changed. The API enforces optimistic " +
        "concurrency: the PUT must carry the object's current ETag as an " +
        "If-Match header. Pass 'etag' (the ETAG field from a previous " +
        "get_data_object) to save a round trip — otherwise the tool " +
        "fetches it automatically before updating. Maps to " +
        "PUT /v7.0/type/{dataObjectType}/{dataObjectGGUID}.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment), e.g. 'TASK', 'ADDRESS'."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the data object to update (path segment)."),
        fields: z
          .record(z.any())
          .describe(
            "Field values to change, keyed by API field name " +
            "(e.g. {\"STATUS\": 2}). Unlisted fields stay untouched."
          ),
        etag: z
          .string()
          .optional()
          .describe(
            "Current ETag of the object (ETAG field of a fresh " +
            "get_data_object). Auto-fetched when omitted. A stale value " +
            "makes the server reject the update (concurrent change)."
          ),
        tagAsRecentlyUsed: z
          .boolean()
          .optional()
          .describe("Track this update as 'recently used' (default false)."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}`;

        let etag = args.etag;
        if (etag === undefined) {
          try {
            const current = JSON.parse(await apiGet(path, { fields: "ETAG" }));
            etag = extractEtag(current);
          } catch {
            // Auto-fetch failed — attempt the PUT anyway; the server's
            // error response is more informative than failing here.
          }
        }

        const query = { "tag-as-recently-used": args.tagAsRecentlyUsed ?? false };
        const body = { fields: args.fields };
        const text =
          etag !== undefined
            ? await apiSend("PUT", path, query, body, "application/json", {
                "If-Match": formatIfMatch(etag),
              })
            : await apiSend("PUT", path, query, body);
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "update_data_object",
  mode: "write",
  kind: "atomic",
  ops: [
    "GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}",
    "PUT /v7.0/type/{dataObjectType}/{dataObjectGGUID}",
  ],
  register: registerUpdateDataObject,
};
