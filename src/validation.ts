import { NOTEPAD_CATEGORIES } from './rules.js';

export const MAX_NOTE_LENGTH = 280;

const CATEGORY_PATTERN = new RegExp(`^\\[(${NOTEPAD_CATEGORIES.join('|')})\\]\\s+\\S`);

/**
 * Returns an error message meant for the calling agent, or null when the
 * note is acceptable.
 */
export function validateNoteContent(content: string): string | null {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return 'A note cannot be empty.';
  }

  if (trimmed.length > MAX_NOTE_LENGTH) {
    return `A note must be at most ${String(MAX_NOTE_LENGTH)} characters, got ${String(trimmed.length)}. Split it into several notes, one fact each.`;
  }

  if (!CATEGORY_PATTERN.test(trimmed)) {
    return `A note must start with a category prefix followed by the fact. Allowed categories: ${NOTEPAD_CATEGORIES.map((c) => `[${c}]`).join(', ')}. Example: "[deadline] The project must be delivered on Friday."`;
  }

  return null;
}
