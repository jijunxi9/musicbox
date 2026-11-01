const CACHE = 'mbx-shell-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './songs.json', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const u of SHELL) { try { await c.add(new Request(u, { cache: 'reload' })); } catch (_) {} }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;          // audio + api go straight to network
  if (url.pathname.endsWith('songs.json')) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const r = await fetch(req, { cache: 'no-cache' });
        if (r && r.ok) c.put(req, r.clone());
        return r;
      } catch (_) {
        return (await c.match(req)) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) { fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); }).catch(() => {}); return hit; }
    try { return await fetch(req); }
    catch (_) { return (await c.match('./index.html')) || Response.error(); }
  })());
});
