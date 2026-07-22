/**
 * Cached metadata resources (ROADMAP P1.5).
 *
 * Slow-moving schema/discovery data as MCP resources, so agents don't pay
 * tool calls for it on every session:
 *
 *   genesisworld://types                 → accessible data-object types
 *   genesisworld://metadata/{objectType} → field/relationship schema of one type
 *   genesisworld://views/{objectType}    → saved views of one type
 *
 * Responses are cached in-memory for 15 minutes (see cache.ts). All three
 * are reads and are registered in every launch mode.
 */

import {
  ResourceTemplate,
  type McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../lib.js";
import { cached } from "./cache.js";

export const TYPES_URI = "genesisworld://types";

function markdownlessJson(uri: string, text: string) {
  return { contents: [{ uri, mimeType: "application/json", text }] };
}

export function registerMetadataResources(server: McpServer): void {
  server.registerResource(
    "types",
    TYPES_URI,
    {
      title: "Accessible data-object types",
      description:
        "All data-object types this user may access, with permissions. " +
        "Cached for 15 minutes — read once per session, not per query.",
      mimeType: "application/json",
    },
    async (uri) => {
      const text = await cached(TYPES_URI, () =>
        apiGet("/v7.0/user/self/dataobjecttypepermission/list", {})
      );
      return markdownlessJson(uri.href, text);
    }
  );

  server.registerResource(
    "metadata",
    new ResourceTemplate("genesisworld://metadata/{objectType}", {
      list: undefined,
    }),
    {
      title: "Type metadata (field schema)",
      description:
        "Field and relationship schema of one data-object type, e.g. " +
        "genesisworld://metadata/ADDRESS. Cached for 15 minutes.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const objectType = String(variables.objectType);
      const text = await cached(uri.href, () =>
        apiGet("/v7.0/metadata", { "object-types": [objectType] })
      );
      return markdownlessJson(uri.href, text);
    }
  );

  server.registerResource(
    "views",
    new ResourceTemplate("genesisworld://views/{objectType}", {
      list: undefined,
    }),
    {
      title: "Saved views of a type",
      description:
        "Saved views (server-side filters/column sets) of one data-object " +
        "type, e.g. genesisworld://views/TASK. Cached for 15 minutes.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const objectType = String(variables.objectType);
      const text = await cached(uri.href, () =>
        apiGet(
          `/v7.0/type/${encodeURIComponent(objectType)}/view/list`,
          {}
        )
      );
      return markdownlessJson(uri.href, text);
    }
  );
}
