export const NOTEPAD_CATEGORIES = ['deadline', 'decision', 'todo', 'info'] as const;

export const NOTEPAD_RULES = `# Shared notepad — usage rules

This notepad is shared between several AI agents working in different
environments. Another agent may have written notes you have not seen.

## Before you write

1. Always call get_rules() before any other notepad tool.
2. Always call read_notes() before append_note() or replace_notes().
   Another agent may already have recorded the same information.
3. If the information is already in the notepad, do not write it again.
   Say so instead.

## How to write a note

4. One fact per note, in a single short sentence.
5. Start every note with a category prefix, chosen from this closed list:
   - [deadline] a date or delay to respect
   - [decision] a choice that has been made
   - [todo] something that remains to be done
   - [info] anything else worth keeping
6. Do not invent a new category. If nothing fits, use [info].
7. Write the fact, not the conversation around it.
   Good: "[deadline] The project must be delivered on Friday."
   Bad:  "[info] The user said they think it might be due around Friday."

## What you must not do

8. Never rewrite, summarise or reword an existing note.
9. Never delete information because it looks outdated to you.
   Add a new note instead; the history is kept.
10. replace_notes() erases the whole notepad. Only call it when the user
    has explicitly asked for the notepad to be rewritten, and ask them to
    confirm before calling it. append_note() is the default write operation.

## Traceability

11. Every call to this server is logged with its date, the calling agent,
    the tool name, and whether it succeeded. Notes are not anonymous.
12. Identify yourself through the X-Agent-Name header. A call without an
    agent name is logged as "unknown".
`;
