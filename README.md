<p align="center">
  <img src="https://www.acp-gruppe.com/hs-fs/hubfs/cas_genesis_world-1.png?width=1600&height=600&name=cas_genesis_world-1.png" alt="CAS genesisWorld" width="100%" />
</p>

# cas-genesisworld-mcp

[![npm](https://img.shields.io/npm/v/cas-genesis-world-mcp?logo=npm&label=npm)](https://www.npmjs.com/package/cas-genesis-world-mcp)
[![Docker](https://img.shields.io/docker/v/vaatu/cas-genesis-world-mcp?logo=docker&label=docker)](https://hub.docker.com/r/vaatu/cas-genesis-world-mcp)
[![CI](https://github.com/Gnidreve/Genesis-World-MCP/actions/workflows/ci.yml/badge.svg)](https://github.com/Gnidreve/Genesis-World-MCP/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/Gnidreve/Genesis-World-MCP)](./LICENSE)

Connect Claude, Cursor, or any [MCP](https://modelcontextprotocol.io)-compatible
AI agent to your **CAS genesisWorld** CRM. Search contacts, manage tasks and
appointments, and read or write records — through natural language, without
writing a single API call.

- **67 tools**, including **7 native flows** that bundle multi-step CRM
  operations (like checking for scheduling conflicts before booking a
  meeting, or checking for duplicates before creating a contact) into a
  single call.
- **Full read/write access** to tasks, contacts, appointments, documents,
  distribution lists, and more — plus generic access to any custom object
  type your installation defines.
- **Read-only mode** available for safe, exploratory use.
- Ships as a ready-made **Docker image** or **npm package**.

## Quick start

Add this to your MCP client's config (e.g. Claude Desktop's
`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cas-genesisworld": {
      "command": "npx",
      "args": ["-y", "cas-genesis-world-mcp"],
      "env": {
        "GENESISWORLD_BASE_URL": "http://your-genesisworld-server/genesisrest.svc",
        "GENESISWORLD_PRODUCT_KEY": "your-product-key",
        "GENESISWORLD_USERNAME": "your-username",
        "GENESISWORLD_PASSWORD": "your-password"
      }
    }
  }
}
```

Restart your client — the tools show up automatically. Ask your agent to
find a contact, list your open tasks, or book a meeting, and it takes it
from there.

Prefer a persistent, self-hosted server instead of a per-client process?
See [Self-hosting with Docker](#self-hosting-with-docker) below.

## What you can ask it

Once connected, your agent can handle requests like:

- *"Find the contact info for Jane Doe and show me her open tasks."*
- *"Create a follow-up task for this lead and link it to their contact record."*
- *"Book a meeting with the sales team next Tuesday at 10am — check everyone's
  calendar for conflicts first."*
- *"Check for possible duplicates before creating a new contact for Acme Corp."*

Requests like these are answered by **flows** — single tool calls that
bundle the multi-step sequence of API requests a human would otherwise have
to script by hand.

## Tools & flows

### Flows — compound actions, one call each

| Flow            | Mode  | What it does |
|-----------------|-------|--------------|
| `my_open_tasks` | read  | Current user + their task list (due window, saved view, or full-text filter) in one call |
| `task_overview` | read  | Task record + links + tags, fetched in parallel |
| `create_task`   | write | Create a task and optionally link it to another object (e.g. a contact) |
| `find_contact`  | read  | Contact search by name and/or phone number, in parallel |
| `contact_360`   | read  | Contact + collection dossier + tags + links, fetched in parallel |
| `create_address_safe` | write | Duplicate check first — creates only when no candidates are found |
| `create_appointment_safe` | write | Optional conflict check → create → add participants, in one call |

<details>
<summary><strong>Full tool reference (60 atomic tools)</strong></summary>

#### Read (37)

| Tool                               | Endpoint                                                          |
|-------------------------------------|-------------------------------------------------------------------|
| `smart_search`                     | `GET /v7.0/smartsearch`                                           |
| `get_data_object`                  | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}`               |
| `get_dossier`                      | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier/full`  |
| `list_data_objects`                | `GET /v7.0/type/{dataObjectType}/list`                            |
| `list_views`                       | `GET /v7.0/type/{dataObjectType}/view/list`                       |
| `list_data_objects_by_view`        | `GET /v7.0/type/{dataObjectType}/view/{viewID}/list`              |
| `list_available_data_object_types` | `GET /v7.0/user/self/dataobjecttypepermission/list`               |
| `get_data_object_types_metadata`   | `GET /v7.0/metadata`                                              |
| `list_links`                       | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link/list`     |
| `list_recent_data_objects`         | `GET /v7.0/type/{dataObjectType}/recent/list`                     |
| `get_available_products`           | `GET /v7.0/type/gwopportunity/availableproducts`                  |
| `get_data_object_count`            | `GET /v7.0/type/{dataObjectType}/count`                           |
| `get_primary_link_parents`         | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/primarylinkparents` |
| `list_users`                       | `GET /v7.0/user/list`                                             |
| `get_user_self`                    | `GET /v7.0/user/self`                                             |
| `get_view`                         | `GET /v7.0/type/{dataObjectType}/view/{viewID}`                   |
| `list_tags`                        | `GET /v7.0/tags`                                                  |
| `get_object_tags`                  | `GET /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags`          |
| `get_full_data_objects`            | `GET /v7.0/type/{dataObjectType}/full`                            |
| `list_data_objects_by_view_full`   | `GET /v7.0/type/{dataObjectType}/view/{viewID}/full`              |
| `get_data_objects_bulk`            | `POST /v7.0/type/{dataObjectType}/records` (read despite POST)    |
| `get_ticket_service_agreements`    | `GET /v7.0/type/task/ticket/serviceagreements`                    |
| `get_vcard`                        | `GET /v7.0/type/address/{dataObjectGGUID}/vcard`                  |
| `get_salutation`                   | `POST /v7.0/type/address/salutation` (read despite POST)          |
| `format_phone_number`              | `POST /v7.0/type/address/formatphonenumber` (read despite POST)   |
| `check_appointment_conflicts`      | `GET /v7.0/type/appointment/conflicts`                            |
| `get_participant_summary`          | `GET /v7.0/type/appointment/{gguid}/participant/summary`          |
| `list_appointment_participants`    | `GET /v7.0/type/appointment/{gguid}/participant/full`             |
| `get_document_file`                | `GET /v7.0/type/document/{gguid}/file` (never locks)              |
| `list_document_versions`           | `GET /v7.0/type/document/{gguid}/file/version/list`               |
| `list_email_attachments`           | `GET /v7.0/type/emailstore/{gguid}/attachment/list`               |
| `get_email_attachment`             | `GET /v7.0/type/emailstore/{gguid}/attachment/{attachmentId}`     |
| `get_email_file`                   | `GET /v7.0/type/emailstore/{gguid}/file`                          |
| `list_object_permissions`          | `GET /v7.0/type/{t}/{gguid}/permission/full`                      |
| `list_distributions`               | `GET /v7.0/type/gwdistribution/list`                              |
| `list_distribution_addresses`      | `GET /v7.0/type/gwdistribution/{distributionGuid}/address/list`   |
| `readme` (tool form)                | server-local static orientation document                          |

#### Write (23 — hidden in read-only mode, along with the write flows above)

| Tool                    | Endpoint                                                             |
|-------------------------|------------------------------------------------------------------------|
| `create_data_object`    | `POST /v7.0/type/{dataObjectType}`                                   |
| `update_data_object`    | `PUT /v7.0/type/{dataObjectType}/{dataObjectGGUID}`                  |
| `delete_data_object`    | `DELETE /v7.0/type/{dataObjectType}/{dataObjectGGUID}`               |
| `restore_data_object`   | `POST /v7.0/type/{dataObjectType}/rbin/undelete`                     |
| `create_link`           | `POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/link`            |
| `delete_link`           | `DELETE /v7.0/type/{t}/{gguid}/link/{objecttype2}/{guid2}/{attribute}` |
| `set_object_tags`       | `POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/tags/user`       |
| `append_notes`          | `POST /v7.0/type/{t}/{gguid}/notes/{fieldName}`                      |
| `create_dossier_entry`  | `POST /v7.0/type/{dataObjectType}/{dataObjectGGUID}/dossier`         |
| `delete_dossier_entry`  | `DELETE /v7.0/type/{t}/{gguid}/dossier/{dossierEntryGGUID}`          |
| `set_contact_persons_active` | `POST /v7.0/type/address/{gguid}/contactperson/activate\|deactivate` |
| `add_appointment_participant`    | `POST /v7.0/type/appointment/{gguid}/participant`                |
| `remove_appointment_participant` | `DELETE /v7.0/type/appointment/{gguid}/participant/{participantGGUID}` |
| `set_recurrence`        | `POST /v7.0/type/{t}/recurrence` / `PUT …/recurrence/{periodGuid}`   |
| `delete_recurrence`     | `DELETE /v7.0/type/{t}/recurrence/{periodGuid}`                      |
| `set_alarm`             | `PUT /v7.0/type/{t}/{gguid}/alarm/self`                              |
| `delete_alarm`          | `DELETE /v7.0/type/{t}/{gguid}/alarm/self`                           |
| `set_object_permission` | `POST /v7.0/type/{t}/{gguid}/permission`                             |
| `delete_object_permission` | `DELETE /v7.0/type/{t}/{gguid}/permission/{permissionGGUID}`      |
| `add_distribution_addresses`  | `POST /v7.0/type/gwdistribution/{distributionGuid}/address`    |
| `remove_distribution_address` | `DELETE /v7.0/type/gwdistribution/{distributionGuid}/address/{addressGGUID}` |
| `convert_lead`          | `POST /v7.0/type/gwsllead/{dataObjectGGUID}/convert`                 |
| `recalculate_opportunity_positions` | `PUT /v7.0/type/gwopportunitypos/recalculatevalues`      |

The full upstream API this is built on is committed as
[`swagger.json`](./swagger.json).

</details>

## Resources

Beyond tools, the server exposes MCP resources for data that rarely
changes, so your agent doesn't burn tool calls rediscovering it every
session:

- `genesisworld://readme` — static orientation document for the agent
  itself (domain model, navigation patterns, efficiency rules).
- `genesisworld://types` — data-object types accessible to the user, with
  permissions. Cached 15 min.
- `genesisworld://metadata/{objectType}` — field/relationship schema of one
  type, e.g. `genesisworld://metadata/ADDRESS`. Cached 15 min.
- `genesisworld://views/{objectType}` — saved views of one type, e.g.
  `genesisworld://views/TASK`. Cached 15 min.

## Self-hosting with Docker

For a persistent server multiple clients can point at (instead of one
`npx` process per client):

```bash
docker run -d --name cas-genesisworld-mcp -p 8084:3000 \
  -e GENESISWORLD_BASE_URL="http://your-genesisworld-server/genesisrest.svc" \
  -e GENESISWORLD_PRODUCT_KEY="your-product-key" \
  -e GENESISWORLD_USERNAME="your-username" \
  -e GENESISWORLD_PASSWORD="your-password" \
  vaatu/cas-genesis-world-mcp

# Read-only mode: append --read-only after the image name
docker run -d --name cas-genesisworld-mcp -p 8084:3000 \
  -e GENESISWORLD_BASE_URL="http://your-genesisworld-server/genesisrest.svc" \
  -e GENESISWORLD_PRODUCT_KEY="your-product-key" \
  -e GENESISWORLD_USERNAME="your-username" \
  -e GENESISWORLD_PASSWORD="your-password" \
  vaatu/cas-genesis-world-mcp --read-only
```

The MCP endpoint is now at `http://localhost:8084/mcp`. Point your client
at it:

```json
{
  "mcpServers": {
    "cas-genesisworld": {
      "url": "http://localhost:8084/mcp"
    }
  }
}
```

## Configuration

| Variable                   | Required | Purpose                                          |
| --------------------------- | -------- | ------------------------------------------------ |
| `GENESISWORLD_BASE_URL`    | **yes**  | Base URL of the REST service, e.g. `http://demo.cas.de/genesisrest.svc` |
| `GENESISWORLD_PRODUCT_KEY` | **yes**  | Sent as `X-CAS-PRODUCT-KEY` on every request      |
| `GENESISWORLD_USERNAME`    | yes\*    | Basic Auth user                                   |
| `GENESISWORLD_PASSWORD`    | yes\*    | Basic Auth password                               |
| `MCP_TRANSPORT`            | no       | `http` (default in Docker) or `stdio`             |
| `MCP_HOST` / `MCP_PORT`    | no       | Bind address for HTTP mode (default `0.0.0.0:3000`) |
| `GENESISWORLD_MAX_RESULT_CHARS` | no  | Truncate oversized responses (default 60000 chars; `0` disables) |
| `GENESISWORLD_QUIET`       | no       | `true` disables per-request stderr logging        |

\* Required in practice for any real request to succeed.

**Read-only mode** is a launch option, not an environment variable: pass
`--read-only` on the command line (or after the image name in `docker
run`, as shown above). This registers only the read tools — mutating
tools are not merely blocked, they don't exist for that session.

## License

[MIT](./LICENSE)

---

Want to add a tool or understand how this is built? See
[AGENTS.md](./AGENTS.md) for architecture and contributor docs, and
[ROADMAP.md](./ROADMAP.md) for the project plan.
