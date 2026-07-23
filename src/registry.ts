/**
 * Central tool registry (ROADMAP P1.1).
 *
 * Every tool/flow module exports a `tool: ToolDef`; this file collects them.
 * `registerTools` is the only place that decides what gets registered —
 * in read-only mode, `mode: "write"` entries are skipped entirely
 * (invisible to the client, not merely rejected).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDef } from "./types.js";

import { tool as smartSearch } from "./tools/smart_search.js";
import { tool as getDataObject } from "./tools/get_data_object.js";
import { tool as getDossier } from "./tools/get_dossier.js";
import { tool as listDataObjects } from "./tools/list_data_objects.js";
import { tool as listViews } from "./tools/list_views.js";
import { tool as listDataObjectsByView } from "./tools/list_data_objects_by_view.js";
import { tool as listAvailableDataObjectTypes } from "./tools/list_available_data_object_types.js";
import { tool as getDataObjectTypesMetadata } from "./tools/get_data_object_types_metadata.js";
import { tool as listLinks } from "./tools/list_links.js";
import { tool as listRecentDataObjects } from "./tools/list_recent_data_objects.js";
import { tool as getAvailableProducts } from "./tools/get_available_products.js";
import { tool as getDataObjectCount } from "./tools/get_data_object_count.js";
import { tool as getPrimaryLinkParents } from "./tools/get_primary_link_parents.js";
import { tool as listUsers } from "./tools/list_users.js";
import { tool as getUserSelf } from "./tools/get_user_self.js";
import { tool as getView } from "./tools/get_view.js";
import { tool as listTags } from "./tools/list_tags.js";
import { tool as getObjectTags } from "./tools/get_object_tags.js";
import { tool as getFullDataObjects } from "./tools/get_full_data_objects.js";
import { tool as listDataObjectsByViewFull } from "./tools/list_data_objects_by_view_full.js";
import { tool as readme } from "./resources/readme.js";
import { tool as createDataObject } from "./tools/create_data_object.js";
import { tool as updateDataObject } from "./tools/update_data_object.js";
import { tool as deleteDataObject } from "./tools/delete_data_object.js";
import { tool as createLink } from "./tools/create_link.js";
import { tool as deleteLink } from "./tools/delete_link.js";
import { tool as setObjectTags } from "./tools/set_object_tags.js";
import { tool as appendNotes } from "./tools/append_notes.js";
import { tool as createDossierEntry } from "./tools/create_dossier_entry.js";
import { tool as deleteDossierEntry } from "./tools/delete_dossier_entry.js";
import { tool as getDataObjectsBulk } from "./tools/get_data_objects_bulk.js";
import { tool as restoreDataObject } from "./tools/restore_data_object.js";
import { tool as getTicketServiceAgreements } from "./tools/get_ticket_service_agreements.js";
import { tool as myOpenTasks } from "./flows/my_open_tasks.js";
import { tool as taskOverview } from "./flows/task_overview.js";
import { tool as createTask } from "./flows/create_task.js";
import { tool as getVcard } from "./tools/get_vcard.js";
import { tool as getSalutation } from "./tools/get_salutation.js";
import { tool as formatPhoneNumber } from "./tools/format_phone_number.js";
import { tool as setContactPersonsActive } from "./tools/set_contact_persons_active.js";
import { tool as findContact } from "./flows/find_contact.js";
import { tool as contact360 } from "./flows/contact_360.js";
import { tool as createAddressSafe } from "./flows/create_address_safe.js";
import { tool as checkAppointmentConflicts } from "./tools/check_appointment_conflicts.js";
import { tool as getParticipantSummary } from "./tools/get_participant_summary.js";
import { tool as listAppointmentParticipants } from "./tools/list_appointment_participants.js";
import { tool as addAppointmentParticipant } from "./tools/add_appointment_participant.js";
import { tool as removeAppointmentParticipant } from "./tools/remove_appointment_participant.js";
import { tool as setRecurrence } from "./tools/set_recurrence.js";
import { tool as deleteRecurrence } from "./tools/delete_recurrence.js";
import { tool as setAlarm } from "./tools/set_alarm.js";
import { tool as deleteAlarm } from "./tools/delete_alarm.js";
import { tool as getDocumentFile } from "./tools/get_document_file.js";
import { tool as listDocumentVersions } from "./tools/list_document_versions.js";
import { tool as listEmailAttachments } from "./tools/list_email_attachments.js";
import { tool as getEmailAttachment } from "./tools/get_email_attachment.js";
import { tool as getEmailFile } from "./tools/get_email_file.js";
import { tool as createAppointmentSafe } from "./flows/create_appointment_safe.js";
import { tool as listObjectPermissions } from "./tools/list_object_permissions.js";
import { tool as setObjectPermission } from "./tools/set_object_permission.js";
import { tool as deleteObjectPermission } from "./tools/delete_object_permission.js";
import { tool as listDistributions } from "./tools/list_distributions.js";
import { tool as listDistributionAddresses } from "./tools/list_distribution_addresses.js";
import { tool as addDistributionAddresses } from "./tools/add_distribution_addresses.js";
import { tool as removeDistributionAddress } from "./tools/remove_distribution_address.js";
import { tool as convertLead } from "./tools/convert_lead.js";
import { tool as recalculateOpportunityPositions } from "./tools/recalculate_opportunity_positions.js";

export const REGISTRY: ToolDef[] = [
  readme,
  smartSearch,
  getDataObject,
  getDossier,
  listDataObjects,
  listViews,
  listDataObjectsByView,
  listAvailableDataObjectTypes,
  getDataObjectTypesMetadata,
  listLinks,
  listRecentDataObjects,
  getAvailableProducts,
  getDataObjectCount,
  getPrimaryLinkParents,
  listUsers,
  getUserSelf,
  getView,
  listTags,
  getObjectTags,
  getFullDataObjects,
  listDataObjectsByViewFull,
  getDataObjectsBulk,
  createDataObject,
  updateDataObject,
  deleteDataObject,
  createLink,
  deleteLink,
  setObjectTags,
  appendNotes,
  createDossierEntry,
  deleteDossierEntry,
  restoreDataObject,
  getTicketServiceAgreements,
  myOpenTasks,
  taskOverview,
  createTask,
  getVcard,
  getSalutation,
  formatPhoneNumber,
  setContactPersonsActive,
  findContact,
  contact360,
  createAddressSafe,
  checkAppointmentConflicts,
  getParticipantSummary,
  listAppointmentParticipants,
  addAppointmentParticipant,
  removeAppointmentParticipant,
  setRecurrence,
  deleteRecurrence,
  setAlarm,
  deleteAlarm,
  getDocumentFile,
  listDocumentVersions,
  listEmailAttachments,
  getEmailAttachment,
  getEmailFile,
  createAppointmentSafe,
  listObjectPermissions,
  setObjectPermission,
  deleteObjectPermission,
  listDistributions,
  listDistributionAddresses,
  addDistributionAddresses,
  removeDistributionAddress,
  convertLead,
  recalculateOpportunityPositions,
];

export interface RegisterOptions {
  readOnly: boolean;
}

/** Resolve read-only mode from CLI flag `--read-only` or GENESISWORLD_READ_ONLY=true. */
export function isReadOnly(
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return (
    argv.includes("--read-only") ||
    (env.GENESISWORLD_READ_ONLY ?? "").trim().toLowerCase() === "true"
  );
}

/** Register all tools allowed by the launch mode; returns what was registered. */
export function registerTools(
  server: McpServer,
  opts: RegisterOptions,
  registry: ToolDef[] = REGISTRY
): ToolDef[] {
  const selected = registry.filter((t) => !opts.readOnly || t.mode === "read");
  for (const t of selected) t.register(server);
  return selected;
}
