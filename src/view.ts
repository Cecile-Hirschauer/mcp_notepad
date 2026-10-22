import type { ActionLogEntry, Note } from './store/types.js';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderPage(notes: Note[], actions: ActionLogEntry[]): string {
  const notesHtml =
    notes.length === 0
      ? '<p class="empty">The notepad is empty.</p>'
      : `<ul>${notes
          .map(
            (note) => `<li>
              <span class="content">${escapeHtml(note.content)}</span>
              <span class="meta">${escapeHtml(note.agent)} — ${escapeHtml(note.createdAt)}</span>
            </li>`,
          )
          .join('')}</ul>`;

  const actionsHtml =
    actions.length === 0
      ? '<p class="empty">No action recorded yet.</p>'
      : `<table>
          <thead><tr><th>Date</th><th>Agent</th><th>Action</th><th>Result</th></tr></thead>
          <tbody>${actions
            .map(
              (entry) => `<tr>
                <td>${escapeHtml(entry.date)}</td>
                <td>${escapeHtml(entry.agent)}</td>
                <td>${escapeHtml(entry.action)}</td>
                <td>${entry.success ? 'ok' : 'failed'}</td>
              </tr>`,
            )
            .join('')}</tbody>
        </table>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Shared notepad</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, sans-serif; max-width: 60rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.1rem; margin-top: 2.5rem; }
    ul { list-style: none; padding: 0; }
    li { padding: .6rem 0; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent); }
    .content { display: block; }
    .meta { font-size: .8rem; opacity: .6; }
    .empty { opacity: .6; font-style: italic; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th { text-align: left; font-weight: 600; }
    th, td { padding: .4rem .5rem; border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent); }
  </style>
</head>
<body>
  <h1>Shared notepad</h1>
  <section>
    <h2>Notes</h2>
    ${notesHtml}
  </section>
  <section>
    <h2>Recent actions</h2>
    ${actionsHtml}
  </section>
</body>
</html>`;
}
