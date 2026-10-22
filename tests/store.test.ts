import { neon } from '@neondatabase/serverless';
import { describe, expect, it } from 'vitest';
import { InMemoryNotesStore } from '../src/store/memory.js';
import { NeonNotesStore } from '../src/store/neon.js';
import { testNotesStoreContract } from './helpers/store-contract.js';

testNotesStoreContract('in-memory', () => Promise.resolve(new InMemoryNotesStore()));

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl === '') {
  describe.skip('NotesStore contract: neon (DATABASE_URL not set)', () => {
    it('is skipped', () => {
      expect(true).toBe(true);
    });
  });
} else {
  const sql = neon(databaseUrl);

  testNotesStoreContract('neon', async () => {
    await sql`delete from notes`;
    return new NeonNotesStore(sql);
  });
}

describe('InMemoryNotesStore specifics', () => {
  it('does not let callers mutate its internal state', async () => {
    const store = new InMemoryNotesStore();
    await store.appendNote('[info] Original.', 'agent-a');

    const notes = await store.listNotes();
    notes.push({ id: 'x', content: 'injected', createdAt: '', agent: 'x' });

    await expect(store.listNotes()).resolves.toHaveLength(1);
  });
});
