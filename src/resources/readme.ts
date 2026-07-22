/**
 * The `readme` tool + `genesisworld://readme` resource (ROADMAP P1.4).
 *
 * A static orientation document for agents: domain model, navigation
 * patterns, efficiency rules. Served byte-identical as both an MCP
 * resource and a plain tool (for clients without resource support).
 *
 * The content is intentionally immutable for the lifetime of a session —
 * both descriptions say so, so agents read it at most once.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDef } from "../types.js";

export const README_URI = "genesisworld://readme";

export const README_TEXT = `# CAS genesisWorld MCP — Orientation

STATIC DOCUMENT: this content never changes during a session. Read once,
do not re-read.

## What this server is

Access to a CAS genesisWorld CRM via its REST API v7.0. Tools are either
atomic (one API operation) or flows (one tool, several operations bundled
server-side). In read-only mode, mutating tools are not registered — if you
see no create/update/delete tools, that is why, not an error.

## Domain model — the 6 concepts that matter

1. **Data object**: every record (appointment, task, address, …) is a data
   object with a type and a GGUID (globally unique ID). All generic tools
   take \`dataObjectType\` + \`dataObjectGGUID\`.
2. **Types — native vs. custom**: native types ship with genesisWorld
   (ADDRESS, APPOINTMENT, TASK, DOCUMENT, EMAILSTORE, GWOPPORTUNITY, …) and
   may have dedicated tools/flows here. Custom types are customer-created;
   they work exclusively through the generic data-object tools. Discover
   what this installation has via \`list_available_data_object_types\`
   (includes your permissions) and \`get_data_object_types_metadata\`
   (field schemas).
3. **Views**: server-side saved filters/column sets per type, often the
   fastest path to "the records the user actually means" (e.g. a "My open
   tasks" view). \`list_views\` → \`list_data_objects_by_view\`.
4. **Links**: typed relations between objects (e.g. task → address).
   \`list_links\` lists them; \`get_primary_link_parents\` resolves the
   primary parent (e.g. the company an opportunity belongs to).
5. **Dossier**: the full activity file of an object — linked records,
   documents, journal. \`get_dossier\` returns it in one call.
6. **Tags**: user-assigned labels, system-wide (\`list_tags\`) and
   per-object (\`get_object_tags\`).

## Navigation patterns (cheapest path first)

- **"Find X"** → \`smart_search\` (full-text, all types, supports
  object-type narrowing). Then \`get_data_object\` for details.
- **"List my/all Y"** → check \`list_views\` for a matching view first;
  fall back to \`list_data_objects\` with \`search\`/time filters.
- **"Everything about X"** → \`get_dossier\` (one call), not N × \`list_links\`
  + fetches.
- **Unknown installation?** → \`list_available_data_object_types\` once,
  then stop re-discovering.

## Efficiency rules

- Always pass \`fields\` where supported — full records are large.
- Use \`page\` / \`entriesPerPage\` (default page sizes can be big); prefer
  small pages plus \`get_data_object_count\` over fetching everything.
- \`*_full\` variants return every field — use only when you need them.
- Dates/times are ISO 8601; GGUIDs are opaque strings, never guess them.
`;

export function registerReadme(server: McpServer): void {
  server.registerResource(
    "readme",
    README_URI,
    {
      title: "genesisWorld MCP Orientation (static)",
      description:
        "Static orientation document: domain model, navigation patterns, " +
        "efficiency rules. Content never changes during a session — read " +
        "once, do not re-read.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: README_TEXT }],
    })
  );

  server.registerTool(
    "readme",
    {
      title: "Server Orientation (static)",
      description:
        "Returns a static orientation document for this server: domain " +
        "model, navigation patterns, efficiency rules. Content never " +
        "changes during a session — call at most once, do not re-read. " +
        "Identical to the resource genesisworld://readme.",
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {},
    },
    async () => ({ content: [{ type: "text" as const, text: README_TEXT }] })
  );
}

export const tool: ToolDef = {
  name: "readme",
  mode: "read",
  kind: "atomic",
  ops: [],
  register: registerReadme,
};
