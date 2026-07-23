<p align="center">
  <img src="https://www.acp-gruppe.com/hs-fs/hubfs/cas_genesis_world-1.png?width=1600&height=600&name=cas_genesis_world-1.png" alt="CAS genesisWorld" width="100%" />
</p>

# cas-genesisworld-mcp

[![npm](https://img.shields.io/npm/v/cas-genesis-world-mcp?logo=npm&label=cas-genesis-world-mcp)](https://www.npmjs.com/package/cas-genesis-world-mcp)
[![CI](https://github.com/Gnidreve/Genesis-World-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/Gnidreve/Genesis-World-MCP/actions/workflows/ci.yml)

An [MCP](https://modelcontextprotocol.io) server for the **CAS genesisWorld
REST Webservice v7.0**.

**Current state:** 67 tools — 41 read / 26 write, including 7 native-type
**flows** for Aufgaben/tasks, Adressen/contacts, and Termine/appointments
(duplicate-safe address creation, conflict-safe appointment creation, 360°
contact view), plus document/email reads, distribution lists, lead
conversion, and permission management — gated by a `--read-only` launch
mode. Flow results are compacted by default (null/empty fields pruned via
the `compact` param), with a configurable result cap and request logging.
See the machine-readable plan in [`ROADMAP.md`](./ROADMAP.md).

The full upstream API is committed as [`swagger.json`](./swagger.json) (cross-
reference). Working rules and architecture live in [`AGENTS.md`](./AGENTS.md).

## Modes

- **Default: read-write.** All 32 tools are registered.
- **Read-only:** start with the `--read-only` CLI flag or
  `GENESISWORLD_READ_ONLY=true`. The 10 mutating tools are then not
  registered at all (22 tools remain). Classification is semantic, not by
  HTTP verb — e.g. the POST-based bulk load stays available.

## Resources

- `genesisworld://readme` — static orientation document (domain model,
  navigation patterns, efficiency rules). Never changes during a session;
  also available as the `readme` tool for clients without resource support.
- `genesisworld://types` — data-object types accessible to the user, with
  permissions. Cached 15 min.
- `genesisworld://metadata/{objectType}` — field/relationship schema of one
  type (template, e.g. `genesisworld://metadata/ADDRESS`). Cached 15 min.
- `genesisworld://views/{objectType}` — saved views of one type (template,
  e.g. `genesisworld://views/TASK`). Cached 15 min.

## Tools (67)

### Flows (7)

One tool call, several upstream calls bundled server-side. All flows
accept `compact` (default `true`) — null/empty fields are pruned from the
combined result:

| Flow            | Mode  | What it does |
|-----------------|-------|--------------|
| `my_open_tasks` | read  | Current user + their task list (due window, saved view, or full-text filter) in one call |
| `task_overview` | read  | Task record + links + tags, fetched in parallel |
| `create_task`   | write | Create a task and optionally link it to another object (e.g. an address) |
| `find_contact`  | read  | Address search by name and/or phone number, in parallel |
| `contact_360`   | read  | Address + collection dossier + tags + links, fetched in parallel |
| `create_address_safe` | write | Duplicate check first — creates only when no candidates are found (`force` overrides) |
| `create_appointment_safe` | write | Optional conflict check → create → add participants, in one call |

### Read (35)

| # | Tool                               | Endpoint                                                          |
|---|------------------------------------|-------------------------------------------------------------------|
| 0 | `readme`                           | server-local static orientation document                          |
| 1 | `smart_search`                     | `GET /v7.0/smartsearch`                                           |
| 2 | `get_data_object`                  | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}`               |
| 3 | `get_dossier`                      | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier/full`  |
| 4 | `list_data_objects`                | `GET /v7.0/type/{dataObjectType}/list`                            |
| 5 | `list_views`                       | `GET /v7.0/type/{dataObjectType}/view/list`                       |
| 6 | `list_data_objects_by_view`        | `GET /v7.0/type/{dataObjectType}/view/{viewID}/list`              |
| 7 | `list_available_data_object_types` | `GET /v7.0/user/self/dataobjecttypepermission/list`               |
| 8 | `get_data_object_types_metadata`   | `GET /v7.0/metadata`                                              |
| 9 | `list_links`                       | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/list`     |
|10 | `list_recent_data_objects`         | `GET /v7.0/type/{dataObjectType}/recent/list`                     |
|11 | `get_available_products`           | `GET /v7.0/type/gwopportunity/availableproducts`                  |
|12 | `get_data_object_count`            | `GET /v7.0/type/{dataObjectType}/count`                           |
|13 | `get_primary_link_parents`         | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/primarylinkparents`|
|14 | `list_users`                       | `GET /v7.0/user/list`                                             |
|15 | `get_user_self`                    | `GET /v7.0/user/self`                                             |
|16 | `get_view`                         | `GET /v7.0/type/{dataObjectType}/view/{viewID}`                   |
|17 | `list_tags`                        | `GET /v7.0/tags`                                                  |
|18 | `get_object_tags`                  | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags`          |
|19 | `get_full_data_objects`            | `GET /v7.0/type/{dataObjectType}/full`                            |
|20 | `list_data_objects_by_view_full`   | `GET /v7.0/type/{dataObjectType}/view/{viewID}/full`              |
|21 | `get_data_objects_bulk`            | `POST /v7.0/type/{dataObjectType}/records` (read despite POST)    |
|21a| `get_ticket_service_agreements`    | `GET /v7.0/type/task/ticket/serviceagreements`                    |
|21b| `get_vcard`                        | `GET /v7.0/type/address/{dataObjectGGUID}/vcard`                  |
|21c| `get_salutation`                   | `POST /v7.0/type/address/salutation` (read despite POST)          |
|21d| `format_phone_number`              | `POST /v7.0/type/address/formatphonenumber` (read despite POST)   |
|21e| `check_appointment_conflicts`      | `GET /v7.0/type/appointment/conflicts`                            |
|21f| `get_participant_summary`          | `GET /v7.0/type/appointment/{gguid}/participant/summary`          |
|21g| `list_appointment_participants`    | `GET /v7.0/type/appointment/{gguid}/participant/full`             |
|21h| `get_document_file`                | `GET /v7.0/type/document/{gguid}/file` (never locks)              |
|21i| `list_document_versions`           | `GET /v7.0/type/document/{gguid}/file/version/list`               |
|21j| `list_email_attachments`           | `GET /v7.0/type/emailstore/{gguid}/attachment/list`               |
|21k| `get_email_attachment`             | `GET /v7.0/type/emailstore/{gguid}/attachment/{attachmentId}`     |
|21l| `get_email_file`                   | `GET /v7.0/type/emailstore/{gguid}/file`                          |
|21m| `list_object_permissions`          | `GET /v7.0/type/{t}/{gguid}/permission/full`                      |
|21n| `list_distributions`               | `GET /v7.0/type/gwdistribution/list`                              |
|21o| `list_distribution_addresses`      | `GET /v7.0/type/gwdistribution/{distributionGuid}/address/list`   |

### Write (23 — hidden in read-only mode, plus the write flows)

| # | Tool                    | Endpoint                                                             |
|---|-------------------------|----------------------------------------------------------------------|
|22 | `create_data_object`    | `POST /v7.0/type/{dataObjectType}`                                   |
|23 | `update_data_object`    | `PUT /v7.0/type/{dataObjectType}/{dataObjectGGUID}` (handles the required `If-Match` ETag automatically) |
|24 | `delete_data_object`    | `DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}`               |
|25 | `restore_data_object`   | `POST /v7.0/type/{dataObjectType}/rbin/undelete`                     |
|26 | `create_link`           | `POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link`            |
|27 | `delete_link`           | `DELETE /v7.0/type/{t}/{gguid}/link/{objecttype2}/{guid2}/{attribute}`|
|28 | `set_object_tags`       | `POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags/user`       |
|29 | `append_notes`          | `POST /v7.0/type/{t}/{gguid}/notes/{fieldName}`                      |
|30 | `create_dossier_entry`  | `POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier`         |
|31 | `delete_dossier_entry`  | `DELETE /v7.0/type/{t}/{gguid}/dossier/{dossierEntryGGUID}`          |
|32 | `set_contact_persons_active` | `POST /v7.0/type/address/{gguid}/contactperson/activate\|deactivate` |
|33 | `add_appointment_participant`    | `POST /v7.0/type/appointment/{gguid}/participant`                |
|34 | `remove_appointment_participant` | `DELETE /v7.0/type/appointment/{gguid}/participant/{participantGGUID}` |
|35 | `set_recurrence`        | `POST /v7.0/type/{t}/recurrence` / `PUT …/recurrence/{periodGuid}`   |
|36 | `delete_recurrence`     | `DELETE /v7.0/type/{t}/recurrence/{periodGuid}`                      |
|37 | `set_alarm`             | `PUT /v7.0/type/{t}/{gguid}/alarm/self`                              |
|38 | `delete_alarm`          | `DELETE /v7.0/type/{t}/{gguid}/alarm/self`                           |
|39 | `set_object_permission` | `POST /v7.0/type/{t}/{gguid}/permission`                             |
|40 | `delete_object_permission` | `DELETE /v7.0/type/{t}/{gguid}/permission/{permissionGGUID}`      |
|41 | `add_distribution_addresses`  | `POST /v7.0/type/gwdistribution/{distributionGuid}/address`    |
|42 | `remove_distribution_address` | `DELETE /v7.0/type/gwdistribution/{distributionGuid}/address/{addressGGUID}` |
|43 | `convert_lead`          | `POST /v7.0/type/gwsllead/{dataObjectGGUID}/convert`                 |
|44 | `recalculate_opportunity_positions` | `PUT /v7.0/type/gwopportunitypos/recalculatevalues`      |

See [`AGENTS.md`](./AGENTS.md) for full descriptions, parameter details,
and categories.

## Requirements

- Node.js **18+** (uses the built-in global `fetch`)

## Build

The package is shipped as source. Build it once after unzipping:

```bash
npm install      # also runs the build via the "prepare" script
# or explicitly:
npm run build
```

This compiles `src/` → `dist/`.

## Configuration

Connection details are read from environment variables at startup. The demo URL
is only an example — set your own base URL.

| Variable                   | Required | Example                                   |
| -------------------------- | -------- | ----------------------------------------- |
| `GENESISWORLD_BASE_URL`    | yes      | `http://demo.cas.de/genesisrest.svc`      |
| `GENESISWORLD_USERNAME`    | yes      | `myuser`                                  |
| `GENESISWORLD_PASSWORD`    | yes      | `mypassword`                              |
| `GENESISWORLD_PRODUCT_KEY` | no       | sent as `X-CAS-PRODUCT-KEY` if provided   |
| `GENESISWORLD_READ_ONLY`   | no       | `true` = read-only mode (same as `--read-only`) |
| `GENESISWORLD_MAX_RESULT_CHARS` | no  | Result cap in chars (default 60000; `0` = off)  |
| `GENESISWORLD_QUIET`       | no       | `true` = no per-request stderr logging          |

## Run

### Option 1: Docker (recommended for production)

```bash
# Build the image
docker build -t cas-genesisworld-mcp .

# Run with Streamable HTTP on port 8084
docker run -d --name cas-genesisworld-mcp -p 8084:3000 \
  -e GENESISWORLD_BASE_URL="http://demo.cas.de/genesisrest.svc" \
  -e GENESISWORLD_USERNAME="myuser" \
  -e GENESISWORLD_PASSWORD="mypassword" \
  cas-genesisworld-mcp

# The MCP endpoint is now at http://localhost:8084/mcp
```

### Option 2: npx (development)

```bash
GENESISWORLD_BASE_URL="http://demo.cas.de/genesisrest.svc" \
GENESISWORLD_USERNAME="myuser" \
GENESISWORLD_PASSWORD="mypassword" \
npx .
```

(`npx .` resolves the `bin` entry in `package.json`. `node dist/index.js`
works identically.)

### Option 3: HTTP mode via env var

```bash
MCP_TRANSPORT=http MCP_PORT=3000 MCP_HOST=0.0.0.0 \
GENESISWORLD_BASE_URL="http://demo.cas.de/genesisrest.svc" \
GENESISWORLD_USERNAME="myuser" \
GENESISWORLD_PASSWORD="mypassword" \
node dist/index.js
```

## MCP client configuration

Point your MCP client at the server. You have two options:

### HTTP (recommended for remote/production)

```json
{
  "mcpServers": {
    "cas-genesisworld": {
      "url": "http://localhost:8084/mcp"
    }
  }
}
```

### stdio / npx (local development)

```json
{
  "mcpServers": {
    "cas-genesisworld": {
      "command": "npx",
      "args": ["-y", "/absolute/path/to/cas-genesisworld-mcp"],
      "env": {
        "GENESISWORLD_BASE_URL": "http://demo.cas.de/genesisrest.svc",
        "GENESISWORLD_USERNAME": "myuser",
        "GENESISWORLD_PASSWORD": "mypassword"
      }
    }
  }
}
```

If `npx` resolution gives you trouble, use the absolute path to the built file
instead:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/cas-genesisworld-mcp/dist/index.js"]
}
```

## Tests

Tests use [Vitest](https://vitest.dev) and mock the upstream API entirely
(no real genesisWorld connection needed).

```bash
# Run once (CI)
npm test

# Watch mode during development
npm run test:watch
```

**Coverage:** all API tool registrations are tested declaratively via
`src/tools/all-tools.test.ts`; `src/registry.test.ts` covers the registry,
read-only filtering, annotations, and the `readme` tool/resource. Adding a
new tool means:
1. Create the tool file in `src/tools/<name>.ts` (exports `register<Name>` +
   `tool: ToolDef`)
2. Add the entry to `REGISTRY` in `src/registry.ts`
3. Add one entry to the `TOOL_CONFIGS` array in `all-tools.test.ts`

Each API tool gets 4 tests: registration name, endpoint path + params,
success response, and error handling.

## Publishing (npm)

The package is `cas-genesis-world-mcp` (name is unclaimed on the npm
registry). Publishing is automated —
[`.github/workflows/publish.yml`](./.github/workflows/publish.yml) runs
tests and publishes whenever a version tag is pushed. One-time setup:

1. Create an npm account at npmjs.com (if you don't have one).
2. npmjs.com → profile → **Access Tokens** → *Generate New Token* →
   **Automation** — copy the token.
3. GitHub repo → *Settings* → *Secrets and variables* → *Actions* →
   *New repository secret*: name `NPM_TOKEN`, value = the token.

Then every release is just:

```bash
git tag v0.9.0 && git push origin v0.9.0
```

(Keep the tag in sync with the `version` in `package.json`.)

## Source layout

```
src/
├── index.ts          # Entry point: transports, server build, main()
├── lib.ts            # Shared: apiGet, jsonResult, errorResult
├── lib.test.ts       # Lib unit tests
├── types.ts          # ToolDef / ToolMode / ToolKind
├── registry.ts       # Tool registry, isReadOnly, registerTools
├── registry.test.ts  # Registry / mode / annotations / readme tests
├── resources/
│   ├── readme.ts     # Static orientation tool + resource
│   ├── metadata.ts   # Cached types/metadata/views resources
│   ├── metadata.test.ts
│   └── cache.ts      # In-memory TTL cache
├── __tests__/
│   └── test-utils.ts # Mock helpers (tools + resources)
└── tools/
    ├── all-tools.test.ts    # Declarative master test (all API tools)
    ├── smart_search.ts      # One file per tool
    ├── get_data_object.ts
    └── …
```

## Notes

- Logs are written to **stderr** so they never corrupt the stdio JSON-RPC
  stream.
- Responses are passed through as raw JSON (pretty-printed). The
  `smart_search` response shape is marked "undocumented" in the spec.
- The pinned `@modelcontextprotocol/sdk` version is `^1.0.0`. If `npm install`
  fails to resolve it, bump to the latest 1.x and rebuild.
