import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { NOTEPAD_RULES } from './rules.js';
import type { NotesStore } from './store/types.js';

export function createNotepadServer(store: NotesStore): McpServer {
  const server = new McpServer({ name: 'notepad', version: '1.0.0' });

  server.registerTool(
    'get_rules',
    {
      description:
        'Return the rules an agent must follow before using the shared notepad. ' +
        'Always call this first, before any other notepad tool.',
      inputSchema: z.object({}),
    },
    () => ({
      content: [{ type: 'text', text: NOTEPAD_RULES }],
    }),
  );

  server.registerTool(
    'read_notes',
    {
      description:
        'Return the current content of the shared notepad, ' +
        'as a list of notes with their author and creation date.',
      inputSchema: z.object({}),
    },
    async () => {
      const notes = await store.listNotes();

      const text =
        notes.length === 0
          ? 'The notepad is empty.'
          : notes.map((n) => `- [${n.createdAt}] (${n.agent}) ${n.content}`).join('\n');

      return { content: [{ type: 'text', text }] };
    },
  );

  return server;
}
