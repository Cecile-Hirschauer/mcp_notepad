import { randomUUID } from 'node:crypto';
import type { Note, NotesStore } from './types.js';

export class InMemoryNotesStore implements NotesStore {
  private notes: Note[] = [];

  listNotes(): Promise<Note[]> {
    return Promise.resolve([...this.notes]);
  }

  appendNote(content: string, agent: string): Promise<Note> {
    const note: Note = {
      id: randomUUID(),
      content,
      createdAt: new Date().toISOString(),
      agent,
    };
    this.notes.push(note);
    return Promise.resolve(note);
  }

  replaceNotes(content: string, agent: string): Promise<Note> {
    this.notes = [];
    return this.appendNote(content, agent);
  }
}
