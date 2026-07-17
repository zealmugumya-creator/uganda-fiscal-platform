/* ============================================================
   Uganda Fiscal Intelligence Platform — unified backend API
   Deploy target: Render (https://render.com) — Node web service
   Endpoints:
     GET  /health              — liveness + which features are enabled
     GET  /api/products        — metadata for all 15 products
     GET  /api/stats           — live platform stats (debt ticker etc.)
     POST /api/agent           — AI assistant (Claude) per product
     POST /api/demo            — demo request capture
     POST /api/contact         — contact form capture
   Env:
     ANTHROPIC_API_KEY  — enables real AI agent replies
     PORT               — set by Render automatically
     ALLOWED_ORIGINS    — comma-separated CORS allowlist (default *)
   ============================================================ */
'use strict';

const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

app.use(express.json({ limit: '256kb' }));

// ---- CORS ----
const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (allowed.includes('*') || allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', allowed.includes('*') ? '*' : origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---- Product catalogue + agent personas ----
const PRODUCTS = {
  portal: {
    name: 'Uganda Fiscal Intelligence Platform',
    sector: 'all',
    persona: 'You are the Platform Guide for the Uganda Fiscal Intelligence Platform — a suite of 15 products (10 private-sector, 5 government) that fight tax evasion, fraud and fiscal waste in Uganda. You know every product, how they interconnect (shared data backbone: EFRIS events, TIN registry, Mobile Money receipts), and typical pricing (UGX 100k–2M/month per product, bundles discounted). Help visitors pick the right product and route them to a demo.'
  },
  taxlink: {
    name: 'TaxLink — EFRIS Compliance Manager',
    sector: 'private',
    persona: 'You are the EFRIS Compliance Agent for TaxLink. You help Ugandan manufacturers and distributors submit e-invoices to URA EFRIS, file VAT returns (18% standard rate), avoid penalties (UGX 6M or 2x tax due for non-fiscalisation), and keep a clean compliance checklist. You know URA deadlines: VAT returns by the 15th of the following month.'
  },
  taxlinkconnect: {
    name: 'TaxLink Connect — Accounting Middleware',
    sector: 'private',
    persona: 'You are the Integration Agent for TaxLink Connect, middleware that syncs QuickBooks, Tally and Excel to URA EFRIS automatically. You help users map their chart of accounts, schedule syncs, resolve failed invoice submissions, and understand EFRIS API error codes.'
  },
  credittrack: {
    name: 'CreditTrack — Distributor Credit Manager',
    sector: 'private',
    persona: 'You are the Credit Risk Agent for CreditTrack. You help manufacturers manage distributor credit: real-time debt positions, auto-blocking over-limit customers, Mobile Money (MTN MoMo / Airtel Money) receipt reconciliation, and aging analysis. You advise on credit limits based on payment history.'
  },
  verifyug: {
    name: 'VerifyUG — Product Authentication',
    sector: 'private',
    persona: 'You are the Authentication Agent for VerifyUG. You help brands fight counterfeits with QR scan-to-verify, track scan analytics and counterfeit hotspots by district, and support NDA (National Drug Authority) compliance dashboards for pharma.'
  },
  guardpost: {
    name: 'GuardPost — Warehouse Fraud Detection',
    sector: 'private',
    persona: 'You are the Fraud Detection Agent for GuardPost. You detect warehouse and distribution fraud: 3-way load matching (order vs loaded vs delivered), GPS route deviation alerts, ghost shipment detection. You reference the documented UGX 5B Nile Breweries-scale fraud pattern as the canonical case study.'
  },
  payrollguard: {
    name: 'PayrollGuard — Payroll Compliance',
    sector: 'private',
    persona: 'You are the Payroll Compliance Agent for PayrollGuard. You handle Ugandan PAYE bands (0% to UGX 235k/mo, 10%, 20%, 30% + 10% over UGX 10M/mo), NSSF (5% employee + 10% employer), ghost worker detection via biometric/phone verification, and auto-filing to URA.'
  },
  deliverug: {
    name: 'DeliverUG — Last-Mile Logistics',
    sector: 'private',
    persona: 'You are the Logistics Agent for DeliverUG. You coordinate boda boda delivery fleets: GPS tracking, WhatsApp job dispatch, cash-on-delivery reconciliation, and route optimisation across Kampala and upcountry towns.'
  },
  procureguard: {
    name: 'ProcureGuard — Procurement Integrity',
    sector: 'private',
    persona: 'You are the Procurement Agent for ProcureGuard. You verify supplier TINs against URA, maintain a shared supplier blacklist, enforce digital PO approval chains, and flag conflict-of-interest patterns in purchasing.'
  },
  retailpulse: {
    name: 'RetailPulse — Retail Intelligence',
    sector: 'private',
    persona: 'You are the Retail Intelligence Agent for RetailPulse. Retailers report stock via USSD *284# or WhatsApp; you turn that into production intelligence for manufacturers: stockout prediction, demand heatmaps by region, and distributor performance scores.'
  },
  powercost: {
    name: 'PowerCost — Energy Cost Intelligence',
    sector: 'private',
    persona: 'You are the Energy Cost Agent for PowerCost. You track UEDCL/Umeme outages, quantify production losses per outage hour, manage generator fuel logs, and prepare compensation claims to UEDCL with evidence bundles.'
  },
  efrisbridge: {
    name: 'EFRIS Bridge — Informal Sector USSD',
    sector: 'government',
    persona: 'You are the Informal Sector Agent for EFRIS Bridge, which brings Uganda\'s ~80% informal economy into tax compliance via USSD and WhatsApp — no smartphone needed. You explain presumptive tax rates for small businesses (turnover below UGX 150M/year), simplified filing, and Mobile Money payment of tax.'
  },
  efrisdash: {
    name: 'EFRIS Intelligence Dashboard',
    sector: 'government',
    persona: 'You are the Tax Intelligence Agent for the EFRIS Intelligence Dashboard, used by URA officers. You explain compliance heatmaps by district and sector, dormant-taxpayer detection, and the AI anomaly audit queue that ranks businesses by evasion likelihood so audit capacity goes where it pays.'
  },
  debtwatch: {
    name: 'DebtWatch Uganda',
    sector: 'government',
    persona: 'You are the Debt Analysis Agent for DebtWatch Uganda, the national debt transparency tracker. You know Uganda\'s public debt (~UGX 116 trillion), creditor breakdown (multilateral, bilateral incl. China EXIM, domestic), repayment calendar pressure, and debt-service-to-revenue ratio (~67%). You explain these to both officials and citizens in plain language.'
  },
  fiscalai: {
    name: 'FiscalAI — Debt Reduction Optimiser',
    sector: 'government',
    persona: 'You are the Fiscal Strategy Agent for FiscalAI, used by the Ministry of Finance. You run debt-reduction scenario analysis: refinancing options, expenditure anomaly ML, revenue-lever ranking by ROI, and you draft minister-ready briefing summaries. Always quantify trade-offs.'
  },
  customs: {
    name: 'Customs Intelligence',
    sector: 'government',
    persona: 'You are the Customs Analysis Agent for Customs Intelligence. You cross-match Uganda import/export declarations against UN Comtrade mirror data to find under-invoicing, track gold export anomalies, and maintain border-post risk heatmaps (Malaba, Busia, Entebbe, Mutukula).'
  }
};

// ---- In-memory stores (swap for a DB when needed) ----
const demoRequests = [];
const contactMessages = [];
const store = {};   // per-product data collections: store[product][collection] = [records]
const events = [];  // cross-app collaboration feed

// ---- Routes ----
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'uganda-fiscal-platform-api',
    ai: Boolean(ANTHROPIC_API_KEY),
    products: Object.keys(PRODUCTS).length,
    time: new Date().toISOString()
  });
});

app.get('/api/products', (req, res) => {
  res.json(Object.entries(PRODUCTS).map(([id, p]) => ({ id, name: p.name, sector: p.sector })));
});

// Live-ish national stats for tickers (deterministic drift so all clients agree)
app.get('/api/stats', (req, res) => {
  const t = Date.now() / 1000;
  const base = 116.4e12; // UGX national debt baseline
  res.json({
    nationalDebtUGX: Math.round(base + (t % 86400) * 1.62e6),
    debtServicePctRevenue: 67,
    efrisComplianceRate: 48.5,
    revenueGapUGX: 1.7e12,
    informalEconomyPct: 80,
    updated: new Date().toISOString()
  });
});

app.post('/api/agent', async (req, res) => {
  const { product = 'portal', messages = [] } = req.body || {};
  const p = PRODUCTS[product] || PRODUCTS.portal;

  const clean = (Array.isArray(messages) ? messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!clean.length || clean[clean.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'messages must end with a user turn' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.json({
      reply: 'AI is not configured on the server yet (missing ANTHROPIC_API_KEY). '
        + 'Meanwhile: ' + p.name + ' — ask about features, pricing, or request a demo from the portal.',
      ai: false
    });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system: p.persona + '\n\nRules: Be concise (under 180 words unless asked for detail). Use UGX for money. '
          + 'You are embedded in the live web app, so refer to on-screen features naturally. '
          + 'If asked about other products in the platform, describe them and suggest opening them from the portal. '
          + 'Never invent specific client data; speak in terms of what the product does.',
        messages: clean
      })
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error('Anthropic API error', r.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'upstream AI error', status: r.status });
    }
    const data = await r.json();
    const reply = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    res.json({ reply: reply || 'I could not generate a response — please rephrase.', ai: true });
  } catch (err) {
    console.error('agent error', err.message);
    res.status(500).json({ error: 'agent failure' });
  }
});

// ---- Per-app data storage (each app keeps its own records) ----
const okName = s => /^[a-z0-9-]{1,40}$/.test(s);

app.get('/api/store/:product/:collection', (req, res) => {
  const { product, collection } = req.params;
  if (!okName(product) || !okName(collection)) return res.status(400).json({ error: 'bad name' });
  res.json(((store[product] || {})[collection]) || []);
});

app.post('/api/store/:product/:collection', (req, res) => {
  const { product, collection } = req.params;
  if (!okName(product) || !okName(collection)) return res.status(400).json({ error: 'bad name' });
  store[product] = store[product] || {};
  const col = store[product][collection] = store[product][collection] || [];
  if (col.length >= 5000) col.shift();
  const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ...req.body, _at: new Date().toISOString() };
  col.push(rec);
  res.json(rec);
});

app.delete('/api/store/:product/:collection/:id', (req, res) => {
  const { product, collection, id } = req.params;
  const col = (store[product] || {})[collection];
  if (!col) return res.status(404).json({ error: 'not found' });
  const i = col.findIndex(r => r.id === id);
  if (i < 0) return res.status(404).json({ error: 'not found' });
  col.splice(i, 1);
  res.json({ ok: true });
});

// ---- Cross-app collaboration feed ----
// Any app can publish an event (e.g. GuardPost publishes a fraud alert,
// CreditTrack publishes an over-limit distributor). Every other app can read
// the feed and react — this is how the 15 separate apps work as a team.
app.post('/api/events', (req, res) => {
  const { product = 'unknown', type = 'info', title = '', detail = '' } = req.body || {};
  if (events.length >= 2000) events.shift();
  const ev = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    product: String(product).slice(0, 40), type: String(type).slice(0, 30),
    title: String(title).slice(0, 200), detail: String(detail).slice(0, 1000),
    at: new Date().toISOString()
  };
  events.push(ev);
  res.json(ev);
});

app.get('/api/events', (req, res) => {
  const since = req.query.since ? Date.parse(req.query.since) : 0;
  const forProduct = req.query.product;
  let out = events.filter(e => Date.parse(e.at) > since);
  if (forProduct) out = out.filter(e => e.product === forProduct);
  res.json(out.slice(-100));
});

app.post('/api/demo', (req, res) => {
  const { name = '', company = '', phone = '', email = '', product = '', date = '' } = req.body || {};
  demoRequests.push({ name, company, phone, email, product, date, at: new Date().toISOString() });
  console.log('DEMO REQUEST:', JSON.stringify(demoRequests[demoRequests.length - 1]));
  res.json({ ok: true, message: 'Demo request received — we will contact you within 24 hours.' });
});

app.post('/api/contact', (req, res) => {
  const { name = '', email = '', message = '' } = req.body || {};
  contactMessages.push({ name, email, message: String(message).slice(0, 2000), at: new Date().toISOString() });
  console.log('CONTACT:', JSON.stringify(contactMessages[contactMessages.length - 1]));
  res.json({ ok: true, message: 'Message received.' });
});

// Admin peek (protect with a token if you keep it)
app.get('/api/admin/leads', (req, res) => {
  if (process.env.ADMIN_TOKEN && req.query.token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'forbidden' });
  }
  res.json({ demoRequests, contactMessages });
});

app.listen(PORT, () => {
  console.log('Uganda Fiscal Platform API listening on :' + PORT
    + ' | AI: ' + (ANTHROPIC_API_KEY ? 'enabled (' + MODEL + ')' : 'DISABLED — set ANTHROPIC_API_KEY'));
});
