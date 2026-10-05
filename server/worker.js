// server/worker.js — Cloudflare Worker entry point for Static Assets + Edge API
import { onRequest } from '../functions/api/[[route]].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Dynamic frontend config
    if (url.pathname === '/env-config.js') {
      const origin = env.LIVE_SITE_ORIGIN || url.origin;
      return new Response(`window.__LIVE_SITE_ORIGIN__ = ${JSON.stringify(origin)};`, {
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    // 2. Handle API endpoints (/api/*)
    if (url.pathname.startsWith('/api/')) {
      const pathParts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
      return onRequest({ request, env, params: { route: pathParts } });
    }

    // 3. Handle /admin redirect / rewrite
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      const adminReq = new Request(new URL('/admin/index.html', request.url), request);
      if (env.ASSETS) {
        return env.ASSETS.fetch(adminReq);
      }
    }

    // 4. Serve all other static assets (HTML, CSS, JS, etc.)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
