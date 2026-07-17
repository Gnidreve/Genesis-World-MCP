import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, jsonResult, errorResult } from "../lib.js";

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
