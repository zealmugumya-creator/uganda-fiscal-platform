/* ============================================================
   Uganda Fiscal Intelligence Platform — shared runtime
   Injected into every app. Provides:
   1. Cross-app navigation (portal ↔ products)
   2. AI assistant widget (per-product agent persona)
   3. Backend connectivity (Render API) with offline fallback
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.UFP || { product: 'portal', api: '' };
  // Resolve API base: explicit config → localStorage override → localhost dev
  var API = (localStorage.getItem('ufp_api') || CFG.api || '').replace(/\/+$/, '');
  if (!API && /^(localhost|127\.)/.test(location.hostname)) API = 'http://localhost:10000';

  var PRODUCTS = {
    portal:         { file: 'index.html',                          name: 'Master Portal',        agent: 'Platform Guide' },
    taxlink:        { file: 'efris-compliance-manager.html',       name: 'TaxLink',              agent: 'EFRIS Compliance Agent' },
    taxlinkconnect: { file: 'taxlink-connect-middleware.html',     name: 'TaxLink Connect',      agent: 'Integration Agent' },
    credittrack:    { file: 'distributor-credit-manager.html',     name: 'CreditTrack',          agent: 'Credit Risk Agent' },
    verifyug:       { file: 'product-authentication-platform.html',name: 'VerifyUG',             agent: 'Authentication Agent' },
    guardpost:      { file: 'warehouse-fraud-detection.html',      name: 'GuardPost',            agent: 'Fraud Detection Agent' },
    payrollguard:   { file: 'payrollguard.html',                   name: 'PayrollGuard',         agent: 'Payroll Compliance Agent' },
    deliverug:      { file: 'deliverug.html',                      name: 'DeliverUG',            agent: 'Logistics Agent' },
    procureguard:   { file: 'procureguard.html',                   name: 'ProcureGuard',         agent: 'Procurement Agent' },
    retailpulse:    { file: 'retailpulse.html',                    name: 'RetailPulse',          agent: 'Retail Intelligence Agent' },
    powercost:      { file: 'powercost.html',                      name: 'PowerCost',            agent: 'Energy Cost Agent' },
    efrisbridge:    { file: 'efris-bridge-ussd.html',              name: 'EFRIS Bridge',         agent: 'Informal Sector Agent' },
    efrisdash:      { file: 'efris-intelligence-dashboard.html',   name: 'EFRIS Intelligence',   agent: 'Tax Intelligence Agent' },
    debtwatch:      { file: 'debtwatch-uganda.html',               name: 'DebtWatch',            agent: 'Debt Analysis Agent' },
    fiscalai:       { file: 'fiscalai.html',                       name: 'FiscalAI',             agent: 'Fiscal Strategy Agent' },
    customs:        { file: 'customs-intelligence.html',           name: 'Customs Intelligence', agent: 'Customs Analysis Agent' }
  };

  var me = PRODUCTS[CFG.product] || PRODUCTS.portal;

  /* ---------- styles ---------- */
  var css = ''
    + '.ufp-back{position:fixed;top:14px;left:14px;z-index:99990;display:flex;align-items:center;gap:6px;'
    + 'background:#0d0f14;border:1px solid #242c40;color:#e8ecf8;padding:8px 14px;border-radius:999px;'
    + 'font:500 12px Inter,system-ui,sans-serif;cursor:pointer;text-decoration:none;opacity:.85;transition:all .15s;box-shadow:0 4px 16px rgba(0,0,0,.5)}'
    + '.ufp-back:hover{opacity:1;border-color:#e8c040;color:#e8c040}'
    + '.ufp-fab{position:fixed;bottom:22px;right:22px;z-index:99991;width:56px;height:56px;border-radius:50%;'
    + 'background:linear-gradient(135deg,#e8c040,#c8a020);border:none;cursor:pointer;font-size:24px;'
    + 'box-shadow:0 6px 24px rgba(232,192,64,.35);display:flex;align-items:center;justify-content:center;transition:transform .15s}'
    + '.ufp-fab:hover{transform:scale(1.08)}'
    + '.ufp-panel{position:fixed;bottom:90px;right:22px;z-index:99992;width:min(380px,calc(100vw - 44px));height:min(520px,70vh);'
    + 'background:#0d0f14;border:1px solid #242c40;border-radius:16px;display:none;flex-direction:column;overflow:hidden;'
    + 'box-shadow:0 12px 48px rgba(0,0,0,.7);font-family:Inter,system-ui,sans-serif}'
    + '.ufp-panel.open{display:flex}'
    + '.ufp-head{padding:14px 16px;border-bottom:1px solid #1c2130;background:#12151c;display:flex;align-items:center;gap:10px}'
    + '.ufp-dot{width:8px;height:8px;border-radius:50%;background:#f04040;flex-shrink:0}'
    + '.ufp-dot.on{background:#28e060;box-shadow:0 0 8px rgba(40,224,96,.6)}'
    + '.ufp-htxt{flex:1;min-width:0}.ufp-hname{font-size:13px;font-weight:600;color:#e8ecf8}'
    + '.ufp-hsub{font-size:10px;color:#6070a0;text-transform:uppercase;letter-spacing:.08em;margin-top:1px}'
    + '.ufp-x{background:none;border:none;color:#6070a0;font-size:18px;cursor:pointer;padding:4px}'
    + '.ufp-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}'
    + '.ufp-m{max-width:85%;padding:10px 13px;border-radius:12px;font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word}'
    + '.ufp-m.user{align-self:flex-end;background:#e8c040;color:#000;border-bottom-right-radius:4px}'
    + '.ufp-m.bot{align-self:flex-start;background:#171b24;color:#e8ecf8;border:1px solid #1c2130;border-bottom-left-radius:4px}'
    + '.ufp-m.bot.think{color:#6070a0;font-style:italic}'
    + '.ufp-form{display:flex;gap:8px;padding:12px;border-top:1px solid #1c2130;background:#12151c}'
    + '.ufp-in{flex:1;background:#08090c;border:1px solid #242c40;border-radius:9px;padding:10px 12px;color:#e8ecf8;'
    + 'font:400 12.5px Inter,system-ui,sans-serif;outline:none}'
    + '.ufp-in:focus{border-color:#e8c040}'
    + '.ufp-send{background:#e8c040;color:#000;border:none;border-radius:9px;padding:0 16px;font:600 12px Inter,sans-serif;cursor:pointer}'
    + '.ufp-send:disabled{opacity:.5;cursor:default}'
    + '.ufp-launch{display:inline-flex;align-items:center;gap:4px;margin-top:10px;padding:6px 12px;border-radius:7px;'
    + 'background:rgba(232,192,64,.1);border:1px solid #403800;color:#e8c040;font:600 11px Inter,sans-serif;'
    + 'cursor:pointer;text-decoration:none;transition:all .15s}'
    + '.ufp-launch:hover{background:#e8c040;color:#000}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- navigation ---------- */
  if (CFG.product !== 'portal') {
    var back = document.createElement('a');
    back.className = 'ufp-back';
    back.href = 'index.html';
    back.innerHTML = '&#8592; Portal';
    back.title = 'Back to Uganda Fiscal Intelligence Platform';
    document.body.appendChild(back);
  } else {
    // Portal: give every product card a real "Launch App" link
    document.querySelectorAll('.product-card[onclick]').forEach(function (card) {
      var m = (card.getAttribute('onclick') || '').match(/openProduct\('([^']+)'\)/);
      if (!m || !PRODUCTS[m[1]]) return;
      var a = document.createElement('a');
      a.className = 'ufp-launch';
      a.href = PRODUCTS[m[1]].file;
      a.innerHTML = 'Launch App &#8599;';
      a.addEventListener('click', function (e) { e.stopPropagation(); });
      card.appendChild(a);
    });
  }

  /* ---------- AI assistant widget ---------- */
  var fab = document.createElement('button');
  fab.className = 'ufp-fab';
  fab.innerHTML = '&#10024;';
  fab.title = me.agent;

  var panel = document.createElement('div');
  panel.className = 'ufp-panel';
  panel.innerHTML =
    '<div class="ufp-head">'
    + '<span class="ufp-dot" id="ufp-dot"></span>'
    + '<div class="ufp-htxt"><div class="ufp-hname">' + me.agent + '</div>'
    + '<div class="ufp-hsub">' + me.name + ' &middot; AI Assistant</div></div>'
    + '<button class="ufp-x" id="ufp-x">&#10005;</button></div>'
    + '<div class="ufp-msgs" id="ufp-msgs"></div>'
    + '<form class="ufp-form" id="ufp-form">'
    + '<input class="ufp-in" id="ufp-in" placeholder="Ask the ' + me.agent + '..." autocomplete="off">'
    + '<button class="ufp-send" id="ufp-send" type="submit">Send</button></form>';

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var msgs = panel.querySelector('#ufp-msgs');
  var input = panel.querySelector('#ufp-in');
  var sendBtn = panel.querySelector('#ufp-send');
  var history = [];
  var online = false;

  function addMsg(role, text, think) {
    var d = document.createElement('div');
    d.className = 'ufp-m ' + (role === 'user' ? 'user' : 'bot') + (think ? ' think' : '');
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  fab.addEventListener('click', function () {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      input.focus();
      if (!msgs.children.length) {
        addMsg('bot', 'Hello! I’m the ' + me.agent + ' for ' + me.name + '. Ask me anything about '
          + (CFG.product === 'portal' ? 'the platform, any of the 15 products, pricing, or how the products work together.' : 'this product, your data, Ugandan tax rules, or how to get started.'));
      }
    }
  });
  panel.querySelector('#ufp-x').addEventListener('click', function () { panel.classList.remove('open'); });

  panel.querySelector('#ufp-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q || sendBtn.disabled) return;
    input.value = '';
    addMsg('user', q);
    history.push({ role: 'user', content: q });
    sendBtn.disabled = true;
    var thinking = addMsg('bot', 'Thinking…', true);

    if (!API || !online) {
      setTimeout(function () {
        thinking.remove();
        addMsg('bot', offlineAnswer(q));
        sendBtn.disabled = false;
      }, 500);
      return;
    }

    fetch(API + '/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: CFG.product, messages: history.slice(-12) })
    })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        thinking.remove();
        var reply = data.reply || 'Sorry, I could not generate a response.';
        addMsg('bot', reply);
        history.push({ role: 'assistant', content: reply });
      })
      .catch(function () {
        thinking.remove();
        addMsg('bot', offlineAnswer(q));
      })
      .then(function () { sendBtn.disabled = false; input.focus(); });
  });

  // Rule-based fallback so the widget is useful even before the backend is live
  function offlineAnswer(q) {
    var s = q.toLowerCase();
    var pre = '(Offline mode — connect the backend for full AI answers.)\n\n';
    if (/price|cost|how much|fee/.test(s)) return pre + me.name + ' pricing is tiered by business size. Typical range across the platform is UGX 100,000–2,000,000 per month per product, with bundle discounts for 3+ products. Use "Request Demo" on the portal for a formal quote.';
    if (/efris|ura|tax|vat/.test(s)) return pre + 'The platform automates URA EFRIS compliance: invoices are fiscalised automatically, VAT returns are pre-filled, and the AI flags anomalies before URA does. TaxLink and EFRIS Bridge are the two entry points depending on whether you are formal or informal sector.';
    if (/start|begin|setup|sign ?up|demo/.test(s)) return pre + 'To get started with ' + me.name + ': 1) Request a demo from the portal, 2) We onboard your data in under a week, 3) You go live with the AI agent monitoring from day one.';
    if (/product|platform|other|all/.test(s)) return pre + 'The platform has 15 products: 10 for the private sector (TaxLink, CreditTrack, VerifyUG, GuardPost, PayrollGuard, DeliverUG, ProcureGuard, RetailPulse, PowerCost, TaxLink Connect) and 5 for government (EFRIS Bridge, EFRIS Intelligence, DebtWatch, FiscalAI, Customs Intelligence). They share one data backbone, so evidence flows between them.';
    return pre + 'I’m the ' + me.agent + '. I can explain features, pricing, EFRIS rules, and how ' + me.name + ' fits with the other 14 products. Could you rephrase or ask something more specific?';
  }

  /* ---------- backend health ---------- */
  function ping() {
    if (!API) return;
    fetch(API + '/health', { method: 'GET' })
      .then(function (r) { online = r.ok; })
      .catch(function () { online = false; })
      .then(function () {
        var dot = document.getElementById('ufp-dot');
        if (dot) dot.className = 'ufp-dot' + (online ? ' on' : '');
      });
  }
  ping();
  setInterval(ping, 30000);
})();
