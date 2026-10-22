export interface Note {
  id: string;
  content: string;
  createdAt: string;
  agent: string;
}

export interface NotesStore {
  listNotes(): Promise<Note[]>;
  appendNote(content: string, agent: string): Promise<Note>;
  replaceNotes(content: string, agent: string): Promise<Note>;
}

export interface ActionLogEntry {
  id: string;
  date: string;
  agent: string;
  action: string;
  success: boolean;
}

export interface ActionLog {
  record(entry: Omit<ActionLogEntry, 'id' | 'date'>): Promise<void>;
  listActions(limit?: number): Promise<ActionLogEntry[]>;
}
