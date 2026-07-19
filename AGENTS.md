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
13 PUT). This implementation covers 20 of 133 GET endpoints.

## Currently implemented tools

| #  | Tool                               | HTTP | Endpoint                                                          | Read-only |
|----|------------------------------------|------|-------------------------------------------------------------------|-----------|
| 1  | `smart_search`                     | GET  | `/v7.0/smartsearch`                                               | ✅        |
| 2  | `get_data_object`                  | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}`                   | ✅        |
| 3  | `get_dossier`                      | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier/full`      | ✅        |
| 4  | `list_data_objects`                | GET  | `/v7.0/type/{dataObjectType}/list`                                | ✅        |
| 5  | `list_views`                       | GET  | `/v7.0/type/{dataObjectType}/view/list`                           | ✅        |
| 6  | `list_data_objects_by_view`        | GET  | `/v7.0/type/{dataObjectType}/view/{viewID}/list`                  | ✅        |
| 7  | `list_available_data_object_types` | GET  | `/v7.0/user/self/dataobjecttypepermission/list`                   | ✅        |
| 8  | `get_data_object_types_metadata`   | GET  | `/v7.0/metadata`                                                  | ✅        |
| 9  | `list_links`                       | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/list`         | ✅        |
| 10 | `list_recent_data_objects`         | GET  | `/v7.0/type/{dataObjectType}/recent/list`                         | ✅        |
| 11 | `get_available_products`           | GET  | `/v7.0/type/gwopportunity/availableproducts`                      | ✅        |
| 12 | `get_data_object_count`            | GET  | `/v7.0/type/{dataObjectType}/count`                               | ✅        |
| 13 | `get_primary_link_parents`         | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/primarylinkparents`| ✅        |
| 14 | `list_users`                       | GET  | `/v7.0/user/list`                                                 | ✅        |
| 15 | `get_user_self`                    | GET  | `/v7.0/user/self`                                                 | ✅        |
| 16 | `get_view`                         | GET  | `/v7.0/type/{dataObjectType}/view/{viewID}`                       | ✅        |
| 17 | `list_tags`                        | GET  | `/v7.0/tags`                                                      | ✅        |
| 18 | `get_object_tags`                  | GET  | `/v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags`              | ✅        |
| 19 | `get_full_data_objects`            | GET  | `/v7.0/type/{dataObjectType}/full`                                | ✅        |
| 20 | `list_data_objects_by_view_full`   | GET  | `/v7.0/type/{dataObjectType}/view/{viewID}/full`                  | ✅        |

### Tool categories

**Search & Discovery (1–3):** Smart full-text search across all types, single-object fetch with field selection, dossier with linked records/activities/documents.

**List & Filter (4–6, 12, 19):** Paginated lists with `search`, time-range, and link-based filtering — list view (lean), full view (all fields), plus record counts.

**View-based (5, 6, 16, 20):** View discovery, detail, and view-filtered listing in both list and full view. Tools 6 and 20 support the `whereString` parameter for field-level filtering (syntax depends on genesisWorld API version).

**Relationships (9, 13):** Link listing with type/attribute/direction filters, and primary-link-parent resolution.

**`whereString`-enabled endpoints (tools without view requirement):**
- Tool 10 (`list_recent_data_objects`): `GET /v7.0/type/{dataObjectType}/recent/list`
- Tool 11 (`get_available_products`): `GET /v7.0/type/gwopportunity/availableproducts`

**Type & Metadata (7, 8):** Object type discovery and full field/relationship schema.

**User & Group (14, 15):** User listing and self-profile.

**Tags (17, 18):** System-wide tag listing and per-object tag assignment.

## Deployment (Docker HTTP)

The server runs as a standalone Docker container exposing a **Streamable HTTP**
endpoint. Build and run locally:

```bash
# Build the image
docker build -t cas-genesisworld-mcp .

# Run with HTTP transport (default in the Docker image)
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

Rebuild after code changes:
```bash
docker build -t cas-genesisworld-mcp . && \
  docker stop cas-genesisworld-mcp && \
  docker rm cas-genesisworld-mcp && \
  docker run -d --name cas-genesisworld-mcp -p 8084:3000 \
    -e GENESISWORLD_BASE_URL="..." \
    -e GENESISWORLD_USERNAME="..." \
    -e GENESISWORLD_PASSWORD="..." \
    cas-genesisworld-mcp
```

## How to add another (GET) tool

1. Find the `GET` operation in `swagger.json` (`paths` → path → `get`).
2. Confirm it is read-only. If it is not a `GET`, **stop** — out of scope.
3. Create `src/tools/<name>.ts` with a `register<Name>` function that calls
   `server.registerTool(...)`:
   - Map path params to `encodeURIComponent`-ed path segments.
   - Map query params 1:1, keeping the API's original param names
     (e.g. `object-type`, `include-permissions`) on the wire while exposing
     camelCase argument names to the tool caller.
   - Return `jsonResult(text)`; never post-process or "interpret" the payload
     in this phase.
4. Keep handlers wrapped in `try/catch` returning `errorResult(err)`.
5. Import and call the `register<Name>(server)` function in `src/index.ts`.
6. Add a corresponding entry to the `TOOL_CONFIGS` array in
   `src/tools/all-tools.test.ts` — one object provides tool name, sample args,
   expected path, and expected query params. Four tests are generated
   automatically.
7. Run `npm test` to verify.

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
