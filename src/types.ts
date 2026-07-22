/**
 * Shared types for the tool/flow registry.
 *
 * Every tool or flow module exports a `tool: ToolDef` describing itself.
 * `src/registry.ts` collects these and `src/index.ts` registers them,
 * filtered by the launch mode (see AGENTS.md "Operating modes").
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Semantic classification — NOT the HTTP verb. A POST endpoint that only
 * reads (e.g. bulk load, duplicate check) is still `mode: "read"`.
 * In read-only mode (`--read-only` / GENESISWORLD_READ_ONLY=true) only
 * `mode: "read"` tools are registered.
 */
export type ToolMode = "read" | "write";

/** "atomic" = one upstream operation, 1:1. "flow" = composite multi-call. */
export type ToolKind = "atomic" | "flow";

export interface ToolDef {
  /** MCP tool name (snake_case). */
  name: string;
  mode: ToolMode;
  kind: ToolKind;
  /**
   * Upstream operations this tool touches, as "METHOD path" strings matching
   * swagger.json (e.g. "GET /v7.0/type/{dataObjectType}/list").
   * Empty for server-local tools like `readme`.
   */
  ops: string[];
  register: (server: McpServer) => void;
}
