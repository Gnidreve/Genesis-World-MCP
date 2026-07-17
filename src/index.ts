#!/usr/bin/env node
/**
 * CAS genesisWorld REST Webservice — MCP server (read-only).
 *
 * Exposes a curated, GET-only subset of the CAS genesisWorld REST API v7.0
 * as MCP tools. Tools live in individual files under src/tools/.
 *
 * Configuration is provided at startup via environment variables:
 *   GENESISWORLD_BASE_URL   (required)  e.g. http://demo.cas.de/genesisrest.svc
 *   GENESISWORLD_USERNAME   (Basic Auth user)
 *   GENESISWORLD_PASSWORD   (Basic Auth password)
 *   GENESISWORLD_PRODUCT_KEY (optional) sent as X-CAS-PRODUCT-KEY if set
 *
 * The base URL is NOT hardcoded — the demo URL above is only an example.
 *
 * See AGENTS.md for the scope/classification rules and swagger.json (repo
 * root) for the full API surface used as cross-reference.
 */

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { ensureConfig, getBaseUrl } from "./lib.js";

// Tool registrations
import { registerSmartSearch } from "./tools/smart_search.js";
import { registerGetDataObject } from "./tools/get_data_object.js";
import { registerGetDossier } from "./tools/get_dossier.js";
import { registerListDataObjects } from "./tools/list_data_objects.js";
import { registerListViews } from "./tools/list_views.js";
import { registerListDataObjectsByView } from "./tools/list_data_objects_by_view.js";
import { registerListAvailableDataObjectTypes } from "./tools/list_available_data_object_types.js";
import { registerGetDataObjectTypesMetadata } from "./tools/get_data_object_types_metadata.js";
import { registerListLinks } from "./tools/list_links.js";
import { registerListRecentDataObjects } from "./tools/list_recent_data_objects.js";
import { registerGetAvailableProducts } from "./tools/get_available_products.js";
import { registerGetDataObjectCount } from "./tools/get_data_object_count.js";
import { registerGetPrimaryLinkParents } from "./tools/get_primary_link_parents.js";
import { registerListUsers } from "./tools/list_users.js";
import { registerGetUserSelf } from "./tools/get_user_self.js";
import { registerGetView } from "./tools/get_view.js";
import { registerListTags } from "./tools/list_tags.js";
import { registerGetObjectTags } from "./tools/get_object_tags.js";
import { registerGetFullDataObjects } from "./tools/get_full_data_objects.js";
import { registerListDataObjectsByViewFull } from "./tools/list_data_objects_by_view_full.js";

function buildServer(): McpServer {
  const server = new McpServer({
    name: "cas-genesisworld-mcp",
    version: "0.2.0",
  });

  registerSmartSearch(server);
  registerGetDataObject(server);
  registerGetDossier(server);
  registerListDataObjects(server);
  registerListViews(server);
  registerListDataObjectsByView(server);
  registerListAvailableDataObjectTypes(server);
  registerGetDataObjectTypesMetadata(server);
  registerListLinks(server);
  registerListRecentDataObjects(server);
  registerGetAvailableProducts(server);
  registerGetDataObjectCount(server);
  registerGetPrimaryLinkParents(server);
  registerListUsers(server);
  registerGetUserSelf(server);
  registerGetView(server);
  registerListTags(server);
  registerGetObjectTags(server);
  registerGetFullDataObjects(server);
  registerListDataObjectsByViewFull(server);

  return server;
}

function createServer(): McpServer {
  return buildServer();
}

async function main() {
  ensureConfig();

  const BASE_URL = getBaseUrl();
  const transport = process.env.MCP_TRANSPORT ?? "stdio";

  if (transport === "http") {
    const host = process.env.MCP_HOST ?? "0.0.0.0";
    const port = parseInt(process.env.MCP_PORT ?? "3000", 10);
    const endpoint = "/mcp";

    const app = createMcpExpressApp({ host });
    const transports = new Map<string, StreamableHTTPServerTransport | SSEServerTransport>();

    const connectSession = async (t: StreamableHTTPServerTransport | SSEServerTransport) => {
      const s = createServer();
      let closing = false;
      t.onclose = () => {
        if (closing) return;
        closing = true;
        if (t.sessionId) transports.delete(t.sessionId);
        s.close().catch(() => {});
      };
      await s.connect(t as Parameters<McpServer["connect"]>[0]);
    };

    app.all(endpoint, async (req: any, res: any) => {
      try {
        const sessionId = req.headers["mcp-session-id"];
        let t: StreamableHTTPServerTransport;
        if (typeof sessionId === "string") {
          const existing = transports.get(sessionId);
          if (existing instanceof StreamableHTTPServerTransport) {
            t = existing;
          } else {
            res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Unknown session" }, id: null });
            return;
          }
        } else if (req.method === "POST" && isInitializeRequest(req.body)) {
          t = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id) => { transports.set(id, t); },
          });
          await connectSession(t);
        } else {
          res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "No session" }, id: null });
          return;
        }
        await t.handleRequest(req, res, req.body);
      } catch (err) {
        if (!res.headersSent) res.status(500).end();
      }
    });

    app.get("/sse", async (req: any, res: any) => {
      const t = new SSEServerTransport("/messages", res);
      transports.set(t.sessionId, t);
      await connectSession(t);
    });

    app.post("/messages", async (req: any, res: any) => {
      const sessionId = req.query?.sessionId as string | undefined;
      const existing = sessionId ? transports.get(sessionId) : undefined;
      if (existing instanceof SSEServerTransport) {
        await existing.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).end();
      }
    });

    await new Promise<void>((resolve, reject) => {
      const srv = app.listen(port, host, () => resolve());
      srv.once("error", reject);
    });

    console.error(`[cas-genesisworld-mcp] running on http://${host}:${port}${endpoint} (base_url=${BASE_URL})`);
  } else {
    const t = new StdioServerTransport();
    await buildServer().connect(t);
    console.error(`[cas-genesisworld-mcp] running on stdio (base_url=${BASE_URL})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
