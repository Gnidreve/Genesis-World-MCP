# ROADMAP.md — cas-genesisworld-mcp

Machine-readable game plan for building the definitive CAS genesisWorld MCP
server. This file is the **single source of truth for project progress**.

## How to read / maintain this file

- **Item ID** — stable, never reused, never renumbered. Format `P<phase>.<n>`.
- **Status** — one of: `done` | `next` (the active work front) | `planned` |
  `blocked` | `dropped`. Exactly one phase should hold `next` items at a time.
- **Deps** — item IDs that must be `done` first.
- **Ops** — upstream operations from [`swagger.json`](./swagger.json)
  (`METHOD path`), the cross-reference for every implementation.
- Status updates happen **in the same commit** as the implementation
  (standing order, see [`AGENTS.md`](./AGENTS.md)).
- New scope = new items appended to the matching phase (or a new phase).
  Never rewrite history of `done` items.

## Design pillars (summary — normative version in AGENTS.md)

1. **Read-write by default, `--read-only` throttles.** Mutating tools are
   registered unless read-only mode is active. Classification is
   **semantic** (`mode: read | write` per tool), not by HTTP verb —
   e.g. `POST /type/{t}/records` is a bulk *read*.
2. **Native-type-first.** Native genesisWorld record types (Termine/appointment,
   Aufgaben/task, Adressen/address, Dokumente/document, …) get dedicated,
   ergonomic tools and flows. Everything non-native is a customer-created
   custom type and is served **only** through the generic data-object tools.
3. **Flows over raw calls.** Composite tools that bundle the multi-step
   patterns an agent would otherwise burn 3–5 tool calls on.
4. **Resources for slow-moving data.** Metadata, views, users, and the static
   server overview are MCP resources, not repeated tool calls.

---

## P0 — Foundation `done`

| ID   | Item                                                        | Status | Deps | Ops |
|------|-------------------------------------------------------------|--------|------|-----|
| P0.1 | 20 generic GET tools (search, objects, views, links, tags, users, metadata) | done | — | 20× `GET` (see AGENTS.md tool table) |
| P0.2 | Vitest suite: declarative per-tool tests + lib tests        | done   | —    | — |
| P0.3 | Transports: stdio + Streamable HTTP (+SSE), Docker image    | done   | —    | — |
| P0.4 | Config via env vars, Basic Auth, optional product key       | done   | —    | — |

## P1 — Server core: modes, registry, resources `done`

Goal: the structural upgrade every later phase builds on.

| ID   | Item | Status | Deps | Ops |
|------|------|--------|------|-----|
| P1.1 | **Tool registry**: each tool module exports `{ name, mode: "read"\|"write", kind: "atomic"\|"flow", ops: string[] }`; `index.ts` registers from the registry instead of 20 hand-written imports | done | — | — |
| P1.2 | **Launch modes**: CLI flag `--read-only` + env `GENESISWORLD_READ_ONLY=true` (either activates). In read-only mode, `mode: "write"` tools are not registered | done | P1.1 | — |
| P1.3 | **MCP tool annotations** on every tool: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `title` | done | P1.1 | — |
| P1.4 | **`readme` tool + resource**: static server overview (what this server is, type system, native vs. custom types, how to navigate, flow index). Description states: *"Static — content never changes during a session. Read once, do not re-read."* Served as resource `genesisworld://readme` and mirrored as a `readme` tool for resource-less clients | done | — | — |
| P1.5 | **Metadata resources**: object types, field metadata, view lists as MCP resources (cached, TTL) so agents stop paying tool calls for schema discovery | done | P1.1 | `GET /v7.0/metadata`, `GET /v7.0/user/self/dataobjecttypepermission/list`, `GET /v7.0/type/{t}/view/list` |
| P1.6 | **Server `instructions`** field populated at init (compact navigation hints for clients that surface it) | done | P1.4 | — |

**Acceptance P1:** server starts in both modes; read-only registers exactly the
`mode: "read"` set; tests assert registry filtering; `readme` content served
byte-identical from resource and tool.

## P2 — Generic write layer `next`

Goal: full CRUD for *any* data-object type (native and custom alike) —
this is the substrate the native flows in P3/P4 compose over.

| ID   | Item | Status | Deps | Ops |
|------|------|--------|------|-----|
| P2.1 | `create_data_object` | planned | P1.2 | `POST /v7.0/type/{dataObjectType}` |
| P2.2 | `update_data_object` | planned | P1.2 | `PUT /v7.0/type/{dataObjectType}/{dataObjectGGUID}` |
| P2.3 | `delete_data_object` (→ recycle bin; `destructiveHint: true`) | planned | P1.2 | `DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}` |
| P2.4 | `create_link` / `delete_link` | planned | P1.2 | `POST /v7.0/type/{t}/{gguid}/link`, `DELETE /v7.0/type/{t}/{gguid}/link/{t2}/{guid2}/{attribute}` |
| P2.5 | `set_object_tags` (write/delete user tag assignments) | planned | P1.2 | `POST /v7.0/type/{t}/{gguid}/tags/user` |
| P2.6 | `append_notes` (affix to notes field) | planned | P1.2 | `POST /v7.0/type/{t}/{gguid}/notes/{fieldName}` |
| P2.7 | `create_dossier_entry` / `delete_dossier_entry` | planned | P1.2 | `POST /v7.0/type/{t}/{gguid}/dossier`, `DELETE /v7.0/type/{t}/{gguid}/dossier/{entryGGUID}` |
| P2.8 | `get_data_objects_bulk` (bulk read by GUID list — POST but `mode: "read"`) | planned | P1.1 | `POST /v7.0/type/{dataObjectType}/records` |
| P2.9 | `restore_data_object` (recycle bin undelete) | planned | P2.3 | `POST /v7.0/type/{dataObjectType}/rbin/undelete` |

**Acceptance P2:** every write tool carries correct annotations, is absent in
read-only mode, and has declarative tests (path, verb, body mapping, error path).

## P3 — Native stage 1a: Aufgaben (task) `planned`

| ID   | Item | Status | Deps | Ops |
|------|------|--------|------|-----|
| P3.1 | Flow `my_open_tasks`: resolve self → filtered task list (open, due window, sorted by due date), compact projection | planned | P1.1 | `GET /v7.0/user/self`, `GET /v7.0/type/task/list` |
| P3.2 | Flow `task_overview`: task + links + tags in one call | planned | P1.1 | `GET /v7.0/type/task/{gguid}`, `…/link/list`, `…/tags` |
| P3.3 | Flow `create_task` (typed args: subject, due, priority, responsible, optional link target → create + link) | planned | P2.1, P2.4 | `POST /v7.0/type/task`, `POST …/link` |
| P3.4 | Flow `complete_task` / `update_task_status` (typed field mapping) | planned | P2.2 | `PUT /v7.0/type/task/{gguid}` |
| P3.5 | Tool `get_ticket_service_agreements` (task/ticket extension) | planned | — | `GET /v7.0/type/task/ticket/serviceagreements` |

## P4 — Native stage 1b: Adressen (address) `planned`

| ID   | Item | Status | Deps | Ops |
|------|------|--------|------|-----|
| P4.1 | Flow `find_contact`: smart search + phone-number search fallback → deduplicated compact hit list | planned | P1.1 | `GET /v7.0/smartsearch`, `GET /v7.0/type/address/search/phonenumber` |
| P4.2 | Flow `contact_360`: address + collection dossier + tags + primary links in one call | planned | P1.1 | `GET /v7.0/type/address/{gguid}`, `…/collectiondossier/full`, `…/tags` |
| P4.3 | Flow `create_address_safe`: duplicate check first; on hits return candidates instead of creating; else create | planned | P2.1 | `POST /v7.0/type/address/duplicates`, `POST /v7.0/type/address` |
| P4.4 | Tools: `get_vcard`, `get_salutation`, `format_phone_number` | planned | — | `GET …/vcard`, `POST /v7.0/type/address/salutation`, `POST …/formatphonenumber` |
| P4.5 | Contact person activate/deactivate | planned | P1.2 | `POST …/contactperson/activate`, `…/deactivate` |

## P5 — Native stage 2: Termine (appointment) + Dokumente `planned`

Deliberately after stage 1 (maintainer decision, 2026-07-22).

| ID   | Item | Status | Deps | Ops |
|------|------|--------|------|-----|
| P5.1 | Flow `check_conflicts_and_create_appointment`: conflict check → create → add participants | planned | P2.1 | `GET /v7.0/type/appointment/conflicts`, `POST /v7.0/type/appointment`, `POST …/participant` |
| P5.2 | Participant tools (summary, full, add/remove) | planned | P1.2 | 5× `…/appointment/{gguid}/participant…` |
| P5.3 | Recurrence support (create/update/delete recurrent events) | planned | P2.1 | `POST/PUT/DELETE /v7.0/type/{t}/recurrence…` |
| P5.4 | Alarm tools (set/delete own alarm) | planned | P1.2 | `PUT/DELETE /v7.0/type/{t}/{gguid}/alarm/self` |
| P5.5 | Document/email read tools: file fetch, versions, attachments | planned | — | `GET /v7.0/type/document/{gguid}/file…`, `GET /v7.0/type/emailstore/{gguid}/attachment…` |

## P6 — Hardening & efficiency `planned`

| ID   | Item | Status | Deps | Ops |
|------|------|--------|------|-----|
| P6.1 | Response projection: opt-in field allowlists on list/full tools to cut token bloat | planned | P1.1 | — |
| P6.2 | Pagination guardrails: sane default page sizes, `has_more` surfacing | planned | — | — |
| P6.3 | Object permissions read/write | planned | P1.2 | `GET/POST/DELETE …/permission…` |
| P6.4 | OAuth2 authorization-code support as alternative to Basic Auth | planned | — | — |
| P6.5 | Structured logging + request timing to stderr | planned | — | — |
| P6.6 | npm publish / release pipeline | planned | — | — |

---

## Coverage ledger

Upstream API: **209 operations** (133 GET / 46 POST / 17 DELETE / 13 PUT).

| Milestone | Tools/Flows | Upstream ops covered |
|-----------|-------------|----------------------|
| after P0 (today) | 20 atomic read | 20 |
| after P2  | ~30 | ~31 |
| after P4  | ~40 (incl. 7 flows) | ~45 |
| after P5  | ~55 | ~65 |

Full 209-op coverage is a **non-goal**: many operations are portal/registration,
report-template, or admin plumbing with no agent value. Items get added here
when a concrete use case exists — not to grow the number.
