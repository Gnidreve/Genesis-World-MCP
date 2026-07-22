/**
 * Tests for the tool registry (P1.1), mode filtering (P1.2),
 * annotations (P1.3), and the readme tool/resource (P1.4).
 */

import { describe, it, expect } from "vitest";
import { REGISTRY, isReadOnly, registerTools } from "./registry.js";
import { README_TEXT, README_URI } from "./resources/readme.js";
import { createMockServer } from "./__tests__/test-utils.js";
import type { ToolDef } from "./types.js";

describe("registry", () => {
  it("contains 21 entries (20 atomic API tools + readme)", () => {
    expect(REGISTRY).toHaveLength(21);
  });

  it("has unique tool names", () => {
    const names = REGISTRY.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every entry declares mode, kind, ops, and a register function", () => {
    for (const t of REGISTRY) {
      expect(["read", "write"]).toContain(t.mode);
      expect(["atomic", "flow"]).toContain(t.kind);
      expect(Array.isArray(t.ops)).toBe(true);
      expect(typeof t.register).toBe("function");
    }
  });

  it("every API-backed entry references swagger-style ops", () => {
    for (const t of REGISTRY) {
      if (t.name === "readme") continue;
      expect(t.ops.length).toBeGreaterThan(0);
      for (const op of t.ops) {
        expect(op).toMatch(/^(GET|POST|PUT|DELETE) \/v7\.0\//);
      }
    }
  });

  it("registers all tools in read-write mode", () => {
    const server = createMockServer();
    const selected = registerTools(server as any, { readOnly: false });
    expect(selected).toHaveLength(REGISTRY.length);
    expect(server.registrations.map((r) => r.name)).toContain("smart_search");
  });

  it("filters mode:write entries in read-only mode", () => {
    const fakeWrite: ToolDef = {
      name: "fake_write",
      mode: "write",
      kind: "atomic",
      ops: ["POST /v7.0/type/{dataObjectType}"],
      register: (s) =>
        (s as any).registerTool("fake_write", {}, async () => ({ content: [] })),
    };
    const testRegistry = [...REGISTRY, fakeWrite];

    const rw = createMockServer();
    registerTools(rw as any, { readOnly: false }, testRegistry);
    expect(rw.registrations.map((r) => r.name)).toContain("fake_write");

    const ro = createMockServer();
    const selected = registerTools(ro as any, { readOnly: true }, testRegistry);
    expect(ro.registrations.map((r) => r.name)).not.toContain("fake_write");
    expect(selected.every((t) => t.mode === "read")).toBe(true);
    expect(selected).toHaveLength(REGISTRY.length);
  });
});

describe("read-only mode resolution (P1.2)", () => {
  it("via --read-only CLI flag", () => {
    expect(isReadOnly(["node", "index.js", "--read-only"], {})).toBe(true);
  });

  it("via GENESISWORLD_READ_ONLY env var (case/whitespace tolerant)", () => {
    expect(isReadOnly([], { GENESISWORLD_READ_ONLY: "true" })).toBe(true);
    expect(isReadOnly([], { GENESISWORLD_READ_ONLY: " True " })).toBe(true);
    expect(isReadOnly([], { GENESISWORLD_READ_ONLY: "false" })).toBe(false);
    expect(isReadOnly([], { GENESISWORLD_READ_ONLY: "" })).toBe(false);
  });

  it("defaults to read-write", () => {
    expect(isReadOnly(["node", "index.js"], {})).toBe(false);
  });
});

describe("annotations (P1.3)", () => {
  it("every registered tool carries readOnlyHint matching its mode", () => {
    const server = createMockServer();
    registerTools(server as any, { readOnly: false });
    for (const reg of server.registrations) {
      const entry = REGISTRY.find((t) => t.name === reg.name)!;
      expect(reg.schema.annotations, reg.name).toBeDefined();
      expect(reg.schema.annotations.readOnlyHint, reg.name).toBe(
        entry.mode === "read"
      );
    }
  });
});

describe("readme (P1.4)", () => {
  it("is marked static / read-once in tool and resource descriptions", () => {
    const server = createMockServer();
    registerTools(server as any, { readOnly: false });
    const tool = server.registrations.find((r) => r.name === "readme")!;
    const resource = server.resources.find((r) => r.uri === README_URI)!;
    for (const desc of [tool.schema.description, resource.config.description]) {
      expect(desc).toMatch(/never changes during a session/);
    }
  });

  it("serves byte-identical content from tool and resource", async () => {
    const server = createMockServer();
    registerTools(server as any, { readOnly: false });
    const toolResult = await server.callHandler("readme");
    const resourceResult = await server.readResource(README_URI);
    expect(toolResult.content[0].text).toBe(README_TEXT);
    expect(resourceResult.contents[0].text).toBe(README_TEXT);
    expect(toolResult.content[0].text).toBe(resourceResult.contents[0].text);
  });
});
