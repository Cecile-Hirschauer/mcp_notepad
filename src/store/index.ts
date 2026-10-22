import { neon } from '@neondatabase/serverless';
import { InMemoryActionLog, InMemoryNotesStore } from './memory.js';
import { NeonActionLog, NeonNotesStore } from './neon.js';
import type { ActionLog, NotesStore } from './types.js';

export function createStores(): { store: NotesStore; log: ActionLog } {
  const url = process.env.DATABASE_URL;

  if (url === undefined || url === '') {
    console.warn('DATABASE_URL is not set — falling back to in-memory storage.');
    return { store: new InMemoryNotesStore(), log: new InMemoryActionLog() };
  }

  const sql = neon(url);
  return { store: new NeonNotesStore(sql), log: new NeonActionLog(sql) };
}
