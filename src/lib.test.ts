import { describe, it, expect } from "vitest";
import { jsonResult, errorResult } from "./lib.js";

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
