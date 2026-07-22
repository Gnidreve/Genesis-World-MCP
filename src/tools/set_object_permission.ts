import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, jsonResult, errorResult } from "../lib.js";
import type { ToolDef } from "../types.js";

export function registerSetObjectPermission(server: McpServer): void {
  server.registerTool(
    "set_object_permission",
    {
      title: "Set Object Permission (genesisWorld)",
      description:
        "Grant a user/group an access right on a data object. Maps to " +
        "POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/permission.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        dataObjectType: z.string().describe("Object/table type (path segment)."),
        dataObjectGGUID: z.string().describe("GGUID of the data object (path segment)."),
        rightOwnerGGUID: z.string().describe("GGUID of the user/group receiving the right (API param 'right-owner-gguid')."),
        accessRight: z.string().describe("Access right to grant (API param 'access-right')."),
      },
    },
    async (args) => {
      try {
        const text = await apiSend(
          "POST",
          `/v7.0/type/${encodeURIComponent(args.dataObjectType)}` +
            `/${encodeURIComponent(args.dataObjectGGUID)}/permission`,
          { "right-owner-gguid": args.rightOwnerGGUID, "access-right": args.accessRight }
        );
        return jsonResult(text);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "set_object_permission",
  mode: "write",
  kind: "atomic",
  ops: ["POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/permission"],
  register: registerSetObjectPermission,
};
