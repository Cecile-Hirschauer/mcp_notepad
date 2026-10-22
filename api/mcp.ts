import { createMcpHandler } from '@modelcontextprotocol/server';
import { isAuthorized, readAgentName } from '../src/auth.js';
import { createNotepadServer } from '../src/notepad-server.js';
import { createStores } from '../src/store/index.js';

const { store, log } = createStores();

const handler = createMcpHandler((ctx) =>
  createNotepadServer(store, log, readAgentName(ctx.requestInfo)),
);

export default {
  async fetch(request: Request): Promise<Response> {
    const apiKey = process.env.MCP_API_KEY;

    if (apiKey === undefined || apiKey === '') {
      return Response.json({ error: 'server misconfigured' }, { status: 500 });
    }

    if (!isAuthorized(request, apiKey)) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    return handler.fetch(request);
  },
};
