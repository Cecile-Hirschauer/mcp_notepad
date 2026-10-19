export const NOTEPAD_RULES = `# Shared notepad — usage rules

1. Call get_rules() before any other notepad operation.
2. Call read_notes() before writing, to avoid duplicating existing information.
3. Use append_note() to add information. This is the default write operation.
4. replace_notes() erases all existing content. Ask the user for explicit
   confirmation before calling it.
5. Write one fact per note, in a single short sentence.
6. Do not invent, summarise or reword existing notes.
`;
