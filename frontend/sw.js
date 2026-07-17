/* Service worker — makes the platform installable and usable offline. */
const CACHE = 'ufp-v1';
const PRECACHE = [
  'index.html',
  'efris-compliance-manager.html',
  'taxlink-connect-middleware.html',
  'distributor-credit-manager.html',
  'product-authentication-platform.html',
  'warehouse-fraud-detection.html',
  'payrollguard.html',
  'deliverug.html',
  'procureguard.html',
  'retailpulse.html',
  'powercost.html',
  'efris-bridge-ussd.html',
  'efris-intelligence-dashboard.html',
  'debtwatch-uganda.html',
  'fiscalai.html',
  'customs-intelligence.html',
  'assets/platform.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // API + external: network only
  // Stale-while-revalidate for same-origin assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(resp => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
