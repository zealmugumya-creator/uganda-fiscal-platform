// Build step: split each product into its own standalone app under apps/<slug>/
// Each app gets: index.html (+responsive.css link), own manifest.json, own sw.js,
// own copy of shared assets. The portal stays in frontend/.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FRONTEND = path.join(ROOT, 'frontend');
const APPS = path.join(ROOT, 'apps');

const PRODUCTS = {
  taxlink:        { file: 'efris-compliance-manager.html',        name: 'TaxLink — EFRIS Compliance Manager', short: 'TaxLink',       color: '#18d8c0' },
  taxlinkconnect: { file: 'taxlink-connect-middleware.html',      name: 'TaxLink Connect — Accounting Middleware', short: 'TL Connect', color: '#18d8c0' },
  credittrack:    { file: 'distributor-credit-manager.html',      name: 'CreditTrack — Distributor Credit Manager', short: 'CreditTrack', color: '#3880f8' },
  verifyug:       { file: 'product-authentication-platform.html', name: 'VerifyUG — Product Authentication', short: 'VerifyUG',      color: '#b048f8' },
  guardpost:      { file: 'warehouse-fraud-detection.html',       name: 'GuardPost — Warehouse Fraud Detection', short: 'GuardPost',  color: '#f04040' },
  payrollguard:   { file: 'payrollguard.html',                    name: 'PayrollGuard — Payroll Compliance', short: 'PayrollGuard',  color: '#e8c040' },
  deliverug:      { file: 'deliverug.html',                       name: 'DeliverUG — Last-Mile Logistics', short: 'DeliverUG',       color: '#28e060' },
  procureguard:   { file: 'procureguard.html',                    name: 'ProcureGuard — Procurement Integrity', short: 'ProcureGuard', color: '#f88838' },
  retailpulse:    { file: 'retailpulse.html',                     name: 'RetailPulse — Retail Intelligence', short: 'RetailPulse',   color: '#18d8c0' },
  powercost:      { file: 'powercost.html',                       name: 'PowerCost — Energy Cost Intelligence', short: 'PowerCost',  color: '#e8c040' },
  efrisbridge:    { file: 'efris-bridge-ussd.html',               name: 'EFRIS Bridge — Informal Sector USSD', short: 'EFRIS Bridge', color: '#28e060' },
  efrisdash:      { file: 'efris-intelligence-dashboard.html',    name: 'EFRIS Intelligence Dashboard', short: 'EFRIS Intel',        color: '#3880f8' },
  debtwatch:      { file: 'debtwatch-uganda.html',                name: 'DebtWatch Uganda — National Debt Tracker', short: 'DebtWatch', color: '#e8c040' },
  fiscalai:       { file: 'fiscalai.html',                        name: 'FiscalAI — Debt Reduction Optimiser', short: 'FiscalAI',    color: '#18d8c0' },
  customs:        { file: 'customs-intelligence.html',            name: 'Customs Intelligence', short: 'Customs Intel',              color: '#f04040' }
};

const RESPONSIVE_LINK = '<link rel="stylesheet" href="assets/responsive.css">\n</head>';

function makeManifest(name, short, color) {
  return JSON.stringify({
    name, short_name: short,
    description: name + ' — part of the Uganda Fiscal Intelligence Platform.',
    start_url: 'index.html', scope: '/', display: 'standalone',
    background_color: '#08090c', theme_color: '#08090c',
    icons: [
      { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  }, null, 2);
}

function makeSw(version) {
  return `/* Service worker — installable + offline. */
const CACHE = 'app-${version}';
const PRECACHE = ['index.html', 'assets/platform.js', 'assets/responsive.css', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request).then(cached => {
    const fresh = fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
`;
}

let built = 0;
for (const [slug, p] of Object.entries(PRODUCTS)) {
  const src = path.join(FRONTEND, p.file);
  if (!fs.existsSync(src)) { console.error('MISSING:', p.file); continue; }
  const dir = path.join(APPS, slug);
  const assets = path.join(dir, 'assets');
  fs.mkdirSync(assets, { recursive: true });

  let html = fs.readFileSync(src, 'utf8');
  if (!html.includes('assets/responsive.css')) html = html.replace(/<\/head>/i, RESPONSIVE_LINK);
  fs.writeFileSync(path.join(dir, 'index.html'), html);

  fs.copyFileSync(path.join(FRONTEND, 'assets', 'platform.js'), path.join(assets, 'platform.js'));
  fs.copyFileSync(path.join(FRONTEND, 'assets', 'responsive.css'), path.join(assets, 'responsive.css'));
  fs.writeFileSync(path.join(dir, 'manifest.json'), makeManifest(p.name, p.short, p.color));
  fs.writeFileSync(path.join(dir, 'sw.js'), makeSw('v2'));

  fs.unlinkSync(src); // product no longer lives in the portal deployment
  built++;
  console.log('built app:', slug);
}

// Portal: add responsive.css link, rewrite sw.js precache to portal-only files
const portal = path.join(FRONTEND, 'index.html');
let ph = fs.readFileSync(portal, 'utf8');
if (!ph.includes('assets/responsive.css')) {
  ph = ph.replace(/<\/head>/i, RESPONSIVE_LINK);
  fs.writeFileSync(portal, ph);
}
fs.writeFileSync(path.join(FRONTEND, 'sw.js'), makeSw('portal-v2').replace(
  "['index.html', 'assets/platform.js', 'assets/responsive.css', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.json']",
  "['index.html', 'assets/platform.js', 'assets/responsive.css', 'assets/icon-192.png', 'assets/icon-512.png', 'manifest.json']"
));
// Portal manifest: drop cross-origin shortcuts (they must stay in-scope)
const pmPath = path.join(FRONTEND, 'manifest.json');
const pm = JSON.parse(fs.readFileSync(pmPath, 'utf8'));
delete pm.shortcuts;
fs.writeFileSync(pmPath, JSON.stringify(pm, null, 2));

console.log(`done. apps built=${built}; portal updated.`);
