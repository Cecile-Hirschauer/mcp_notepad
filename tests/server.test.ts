import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNotepadServer } from '../src/notepad-server.js';
import { InMemoryActionLog, InMemoryNotesStore } from '../src/store/memory.js';

let store: InMemoryNotesStore;
let log: InMemoryActionLog;
let handler: ReturnType<typeof createMcpHandler>;
let client: Client;

function firstText(content: { type: string; text?: string }[]): string {
  const block = content[0];
  if (block?.type !== 'text' || typeof block.text !== 'string') {
    throw new Error('expected a text content block');
  }
  return block.text;
}

beforeEach(async () => {
  store = new InMemoryNotesStore();
  log = new InMemoryActionLog();
  handler = createMcpHandler(() => createNotepadServer(store, log));

  const transport = new StreamableHTTPClientTransport(new URL('http://test.local/mcp'), {
    fetch: (url, init) => handler.fetch(new Request(url, init)),
  });

  client = new Client(
    { name: 'test-harness', version: '1.0.0' },
    { versionNegotiation: { mode: 'auto' } },
  );
  await client.connect(transport);
});

afterEach(async () => {
  await client.close();
  await handler.close();
});

describe('notepad MCP server', () => {
  it('exposes the four notepad tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'append_note',
      'get_rules',
      'read_notes',
      'replace_notes',
    ]);
  });

  it('describes every tool, so the model knows when to call it', async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
    }
  });

  it('get_rules returns the notepad rules', async () => {
    const result = await client.callTool({ name: 'get_rules', arguments: {} });
    expect(firstText(result.content)).toContain('get_rules()');
  });

  it('read_notes reports an empty notepad', async () => {
    const result = await client.callTool({ name: 'read_notes', arguments: {} });
    expect(firstText(result.content)).toContain('empty');
  });

  it('read_notes returns the notes the store holds', async () => {
    await store.appendNote('deliver on friday', 'claude-code');

    const result = await client.callTool({ name: 'read_notes', arguments: {} });
    const text = firstText(result.content);

    expect(text).toContain('deliver on friday');
    expect(text).toContain('claude-code');
  });

  it('append_note stores a valid note', async () => {
    const result = await client.callTool({
      name: 'append_note',
      arguments: { content: '[deadline] The project must be delivered on Friday.' },
    });

    expect(result.isError).toBeFalsy();

    const notes = await store.listNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0]?.content).toBe('[deadline] The project must be delivered on Friday.');
  });

  it('append_note rejects a note without a category prefix', async () => {
    const result = await client.callTool({
      name: 'append_note',
      arguments: { content: 'The project must be delivered on Friday.' },
    });

    expect(result.isError).toBe(true);
    await expect(store.listNotes()).resolves.toHaveLength(0);
  });

  it('tells the agent which categories are allowed when it gets the prefix wrong', async () => {
    const result = await client.callTool({
      name: 'append_note',
      arguments: { content: '[urgent] Ship it now.' },
    });

    const text = firstText(result.content);
    expect(text).toContain('[deadline]');
    expect(text).toContain('[info]');
  });

  it('append_note rejects an empty note', async () => {
    const result = await client.callTool({
      name: 'append_note',
      arguments: { content: '   ' },
    });

    expect(result.isError).toBe(true);
  });

  it('append_note rejects a note longer than the limit', async () => {
    const result = await client.callTool({
      name: 'append_note',
      arguments: { content: `[info] ${'a'.repeat(300)}` },
    });

    expect(result.isError).toBe(true);
    expect(firstText(result.content)).toContain('280');
  });

  it('append_note does not overwrite existing notes', async () => {
    await client.callTool({
      name: 'append_note',
      arguments: { content: '[todo] Write the README.' },
    });
    await client.callTool({
      name: 'append_note',
      arguments: { content: '[todo] Deploy to Vercel.' },
    });

    const notes = await store.listNotes();
    expect(notes.map((n) => n.content)).toEqual([
      '[todo] Write the README.',
      '[todo] Deploy to Vercel.',
    ]);
  });

  it('replace_notes erases everything and keeps only the new note', async () => {
    await store.appendNote('[todo] Old one.', 'agent-a');
    await store.appendNote('[todo] Old two.', 'agent-a');

    const result = await client.callTool({
      name: 'replace_notes',
      arguments: { content: '[decision] We start over.', confirmed: true },
    });

    expect(result.isError).toBeFalsy();

    const notes = await store.listNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0]?.content).toBe('[decision] We start over.');
  });

  it('replace_notes reports how many notes it erased', async () => {
    await store.appendNote('[todo] Old one.', 'agent-a');
    await store.appendNote('[todo] Old two.', 'agent-a');

    const result = await client.callTool({
      name: 'replace_notes',
      arguments: { content: '[decision] We start over.', confirmed: true },
    });

    expect(firstText(result.content)).toContain('2');
  });

  it('refuses to replace without an explicit confirmation', async () => {
    await store.appendNote('[todo] Precious note.', 'agent-a');

    const result = await client.callTool({
      name: 'replace_notes',
      arguments: { content: '[info] Wiped.' },
    });

    expect(result.isError).toBe(true);
    await expect(store.listNotes()).resolves.toHaveLength(1);
  });

  it('refuses confirmed: false', async () => {
    await store.appendNote('[todo] Precious note.', 'agent-a');

    const result = await client.callTool({
      name: 'replace_notes',
      arguments: { content: '[info] Wiped.', confirmed: false },
    });

    expect(result.isError).toBe(true);
    await expect(store.listNotes()).resolves.toHaveLength(1);
  });

  it('applies the same content rules as append_note', async () => {
    await store.appendNote('[todo] Precious note.', 'agent-a');

    const result = await client.callTool({
      name: 'replace_notes',
      arguments: { content: 'no category prefix here', confirmed: true },
    });

    expect(result.isError).toBe(true);
    await expect(store.listNotes()).resolves.toHaveLength(1);
  });

  it('logs a successful call', async () => {
    await client.callTool({ name: 'get_rules', arguments: {} });

    const entries = await log.listActions();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('get_rules');
    expect(entries[0]?.success).toBe(true);
  });

  it('logs a failed call as a failure', async () => {
    await client.callTool({
      name: 'append_note',
      arguments: { content: 'no category prefix' },
    });

    const entries = await log.listActions();
    expect(entries[0]?.action).toBe('append_note');
    expect(entries[0]?.success).toBe(false);
  });

  it('records the agent name and an ISO date on every entry', async () => {
    await client.callTool({ name: 'read_notes', arguments: {} });

    const entry = (await log.listActions())[0];
    expect(entry?.agent).toBe('unknown');
    expect(entry?.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('lists the most recent action first', async () => {
    await client.callTool({ name: 'get_rules', arguments: {} });
    await client.callTool({ name: 'read_notes', arguments: {} });

    const entries = await log.listActions();
    expect(entries.map((e) => e.action)).toEqual(['read_notes', 'get_rules']);
  });

  it('logs every tool, including the destructive one', async () => {
    await client.callTool({
      name: 'replace_notes',
      arguments: { content: '[decision] Fresh start.', confirmed: true },
    });

    const entries = await log.listActions();
    expect(entries[0]?.action).toBe('replace_notes');
    expect(entries[0]?.success).toBe(true);
  });
});
