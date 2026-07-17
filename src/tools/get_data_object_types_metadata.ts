import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

export function registerGetDataObjectTypesMetadata(server: McpServer): void {
  server.registerTool(
    "get_data_object_types_metadata",
    {
      title: "Get Data Object Types Metadata (genesisWorld)",
      description:
        "Read-only description and field schema for data object types, in a " +
        "single call. Useful to discover which fields a type exposes (e.g. to " +
        "fill the 'fields' argument of get_data_object). Maps to GET /v7.0/metadata.",
      inputSchema: {
        objectTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Restrict to these object types (API param 'object-types', sent as repeated query params). Omit to get metadata for all types."
          ),
        includeSemantics: z
          .boolean()
          .optional()
          .describe("Include semantic information (API param 'include-semantics')."),
      },
    },
    async (args) => {
      try {
        const text = await apiGet("/v7.0/metadata", {
          "object-types": args.objectTypes,
          "include-semantics": args.includeSemantics,
        });
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}
