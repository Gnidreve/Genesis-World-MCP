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

/** Wrap a combined flow result object as an MCP text result. */
export function flowResult(result: Record<string, unknown>) {
  return {
    content: [
      { type: "text" as const, text: capResult(JSON.stringify(result, null, 2)) },
    ],
  };
}
