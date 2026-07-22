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

// Mock only apiGet/apiSend; keep real jsonResult / errorResult
vi.mock("../lib.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, apiGet: vi.fn(), apiSend: vi.fn() };
});

import { apiGet, apiSend } from "../lib.js";
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
import { registerCreateDataObject } from "./create_data_object.js";
import { registerUpdateDataObject } from "./update_data_object.js";
import { registerDeleteDataObject } from "./delete_data_object.js";
import { registerCreateLink } from "./create_link.js";
import { registerDeleteLink } from "./delete_link.js";
import { registerSetObjectTags } from "./set_object_tags.js";
import { registerAppendNotes } from "./append_notes.js";
import { registerCreateDossierEntry } from "./create_dossier_entry.js";
import { registerDeleteDossierEntry } from "./delete_dossier_entry.js";
import { registerGetDataObjectsBulk } from "./get_data_objects_bulk.js";
import { registerRestoreDataObject } from "./restore_data_object.js";
import { registerGetTicketServiceAgreements } from "./get_ticket_service_agreements.js";
import { registerGetVcard } from "./get_vcard.js";
import { registerGetSalutation } from "./get_salutation.js";
import { registerFormatPhoneNumber } from "./format_phone_number.js";
import { registerSetContactPersonsActive } from "./set_contact_persons_active.js";
import { registerCheckAppointmentConflicts } from "./check_appointment_conflicts.js";
import { registerGetParticipantSummary } from "./get_participant_summary.js";
import { registerListAppointmentParticipants } from "./list_appointment_participants.js";
import { registerAddAppointmentParticipant } from "./add_appointment_participant.js";
import { registerRemoveAppointmentParticipant } from "./remove_appointment_participant.js";
import { registerSetRecurrence } from "./set_recurrence.js";
import { registerDeleteRecurrence } from "./delete_recurrence.js";
import { registerSetAlarm } from "./set_alarm.js";
import { registerDeleteAlarm } from "./delete_alarm.js";
import { registerGetDocumentFile } from "./get_document_file.js";
import { registerListDocumentVersions } from "./list_document_versions.js";
import { registerListEmailAttachments } from "./list_email_attachments.js";
import { registerGetEmailAttachment } from "./get_email_attachment.js";
import { registerGetEmailFile } from "./get_email_file.js";

// ---------------------------------------------------------------------------
// Declarative tool configuration
// ---------------------------------------------------------------------------

interface ToolTestCase {
  name: string;
  register: (server: MockServer) => void;
  /** Expected apiGet/apiSend path for the sample call */
  path: string;
  /** Sample args that exercise as many params as practical */
  sampleArgs: Record<string, any>;
  /** Expected query params for the sample call */
  expectedParams: Record<string, any>;
  /** HTTP method for apiSend-based tools; omit for apiGet-based tools */
  method?: "POST" | "PUT" | "DELETE";
  /** Expected apiSend body (use NO_BODY for body-less sends) */
  expectedBody?: any;
  /** Expected apiSend content type (only when non-default) */
  contentType?: string;
}

/** Sentinel: apiSend called without a body argument. */
const NO_BODY = Symbol("no-body");

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
  // ------------------------------------------------------------------
  // Write layer (apiSend-based) + POST-but-read bulk load
  // ------------------------------------------------------------------
  {
    name: "create_data_object",
    register: (s) => registerCreateDataObject(s as any),
    method: "POST",
    path: "/v7.0/type/TASK",
    sampleArgs: {
      dataObjectType: "TASK",
      fields: { KEYWORD: "Follow-up", NOTES: "call back" },
      tagAsRecentlyUsed: true,
    },
    expectedParams: { "tag-as-recently-used": true },
    expectedBody: { fields: { KEYWORD: "Follow-up", NOTES: "call back" } },
  },
  {
    name: "update_data_object",
    register: (s) => registerUpdateDataObject(s as any),
    method: "PUT",
    path: "/v7.0/type/TASK/gguid-1",
    sampleArgs: {
      dataObjectType: "TASK",
      dataObjectGGUID: "gguid-1",
      fields: { STATUS: 2 },
    },
    expectedParams: { "tag-as-recently-used": false },
    expectedBody: { fields: { STATUS: 2 } },
  },
  {
    name: "delete_data_object",
    register: (s) => registerDeleteDataObject(s as any),
    method: "DELETE",
    path: "/v7.0/type/TASK/gguid-2",
    sampleArgs: { dataObjectType: "TASK", dataObjectGGUID: "gguid-2" },
    expectedParams: {},
    expectedBody: NO_BODY,
  },
  {
    name: "create_link",
    register: (s) => registerCreateLink(s as any),
    method: "POST",
    path: "/v7.0/type/TASK/gguid-3/link",
    sampleArgs: {
      dataObjectType: "TASK",
      dataObjectGGUID: "gguid-3",
      targetType: "ADDRESS",
      targetGGUID: "addr-1",
      attribute: "PRIMARY",
    },
    expectedParams: {},
    expectedBody: {
      fields: {
        OBJECTTYPE1: "TASK",
        GGUID1: "gguid-3",
        OBJECTTYPE2: "ADDRESS",
        GGUID2: "addr-1",
        ATTRIBUTE: "PRIMARY",
      },
    },
  },
  {
    name: "delete_link",
    register: (s) => registerDeleteLink(s as any),
    method: "DELETE",
    path: "/v7.0/type/TASK/gguid-4/link/ADDRESS/addr-2/PRIMARY",
    sampleArgs: {
      dataObjectType: "TASK",
      dataObjectGGUID: "gguid-4",
      targetType: "ADDRESS",
      targetGGUID: "addr-2",
      attribute: "PRIMARY",
    },
    expectedParams: {},
    expectedBody: NO_BODY,
  },
  {
    name: "set_object_tags",
    register: (s) => registerSetObjectTags(s as any),
    method: "POST",
    path: "/v7.0/type/ADDRESS/gguid-5/tags/user",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      dataObjectGGUID: "gguid-5",
      assign: ["vip"],
      unassign: ["old"],
    },
    expectedParams: {},
    expectedBody: { assign: ["vip"], unassign: ["old"] },
  },
  {
    name: "append_notes",
    register: (s) => registerAppendNotes(s as any),
    method: "POST",
    path: "/v7.0/type/TASK/gguid-6/notes/NOTES",
    sampleArgs: {
      dataObjectType: "TASK",
      dataObjectGGUID: "gguid-6",
      fieldName: "NOTES",
      text: "called customer",
      prepend: true,
      withTimestamp: true,
    },
    expectedParams: { prepend: true, "with-timestamp": true },
    expectedBody: "called customer",
    contentType: "text/plain",
  },
  {
    name: "create_dossier_entry",
    register: (s) => registerCreateDossierEntry(s as any),
    method: "POST",
    path: "/v7.0/type/ADDRESS/gguid-7/dossier",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      dataObjectGGUID: "gguid-7",
      entryType: "TASK",
      entryGGUID: "task-1",
      attribute: "attr",
    },
    expectedParams: { gguid2: "task-1", "object-type2": "TASK", attribute: "attr" },
    expectedBody: NO_BODY,
  },
  {
    name: "delete_dossier_entry",
    register: (s) => registerDeleteDossierEntry(s as any),
    method: "DELETE",
    path: "/v7.0/type/ADDRESS/gguid-8/dossier/entry-1",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      dataObjectGGUID: "gguid-8",
      dossierEntryGGUID: "entry-1",
    },
    expectedParams: {},
    expectedBody: NO_BODY,
  },
  {
    name: "get_data_objects_bulk",
    register: (s) => registerGetDataObjectsBulk(s as any),
    method: "POST",
    path: "/v7.0/type/ADDRESS/records",
    sampleArgs: {
      dataObjectType: "ADDRESS",
      gguids: ["a", "b"],
      fields: "KEYWORD,NAME",
      includePermissions: true,
    },
    expectedParams: {
      fields: "KEYWORD,NAME",
      "include-permissions": true,
    },
    expectedBody: ["a", "b"],
  },
  {
    name: "restore_data_object",
    register: (s) => registerRestoreDataObject(s as any),
    method: "POST",
    path: "/v7.0/type/TASK/rbin/undelete",
    sampleArgs: { dataObjectType: "TASK", gguids: ["x"] },
    expectedParams: {},
    expectedBody: ["x"],
  },
  {
    name: "get_ticket_service_agreements",
    register: (s) => registerGetTicketServiceAgreements(s as any),
    path: "/v7.0/type/task/ticket/serviceagreements",
    sampleArgs: {
      search: "sla",
      fields: "KEYWORD",
      orderBy: "KEYWORD ASC",
      teamFilter: "team",
      submitterGGUID: "sub-1",
      customerGGUID: "cust-1",
      page: 1,
      entriesPerPage: 10,
    },
    expectedParams: {
      search: "sla",
      fields: "KEYWORD",
      "order-by": "KEYWORD ASC",
      "team-filter": "team",
      "submitter-gguid": "sub-1",
      "customer-gguid": "cust-1",
      page: 1,
      "entries-per-page": 10,
    },
  },
  {
    name: "get_vcard",
    register: (s) => registerGetVcard(s as any),
    path: "/v7.0/type/address/addr-9/vcard",
    sampleArgs: { dataObjectGGUID: "addr-9" },
    expectedParams: {},
  },
  {
    name: "get_salutation",
    register: (s) => registerGetSalutation(s as any),
    method: "POST",
    path: "/v7.0/type/address/salutation",
    sampleArgs: {
      name: "Meier",
      christianName: "Anna",
      letter: true,
      preferredLanguage: "de",
    },
    expectedParams: {},
    expectedBody: {
      name: "Meier",
      christianName: "Anna",
      letter: true,
      preferredLanguage: "de",
    },
  },
  {
    name: "format_phone_number",
    register: (s) => registerFormatPhoneNumber(s as any),
    method: "POST",
    path: "/v7.0/type/address/formatphonenumber",
    sampleArgs: { phoneNumber: "0721 1234", countryCode: "DE" },
    expectedParams: {},
    expectedBody: { phoneNumber: "0721 1234", countryCode: "DE" },
  },
  {
    name: "set_contact_persons_active",
    register: (s) => registerSetContactPersonsActive(s as any),
    method: "POST",
    path: "/v7.0/type/address/comp-1/contactperson/activate",
    sampleArgs: { dataObjectGGUID: "comp-1", active: true },
    expectedParams: {},
    expectedBody: NO_BODY,
  },
  {
    name: "check_appointment_conflicts",
    register: (s) => registerCheckAppointmentConflicts(s as any),
    path: "/v7.0/type/appointment/conflicts",
    sampleArgs: {
      userOids: ["oid-1", "oid-2"],
      intervalStart: "2026-08-01T09:00:00Z",
      intervalEnd: "2026-08-01T10:00:00Z",
      excludeGGUID: "app-1",
      fields: "KEYWORD",
    },
    expectedParams: {
      "user-oids": ["oid-1", "oid-2"],
      "interval-start": "2026-08-01T09:00:00Z",
      "interval-end": "2026-08-01T10:00:00Z",
      gguid: "app-1",
      fields: "KEYWORD",
    },
  },
  {
    name: "get_participant_summary",
    register: (s) => registerGetParticipantSummary(s as any),
    path: "/v7.0/type/appointment/app-2/participant/summary",
    sampleArgs: { dataObjectGGUID: "app-2" },
    expectedParams: {},
  },
  {
    name: "list_appointment_participants",
    register: (s) => registerListAppointmentParticipants(s as any),
    path: "/v7.0/type/appointment/app-3/participant/full",
    sampleArgs: { dataObjectGGUID: "app-3", domainGuid: "d-1", page: 1, entriesPerPage: 10 },
    expectedParams: { "domain-guid": "d-1", page: 1, "entries-per-page": 10 },
  },
  {
    name: "add_appointment_participant",
    register: (s) => registerAddAppointmentParticipant(s as any),
    method: "POST",
    path: "/v7.0/type/appointment/app-4/participant",
    sampleArgs: { dataObjectGGUID: "app-4", participantGGUID: "user-1" },
    expectedParams: { gguid: "user-1" },
    expectedBody: NO_BODY,
  },
  {
    name: "remove_appointment_participant",
    register: (s) => registerRemoveAppointmentParticipant(s as any),
    method: "DELETE",
    path: "/v7.0/type/appointment/app-5/participant/user-2",
    sampleArgs: { dataObjectGGUID: "app-5", participantGGUID: "user-2" },
    expectedParams: {},
    expectedBody: NO_BODY,
  },
  {
    name: "set_recurrence",
    register: (s) => registerSetRecurrence(s as any),
    method: "POST",
    path: "/v7.0/type/appointment/recurrence",
    sampleArgs: { dataObjectType: "appointment", event: { exceptionDates: [] } },
    expectedParams: {},
    expectedBody: { exceptionDates: [] },
  },
  {
    name: "delete_recurrence",
    register: (s) => registerDeleteRecurrence(s as any),
    method: "DELETE",
    path: "/v7.0/type/appointment/recurrence/per-1",
    sampleArgs: { dataObjectType: "appointment", periodGuid: "per-1" },
    expectedParams: {},
    expectedBody: NO_BODY,
  },
  {
    name: "set_alarm",
    register: (s) => registerSetAlarm(s as any),
    method: "PUT",
    path: "/v7.0/type/appointment/app-6/alarm/self",
    sampleArgs: {
      dataObjectType: "appointment",
      dataObjectGGUID: "app-6",
      alarm: "2026-08-01T08:45:00Z",
    },
    expectedParams: {},
    expectedBody: { alarm: "2026-08-01T08:45:00Z" },
  },
  {
    name: "delete_alarm",
    register: (s) => registerDeleteAlarm(s as any),
    method: "DELETE",
    path: "/v7.0/type/appointment/app-7/alarm/self",
    sampleArgs: { dataObjectType: "appointment", dataObjectGGUID: "app-7" },
    expectedParams: {},
    expectedBody: NO_BODY,
  },
  {
    name: "get_document_file",
    register: (s) => registerGetDocumentFile(s as any),
    path: "/v7.0/type/document/doc-1/file",
    sampleArgs: { dataObjectGGUID: "doc-1", version: 3 },
    expectedParams: { version: 3, "read-only": true },
  },
  {
    name: "list_document_versions",
    register: (s) => registerListDocumentVersions(s as any),
    path: "/v7.0/type/document/doc-2/file/version/list",
    sampleArgs: { dataObjectGGUID: "doc-2" },
    expectedParams: {},
  },
  {
    name: "list_email_attachments",
    register: (s) => registerListEmailAttachments(s as any),
    path: "/v7.0/type/emailstore/mail-1/attachment/list",
    sampleArgs: { dataObjectGGUID: "mail-1" },
    expectedParams: {},
  },
  {
    name: "get_email_attachment",
    register: (s) => registerGetEmailAttachment(s as any),
    path: "/v7.0/type/emailstore/mail-2/attachment/att-1",
    sampleArgs: { dataObjectGGUID: "mail-2", attachmentId: "att-1" },
    expectedParams: {},
  },
  {
    name: "get_email_file",
    register: (s) => registerGetEmailFile(s as any),
    path: "/v7.0/type/emailstore/mail-3/file",
    sampleArgs: { dataObjectGGUID: "mail-3", htmlFilter: 1, includeAttachments: true },
    expectedParams: { "html-filter": 1, "include-attachments": true },
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
      vi.mocked(apiSend).mockReset();
      vi.mocked(apiSend).mockResolvedValue("{}");
      server = createMockServer();
      cfg.register(server);
    });

    it("registers with correct tool name", () => {
      expect(server.registrations).toHaveLength(1);
      expect(server.registrations[0].name).toBe(cfg.name);
    });

    it("calls the API with correct endpoint", async () => {
      await server.callHandler(cfg.name, cfg.sampleArgs);
      if (!cfg.method) {
        expect(apiGet).toHaveBeenCalledWith(cfg.path, cfg.expectedParams);
        return;
      }
      const expected: any[] = [cfg.method, cfg.path, cfg.expectedParams];
      if (cfg.expectedBody !== NO_BODY) expected.push(cfg.expectedBody);
      if (cfg.contentType) expected.push(cfg.contentType);
      expect(apiSend).toHaveBeenCalledWith(...expected);
    });

    it("returns success (jsonResult) on happy path", async () => {
      const result = await server.callHandler(cfg.name, cfg.sampleArgs);
      expect(result).not.toHaveProperty("isError");
    });

    it("returns errorResult when the API call throws", async () => {
      vi.mocked(apiGet).mockRejectedValue(new Error("Boom"));
      vi.mocked(apiSend).mockRejectedValue(new Error("Boom"));
      const result = await server.callHandler(cfg.name, cfg.sampleArgs);
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Boom/);
    });
  });
}
