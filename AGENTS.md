# AGENTS.md — CAS genesisWorld MCP

Guidance for any AI agent or developer working in this repository.

## What this is

An [MCP](https://modelcontextprotocol.io) server for the **CAS genesisWorld
REST Webservice v7.0** — aiming to be *the* genesisWorld MCP, not a thin
wrapper. The full upstream API surface is committed at the repo root as
[`swagger.json`](./swagger.json) and is the **single source of truth /
cross-reference** for every tool.

The project plan lives in [`ROADMAP.md`](./ROADMAP.md) (machine-readable,
stable item IDs). Current state: **P0–P8 done** (P6.4 OAuth2 blocked —
no OAuth2-capable installation for ~6 months; P9 document upload is the
next planned phase). 67 tools: 41 read / 26 write, 7 of them flows;
flow results are compacted by default (P7); result cap + request logging
in place; npm (`cas-genesis-world-mcp`) and Docker Hub
(`vaatu/cas-genesis-world-mcp`) publish pipelines are live, both
triggered by pushing a `v*` tag (`NPM_TOKEN` / `DOCKERHUB_TOKEN` repo
secrets already set). New work = new ROADMAP items first.

**Release checklist (learned the hard way, 2026-07-23):** `package.json`'s
`version` and the server's `version` string in `src/index.ts` must be
bumped **in the same commit** that precedes a new `vX.Y.Z` tag, and must
match the tag. `npm publish` fails outright if that version already
exists on the registry (Docker Hub has no such guard — it happily
overwrites a tag, so a forgotten bump fails silently there instead of
loudly). Order: bump both version strings → commit → tag → push tag.

## Standing orders — READ FIRST

1. **Docs stay in sync, always.** Any commit that adds/changes/removes a
   tool, flow, resource, flag, or config variable **must** update
   `README.md`, the tool tables in this file, and the matching
   `ROADMAP.md` item status **in the same commit**. The maintainer will not
   remind you; this rule is the reminder.
2. **ROADMAP.md is the progress ledger.** Work items are picked from it,
   and their status is flipped when done. New scope is appended as new
   items first, then implemented.
3. **Structural proposals are manifested here before implementation.**
   If you want to change architecture/conventions, write the proposal into
   this file (or ROADMAP.md) in its own commit so the maintainer can see it
   — do not just restructure code silently.
4. **Never document unimplemented features as existing.** README.md
   describes what `main` actually does; the future lives in ROADMAP.md.

## Operating modes (implemented — `isReadOnly` in `src/registry.ts`)

- **Default: read-write.** All registered tools are available, including
  mutating ones (once they exist, P2+).
- **`--read-only`** CLI flag **or** `GENESISWORLD_READ_ONLY=true` env var
  activates read-only mode: tools declared `mode: "write"` are **not
  registered at all** (invisible to the client, not merely rejected).
- Classification is **semantic, not by HTTP verb**:
  - `mode: "read"` — no server-side state change. This includes some POST
    endpoints, e.g. `POST /v7.0/type/{t}/records` (bulk load by GUIDs),
    `POST /v7.0/type/address/duplicates` (duplicate *check*),
    `POST /v7.0/type/address/salutation` (formatting).
  - `mode: "write"` — anything that creates, updates, deletes, links,
    tags, or otherwise mutates CRM data.
- Every tool carries MCP annotations: `readOnlyHint`, `destructiveHint`
  (true for deletes), `idempotentHint`, `title`. `registry.test.ts`
  enforces that `readOnlyHint` matches the declared `mode`.

## Design pillars

1. **Native-type-first.** genesisWorld ships native record types
   (appointment/Termine, task/Aufgaben, address/Adressen, document,
   emailstore, event, gwopportunity, …) — these get dedicated typed tools
   and flows with ergonomic parameters. **Anything not native is a
   customer-created custom type** and is served exclusively through the
   generic data-object tools (`get_data_object`, `list_data_objects`,
   generic CRUD in P2). Never add per-type tools for custom types.
   Stage 1 native focus (maintainer decision, 2026-07-22): **task** and
   **address**; appointment and document/emailstore follow in P5.
2. **Flows over raw calls.** A flow (`kind: "flow"`) is one MCP tool that
   performs a bundled multi-step pattern server-side (e.g. duplicate-check →
   create; resolve self → filtered task list) and returns one compact
   result. Flows live in `src/flows/`, compose the same `lib.ts` HTTP layer,
   and never hide destructive steps: a flow that writes is `mode: "write"`.
3. **Resources for slow-moving data.** Implemented in
   `src/resources/metadata.ts` (15-min in-memory TTL cache, `cache.ts`):
   `genesisworld://types` (accessible types + permissions),
   `genesisworld://metadata/{objectType}` (field schema, template),
   `genesisworld://views/{objectType}` (saved views, template). Registered
   in every launch mode — they are reads.
4. **The `readme` tool/resource** (implemented, `src/resources/readme.ts`)
   returns a static orientation document (domain model, native vs. custom,
   navigation patterns, efficiency rules). Its description explicitly says
   content never changes during a session — read once, do not re-read.
   Served byte-identical as resource `genesisworld://readme` and as a
   `readme` tool for resource-less clients. The server also sets the MCP
   `instructions` field pointing at it.

## Source layout & conventions

```
src/
├── index.ts        # entry: transports, server build (instructions, version)
├── lib.ts          # shared HTTP layer: apiGet (apiSend in P2), results
├── types.ts        # ToolDef / ToolMode / ToolKind
├── registry.ts     # central tool registry + isReadOnly + registerTools
├── registry.test.ts# registry, mode-filtering, annotations, readme tests
├── tools/          # atomic tools — one file, one upstream operation
├── flows/          # (P3+) composite flow tools
├── resources/      # MCP resources: readme.ts, metadata.ts, cache.ts (TTL)
└── __tests__/      # shared test utils (mock server: tools + resources)
```

- **Registry:** every tool/flow module exports
  `tool: ToolDef = { name, mode, kind, ops, register }` (see
  `src/types.ts`); `src/registry.ts` collects them into `REGISTRY` and
  `registerTools(server, { readOnly })` filters by mode. `index.ts` has no
  per-tool imports.
- Atomic tools map params 1:1, keep the API's original wire param names
  (e.g. `object-type`) behind camelCase tool arguments, and return the raw
  JSON payload via `jsonResult` — no interpretation.
- Flows may reshape/project responses; that is their purpose.

## Currently implemented tools (67: 41 read / 26 write; 7 flows)

| #  | Tool                               | HTTP | Endpoint                                                          |
|----|------------------------------------|------|-------------------------------------------------------------------|
| 0  | `readme`                           | —    | server-local static orientation (also resource `genesisworld://readme`) |
| 1  | `smart_search`                     | GET  | `/v7.0/smartsearch`                                               |
| 2  | `get_data_object`                  | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}`                   |
| 3  | `get_dossier`                      | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier/full`      |
| 4  | `list_data_objects`                | GET  | `/v7.0/type/{dataObjectType}/list`                                |
| 5  | `list_views`                       | GET  | `/v7.0/type/{dataObjectType}/view/list`                           |
| 6  | `list_data_objects_by_view`        | GET  | `/v7.0/type/{dataObjectType}/view/{viewID}/list`                  |
| 7  | `list_available_data_object_types` | GET  | `/v7.0/user/self/dataobjecttypepermission/list`                   |
| 8  | `get_data_object_types_metadata`   | GET  | `/v7.0/metadata`                                                  |
| 9  | `list_links`                       | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/list`         |
| 10 | `list_recent_data_objects`         | GET  | `/v7.0/type/{dataObjectType}/recent/list`                         |
| 11 | `get_available_products`           | GET  | `/v7.0/type/gwopportunity/availableproducts`                      |
| 12 | `get_data_object_count`            | GET  | `/v7.0/type/{dataObjectType}/count`                               |
| 13 | `get_primary_link_parents`         | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/primarylinkparents`|
| 14 | `list_users`                       | GET  | `/v7.0/user/list`                                                 |
| 15 | `get_user_self`                    | GET  | `/v7.0/user/self`                                                 |
| 16 | `get_view`                         | GET  | `/v7.0/type/{dataObjectType}/view/{viewID}`                       |
| 17 | `list_tags`                        | GET  | `/v7.0/tags`                                                      |
| 18 | `get_object_tags`                  | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags`              |
| 19 | `get_full_data_objects`            | GET  | `/v7.0/type/{dataObjectType}/full`                                |
| 20 | `list_data_objects_by_view_full`   | GET  | `/v7.0/type/{dataObjectType}/view/{viewID}/full`                  |
| 21 | `get_data_objects_bulk`            | POST | `/v7.0/type/{dataObjectType}/records` (**read** despite POST)     |
| 21a| `get_ticket_service_agreements`    | GET  | `/v7.0/type/task/ticket/serviceagreements`                        |
| 21b| `get_vcard`                        | GET  | `/v7.0/type/address/{dataObjectGGUID}/vcard`                      |
| 21c| `get_salutation`                   | POST | `/v7.0/type/address/salutation` (**read** despite POST)           |
| 21d| `format_phone_number`              | POST | `/v7.0/type/address/formatphonenumber` (**read** despite POST)    |
| 21e| `check_appointment_conflicts`      | GET  | `/v7.0/type/appointment/conflicts`                                |
| 21f| `get_participant_summary`          | GET  | `/v7.0/type/appointment/{gguid}/participant/summary`              |
| 21g| `list_appointment_participants`    | GET  | `/v7.0/type/appointment/{gguid}/participant/full`                 |
| 21h| `get_document_file`                | GET  | `/v7.0/type/document/{gguid}/file` (always `read-only=true`, never locks) |
| 21i| `list_document_versions`           | GET  | `/v7.0/type/document/{gguid}/file/version/list`                   |
| 21j| `list_email_attachments`           | GET  | `/v7.0/type/emailstore/{gguid}/attachment/list`                   |
| 21k| `get_email_attachment`             | GET  | `/v7.0/type/emailstore/{gguid}/attachment/{attachmentId}`         |
| 21l| `get_email_file`                   | GET  | `/v7.0/type/emailstore/{gguid}/file`                              |
| 21m| `list_object_permissions`          | GET  | `/v7.0/type/{t}/{gguid}/permission/full`                          |
| 21n| `list_distributions`               | GET  | `/v7.0/type/gwdistribution/list` (`contains-address` filter)      |
| 21o| `list_distribution_addresses`      | GET  | `/v7.0/type/gwdistribution/{distributionGuid}/address/list`       |

### Flows (`kind: "flow"` — one tool, several upstream calls)

| Flow            | Mode  | Bundles |
|-----------------|-------|---------|
| `my_open_tasks` | read  | `GET /user/self` + `GET /type/task/list` (or `…/view/{id}/list` with `whereString`); `dueWithinDays` → `interval-end` |
| `task_overview` | read  | task record + `…/link/list` + `…/tags`, fetched in parallel |
| `create_task`   | write | `POST /type/task` + optional `POST …/link` to a target object; if the create response yields no GGUID, the flow returns a warning instead of guessing |
| `find_contact`  | read  | smartsearch (addresses) + phone-number search, in parallel |
| `contact_360`   | read  | address + collection dossier + tags + links, in parallel |
| `create_address_safe` | write | `POST /type/address/duplicates` first; creates only when no candidates found (`force: true` overrides). Unparseable duplicate responses count as hits — conservative by design |

| `create_appointment_safe` | write | optional `GET /type/appointment/conflicts` gate (skipped without `userOids`, `force: true` overrides) → `POST /type/appointment` → one `POST …/participant` per GGUID |

Also new (write, atomic): `set_contact_persons_active`
(`POST /type/address/{gguid}/contactperson/activate|deactivate`),
`add_appointment_participant`, `remove_appointment_participant`,
`set_recurrence` (POST create / PUT update in one tool),
`delete_recurrence`, `set_alarm`, `delete_alarm`,
`set_object_permission`, `delete_object_permission`,
`add_distribution_addresses`, `remove_distribution_address`,
`convert_lead`, `recalculate_opportunity_positions`.

### Flow compaction (P7)

Every flow accepts `compact` (default **true**): the combined result is
recursively pruned of null/undefined values, empty strings, empty arrays,
and empty objects (`false` and `0` are kept — see `prune` in
`src/flows/util.ts`). genesisWorld payloads are dominated by null fields,
so this cuts flow results drastically without any per-type schema
knowledge. Atomic tools stay 1:1 pass-through by design.

### Result cap & logging (P6)

- Every tool result passes through `capResult` (lib.ts): bodies above
  `GENESISWORLD_MAX_RESULT_CHARS` (default 60000, `0` disables) are
  truncated with an actionable hint (use `fields`/paging/views).
- Every upstream call logs `METHOD path -> status (ms)` to stderr;
  `GENESISWORLD_QUIET=true` disables.

Flow rules: flows never hide destructive steps (a flow that writes is
`mode: "write"`); sub-results are embedded as parsed JSON in one combined
document (`src/flows/util.ts`); **no hardcoded guessed field names** — the
spec defines no per-type field vocabulary (only `KEYWORD` is confirmed), so
field semantics stay caller-provided, discoverable via
`genesisworld://metadata/{objectType}`. That is also why ROADMAP item P3.4
(typed `complete_task`) was dropped.

### Write tools (`mode: "write"` — hidden in read-only mode)

| #  | Tool                    | HTTP   | Endpoint                                                            |
|----|-------------------------|--------|---------------------------------------------------------------------|
| 22 | `create_data_object`    | POST   | `/v7.0/type/{dataObjectType}`                                       |
| 23 | `update_data_object`    | PUT    | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}`                     |
| 24 | `delete_data_object`    | DELETE | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}` (→ recycle bin)     |
| 25 | `restore_data_object`   | POST   | `/v7.0/type/{dataObjectType}/rbin/undelete`                         |
| 26 | `create_link`           | POST   | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/link`                |
| 27 | `delete_link`           | DELETE | `/v7.0/type/{t}/{gguid}/link/{objecttype2}/{guid2}/{attribute}`     |
| 28 | `set_object_tags`       | POST   | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags/user`           |
| 29 | `append_notes`          | POST   | `/v7.0/type/{t}/{gguid}/notes/{fieldName}` (text/plain or text/html body) |
| 30 | `create_dossier_entry`  | POST   | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier`             |
| 31 | `delete_dossier_entry`  | DELETE | `/v7.0/type/{t}/{gguid}/dossier/{dossierEntryGGUID}`                |

Write-payload shape: create/update send `{ fields: { FIELD: value } }`;
link bodies are `{ fields: { OBJECTTYPE1, GGUID1, OBJECTTYPE2, GGUID2,
ATTRIBUTE? } }`; bulk load and undelete send a plain JSON array of GGUIDs;
the notes affix goes as a raw text body with `prepend`/`with-timestamp`
query params.

### Tool categories

**Search & Discovery (1–3):** Smart full-text search across all types, single-object fetch with field selection, dossier with linked records/activities/documents.

**List & Filter (4–6, 12, 19):** Paginated lists with `search`, time-range, and link-based filtering — list view (lean), full view (all fields), plus record counts.

**View-based (5, 6, 16, 20):** View discovery, detail, and view-filtered listing in both list and full view. Tools 6 and 20 support the `whereString` parameter for field-level filtering (syntax depends on genesisWorld API version).

**Relationships (9, 13):** Link listing with type/attribute/direction filters, and primary-link-parent resolution.

**Type & Metadata (7, 8):** Object type discovery and full field/relationship schema.

**User & Group (14, 15):** User listing and self-profile.

**Tags (17, 18):** System-wide tag listing and per-object tag assignment.

## How to add an atomic tool

1. Find the operation in `swagger.json` (`paths` → path → method) and pick
   the matching `ROADMAP.md` item (or append a new one first).
2. Decide `mode` **semantically** (see Operating modes). If the tool writes,
   it must be gated by the mode filter and carry `destructiveHint` where
   appropriate.
3. Create `src/tools/<name>.ts` with a `register<Name>` function:
   - Map path params to `encodeURIComponent`-ed path segments.
   - Map query params 1:1, wire names preserved, camelCase tool args.
   - Set `annotations` (`readOnlyHint` must match the declared `mode`).
   - Return `jsonResult(text)`; wrap handlers in `try/catch` returning
     `errorResult(err)`.
   - Export `tool: ToolDef` (name, mode, kind, ops, register).
4. Add the entry to `REGISTRY` in `src/registry.ts`.
5. Add one entry to `TOOL_CONFIGS` in `src/tools/all-tools.test.ts`
   (name, sample args, expected path, expected query params → 4 generated
   tests). Run `npm test` — `registry.test.ts` also asserts entry counts,
   annotation/mode consistency, and mode filtering.
6. Update `README.md`, the tool table above, and the ROADMAP item status —
   same commit (standing order #1).

## Configuration (runtime, not hardcoded)

All connection details are passed at startup via environment variables. The
demo URL in the spec (`http://demo.cas.de/genesisrest.svc`) is **only an
example** and is never baked into the code.

| Variable                   | Required | Purpose                                          |
| -------------------------- | -------- | ------------------------------------------------ |
| `GENESISWORLD_BASE_URL`    | yes      | Base URL of the REST service (no trailing slash) |
| `GENESISWORLD_USERNAME`    | yes\*    | Basic Auth user                                  |
| `GENESISWORLD_PASSWORD`    | yes\*    | Basic Auth password                              |
| `GENESISWORLD_PRODUCT_KEY` | no       | Sent as `X-CAS-PRODUCT-KEY` header only if set   |
| `GENESISWORLD_READ_ONLY`   | no       | `true` → read-only mode (equivalent: `--read-only` CLI flag) |
| `GENESISWORLD_MAX_RESULT_CHARS` | no  | Result cap in chars (default 60000; `0` disables truncation) |
| `GENESISWORLD_QUIET`       | no       | `true` → suppress per-request stderr logging      |
| `MCP_TRANSPORT`            | no       | `http` (default in Docker) or `stdio`            |
| `MCP_HOST`                 | no       | Bind host for HTTP mode (default: `0.0.0.0`)     |
| `MCP_PORT`                 | no       | Bind port for HTTP mode (default: `3000`)        |

\* Auth scheme for now is **HTTP Basic**. The spec also documents OAuth2
(`authorizationCode`) — planned as P6.4. `X-CAS-PRODUCT-KEY` is supported
optionally because some installations require it alongside Basic.

## Deployment (Docker HTTP)

The server runs as a standalone Docker container exposing a **Streamable HTTP**
endpoint. Build and run locally:

```bash
docker build -t cas-genesisworld-mcp .

docker run -d \
  --name cas-genesisworld-mcp \
  -p 8084:3000 \
  -e GENESISWORLD_BASE_URL="http://your-genesisworld-server/genesisrest.svc" \
  -e GENESISWORLD_USERNAME="your-user" \
  -e GENESISWORLD_PASSWORD="your-password" \
  cas-genesisworld-mcp
```

The container starts on port **3000** internally (exposed as 8084) and
listens on `GET /mcp` for Streamable HTTP. No auth on the MCP endpoint
itself — credentials stay inside the container as environment variables.

Rebuild after code changes: `docker build`, then stop/rm/run again with the
same env vars.

## Known spec quirks (NSwag-generated)

- The pervasive `{"nullable": true, "oneOf": [{"$ref": ...}]}` pattern is just
  "optional reference to X" — not real polymorphism. There are no
  discriminators and almost no `allOf`.
- Some 200 responses carry **mislabeled** schema names (e.g. `GetDataObject`
  references `CheckForContactDuplicatesRequestData`). Because atomic tools
  are pass-throughs, we do not bind to these response types.
- `POST` ≠ write in this API — several POST endpoints are reads (bulk load,
  duplicate check, salutation formatting). Always classify semantically.
- **Optimistic concurrency is enforced but undocumented**: live
  installations reject `PUT /type/{t}/{gguid}` without a valid `If-Match`
  header (HTTP 400 `ILLEGAL_ARGUMENT_VALUE`, "Mandatory header 'If-Match'
  is missing or invalid") — swagger.json mentions neither the header nor
  the objects' `ETAG` field (live finding, 2026-07-22).
  `update_data_object` therefore accepts an `etag` argument and
  auto-fetches the ETag (`GET …?fields=ETAG`) when it's omitted; bare
  values are quoted per RFC 7232. If other PUT endpoints (alarm, image,
  recurrence) turn out to enforce it too, apply the same pattern via
  `apiSend`'s `extraHeaders` parameter.

## Out of scope

- Per-type tools for **custom** (non-native) data-object types — generic
  tools only, by design (pillar 1).
- Full 209-operation coverage — portal/registration, report-template, and
  admin plumbing stay out unless a concrete agent use case appears.
- OAuth2 until P6.4.
