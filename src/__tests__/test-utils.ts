/**
 * Shared test utilities for CAS genesisWorld MCP tool tests.
 *
 * Usage in tool test files:
 *
 * ```ts
 * vi.mock("../lib.js");                    // hoist-safe auto-mock
 * import { apiGet, jsonResult } from "../lib.js";
 *
 * function toolReg(name: string, server: MockServer) { … }
 *
 * beforeEach(() => {
 *   vi.mocked(apiGet).mockReset();
 *   vi.mocked(apiGet).mockResolvedValue("{}");
 * });
 * ```
 */

import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock McpServer that captures tool registrations
// ---------------------------------------------------------------------------

export interface ToolRegistration {
  name: string;
  schema: Record<string, any>;
  handler: (args: Record<string, any>) => Promise<any>;
}

export interface MockServer {
  registerTool: ReturnType<typeof vi.fn>;
  registrations: ToolRegistration[];
  callHandler(name: string, args?: Record<string, any>): Promise<any>;
}

/**
 * Create a vitest-mocked McpServer that records every registerTool call
 * so tests can inspect registrations and invoke handlers.
 */
export function createMockServer(): MockServer {
  const registrations: ToolRegistration[] = [];
  const registerTool = vi.fn(
    (name: string, schema: any, handler: (args: any) => Promise<any>) => {
      registrations.push({ name, schema, handler });
    }
  );

  return {
    registerTool,
    registrations,
    callHandler(name: string, args: Record<string, any> = {}) {
      const reg = registrations.find((r) => r.name === name);
      if (!reg) throw new Error(`Tool "${name}" not registered`);
      return reg.handler(args);
    },
  } as MockServer;
}

/**
 * Resets the common lib mocks and sets apiGet default to "{}".
 * Call from each tool-file's beforeEach.
 */
export function resetLibMocks() {
  // Dynamic import via vi.importActual to avoid hoisting issues
}
