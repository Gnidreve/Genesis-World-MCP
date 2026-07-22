#!/usr/bin/env node
/**
 * CAS genesisWorld REST Webservice — MCP server.
 *
 * Exposes the CAS genesisWorld REST API v7.0 as MCP tools, flows, and
 * resources. Tools are collected in src/registry.ts and registered filtered
 * by launch mode: with `--read-only` (or GENESISWORLD_READ_ONLY=true) only
 * tools declared `mode: "read"` are registered.
 *
 * Configuration is provided at startup via environment variables:
 *   GENESISWORLD_BASE_URL   (required)  e.g. http://demo.cas.de/genesisrest.svc
 *   GENESISWORLD_USERNAME   (Basic Auth user)
 *   GENESISWORLD_PASSWORD   (Basic Auth password)
 *   GENESISWORLD_PRODUCT_KEY (optional) sent as X-CAS-PRODUCT-KEY if set
 *   GENESISWORLD_READ_ONLY  (optional)  "true" = read-only mode
 *
 * The base URL is NOT hardcoded — the demo URL above is only an example.
 *
 * See AGENTS.md for the scope/classification rules, ROADMAP.md for the
 * project plan, and swagger.json (repo root) for the full API surface.
 */

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { ensureConfig, getBaseUrl } from "./lib.js";
import { isReadOnly, registerTools } from "./registry.js";
import { README_URI } from "./resources/readme.js";
import { registerMetadataResources } from "./resources/metadata.js";

const INSTRUCTIONS =
  "CAS genesisWorld CRM access. Start by reading the static orientation " +
  `resource ${README_URI} (or the 'readme' tool) once — it explains the ` +
  "domain model (data-object types, GGUIDs, views, links, dossiers, tags) " +
  "and the cheapest navigation patterns. In read-only mode, mutating tools " +
  "are not registered.";

function buildServer(readOnly: boolean): McpServer {
  const server = new McpServer(
    { name: "cas-genesisworld-mcp", version: "0.4.0" },
    { instructions: INSTRUCTIONS }
  );
  registerTools(server, { readOnly });
  registerMetadataResources(server);
  return server;
}

async function main() {
  ensureConfig();

  const BASE_URL = getBaseUrl();
  const readOnly = isReadOnly();
  const mode = readOnly ? "read-only" : "read-write";
  const transport = process.env.MCP_TRANSPORT ?? "stdio";
  const createServer = () => buildServer(readOnly);

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

    console.error(`[cas-genesisworld-mcp] running on http://${host}:${port}${endpoint} (mode=${mode}, base_url=${BASE_URL})`);
  } else {
    const t = new StdioServerTransport();
    await createServer().connect(t);
    console.error(`[cas-genesisworld-mcp] running on stdio (mode=${mode}, base_url=${BASE_URL})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
