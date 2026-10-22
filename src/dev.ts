import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createServer } from 'node:http';
import { isAuthorizedKey, readAgentName } from './auth.js';
import { createNotepadServer } from './server.js';
import { createStores } from './store/index.js';

const { store, log } = createStores();
const PORT = Number(process.env.PORT ?? 3000);

const API_KEY = process.env.MCP_API_KEY;
if (API_KEY === undefined || API_KEY === '') {
  throw new Error('MCP_API_KEY is not set. Add it to .env.local.');
}

const handler = createMcpHandler((ctx) =>
  createNotepadServer(store, log, readAgentName(ctx.requestInfo)),
);
const mcp = toNodeHandler(handler, {
  onerror: (error) => console.error('[mcp] handler error:', error),
});

const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

const httpServer = createServer((req, res) => {
  if (!validateHost(req, res)) return;
  if (!validateOrigin(req, res)) return;

  const authorization = req.headers.authorization;
  const keyParam = new URL(req.url ?? '/', 'http://localhost').searchParams.get('key') ?? undefined;

  if (!isAuthorizedKey(authorization, keyParam, API_KEY)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  void mcp(req, res);
});

httpServer.listen(PORT, () => {
  console.warn(`MCP notepad listening on http://127.0.0.1:${String(PORT)}/mcp`);
});
