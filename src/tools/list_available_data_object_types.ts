import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerListAvailableDataObjectTypes(server: McpServer): void {
  server.registerTool(
    "list_available_data_object_types",
    {
      title: "List Available Data Object Types (genesisWorld)",
      description:
        "Read-only list of the data object types the authenticated user is " +
        "permitted to access, together with their permissions. Use this to " +
        "discover valid values for the 'dataObjectType' / 'object-type(s)' " +
        "arguments of the other tools. Maps to " +
        "GET /v7.0/user/self/dataobjecttypepermission/list. Takes no parameters.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {},
    },
    async () => {
      try {
        const text = await apiGet(
          "/v7.0/user/self/dataobjecttypepermission/list",
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
  name: "list_available_data_object_types",
  mode: "read",
  kind: "atomic",
  ops: ["GET /v7.0/user/self/dataobjecttypepermission/list"],
  register: registerListAvailableDataObjectTypes,
};
