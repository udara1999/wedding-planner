/* eslint-env serviceworker */
/**
 * Ticket 8.7, the app-shell half.
 *
 * Plan risk R8 orders the two mitigations: "Printable pack (8.6) is the real
 * mitigation; PWA cache is secondary. Never let the day depend on
 * connectivity." This is the secondary one and it is deliberately small.
 *
 * What it does: keeps the built assets so the app opens with no network. The
 * PACK'S DATA is not cached here — it is written to localStorage by
 * features/dayof/snapshot.ts, where it can be labelled as a saved copy with a
 * timestamp. A service worker replaying a stale API response would hand
 * somebody yesterday's timeline with nothing to say it was old.
 *
 * What it deliberately does NOT do: cache any API response, cache POST/PATCH,
 * or queue writes for later. Offline writes are a stated non-goal (§6), and
 * they would need conflict resolution nobody wants on a wedding day.
 *
 * Hand-written rather than generated. A plugin would bring precaching of every
 * route and a manifest injection step, and the whole requirement here is one
 * page working on a phone with no signal.
 */

const CACHE = 'wedding-shell-v1';

// Navigations only need the entry document; Vite's hashed assets are cached as
// they are fetched, which is correct because their names change on every build.
const SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never the API. A cached PostgREST response is a stale number presented as
  // a current one, and the money screens are the last place for that.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/functions/')) return;

  // A navigation offline falls back to the shell, so the router can take over
  // and the pack can read its saved copy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((r) => r ?? Response.error())),
    );
    return;
  }

  // Assets: serve from cache, and refresh it in the background when online.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached ?? Response.error());
      return cached ?? network;
    }),
  );
});
