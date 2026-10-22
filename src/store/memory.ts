import { randomUUID } from 'node:crypto';
import type { ActionLog, ActionLogEntry, Note, NotesStore } from './types.js';

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

export class InMemoryActionLog implements ActionLog {
  private entries: ActionLogEntry[] = [];

  record(entry: Omit<ActionLogEntry, 'id' | 'date'>): Promise<void> {
    this.entries.push({
      ...entry,
      id: randomUUID(),
      date: new Date().toISOString(),
    });
    return Promise.resolve();
  }

  listActions(limit = 50): Promise<ActionLogEntry[]> {
    return Promise.resolve(this.entries.slice(-limit).reverse());
  }
}
