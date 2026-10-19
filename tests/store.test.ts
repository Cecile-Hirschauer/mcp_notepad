import { describe, expect, it } from 'vitest';
import { InMemoryNotesStore } from '../src/store/memory.js';

describe('InMemoryNotesStore', () => {
  it('starts empty', async () => {
    const store = new InMemoryNotesStore();
    await expect(store.listNotes()).resolves.toEqual([]);
  });

  it('appends a note and returns it', async () => {
    const store = new InMemoryNotesStore();
    const note = await store.appendNote('deliver on friday', 'claude-code');

    expect(note.content).toBe('deliver on friday');
    expect(note.agent).toBe('claude-code');
    expect(note.id).toBeTruthy();
    expect(new Date(note.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('keeps notes in insertion order', async () => {
    const store = new InMemoryNotesStore();
    await store.appendNote('first', 'agent-a');
    await store.appendNote('second', 'agent-b');

    const notes = await store.listNotes();
    expect(notes.map((n) => n.content)).toEqual(['first', 'second']);
  });

  it('replaceNotes discards everything that existed before', async () => {
    const store = new InMemoryNotesStore();
    await store.appendNote('old one', 'agent-a');
    await store.appendNote('old two', 'agent-a');
    await store.replaceNotes('the only one left', 'agent-b');

    const notes = await store.listNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0]?.content).toBe('the only one left');
  });

  it('does not let callers mutate its internal state', async () => {
    const store = new InMemoryNotesStore();
    await store.appendNote('original', 'agent-a');

    const notes = await store.listNotes();
    notes.push({ id: 'x', content: 'injected', createdAt: '', agent: 'x' });

    await expect(store.listNotes()).resolves.toHaveLength(1);
  });
});
