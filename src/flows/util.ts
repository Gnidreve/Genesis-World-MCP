/**
 * Shared helpers for flow tools (kind: "flow").
 *
 * Flows bundle several upstream calls into one MCP tool call and return a
 * single combined JSON object. Sub-results are embedded as parsed JSON so
 * the caller gets one coherent document instead of stitched raw strings.
 */

/** Parse upstream JSON, falling back to the raw string for non-JSON bodies. */
export function parseMaybe(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

import { capResult } from "../lib.js";

/**
 * Shape-agnostic compaction (ROADMAP P7): recursively drop null/undefined
 * values, empty strings, empty arrays, and empty objects. genesisWorld
 * payloads carry large numbers of null fields; pruning them cuts flow
 * results drastically without any per-type schema knowledge. `false` and
 * `0` are meaningful and always kept.
 */
export function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined);
    return arr.length > 0 ? arr : undefined;
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const p = prune(v);
      if (p !== undefined) out[k] = p;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  if (value === null || value === undefined || value === "") return undefined;
  return value;
}

/**
 * Wrap a combined flow result object as an MCP text result.
 * `compact` (default true) prunes null/empty noise from the payload.
 */
export function flowResult(result: Record<string, unknown>, compact = true) {
  const shaped = compact ? (prune(result) as Record<string, unknown>) ?? {} : result;
  return {
    content: [
      { type: "text" as const, text: capResult(JSON.stringify(shaped, null, 2)) },
    ],
  };
}
