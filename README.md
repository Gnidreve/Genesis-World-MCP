# cas-genesisworld-mcp

An [MCP](https://modelcontextprotocol.io) server for the **CAS genesisWorld
REST Webservice v7.0**.

**Current state:** 21 read tools (incl. the static `readme` orientation
tool/resource), central tool registry, and a `--read-only` launch mode.
**Direction:** a full read-write server with native-type flows (Aufgaben,
Adressen, Termine, …) — see the machine-readable plan in
[`ROADMAP.md`](./ROADMAP.md).

The full upstream API is committed as [`swagger.json`](./swagger.json) (cross-
reference). Working rules and architecture live in [`AGENTS.md`](./AGENTS.md).

## Modes

- **Default: read-write.** All registered tools are available. (Until write
  tools land — ROADMAP P2 — the server is factually read-only either way.)
- **Read-only:** start with the `--read-only` CLI flag or
  `GENESISWORLD_READ_ONLY=true`. Tools classified as writing are then not
  registered at all. Classification is semantic, not by HTTP verb.

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

## Tools (21)

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
