import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiSend, errorResult } from "../lib.js";
import { parseMaybe, flowResult } from "./util.js";
import type { ToolDef } from "../types.js";

/**
 * Conservative duplicate detection over an unknown response shape:
 * a JSON array counts as hits when non-empty; an object counts as hits
 * when any of its array-valued properties is non-empty. Anything
 * unparseable counts as "unknown" (treated like hits — don't create).
 */
export function looksLikeHits(parsed: unknown): boolean | "unknown" {
  if (Array.isArray(parsed)) return parsed.length > 0;
  if (typeof parsed === "object" && parsed !== null) {
    const arrays = Object.values(parsed).filter(Array.isArray);
    if (arrays.length > 0) return arrays.some((a) => a.length > 0);
    return Object.keys(parsed).length > 0;
  }
  return "unknown";
}

export function registerCreateAddressSafe(server: McpServer): void {
  server.registerTool(
    "create_address_safe",
    {
      title: "Create Address — duplicate-safe (flow)",
      description:
        "Create an address only after a duplicate check: runs " +
        "POST /v7.0/type/address/duplicates first and, if candidates are " +
        "found, returns them WITHOUT creating. Pass force=true to create " +
        "anyway. Field names must match the installation's address schema " +
        "(genesisworld://metadata/address).",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        fields: z
          .record(z.any())
          .describe(
            "Field values for the new address, keyed by API field name."
          ),
        force: z
          .boolean()
          .optional()
          .describe("Create even when duplicate candidates are found."),
        tagAsRecentlyUsed: z
          .boolean()
          .optional()
          .describe("Track the new address as 'recently used' (default false)."),
      },
    },
    async (args) => {
      try {
        const dupText = await apiSend(
          "POST",
          "/v7.0/type/address/duplicates",
          {},
          { fields: args.fields }
        );
        const duplicates = parseMaybe(dupText);
        const hits = looksLikeHits(duplicates);

        if (hits !== false && !args.force) {
          return flowResult({
            created: false,
            reason:
              hits === "unknown"
                ? "Duplicate check response was not interpretable — address NOT created. Inspect 'duplicates' and retry with force=true to create anyway."
                : "Possible duplicates found — address NOT created. Inspect 'duplicates' and retry with force=true to create anyway.",
            duplicates,
          });
        }

        const createdText = await apiSend(
          "POST",
          "/v7.0/type/address",
          { "tag-as-recently-used": args.tagAsRecentlyUsed ?? false },
          { fields: args.fields }
        );

        return flowResult({
          created: true,
          address: parseMaybe(createdText),
          duplicates,
        });
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}

export const tool: ToolDef = {
  name: "create_address_safe",
  mode: "write",
  kind: "flow",
  ops: ["POST /v7.0/type/address/duplicates", "POST /v7.0/type/{dataObjectType}"],
  register: registerCreateAddressSafe,
};
