import { isViewAuthorized } from '../src/auth.js';
import { createStores } from '../src/store/index.js';
import { renderPage } from '../src/view.js';

const { store, log } = createStores();

export default {
  async fetch(request: Request): Promise<Response> {
    const viewKey = process.env.VIEW_KEY;

    if (viewKey === undefined || viewKey === '') {
      return new Response('server misconfigured', { status: 500 });
    }

    const keyParam = new URL(request.url).searchParams.get('key') ?? undefined;

    if (!isViewAuthorized(keyParam, viewKey)) {
      return new Response('unauthorized', {
        status: 401,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const [notes, actions] = await Promise.all([store.listNotes(), log.listActions(20)]);

    return new Response(renderPage(notes, actions), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
