# AGENTS.md — CAS genesisWorld MCP

Guidance for any AI agent or developer working in this repository.

## What this is

An [MCP](https://modelcontextprotocol.io) server for the **CAS genesisWorld
REST Webservice v7.0** — aiming to be *the* genesisWorld MCP, not a thin
wrapper. The full upstream API surface is committed at the repo root as
[`swagger.json`](./swagger.json) and is the **single source of truth /
cross-reference** for every tool.

The project plan lives in [`ROADMAP.md`](./ROADMAP.md) (machine-readable,
stable item IDs). Current state: **P0 done** (20 read tools), **P1 mostly
done** (registry, modes, annotations, readme tool/resource, instructions —
P1.5 metadata resources still open).

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
  (true for deletes), `idempotentHint`, `title`.
- Until P2 lands, the server is factually read-only in both modes (no write
  tools exist yet); the old "GET-only by design" rule is **superseded** by
  this model.

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
3. **Resources for slow-moving data.** Type metadata, view lists, user
   lists, and the static server overview are exposed as MCP resources so
   agents don't burn tool calls on schema discovery (readme done; metadata
   resources = P1.5, open).
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
├── resources/      # MCP resources: readme.ts (static orientation)
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

## Currently implemented tools (21 — all `mode: "read"`, atomic)

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

## Out of scope

- Per-type tools for **custom** (non-native) data-object types — generic
  tools only, by design (pillar 1).
- Full 209-operation coverage — portal/registration, report-template, and
  admin plumbing stay out unless a concrete agent use case appears.
- OAuth2 until P6.4.
