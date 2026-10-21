import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { NOTEPAD_RULES } from './rules.js';
import type { NotesStore } from './store/types.js';
import { validateNoteContent } from './validation.js';

export function createNotepadServer(store: NotesStore, agent = 'unknown'): McpServer {
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

  server.registerTool(
    'append_note',
    {
      description:
        'Add one fact to the shared notepad, without touching existing notes. ' +
        'This is the default way to write. Call read_notes first to avoid duplicates. ' +
        'The note must start with a category prefix: [deadline], [decision], [todo] or [info].',
      inputSchema: z.object({
        content: z.string().describe('One short sentence, prefixed with its category.'),
      }),
    },
    async ({ content }) => {
      const problem = validateNoteContent(content);
      if (problem !== null) {
        return { content: [{ type: 'text', text: problem }], isError: true };
      }

      const note = await store.appendNote(content.trim(), agent);
      return {
        content: [{ type: 'text', text: `Note added: ${note.content}` }],
      };
    },
  );

  server.registerTool(
    'replace_notes',
    {
      description:
        'Erase the entire notepad and replace it with a single note. ' +
        'Destructive: every existing note is lost. Only call this when the user has ' +
        'explicitly asked for the notepad to be rewritten, and only after they confirmed it. ' +
        'To add information, use append_note instead.',
      inputSchema: z.object({
        content: z.string().describe('The only note that will remain, prefixed with its category.'),
        confirmed: z
          .literal(true)
          .describe('Must be true. Set it only after the user explicitly confirmed the erasure.'),
      }),
    },
    async ({ content }) => {
      const problem = validateNoteContent(content);
      if (problem !== null) {
        return { content: [{ type: 'text', text: problem }], isError: true };
      }

      const previous = await store.listNotes();
      const note = await store.replaceNotes(content.trim(), agent);

      return {
        content: [
          {
            type: 'text',
            text: `Notepad replaced. ${String(previous.length)} note(s) were erased. It now contains: ${note.content}`,
          },
        ],
      };
    },
  );

  return server;
}
