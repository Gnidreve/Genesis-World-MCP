import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerListLinks(server: McpServer): void {
  server.registerTool(
    "list_links",
    {
      title: "List Links (genesisWorld)",
      description:
        "Read-only fetch of all links (relationships) for a data object. " +
        "Filters by object-type, gguid, attribute, and link-direction. " +
        "Maps to GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/list.",
      inputSchema: {
        dataObjectType: z
          .string()
          .describe("Object/table type (path segment), e.g. 'ADDRESS', 'GWOPPORTUNITY'."),
        dataObjectGGUID: z
          .string()
          .describe("GGUID of the data object (path segment)."),
        objectType: z
          .string()
          .optional()
          .describe("Filters links by object type (API param 'object-type')."),
        gguid: z
          .string()
          .optional()
          .describe("Filters links by data object GUID (API param 'gguid')."),
        attribute: z
          .string()
          .optional()
          .describe("Filters links by link attribute (API param 'attribute')."),
        linkDirection: z
          .string()
          .optional()
          .describe("Filters links by link direction (API param 'link-direction')."),
      },
    },
    async (args) => {
      try {
        const path =
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
          `/${encodeURIComponent(args.dataObjectGGUID)}/link/list`;
        const text = await apiGet(path, {
          "object-type": args.objectType,
          gguid: args.gguid,
          attribute: args.attribute,
          "link-direction": args.linkDirection,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}
