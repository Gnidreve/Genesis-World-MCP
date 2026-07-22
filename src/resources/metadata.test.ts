/**
 * Tests for the cached metadata resources (P1.5) and the TTL cache.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, apiGet: vi.fn() };
});

import { apiGet } from "../lib.js";
import { registerMetadataResources, TYPES_URI } from "./metadata.js";
import { cached, clearCache, DEFAULT_TTL_MS } from "./cache.js";
import { createMockServer } from "../__tests__/test-utils.js";
import type { MockServer } from "../__tests__/test-utils.js";

describe("ttl cache", () => {
  beforeEach(() => clearCache());

  it("computes once within the TTL and again after expiry", async () => {
    let t = 0;
    const now = () => t;
    const fn = vi.fn(async () => "value");
    await cached("k", fn, 1000, now);
    await cached("k", fn, 1000, now);
    expect(fn).toHaveBeenCalledTimes(1);
    t = 1001;
    await cached("k", fn, 1000, now);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("has a 15-minute default TTL", () => {
    expect(DEFAULT_TTL_MS).toBe(15 * 60 * 1000);
  });
});

describe("metadata resources", () => {
  let server: MockServer;

  beforeEach(() => {
    clearCache();
    vi.mocked(apiGet).mockReset();
    vi.mocked(apiGet).mockResolvedValue("{}");
    server = createMockServer();
    registerMetadataResources(server as any);
  });

  it("registers types, metadata, and views resources", () => {
    expect(server.resources.map((r) => r.name).sort()).toEqual([
      "metadata",
      "types",
      "views",
    ]);
  });

  it("types resource hits the permission-list endpoint and caches", async () => {
    const res = server.resources.find((r) => r.name === "types")!;
    await res.readCallback(new URL(TYPES_URI));
    await res.readCallback(new URL(TYPES_URI));
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith(
      "/v7.0/user/self/dataobjecttypepermission/list",
      {}
    );
  });

  it("metadata template maps objectType to the metadata endpoint", async () => {
    const res = server.resources.find((r) => r.name === "metadata")!;
    const out = await res.readCallback(
      new URL("genesisworld://metadata/ADDRESS"),
      { objectType: "ADDRESS" }
    );
    expect(apiGet).toHaveBeenCalledWith("/v7.0/metadata", {
      "object-types": ["ADDRESS"],
    });
    expect(out.contents[0].mimeType).toBe("application/json");
  });

  it("views template maps objectType into the path (encoded)", async () => {
    const res = server.resources.find((r) => r.name === "views")!;
    await res.readCallback(new URL("genesisworld://views/MY%20TYPE"), {
      objectType: "MY TYPE",
    });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/MY%20TYPE/view/list", {});
  });

  it("caches per URI, not globally", async () => {
    const res = server.resources.find((r) => r.name === "views")!;
    await res.readCallback(new URL("genesisworld://views/TASK"), {
      objectType: "TASK",
    });
    await res.readCallback(new URL("genesisworld://views/ADDRESS"), {
      objectType: "ADDRESS",
    });
    await res.readCallback(new URL("genesisworld://views/TASK"), {
      objectType: "TASK",
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});
