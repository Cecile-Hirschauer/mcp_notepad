import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNotepadServer } from '../src/server.js';
import { InMemoryNotesStore } from '../src/store/memory.js';

let store: InMemoryNotesStore;
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
  handler = createMcpHandler(() => createNotepadServer(store));

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
  it('exposes get_rules and read_notes', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['get_rules', 'read_notes']);
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
});
