/**
 * Tests for flow tools (kind: "flow") — call bundling, parameter mapping,
 * partial-failure behavior.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../lib.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, apiGet: vi.fn(), apiSend: vi.fn() };
});

import { apiGet, apiSend } from "../lib.js";
import { registerMyOpenTasks } from "./my_open_tasks.js";
import { registerTaskOverview } from "./task_overview.js";
import { registerCreateTask, extractGGUID } from "./create_task.js";
import { createMockServer } from "../__tests__/test-utils.js";
import type { MockServer } from "../__tests__/test-utils.js";

let server: MockServer;

beforeEach(() => {
  vi.mocked(apiGet).mockReset();
  vi.mocked(apiGet).mockResolvedValue('{"ok":1}');
  vi.mocked(apiSend).mockReset();
  vi.mocked(apiSend).mockResolvedValue('{"ok":1}');
  server = createMockServer();
});

describe("my_open_tasks", () => {
  beforeEach(() => registerMyOpenTasks(server as any));
  afterEach(() => vi.useRealTimers());

  it("bundles user/self and the task list with a default page size", async () => {
    const result = await server.callHandler("my_open_tasks", {});
    expect(apiGet).toHaveBeenCalledWith("/v7.0/user/self", {});
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/task/list", {
      "where-string": undefined,
      search: undefined,
      fields: undefined,
      "order-by": undefined,
      "interval-end": undefined,
      page: undefined,
      "entries-per-page": 25,
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.user).toEqual({ ok: 1 });
    expect(parsed.tasks).toEqual({ ok: 1 });
  });

  it("maps dueWithinDays to interval-end", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T00:00:00Z"));
    await server.callHandler("my_open_tasks", { dueWithinDays: 7 });
    const call = vi.mocked(apiGet).mock.calls.find(
      (c) => c[0] === "/v7.0/type/task/list"
    )!;
    expect(call[1]["interval-end"]).toBe("2026-07-29T00:00:00.000Z");
  });

  it("uses the view endpoint when viewId is given", async () => {
    await server.callHandler("my_open_tasks", {
      viewId: "v1",
      whereString: "X=1",
      includeUser: false,
    });
    expect(apiGet).toHaveBeenCalledTimes(1);
    const [path, params] = vi.mocked(apiGet).mock.calls[0];
    expect(path).toBe("/v7.0/type/task/view/v1/list");
    expect(params["where-string"]).toBe("X=1");
  });
});

describe("task_overview", () => {
  beforeEach(() => registerTaskOverview(server as any));

  it("fetches task, links, and tags in one call", async () => {
    const result = await server.callHandler("task_overview", {
      dataObjectGGUID: "t-1",
      fields: "KEYWORD",
    });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/task/t-1", { fields: "KEYWORD" });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/task/t-1/link/list", {});
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/task/t-1/tags", {});
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({ task: { ok: 1 }, links: { ok: 1 }, tags: { ok: 1 } });
  });

  it("skips links and tags on request", async () => {
    await server.callHandler("task_overview", {
      dataObjectGGUID: "t-2",
      includeLinks: false,
      includeTags: false,
    });
    expect(apiGet).toHaveBeenCalledTimes(1);
  });
});

describe("create_task", () => {
  beforeEach(() => registerCreateTask(server as any));

  it("creates without link when no target given", async () => {
    const result = await server.callHandler("create_task", {
      fields: { KEYWORD: "Call" },
    });
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(apiSend).toHaveBeenCalledWith(
      "POST",
      "/v7.0/type/task",
      { "tag-as-recently-used": false },
      { fields: { KEYWORD: "Call" } }
    );
    expect(JSON.parse(result.content[0].text).task).toEqual({ ok: 1 });
  });

  it("creates and links when a target is given", async () => {
    vi.mocked(apiSend).mockResolvedValueOnce('{"fields":{"GGUID":"new-1"}}');
    const result = await server.callHandler("create_task", {
      fields: { KEYWORD: "Call" },
      linkToType: "ADDRESS",
      linkToGGUID: "addr-1",
      linkAttribute: "PRIMARY",
    });
    expect(apiSend).toHaveBeenCalledTimes(2);
    expect(apiSend).toHaveBeenLastCalledWith(
      "POST",
      "/v7.0/type/task/new-1/link",
      {},
      {
        fields: {
          OBJECTTYPE1: "task",
          GGUID1: "new-1",
          OBJECTTYPE2: "ADDRESS",
          GGUID2: "addr-1",
          ATTRIBUTE: "PRIMARY",
        },
      }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.link).toEqual({ ok: 1 });
  });

  it("warns instead of guessing when the create response has no GGUID", async () => {
    vi.mocked(apiSend).mockResolvedValueOnce('{"something":"else"}');
    const result = await server.callHandler("create_task", {
      fields: { KEYWORD: "Call" },
      linkToType: "ADDRESS",
      linkToGGUID: "addr-1",
    });
    expect(apiSend).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.warning).toMatch(/link was NOT created/i);
  });
});

describe("extractGGUID", () => {
  it("prefers fields.GGUID, then GGUID/gguid/id", () => {
    expect(extractGGUID({ fields: { GGUID: "a" }, GGUID: "b" })).toBe("a");
    expect(extractGGUID({ GGUID: "b" })).toBe("b");
    expect(extractGGUID({ gguid: "c" })).toBe("c");
    expect(extractGGUID({ id: "d" })).toBe("d");
    expect(extractGGUID({})).toBeUndefined();
    expect(extractGGUID("raw")).toBeUndefined();
  });
});
