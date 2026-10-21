import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createServer } from 'node:http';
import { createNotepadServer } from './server.js';
import { InMemoryNotesStore } from './store/memory.js';

const PORT = Number(process.env.PORT ?? 3000);

const store = new InMemoryNotesStore();
const handler = createMcpHandler(() => createNotepadServer(store));
const mcp = toNodeHandler(handler, {
  onerror: (error) => console.error('[mcp] handler error:', error),
});

const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

const httpServer = createServer((req, res) => {
  if (!validateHost(req, res)) return;
  if (!validateOrigin(req, res)) return;
  if (req.method === undefined) return;

  void mcp(req, res);
});

httpServer.listen(PORT, () => {
  console.warn(`MCP notepad listening on http://127.0.0.1:${String(PORT)}/mcp`);
});
