/* Service worker — installable + offline, redirect-safe navigations. */
const CACHE = 'app-retailpulse-v3';
const PRECACHE = ['./', 'assets/platform.js', 'assets/responsive.css', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Navigations: network-first, redirect-safe (a redirected response cannot be
  // returned for a navigation — rebuild it clean), offline fallback to cached root.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (net.redirected) {
          const body = await net.blob();
          return new Response(body, { status: net.status, statusText: net.statusText, headers: net.headers });
        }
        return net;
      } catch (err) {
        return (await caches.match('./')) || (await caches.match('index.html')) || Response.error();
      }
    })());
    return;
  }
  // Other GET assets: stale-while-revalidate (never cache redirects).
  e.respondWith(caches.match(req).then(cached => {
    const fresh = fetch(req).then(r => {
      if (r.ok && !r.redirected) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
