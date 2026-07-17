// One-time build step: inject shared platform runtime into every frontend page.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'frontend');
const API = 'https://uganda-fiscal-platform-api.onrender.com';

const MAP = {
  'index.html': 'portal',
  'efris-compliance-manager.html': 'taxlink',
  'taxlink-connect-middleware.html': 'taxlinkconnect',
  'distributor-credit-manager.html': 'credittrack',
  'product-authentication-platform.html': 'verifyug',
  'warehouse-fraud-detection.html': 'guardpost',
  'payrollguard.html': 'payrollguard',
  'deliverug.html': 'deliverug',
  'procureguard.html': 'procureguard',
  'retailpulse.html': 'retailpulse',
  'powercost.html': 'powercost',
  'efris-bridge-ussd.html': 'efrisbridge',
  'efris-intelligence-dashboard.html': 'efrisdash',
  'debtwatch-uganda.html': 'debtwatch',
  'fiscalai.html': 'fiscalai',
  'customs-intelligence.html': 'customs'
};

let ok = 0, skipped = 0;
for (const [file, slug] of Object.entries(MAP)) {
  const fp = path.join(DIR, file);
  if (!fs.existsSync(fp)) { console.error('MISSING:', file); continue; }
  let html = fs.readFileSync(fp, 'utf8');
  if (html.includes('assets/platform.js')) { skipped++; continue; }
  const inject = `<script>window.UFP={product:"${slug}",api:"${API}"};</script>\n<script src="assets/platform.js"></script>\n</body>`;
  if (!html.includes('</body>')) { console.error('NO </body>:', file); continue; }
  html = html.replace(/<\/body>/i, inject);
  fs.writeFileSync(fp, html, 'utf8');
  ok++;
  console.log('injected:', file, '→', slug);
}
console.log(`done. injected=${ok} skipped=${skipped}`);
