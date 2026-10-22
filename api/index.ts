import { renderHome } from '../src/view.js';

export default {
  fetch(): Response {
    return new Response(renderHome(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
