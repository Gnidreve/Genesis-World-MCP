import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { jsonResult, errorResult, capResult } from "./lib.js";

describe("apiSend", () => {
  let apiSend: typeof import("./lib.js").apiSend;
  const fetchMock = vi.fn();

  beforeAll(async () => {
    process.env.GENESISWORLD_BASE_URL = "http://api.test/svc";
    vi.resetModules();
    ({ apiSend } = await import("./lib.js"));
    vi.stubGlobal("fetch", fetchMock);
  });

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => '{"done":true}',
    });
  });

  it("JSON-encodes the body and sets Content-Type", async () => {
    await apiSend("POST", "/v7.0/type/TASK", { q: 1 }, { fields: { A: "b" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://api.test/svc/v7.0/type/TASK?q=1");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"fields":{"A":"b"}}');
  });

  it("sends raw text bodies with a custom content type", async () => {
    await apiSend("POST", "/p", {}, "hello", "text/plain");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("text/plain");
    expect(init.body).toBe("hello");
  });

  it("omits body and Content-Type when no body is given", async () => {
    await apiSend("DELETE", "/p", {});
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBeUndefined();
    expect(init.headers["Content-Type"]).toBeUndefined();
  });

  it("normalizes empty upstream responses to a JSON status object", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      statusText: "No Content",
      text: async () => "",
    });
    const text = await apiSend("DELETE", "/p", {});
    expect(JSON.parse(text)).toEqual({ ok: true, status: 204 });
  });

  it("throws with status and body excerpt on HTTP errors", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => "denied",
    });
    await expect(apiSend("PUT", "/p", {}, {})).rejects.toThrow(/HTTP 403.*PUT.*denied/s);
  });
});

describe("jsonResult", () => {
  it("pretty-prints JSON", () => {
    const result = jsonResult('{"hello":"world"}');
    expect(result.content[0].text).toBe('{\n  "hello": "world"\n}');
  });

  it("returns plain text for non-JSON", () => {
    const result = jsonResult("plain text");
    expect(result.content[0].text).toBe("plain text");
  });
});

describe("capResult / jsonResult truncation", () => {
  beforeEach(() => {
    delete process.env.GENESISWORLD_MAX_RESULT_CHARS;
  });

  it("passes small bodies through untouched", () => {
    expect(capResult("short")).toBe("short");
  });

  it("truncates oversized bodies with an actionable hint", () => {
    process.env.GENESISWORLD_MAX_RESULT_CHARS = "10";
    const out = capResult("x".repeat(50));
    expect(out.startsWith("x".repeat(10))).toBe(true);
    expect(out).toMatch(/truncated: response was 50 chars/);
    expect(out).toMatch(/GENESISWORLD_MAX_RESULT_CHARS/);
  });

  it("can be disabled with 0", () => {
    process.env.GENESISWORLD_MAX_RESULT_CHARS = "0";
    const big = "x".repeat(100_000);
    expect(capResult(big)).toBe(big);
  });

  it("applies inside jsonResult", () => {
    process.env.GENESISWORLD_MAX_RESULT_CHARS = "20";
    const result = jsonResult(JSON.stringify({ data: "y".repeat(100) }));
    expect(result.content[0].text).toMatch(/truncated/);
  });
});

describe("errorResult", () => {
  it("formats Error instances", () => {
    const result = errorResult(new Error("Something broke"));
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("Something broke");
  });

  it("formats plain strings", () => {
    const result = errorResult("fail");
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toBe("fail");
  });
});
