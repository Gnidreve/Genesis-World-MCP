# cas-genesisworld-mcp

An [MCP](https://modelcontextprotocol.io) server exposing a **read-only
(GET-only)** subset of the **CAS genesisWorld REST Webservice v7.0**.

Phase 1 ships five read-only tools, each mapping to a single GET call:

| Tool                               | Endpoint                                                          |
| ---------------------------------- | ----------------------------------------------------------------- |
| `smart_search`                     | `GET /v7.0/smartsearch`                                           |
| `get_data_object`                  | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}`              |
| `get_dossier`                      | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier/full` |
| `list_available_data_object_types` | `GET /v7.0/user/self/dataobjecttypepermission/list`             |
| `get_data_object_types_metadata`   | `GET /v7.0/metadata`                                             |

The two `*_types*` tools exist for **type discovery** — they let an agent find
the valid `dataObjectType` / `object-type(s)` values used by the other tools.

The full upstream API is committed as [`swagger.json`](./swagger.json) (cross-
reference). Scope rules live in [`AGENTS.md`](./AGENTS.md). **Only GET endpoints
are integrated.**

## Requirements

- Node.js **18+** (uses the built-in global `fetch`)

## Build

The package is shipped as source. Build it once after unzipping:

```bash
npm install      # also runs the build via the "prepare" script
# or explicitly:
npm run build
```

This compiles `src/index.ts` → `dist/index.js`.

## Configuration

Connection details are read from environment variables at startup. The demo URL
is only an example — set your own base URL.

| Variable                   | Required | Example                                   |
| -------------------------- | -------- | ----------------------------------------- |
| `GENESISWORLD_BASE_URL`    | yes      | `http://demo.cas.de/genesisrest.svc`      |
| `GENESISWORLD_USERNAME`    | yes      | `myuser`                                  |
| `GENESISWORLD_PASSWORD`    | yes      | `mypassword`                              |
| `GENESISWORLD_PRODUCT_KEY` | no       | sent as `X-CAS-PRODUCT-KEY` if provided   |

## Run (npx)

After building, the server is runnable as a local bin via `npx`:

```bash
GENESISWORLD_BASE_URL="http://demo.cas.de/genesisrest.svc" \
GENESISWORLD_USERNAME="myuser" \
GENESISWORLD_PASSWORD="mypassword" \
npx .
```

(`npx .` resolves the `bin` entry in `package.json`. `node dist/index.js`
works identically.)

## MCP client configuration

Point your MCP client at the built server. Example client config block:

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

## Notes

- Logs are written to **stderr** so they never corrupt the stdio JSON-RPC
  stream.
- Responses are passed through as raw JSON (pretty-printed). The
  `smart_search` response shape is marked "undocumented" in the spec.
- The pinned `@modelcontextprotocol/sdk` version is `^1.0.0`. If `npm install`
  fails to resolve it, bump to the latest 1.x and rebuild.
