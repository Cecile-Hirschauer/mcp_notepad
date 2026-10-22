import type { NeonQueryFunction } from '@neondatabase/serverless';
import type { ActionLog, ActionLogEntry, Note, NotesStore } from './types.js';

type Sql = NeonQueryFunction<false, false>;

interface NoteRow {
  id: string;
  content: string;
  agent: string;
  created_at: string | Date;
}

interface LogRow {
  id: string;
  agent: string;
  action: string;
  success: boolean;
  created_at: string | Date;
}

function toIso(value: string | Date): string {
  return new Date(value).toISOString();
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    content: row.content,
    agent: row.agent,
    createdAt: toIso(row.created_at),
  };
}

export class NeonNotesStore implements NotesStore {
  constructor(private readonly sql: Sql) {}

  async listNotes(): Promise<Note[]> {
    const rows = (await this.sql`
      select id, content, agent, created_at
      from notes
      order by created_at asc
    `) as NoteRow[];

    return rows.map((row) => toNote(row));
  }

  async appendNote(content: string, agent: string): Promise<Note> {
    const rows = (await this.sql`
      insert into notes (content, agent)
      values (${content}, ${agent})
      returning id, content, agent, created_at
    `) as NoteRow[];

    const row = rows[0];
    if (row === undefined) {
      throw new Error('insert into notes returned no row');
    }
    return toNote(row);
  }

  async replaceNotes(content: string, agent: string): Promise<Note> {
    await this.sql`delete from notes`;
    return this.appendNote(content, agent);
  }
}

export class NeonActionLog implements ActionLog {
  constructor(private readonly sql: Sql) {}

  async record(entry: Omit<ActionLogEntry, 'id' | 'date'>): Promise<void> {
    await this.sql`
      insert into action_log (agent, action, success)
      values (${entry.agent}, ${entry.action}, ${entry.success})
    `;
  }

  async listActions(limit = 50): Promise<ActionLogEntry[]> {
    const rows = (await this.sql`
      select id, agent, action, success, created_at
      from action_log
      order by created_at desc
      limit ${limit}
    `) as LogRow[];

    return rows.map((row) => ({
      id: row.id,
      agent: row.agent,
      action: row.action,
      success: row.success,
      date: toIso(row.created_at),
    }));
  }
}
