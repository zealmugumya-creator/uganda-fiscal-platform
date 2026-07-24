// Fix ERR_FAILED on installed PWAs:
//  1) start_url -> "/" (Cloudflare Pages 308-redirects /index.html -> /, which
//     breaks SW-controlled navigations). "/" returns 200 directly.
//  2) redirect-safe service worker: network-first for navigations, rebuilds any
//     redirected response into a clean one, falls back to cached root offline.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const targets = [{ dir: path.join(ROOT, 'frontend'), version: 'portal-v3' }];
const appsDir = path.join(ROOT, 'apps');
for (const slug of fs.readdirSync(appsDir)) {
  const d = path.join(appsDir, slug);
  if (fs.statSync(d).isDirectory()) targets.push({ dir: d, version: slug + '-v3' });
}

function swSource(version, hasHooks) {
  const extra = hasHooks ? "'assets/app-hooks.js', " : '';
  return `/* Service worker — installable + offline, redirect-safe navigations. */
const CACHE = 'app-${version}';
const PRECACHE = ['./', 'assets/platform.js', 'assets/responsive.css', ${extra}'assets/icon-192.png', 'assets/icon-512.png', 'manifest.json'];
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
`;
}

let manifestsFixed = 0, swFixed = 0;
for (const t of targets) {
  const mPath = path.join(t.dir, 'manifest.json');
  if (fs.existsSync(mPath)) {
    const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
    m.start_url = '/';
    m.scope = '/';
    m.id = '/';
    fs.writeFileSync(mPath, JSON.stringify(m, null, 2));
    manifestsFixed++;
  }
  const swPath = path.join(t.dir, 'sw.js');
  const hasHooks = fs.existsSync(path.join(t.dir, 'assets', 'app-hooks.js'));
  fs.writeFileSync(swPath, swSource(t.version, hasHooks));
  swFixed++;
}
console.log(`manifests fixed: ${manifestsFixed}, service workers rewritten: ${swFixed}`);
