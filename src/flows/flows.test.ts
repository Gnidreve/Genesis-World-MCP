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
import { registerFindContact } from "./find_contact.js";
import { registerContact360 } from "./contact_360.js";
import { registerCreateAddressSafe, looksLikeHits } from "./create_address_safe.js";
import { registerCreateAppointmentSafe } from "./create_appointment_safe.js";
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

describe("find_contact", () => {
  beforeEach(() => registerFindContact(server as any));

  it("rejects calls without query and phoneNumber", async () => {
    const result = await server.callHandler("find_contact", {});
    expect(result.isError).toBe(true);
    expect(apiGet).not.toHaveBeenCalled();
  });

  it("runs text and phone search in parallel when both are given", async () => {
    const result = await server.callHandler("find_contact", {
      query: "Acme",
      phoneNumber: "+49 721 1234",
      defaultCountryCallingCode: 49,
    });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/smartsearch", {
      query: "Acme",
      "object-type": "address",
      page: undefined,
      "entries-per-page": 25,
    });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/address/search/phonenumber", {
      phoneNumber: "+49 721 1234",
      defaultCountryCallingCode: 49,
      fields: undefined,
      page: undefined,
      "entries-per-page": 25,
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.textHits).toEqual({ ok: 1 });
    expect(parsed.phoneHits).toEqual({ ok: 1 });
  });

  it("skips the phone search when only a query is given", async () => {
    await server.callHandler("find_contact", { query: "Acme" });
    expect(apiGet).toHaveBeenCalledTimes(1);
  });
});

describe("contact_360", () => {
  beforeEach(() => registerContact360(server as any));

  it("fetches address, dossier, tags, and links in one call", async () => {
    const result = await server.callHandler("contact_360", {
      dataObjectGGUID: "a-1",
      dossierObjectTypes: "TASK,APPOINTMENT",
      includeCorporateGroup: true,
    });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/address/a-1", { fields: undefined });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/address/a-1/collectiondossier/full", {
      "object-types": "TASK,APPOINTMENT",
      "include-corporate-group": true,
      "entries-per-page": 25,
    });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/address/a-1/tags", {});
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/address/a-1/link/list", {});
    const parsed = JSON.parse(result.content[0].text);
    expect(Object.keys(parsed).sort()).toEqual(["address", "dossier", "links", "tags"]);
  });

  it("honors the include switches", async () => {
    await server.callHandler("contact_360", {
      dataObjectGGUID: "a-2",
      includeDossier: false,
      includeTags: false,
      includeLinks: false,
    });
    expect(apiGet).toHaveBeenCalledTimes(1);
  });
});

describe("create_address_safe", () => {
  beforeEach(() => registerCreateAddressSafe(server as any));

  it("does NOT create when the duplicate check finds candidates", async () => {
    vi.mocked(apiSend).mockResolvedValueOnce('{"duplicates":[{"GGUID":"dup-1"}]}');
    const result = await server.callHandler("create_address_safe", {
      fields: { NAME: "Meier" },
    });
    expect(apiSend).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.created).toBe(false);
    expect(parsed.duplicates).toEqual({ duplicates: [{ GGUID: "dup-1" }] });
  });

  it("creates when the duplicate check comes back empty", async () => {
    vi.mocked(apiSend).mockResolvedValueOnce('{"duplicates":[]}');
    const result = await server.callHandler("create_address_safe", {
      fields: { NAME: "Meier" },
    });
    expect(apiSend).toHaveBeenCalledTimes(2);
    expect(apiSend).toHaveBeenLastCalledWith(
      "POST",
      "/v7.0/type/address",
      { "tag-as-recently-used": false },
      { fields: { NAME: "Meier" } }
    );
    expect(JSON.parse(result.content[0].text).created).toBe(true);
  });

  it("creates despite candidates when force=true", async () => {
    vi.mocked(apiSend).mockResolvedValueOnce('{"duplicates":[{"GGUID":"dup-1"}]}');
    const result = await server.callHandler("create_address_safe", {
      fields: { NAME: "Meier" },
      force: true,
    });
    expect(apiSend).toHaveBeenCalledTimes(2);
    expect(JSON.parse(result.content[0].text).created).toBe(true);
  });
});

describe("create_appointment_safe", () => {
  beforeEach(() => registerCreateAppointmentSafe(server as any));

  it("creates directly when no conflict check is requested", async () => {
    const result = await server.callHandler("create_appointment_safe", {
      fields: { KEYWORD: "Meeting" },
    });
    expect(apiGet).not.toHaveBeenCalled();
    expect(apiSend).toHaveBeenCalledWith(
      "POST",
      "/v7.0/type/appointment",
      { "tag-as-recently-used": false },
      { fields: { KEYWORD: "Meeting" } }
    );
    expect(JSON.parse(result.content[0].text).created).toBe(true);
  });

  it("refuses to create when conflicts are found", async () => {
    vi.mocked(apiGet).mockResolvedValue('{"conflicts":[{"GGUID":"c-1"}]}');
    const result = await server.callHandler("create_appointment_safe", {
      fields: { KEYWORD: "Meeting" },
      userOids: ["oid-1"],
      intervalStart: "2026-08-01T09:00:00Z",
      intervalEnd: "2026-08-01T10:00:00Z",
    });
    expect(apiGet).toHaveBeenCalledWith("/v7.0/type/appointment/conflicts", {
      "user-oids": ["oid-1"],
      "interval-start": "2026-08-01T09:00:00Z",
      "interval-end": "2026-08-01T10:00:00Z",
    });
    expect(apiSend).not.toHaveBeenCalled();
    expect(JSON.parse(result.content[0].text).created).toBe(false);
  });

  it("requires the interval when userOids are given", async () => {
    const result = await server.callHandler("create_appointment_safe", {
      fields: { KEYWORD: "Meeting" },
      userOids: ["oid-1"],
    });
    expect(result.isError).toBe(true);
  });

  it("creates and adds participants when the check is clean", async () => {
    vi.mocked(apiGet).mockResolvedValue('{"conflicts":[]}');
    vi.mocked(apiSend)
      .mockResolvedValueOnce('{"fields":{"GGUID":"app-new"}}')
      .mockResolvedValue('{"ok":1}');
    const result = await server.callHandler("create_appointment_safe", {
      fields: { KEYWORD: "Meeting" },
      userOids: ["oid-1"],
      intervalStart: "2026-08-01T09:00:00Z",
      intervalEnd: "2026-08-01T10:00:00Z",
      participantGGUIDs: ["p-1", "p-2"],
    });
    expect(apiSend).toHaveBeenCalledTimes(3);
    expect(apiSend).toHaveBeenCalledWith(
      "POST",
      "/v7.0/type/appointment/app-new/participant",
      { gguid: "p-1" }
    );
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.created).toBe(true);
    expect(Object.keys(parsed.participants)).toEqual(["p-1", "p-2"]);
  });

  it("warns when participants cannot be added for lack of a GGUID", async () => {
    vi.mocked(apiSend).mockResolvedValueOnce('{"no":"gguid"}');
    const result = await server.callHandler("create_appointment_safe", {
      fields: { KEYWORD: "Meeting" },
      participantGGUIDs: ["p-1"],
    });
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(JSON.parse(result.content[0].text).warning).toMatch(/NOT added/);
  });
});

describe("looksLikeHits", () => {
  it("classifies arrays, objects with arrays, and junk conservatively", () => {
    expect(looksLikeHits([])).toBe(false);
    expect(looksLikeHits([1])).toBe(true);
    expect(looksLikeHits({ duplicates: [] })).toBe(false);
    expect(looksLikeHits({ duplicates: [1] })).toBe(true);
    expect(looksLikeHits({})).toBe(false);
    expect(looksLikeHits({ note: "x" })).toBe(true);
    expect(looksLikeHits("not json")).toBe("unknown");
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
