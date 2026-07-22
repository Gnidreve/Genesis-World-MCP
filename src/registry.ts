/**
 * Central tool registry (ROADMAP P1.1).
 *
 * Every tool/flow module exports a `tool: ToolDef`; this file collects them.
 * `registerTools` is the only place that decides what gets registered —
 * in read-only mode, `mode: "write"` entries are skipped entirely
 * (invisible to the client, not merely rejected).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDef } from "./types.js";

import { tool as smartSearch } from "./tools/smart_search.js";
import { tool as getDataObject } from "./tools/get_data_object.js";
import { tool as getDossier } from "./tools/get_dossier.js";
import { tool as listDataObjects } from "./tools/list_data_objects.js";
import { tool as listViews } from "./tools/list_views.js";
import { tool as listDataObjectsByView } from "./tools/list_data_objects_by_view.js";
import { tool as listAvailableDataObjectTypes } from "./tools/list_available_data_object_types.js";
import { tool as getDataObjectTypesMetadata } from "./tools/get_data_object_types_metadata.js";
import { tool as listLinks } from "./tools/list_links.js";
import { tool as listRecentDataObjects } from "./tools/list_recent_data_objects.js";
import { tool as getAvailableProducts } from "./tools/get_available_products.js";
import { tool as getDataObjectCount } from "./tools/get_data_object_count.js";
import { tool as getPrimaryLinkParents } from "./tools/get_primary_link_parents.js";
import { tool as listUsers } from "./tools/list_users.js";
import { tool as getUserSelf } from "./tools/get_user_self.js";
import { tool as getView } from "./tools/get_view.js";
import { tool as listTags } from "./tools/list_tags.js";
import { tool as getObjectTags } from "./tools/get_object_tags.js";
import { tool as getFullDataObjects } from "./tools/get_full_data_objects.js";
import { tool as listDataObjectsByViewFull } from "./tools/list_data_objects_by_view_full.js";
import { tool as readme } from "./resources/readme.js";

export const REGISTRY: ToolDef[] = [
  readme,
  smartSearch,
  getDataObject,
  getDossier,
  listDataObjects,
  listViews,
  listDataObjectsByView,
  listAvailableDataObjectTypes,
  getDataObjectTypesMetadata,
  listLinks,
  listRecentDataObjects,
  getAvailableProducts,
  getDataObjectCount,
  getPrimaryLinkParents,
  listUsers,
  getUserSelf,
  getView,
  listTags,
  getObjectTags,
  getFullDataObjects,
  listDataObjectsByViewFull,
];

export interface RegisterOptions {
  readOnly: boolean;
}

/** Resolve read-only mode from CLI flag `--read-only` or GENESISWORLD_READ_ONLY=true. */
export function isReadOnly(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return (
    argv.includes("--read-only") ||
    (env.GENESISWORLD_READ_ONLY ?? "").trim().toLowerCase() === "true"
  );
}

/** Register all tools allowed by the launch mode; returns what was registered. */
export function registerTools(
  server: McpServer,
  opts: RegisterOptions,
  registry: ToolDef[] = REGISTRY
): ToolDef[] {
  const selected = registry.filter((t) => !opts.readOnly || t.mode === "read");
  for (const t of selected) t.register(server);
  return selected;
}
