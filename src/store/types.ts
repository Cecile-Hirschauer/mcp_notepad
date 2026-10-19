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
