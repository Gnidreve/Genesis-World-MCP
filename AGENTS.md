# AGENTS.md — CAS genesisWorld MCP

Guidance for any AI agent or developer working in this repository.

## What this is

An [MCP](https://modelcontextprotocol.io) server that exposes a **curated,
read-only subset** of the **CAS genesisWorld REST Webservice v7.0** as MCP
tools. The full upstream API surface is committed at the repo root as
[`swagger.json`](./swagger.json) and is the **single source of truth /
cross-reference** for every tool in `src/index.ts`.

## Scope classification — READ THIS BEFORE ADDING TOOLS

> **This server is GET-only. We exclusively integrate read endpoints.**

- **ONLY `GET` operations from `swagger.json` may be turned into tools.**
- `POST`, `PUT`, `PATCH`, and `DELETE` operations are **out of scope** and
  must **not** be added in the current phase — they mutate CRM data and are
  excluded by design.
- A tool exposes exactly **one** API call in this phase. Bundling multiple
  calls into a single tool ("flows") is a deliberate later phase and is not
  implemented yet.
- When in doubt about whether an operation is safe to add, it isn't. Default
  to leaving it out.

The upstream API has 209 operations in total (133 GET / 46 POST / 17 DELETE /
13 PUT). We are intentionally starting with a tiny read-only slice.

## Currently implemented tools

| Tool                               | HTTP | Endpoint                                                          | Read-only |
| ---------------------------------- | ---- | ----------------------------------------------------------------- | --------- |
| `smart_search`                     | GET  | `/v7.0/smartsearch`                                               | ✅        |
| `get_data_object`                  | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}`                  | ✅        |
| `get_dossier`                      | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier/full`     | ✅        |
| `list_data_objects`                | GET  | `/v7.0/type/{dataObjectType}/list`                               | ✅        |
| `list_views`                       | GET  | `/v7.0/type/{dataObjectType}/view/list`                          | ✅        |
| `list_data_objects_by_view`        | GET  | `/v7.0/type/{dataObjectType}/view/{viewID}/list`                 | ✅        |
| `list_available_data_object_types` | GET  | `/v7.0/user/self/dataobjecttypepermission/list`                 | ✅        |
| `get_data_object_types_metadata`   | GET  | `/v7.0/metadata`                                                 | ✅        |

Tools 4–6 are **list/filter tools**: `list_data_objects` provides paginated listing of data
objects with search, time-range, and link-based filtering; `list_views` discovers available
views for a type; `list_data_objects_by_view` additionally supports a `whereString` parameter
for field-level filtering (syntax depends on the genesisWorld API version — try
`FIELDNAME='value'` or `FIELDNAME LIKE 'pattern'`).

The last two are **type-discovery** tools: `list_available_data_object_types`
returns the types the authenticated user may access (lean, permission-scoped,
the canonical source for valid `dataObjectType` / `object-type(s)` values);
`get_data_object_types_metadata` returns the richer type descriptions incl.
field schemas (useful for filling the `fields` argument of `get_data_object`).

## Deployment

This server runs as a Docker container managed by root's `mcp-swarm` at
`/var/root/.mcp-swarm/docker-compose.yml`. Credentials are stored exclusively
in `/var/root/.mcp-swarm/.env` (root-only). The container exposes a
**Streamable HTTP** endpoint at `http://127.0.0.1:8084/mcp` — no auth required
from the MCP client since secrets never leave the container.

To rebuild after code changes:
```bash
cd /var/root/.mcp-swarm
DOCKER_HOST="unix:///var/lib/sysdocker/.colima/default/docker.sock" \
  docker-compose build cas-genesisworld-mcp && \
  docker-compose up -d cas-genesisworld-mcp
```

## How to add another (GET) tool

1. Find the `GET` operation in `swagger.json` (`paths` → path → `get`).
2. Copy the `server.registerTool(...)` pattern from `buildServer()` in
   `src/index.ts`. Note: all tool registration lives inside `buildServer()`.
3. Map path params to `encodeURIComponent`-ed path segments.
4. Keep handlers wrapped in `try/catch` returning `errorResult(err)`.

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
| `MCP_TRANSPORT`            | no       | `http` (default in Docker) or `stdio`            |
| `MCP_HOST`                 | no       | Bind host for HTTP mode (default: `0.0.0.0`)     |
| `MCP_PORT`                 | no       | Bind port for HTTP mode (default: `3000`)        |

\* Auth scheme for this phase is **HTTP Basic**. The spec also documents OAuth2
(`authorizationCode`) and an API-key product key; those are not the chosen path
here. `X-CAS-PRODUCT-KEY` is supported optionally because some installations
require it alongside Basic — it is sent only when the env var is present.

## How to add another (GET) tool

1. Find the `GET` operation in `swagger.json` (`paths` → path → `get`).
2. Confirm it is read-only. If it is not a `GET`, **stop** — out of scope.
3. Add a `server.registerTool(...)` call inside `buildServer()` in `src/index.ts`:
   - Map path params to `encodeURIComponent`-ed path segments.
   - Map query params 1:1, keeping the API's original param names
     (e.g. `object-type`, `include-permissions`) on the wire while exposing
     camelCase argument names to the tool caller.
   - Return `jsonResult(text)`; never post-process or "interpret" the payload
     in this phase.
4. Keep handlers wrapped in `try/catch` returning `errorResult(err)`.

## Known spec quirks (NSwag-generated)

- The pervasive `{"nullable": true, "oneOf": [{"$ref": ...}]}` pattern is just
  "optional reference to X" — not real polymorphism. There are no
  discriminators and almost no `allOf`.
- Some 200 responses carry **mislabeled** schema names (e.g. `GetDataObject`
  references `CheckForContactDuplicatesRequestData`). Because tools are
  read-only pass-throughs, we do not bind to these response types.

## Out of scope (current phase)

- Any write/mutating operation.
- Multi-call "flow" tools.
- OAuth2 authorization-code flow.
- Response schema validation / typed deserialization.
