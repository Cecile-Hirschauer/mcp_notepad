import { beforeEach, describe, expect, it } from 'vitest';
import type { NotesStore } from '../../src/store/types.js';

export function testNotesStoreContract(name: string, makeStore: () => Promise<NotesStore>): void {
  describe(`NotesStore contract: ${name}`, () => {
    let store: NotesStore;

    beforeEach(async () => {
      store = await makeStore();
    });

    it('starts empty', async () => {
      await expect(store.listNotes()).resolves.toEqual([]);
    });

    it('appends a note and returns it', async () => {
      const note = await store.appendNote('[deadline] Deliver on friday.', 'claude-code');

      expect(note.content).toBe('[deadline] Deliver on friday.');
      expect(note.agent).toBe('claude-code');
      expect(note.id).toBeTruthy();
      expect(new Date(note.createdAt).toString()).not.toBe('Invalid Date');
    });

    it('keeps notes in insertion order', async () => {
      await store.appendNote('[todo] First.', 'agent-a');
      await store.appendNote('[todo] Second.', 'agent-b');

      const notes = await store.listNotes();
      expect(notes.map((n) => n.content)).toEqual(['[todo] First.', '[todo] Second.']);
    });

    it('replaceNotes discards everything that existed before', async () => {
      await store.appendNote('[todo] Old one.', 'agent-a');
      await store.appendNote('[todo] Old two.', 'agent-a');
      await store.replaceNotes('[decision] The only one left.', 'agent-b');

      const notes = await store.listNotes();
      expect(notes).toHaveLength(1);
      expect(notes[0]?.content).toBe('[decision] The only one left.');
    });
  });
}
