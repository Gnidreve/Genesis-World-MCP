/**
 * ETag / If-Match behavior of update_data_object (optimistic concurrency).
 *
 * Live genesisWorld installations reject PUT updates without a valid
 * If-Match header (HTTP 400 ILLEGAL_ARGUMENT_VALUE) — undocumented in
 * swagger.json. The tool must send the object's ETag, auto-fetching it
 * when the caller doesn't provide one.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, apiGet: vi.fn(), apiSend: vi.fn() };
});

import { apiGet, apiSend, formatIfMatch, extractEtag } from "../lib.js";
import { registerUpdateDataObject } from "./update_data_object.js";
import { createMockServer } from "../__tests__/test-utils.js";
import type { MockServer } from "../__tests__/test-utils.js";

const ETAG = "MTc4NDc2MjgwNTtMaW51cyBFdmVyZGluZw==";

describe("update_data_object ETag handling", () => {
  let server: MockServer;

  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
    vi.mocked(apiSend).mockReset();
    vi.mocked(apiSend).mockResolvedValue("{}");
    server = createMockServer();
    registerUpdateDataObject(server as any);
  });

  it("uses a caller-provided etag without an extra GET", async () => {
    await server.callHandler("update_data_object", {
      dataObjectType: "APPOINTMENT",
      dataObjectGGUID: "app-1",
      fields: { KEYWORD: "New" },
      etag: ETAG,
    });
    expect(apiGet).not.toHaveBeenCalled();
    expect(apiSend).toHaveBeenCalledWith(
      "PUT",
      "/v7.0/type/APPOINTMENT/app-1",
      { "tag-as-recently-used": false },
      { fields: { KEYWORD: "New" } },
      "application/json",
      { "If-Match": `"${ETAG}"` }
    );
  });

  it("auto-fetches the etag when none is provided", async () => {
    vi.mocked(apiGet).mockResolvedValue(JSON.stringify({ fields: { ETAG } }));
    await server.callHandler("update_data_object", {
      dataObjectType: "APPOINTMENT",
      dataObjectGGUID: "app-2",
      fields: { KEYWORD: "New" },
    });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/APPOINTMENT/app-2", {
      fields: "ETAG",
    });
    const sendArgs = vi.mocked(apiSend).mock.calls[0];
    expect(sendArgs[5]).toEqual({ "If-Match": `"${ETAG}"` });
  });

  it("falls back to a header-less PUT when no etag can be determined", async () => {
    vi.mocked(apiGet).mockResolvedValue("{}");
    await server.callHandler("update_data_object", {
      dataObjectType: "TASK",
      dataObjectGGUID: "t-1",
      fields: { KEYWORD: "New" },
    });
    expect(vi.mocked(apiSend).mock.calls[0]).toHaveLength(4);
  });

  it("still PUTs (header-less) when the etag auto-fetch itself fails", async () => {
    vi.mocked(apiGet).mockRejectedValue(new Error("403"));
    const result = await server.callHandler("update_data_object", {
      dataObjectType: "TASK",
      dataObjectGGUID: "t-2",
      fields: { KEYWORD: "New" },
    });
    expect(result).not.toHaveProperty("isError");
    expect(apiSend).toHaveBeenCalled();
  });
});

describe("formatIfMatch", () => {
  it("quotes bare values and preserves quoted/weak ones", () => {
    expect(formatIfMatch(ETAG)).toBe(`"${ETAG}"`);
    expect(formatIfMatch(`"${ETAG}"`)).toBe(`"${ETAG}"`);
    expect(formatIfMatch(`W/"${ETAG}"`)).toBe(`W/"${ETAG}"`);
  });
});

describe("extractEtag", () => {
  it("reads fields.ETAG, ETAG, and etag", () => {
    expect(extractEtag({ fields: { ETAG } })).toBe(ETAG);
    expect(extractEtag({ ETAG })).toBe(ETAG);
    expect(extractEtag({ etag: ETAG })).toBe(ETAG);
    expect(extractEtag({})).toBeUndefined();
    expect(extractEtag(null)).toBeUndefined();
  });
});
