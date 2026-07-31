/**
 * generate_report uses apiSendBinary (not apiGet/apiSend), so it needs its
 * own harness outside the declarative TOOL_CONFIGS in all-tools.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../lib.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, apiSendBinary: vi.fn() };
});

import { apiSendBinary } from "../lib.js";
import { registerGenerateReport } from "./generate_report.js";
import { createMockServer } from "../__tests__/test-utils.js";
import type { MockServer } from "../__tests__/test-utils.js";

describe("generate_report", () => {
  let server: MockServer;

  beforeEach(() => {
    vi.mocked(apiSendBinary).mockReset();
    vi.mocked(apiSendBinary).mockResolvedValue({
      base64: "JVBERi0=",
      contentType: "application/pdf",
      byteLength: 6,
    });
    server = createMockServer();
    registerGenerateReport(server as any);
  });

  it("registers with the correct name", () => {
    expect(server.registrations).toHaveLength(1);
    expect(server.registrations[0].name).toBe("generate_report");
  });

  it("carries readOnlyHint: true (POST but no CRM mutation)", () => {
    expect(server.registrations[0].schema.annotations.readOnlyHint).toBe(true);
  });

  it("calls apiSendBinary with the endpoint and mapped body", async () => {
    await server.callHandler("generate_report", {
      templateGGUID: "tpl-1",
      recordGGUIDs: ["rec-1", "rec-2"],
      exportOptions: "PDF",
    });
    expect(apiSendBinary).toHaveBeenCalledWith(
      "POST",
      "/v7.0/type/report/template/tpl-1",
      {},
      { exportOptions: "PDF", records: ["rec-1", "rec-2"] }
    );
  });

  it("returns contentType/byteLengthDecoded/dataBase64 as JSON text", async () => {
    const result = await server.callHandler("generate_report", {
      templateGGUID: "tpl-2",
      recordGGUIDs: ["rec-1"],
    });
    expect(JSON.parse(result.content[0].text)).toEqual({
      contentType: "application/pdf",
      byteLengthDecoded: 6,
      dataBase64: "JVBERi0=",
    });
  });

  it("returns errorResult when apiSendBinary throws", async () => {
    vi.mocked(apiSendBinary).mockRejectedValue(new Error("no such template"));
    const result = await server.callHandler("generate_report", {
      templateGGUID: "tpl-3",
      recordGGUIDs: [],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/no such template/);
  });
});
