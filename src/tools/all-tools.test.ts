/**
 * Master test suite for all genesisWorld MCP tools.
 *
 * Every tool follows the same pattern:
 *   1. Call apiGet(path, params) in its handler
 *   2. Return jsonResult on success / errorResult on failure
 *
 * This file defines one test suite per tool using a declarative config.
 * Adding a new tool = one new entry in TOOL_CONFIGS.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock only apiGet; keep real jsonResult / errorResult
vi.mock("../lib.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, apiGet: vi.fn() };
});

import { apiGet } from "../lib.js";
import { createMockServer } from "../__tests__/test-utils.js";
import type { MockServer } from "../__tests__/test-utils.js";

// ---------------------------------------------------------------------------
// Import all register* functions
// ---------------------------------------------------------------------------
import { registerSmartSearch } from "./smart_search.js";
import { registerGetDataObject } from "./get_data_object.js";
import { registerGetDossier } from "./get_dossier.js";
import { registerListDataObjects } from "./list_data_objects.js";
import { registerListViews } from "./list_views.js";
import { registerListDataObjectsByView } from "./list_data_objects_by_view.js";
import { registerListAvailableDataObjectTypes } from "./list_available_data_object_types.js";
import { registerGetDataObjectTypesMetadata } from "./get_data_object_types_metadata.js";
import { registerListLinks } from "./list_links.js";
import { registerListRecentDataObjects } from "./list_recent_data_objects.js";
import { registerGetAvailableProducts } from "./get_available_products.js";
import { registerGetDataObjectCount } from "./get_data_object_count.js";
import { registerGetPrimaryLinkParents } from "./get_primary_link_parents.js";
import { registerListUsers } from "./list_users.js";
import { registerGetUserSelf } from "./get_user_self.js";
import { registerGetView } from "./get_view.js";
import { registerListTags } from "./list_tags.js";
import { registerGetObjectTags } from "./get_object_tags.js";
import { registerGetFullDataObjects } from "./get_full_data_objects.js";
import { registerListDataObjectsByViewFull } from "./list_data_objects_by_view_full.js";

// ---------------------------------------------------------------------------
// Declarative tool configuration
// ---------------------------------------------------------------------------

interface ToolTestCase {
  name: string;
  register: (server: MockServer) => void;
  /** Expected apiGet path for a default (empty-args) call */
  path: string;
  /** Sample args that exercise as many params as practical */
  sampleArgs: Record<string, any>;
  /** Expected query params for the sample call */
  expectedParams: Record<string, any>;
}

const TOOL_CONFIGS: ToolTestCase[] = [
  {
    name: "smart_search",
    register: (s) => registerSmartSearch(s as any),
    path: "/v7.0/smartsearch",
    sampleArgs: {
      query: "Acme",
      objectType: "ADDRESS",
      objectTypes: "ADDRESS,GWOPPORTUNITY",
      page: 2,
      entriesPerPage: 50,
    },
    expectedParams: {
      query: "Acme",
      "object-type": "ADDRESS",
      "object-types": "ADDRESS,GWOPPORTUNITY",
      page: 2,
      "entries-per-page": 50,
    },
  },
  {
    name: "get_data_object",
    register: (s) => registerGetDataObject(s as any),
    path: "/v7.0/type/ADDRESS/gguid-123",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      dataObjectGGUID: "gguid-123",
      fields: "KEYWORD,NAME",
      includePermissions: true,
      includeSyncrecordPermissions: false,
      tagAsRecentlyUsed: true,
    },
    expectedParams: {
      fields: "KEYWORD,NAME",
      "include-permissions": true,
      "include-syncrecord-permissions": false,
      "tag-as-recently-used": true,
    },
  },
  {
    name: "get_dossier",
    register: (s) => registerGetDossier(s as any),
    path: "/v7.0/type/ADDRESS/gguid-abc/dossier/full",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      dataObjectGGUID: "gguid-abc",
      objectTypes: "APPOINTMENT,TASK",
      search: "keyword",
      includeAttributes: true,
      page: 3,
      entriesPerPage: 20,
    },
    expectedParams: {
      "object-types": "APPOINTMENT,TASK",
      search: "keyword",
      "include-attributes": true,
      page: 3,
      "entries-per-page": 20,
    },
  },
  {
    name: "list_data_objects",
    register: (s) => registerListDataObjects(s as any),
    path: "/v7.0/type/ADDRESS/list",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      search: "test",
      fields: "KEYWORD,NAME",
      orderBy: "KEYWORD ASC",
      teamFilter: "myteam",
      updatedAfter: "2025-01-01T00:00:00Z",
      insertedAfter: "2024-01-01T00:00:00Z",
      intervalStart: "2025-06-01T00:00:00Z",
      intervalEnd: "2025-06-30T00:00:00Z",
      linkedToType: "GWOPPORTUNITY",
      linkedTo: "gguid-1,gguid-2",
      linkedToAttributes: "primary",
      includeDeactivated: true,
      page: 1,
      entriesPerPage: 100,
    },
    expectedParams: {
      search: "test",
      fields: "KEYWORD,NAME",
      "order-by": "KEYWORD ASC",
      "team-filter": "myteam",
      "updated-after": "2025-01-01T00:00:00Z",
      "inserted-after": "2024-01-01T00:00:00Z",
      "interval-start": "2025-06-01T00:00:00Z",
      "interval-end": "2025-06-30T00:00:00Z",
      "linked-to-type": "GWOPPORTUNITY",
      "linked-to": "gguid-1,gguid-2",
      "linked-to-attributes": "primary",
      "include-deactivated": true,
      page: 1,
      "entries-per-page": 100,
    },
  },
  {
    name: "list_views",
    register: (s) => registerListViews(s as any),
    path: "/v7.0/type/ADDRESS/view/list",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      viewKind: "standard",
      includeDisplaySettings: true,
      page: 1,
      entriesPerPage: 25,
    },
    expectedParams: {
      "view-kind": "standard",
      "include-display-settings": true,
      page: 1,
      "entries-per-page": 25,
    },
  },
  {
    name: "list_data_objects_by_view",
    register: (s) => registerListDataObjectsByView(s as any),
    path: "/v7.0/type/ADDRESS/view/custom-view/list",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      viewId: "custom-view",
      whereString: "KEYWORD='Test'",
      search: "query",
      fields: "KEYWORD,NAME",
      orderBy: "KEYWORD DESC",
      updatedAfter: "2025-01-01T00:00:00Z",
      includeDeactivated: true,
      page: 2,
      entriesPerPage: 50,
    },
    expectedParams: {
      "where-string": "KEYWORD='Test'",
      search: "query",
      fields: "KEYWORD,NAME",
      "order-by": "KEYWORD DESC",
      "updated-after": "2025-01-01T00:00:00Z",
      "include-deactivated": true,
      page: 2,
      "entries-per-page": 50,
    },
  },
  {
    name: "list_available_data_object_types",
    register: (s) => registerListAvailableDataObjectTypes(s as any),
    path: "/v7.0/user/self/dataobjecttypepermission/list",
    sampleArgs: {},
    expectedParams: {},
  },
  {
    name: "get_data_object_types_metadata",
    register: (s) => registerGetDataObjectTypesMetadata(s as any),
    path: "/v7.0/metadata",
    sampleArgs: {
      objectTypes: ["ADDRESS", "GWOPPORTUNITY"],
      includeSemantics: true,
    },
    expectedParams: {
      "object-types": ["ADDRESS", "GWOPPORTUNITY"],
      "include-semantics": true,
    },
  },
  {
    name: "list_links",
    register: (s) => registerListLinks(s as any),
    path: "/v7.0/type/ADDRESS/gguid-789/link/list",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      dataObjectGGUID: "gguid-789",
      objectType: "GWOPPORTUNITY",
      gguid: "opp-guid",
      attribute: "primary",
      linkDirection: "forward",
    },
    expectedParams: {
      "object-type": "GWOPPORTUNITY",
      gguid: "opp-guid",
      attribute: "primary",
      "link-direction": "forward",
    },
  },
  {
    name: "list_recent_data_objects",
    register: (s) => registerListRecentDataObjects(s as any),
    path: "/v7.0/type/ADDRESS/recent/list",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      fields: "KEYWORD,NAME",
      whereString: "KEYWORD='Recent'",
    },
    expectedParams: {
      fields: "KEYWORD,NAME",
      "where-string": "KEYWORD='Recent'",
    },
  },
  {
    name: "get_available_products",
    register: (s) => registerGetAvailableProducts(s as any),
    path: "/v7.0/type/gwopportunity/availableproducts",
    sampleArgs: {
      whereString: "PRODUCT='X'",
      search: "widget",
      fields: "NAME,PRICE",
      orderBy: "NAME ASC",
      page: 1,
      entriesPerPage: 10,
    },
    expectedParams: {
      "where-string": "PRODUCT='X'",
      search: "widget",
      fields: "NAME,PRICE",
      "order-by": "NAME ASC",
      page: 1,
      "entries-per-page": 10,
    },
  },
  {
    name: "get_data_object_count",
    register: (s) => registerGetDataObjectCount(s as any),
    path: "/v7.0/type/GWOPPORTUNITY/count",
    sampleArgs: {
      dataObjectType: "GWOPPORTUNITY",
      search: "open",
    },
    expectedParams: { search: "open" },
  },
  {
    name: "get_primary_link_parents",
    register: (s) => registerGetPrimaryLinkParents(s as any),
    path: "/v7.0/type/GWOPPORTUNITY/gguid-456/primarylinkparents",
    sampleArgs: {
      dataObjectType: "GWOPPORTUNITY",
      dataObjectGGUID: "gguid-456",
    },
    expectedParams: {},
  },
  {
    name: "list_users",
    register: (s) => registerListUsers(s as any),
    path: "/v7.0/user/list",
    sampleArgs: {
      page: 1,
      entriesPerPage: 50,
      objectType: "ADDRESS",
      domainGuid: "domain-1",
      minPermission: 3,
    },
    expectedParams: {
      page: 1,
      "entries-per-page": 50,
      "object-type": "ADDRESS",
      "domain-guid": "domain-1",
      "min-permission": 3,
    },
  },
  {
    name: "get_user_self",
    register: (s) => registerGetUserSelf(s as any),
    path: "/v7.0/user/self",
    sampleArgs: { fields: "KEYWORD,NAME" },
    expectedParams: { fields: "KEYWORD,NAME" },
  },
  {
    name: "get_view",
    register: (s) => registerGetView(s as any),
    path: "/v7.0/type/ADDRESS/view/v123",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      viewId: "v123",
    },
    expectedParams: {},
  },
  {
    name: "list_tags",
    register: (s) => registerListTags(s as any),
    path: "/v7.0/tags",
    sampleArgs: { page: 2, entriesPerPage: 20 },
    expectedParams: { page: 2, "entries-per-page": 20 },
  },
  {
    name: "get_object_tags",
    register: (s) => registerGetObjectTags(s as any),
    path: "/v7.0/type/ADDRESS/gguid-999/tags",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      dataObjectGGUID: "gguid-999",
      page: 1,
      entriesPerPage: 10,
    },
    expectedParams: { page: 1, "entries-per-page": 10 },
  },
  {
    name: "get_full_data_objects",
    register: (s) => registerGetFullDataObjects(s as any),
    path: "/v7.0/type/ADDRESS/full",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      search: "full",
      fields: "KEYWORD,NAME",
      orderBy: "KEYWORD ASC",
      page: 1,
      entriesPerPage: 25,
    },
    expectedParams: {
      search: "full",
      fields: "KEYWORD,NAME",
      "order-by": "KEYWORD ASC",
      page: 1,
      "entries-per-page": 25,
    },
  },
  {
    name: "list_data_objects_by_view_full",
    register: (s) => registerListDataObjectsByViewFull(s as any),
    path: "/v7.0/type/ADDRESS/view/v99/full",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      viewId: "v99",
      whereString: "KEYWORD='test'",
      search: "data",
      fields: "KEYWORD,NAME",
      orderBy: "KEYWORD ASC",
      page: 3,
      entriesPerPage: 75,
    },
    expectedParams: {
      "where-string": "KEYWORD='test'",
      search: "data",
      fields: "KEYWORD,NAME",
      "order-by": "KEYWORD ASC",
      page: 3,
      "entries-per-page": 75,
    },
  },
];

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

for (const cfg of TOOL_CONFIGS) {
  describe(cfg.name, () => {
    let server: MockServer;

    beforeEach(() => {
      vi.mocked(apiGet).mockReset();
      vi.mocked(apiGet).mockResolvedValue("{}");
      server = createMockServer();
      cfg.register(server);
    });

    it("registers with correct tool name", () => {
      expect(server.registrations).toHaveLength(1);
      expect(server.registrations[0].name).toBe(cfg.name);
    });

    it("calls apiGet with correct endpoint", async () => {
      // Set up path-params mock: for tools with dataObjectType/GGUID in path,
      // the sampleArgs already contain the right values.
      await server.callHandler(cfg.name, cfg.sampleArgs);
      expect(apiGet).toHaveBeenCalledWith(cfg.path, cfg.expectedParams);
    });

    it("returns success (jsonResult) on happy path", async () => {
      const result = await server.callHandler(cfg.name, cfg.sampleArgs);
      expect(result).not.toHaveProperty("isError");
    });

    it("returns errorResult when apiGet throws", async () => {
      vi.mocked(apiGet).mockRejectedValue(new Error("Boom"));
      const result = await server.callHandler(cfg.name, cfg.sampleArgs);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Boom/);
    });
  });
}
