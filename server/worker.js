// server/worker.js — Cloudflare Worker entry point for Static Assets + Edge API
import { onRequest } from '../functions/api/[[route]].js';

const IMAGE_CDN_FALLBACK = {
  'branch-nguyen-thi-thap': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219585/muse-fitness-studio/branch-nguyen-thi-thap.webp',
  'branch-le-duc-tho': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219584/muse-fitness-studio/branch-le-duc-tho.webp',
  'branch-hoang-van-thu': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219582/muse-fitness-studio/branch-hoang-van-thu.jpg',
  'photo-coach': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219629/muse-fitness-studio/photo-coach.webp',
  'photo-coach-home': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219628/muse-fitness-studio/photo-coach-home.webp',
  'class-boxing-fit': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219589/muse-fitness-studio/class-boxing-fit.webp',
  'class-kettlebell': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219592/muse-fitness-studio/class-kettlebell.webp',
  'class-boxing-group-home': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219590/muse-fitness-studio/class-boxing-group-home.webp',
  'class-boxing-mitts-home': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219591/muse-fitness-studio/class-boxing-mitts-home.webp',
  'class-bodyweight-situp-home': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219586/muse-fitness-studio/class-bodyweight-situp-home.webp',
  'class-bodyweight-squat-home': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219588/muse-fitness-studio/class-bodyweight-squat-home.webp',
  'hero-schedule-home': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219594/muse-fitness-studio/hero-schedule-home.webp',
  'pricing-course-9-week': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219633/muse-fitness-studio/pricing-course-9-week.webp',
  'pricing-membership-1': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219634/muse-fitness-studio/pricing-membership-1.webp',
  'pricing-membership-2': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219635/muse-fitness-studio/pricing-membership-2.webp',
  'pricing-membership-3': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219636/muse-fitness-studio/pricing-membership-3.webp',
  'pricing-pt-1-1': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219638/muse-fitness-studio/pricing-pt-1-1.webp',
  'blog-weight-training': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219581/muse-fitness-studio/blog-weight-training.webp',
  'blog-kettlebell': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219573/muse-fitness-studio/blog-kettlebell.webp',
  'blog-need-pt': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219575/muse-fitness-studio/blog-need-pt.webp',
  'blog-postpartum': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219576/muse-fitness-studio/blog-postpartum.webp',
  'blog-protein-meal': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219578/muse-fitness-studio/blog-protein-meal.webp',
  'blog-rest-day': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219580/muse-fitness-studio/blog-rest-day.webp',
  'og-image': 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219632/muse-fitness-studio/photo-hero.webp',
};

function getCdnRedirect(pathname) {
  const clean = pathname.split('/').pop().replace(/\.[^/.]+$/, '');
  for (const [key, cdnUrl] of Object.entries(IMAGE_CDN_FALLBACK)) {
    if (clean.includes(key)) return cdnUrl;
  }
  return null;
}

function addSecurityAndCacheHeaders(response, pathname) {
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (pathname.match(/\.(webp|jpg|jpeg|png|svg|ico|woff2?|ttf)$/i)) {
    newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (pathname.match(/\.(css|js)$/i)) {
    newHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  } else if (pathname.endsWith('.html') || pathname === '/' || !pathname.includes('.')) {
    newHeaders.set('Cache-Control', 'public, max-age=0, must-revalidate');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Dynamic frontend config
    if (url.pathname === '/env-config.js') {
      const origin = env.LIVE_SITE_ORIGIN || url.origin;
      return new Response(`window.__LIVE_SITE_ORIGIN__ = ${JSON.stringify(origin)};`, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=3600',
        },
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
        const res = await env.ASSETS.fetch(adminReq);
        return addSecurityAndCacheHeaders(res, '/admin/index.html');
      }
    }

    // 4. Serve all other static assets (HTML, CSS, JS, etc.)
    if (env.ASSETS) {
      const res = await env.ASSETS.fetch(request);
      if (res.status === 404) {
        // A. Image CDN fallback redirect
        const cdnUrl = getCdnRedirect(url.pathname);
        if (cdnUrl) {
          return Response.redirect(cdnUrl, 302);
        }
        // B. Custom 404 page for missing pages
        try {
          const notFoundReq = new Request(new URL('/404.html', request.url), request);
          const notFoundRes = await env.ASSETS.fetch(notFoundReq);
          if (notFoundRes && notFoundRes.status === 200) {
            return new Response(notFoundRes.body, {
              status: 404,
              headers: notFoundRes.headers,
            });
          }
        } catch (_) {}
      }
      return addSecurityAndCacheHeaders(res, url.pathname);
    }

    return new Response('Not found', { status: 404 });
  },
};
