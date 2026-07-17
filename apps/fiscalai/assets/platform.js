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

  // Each product is its OWN app with its own URL — they collaborate through
  // the shared backend API and cross-link through the portal.
  var PRODUCTS = {
    portal:         { url: 'https://uganda-fiscal-platform.pages.dev', name: 'Master Portal',        agent: 'Platform Guide' },
    taxlink:        { url: 'https://taxlink-uganda.pages.dev',         name: 'TaxLink',              agent: 'EFRIS Compliance Agent' },
    taxlinkconnect: { url: 'https://taxlinkconnect-uganda.pages.dev',  name: 'TaxLink Connect',      agent: 'Integration Agent' },
    credittrack:    { url: 'https://credittrack-uganda.pages.dev',     name: 'CreditTrack',          agent: 'Credit Risk Agent' },
    verifyug:       { url: 'https://verifyug-uganda.pages.dev',        name: 'VerifyUG',             agent: 'Authentication Agent' },
    guardpost:      { url: 'https://guardpost-uganda.pages.dev',       name: 'GuardPost',            agent: 'Fraud Detection Agent' },
    payrollguard:   { url: 'https://payrollguard-uganda.pages.dev',    name: 'PayrollGuard',         agent: 'Payroll Compliance Agent' },
    deliverug:      { url: 'https://deliverug-uganda.pages.dev',       name: 'DeliverUG',            agent: 'Logistics Agent' },
    procureguard:   { url: 'https://procureguard-uganda.pages.dev',    name: 'ProcureGuard',         agent: 'Procurement Agent' },
    retailpulse:    { url: 'https://retailpulse-uganda.pages.dev',     name: 'RetailPulse',          agent: 'Retail Intelligence Agent' },
    powercost:      { url: 'https://powercost-uganda.pages.dev',       name: 'PowerCost',            agent: 'Energy Cost Agent' },
    efrisbridge:    { url: 'https://efrisbridge-uganda.pages.dev',     name: 'EFRIS Bridge',         agent: 'Informal Sector Agent' },
    efrisdash:      { url: 'https://efrisdash-uganda.pages.dev',       name: 'EFRIS Intelligence',   agent: 'Tax Intelligence Agent' },
    debtwatch:      { url: 'https://debtwatch-uganda.pages.dev',       name: 'DebtWatch',            agent: 'Debt Analysis Agent' },
    fiscalai:       { url: 'https://fiscalai-uganda.pages.dev',        name: 'FiscalAI',             agent: 'Fiscal Strategy Agent' },
    customs:        { url: 'https://customs-uganda.pages.dev',         name: 'Customs Intelligence', agent: 'Customs Analysis Agent' }
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
    back.href = PRODUCTS.portal.url;
    back.innerHTML = '&#8592; Portal';
    back.title = 'Back to Uganda Fiscal Intelligence Platform';
    document.body.appendChild(back);
  } else {
    // Portal: give every product card a real "Launch App" link to its own site
    document.querySelectorAll('.product-card[onclick]').forEach(function (card) {
      var m = (card.getAttribute('onclick') || '').match(/openProduct\('([^']+)'\)/);
      if (!m || !PRODUCTS[m[1]]) return;
      var a = document.createElement('a');
      a.className = 'ufp-launch';
      a.href = PRODUCTS[m[1]].url;
      a.innerHTML = 'Launch App &#8599;';
      a.addEventListener('click', function (e) { e.stopPropagation(); });
      card.appendChild(a);
    });
  }

  /* ---------- responsive grid folding ----------
     The apps were designed desktop-first with fixed multi-column grids.
     At runtime, measure every grid's track count and fold it to fit:
     - 5+ tracks (data rows)  → keep columns, let the container scroll sideways
     - 3-4 tracks (card rows) → 2 columns on tablets, keep 2 on phones
     - 2 tracks               → 1 column on phones                          */
  var grids = [];
  function collectGrids() {
    var all = document.body.getElementsByTagName('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.className && String(el.className).indexOf('ufp-') === 0) continue;
      var cs = getComputedStyle(el);
      if (cs.display !== 'grid' && cs.display !== 'inline-grid') continue;
      var n = cs.gridTemplateColumns.split(' ').filter(Boolean).length;
      if (n >= 2) grids.push({ el: el, n: n, orig: el.style.gridTemplateColumns, wrapped: false });
    }
  }
  function foldGrids() {
    var w = window.innerWidth;
    grids.forEach(function (g) {
      if (w > 900) {
        g.el.style.gridTemplateColumns = g.orig;
        g.el.style.minWidth = '';
        if (g.wrapped && g.el.parentElement) g.el.parentElement.style.overflowX = '';
        return;
      }
      if (g.n >= 5) {
        g.el.style.minWidth = '640px';
        if (g.el.parentElement) { g.el.parentElement.style.overflowX = 'auto'; g.wrapped = true; }
      } else if (g.n >= 3) {
        g.el.style.gridTemplateColumns = w < 620 ? '1fr 1fr' : '1fr 1fr';
      } else {
        g.el.style.gridTemplateColumns = w < 620 ? '1fr' : g.orig || '';
      }
    });
  }
  try { collectGrids(); foldGrids(); } catch (e) {}
  var foldTimer;
  window.addEventListener('resize', function () {
    clearTimeout(foldTimer);
    foldTimer = setTimeout(foldGrids, 150);
  });

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

  /* ---------- installable app (PWA) ---------- */
  if (!document.querySelector('link[rel="manifest"]')) {
    var mf = document.createElement('link');
    mf.rel = 'manifest';
    mf.href = 'manifest.json';
    document.head.appendChild(mf);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    var tc = document.createElement('meta');
    tc.name = 'theme-color';
    tc.content = '#08090c';
    document.head.appendChild(tc);
  }
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  var deferredInstall = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredInstall = e;
    if (document.getElementById('ufp-install')) return;
    var btn = document.createElement('button');
    btn.id = 'ufp-install';
    btn.className = 'ufp-back';
    btn.style.cssText = 'top:14px;right:14px;left:auto;border-color:#403800;color:#e8c040;';
    btn.innerHTML = '&#8681; Install App';
    btn.title = 'Install the Uganda Fiscal Platform as an app on this device';
    btn.addEventListener('click', function () {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      deferredInstall.userChoice.then(function () { btn.remove(); deferredInstall = null; });
    });
    document.body.appendChild(btn);
  });

  /* ---------- collaboration API ----------
     Every app can persist its own records and publish/read cross-app events:
       UFP.client.list('invoices')            → this app's saved records
       UFP.client.save('invoices', {...})     → persist a record
       UFP.client.emit('alert', 'title', 'detail') → tell the other apps
       UFP.client.feed()                      → what the whole team is reporting */
  function api(pathname, opts) {
    if (!API) return Promise.reject(new Error('no API configured'));
    return fetch(API + pathname, opts).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  window.UFP = CFG;
  CFG.client = {
    list: function (col) { return api('/api/store/' + CFG.product + '/' + col); },
    save: function (col, data) {
      return api('/api/store/' + CFG.product + '/' + col, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data || {})
      });
    },
    remove: function (col, id) { return api('/api/store/' + CFG.product + '/' + col + '/' + id, { method: 'DELETE' }); },
    emit: function (type, title, detail) {
      return api('/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: CFG.product, type: type, title: title, detail: detail })
      });
    },
    feed: function (since) { return api('/api/events' + (since ? '?since=' + encodeURIComponent(since) : '')); },
    stats: function () { return api('/api/stats'); },
    products: PRODUCTS
  };

  /* ---------- portal: live team feed ----------
     Shows what the separate apps are reporting (invoices fiscalised,
     fraud alerts, lockdowns) — visible proof they work as a team. */
  if (CFG.product === 'portal') {
    var feedCss = document.createElement('style');
    feedCss.textContent =
      '.ufp-feed-pill{position:fixed;bottom:22px;left:22px;z-index:99991;display:flex;align-items:center;gap:8px;'
      + 'background:#0d0f14;border:1px solid #242c40;color:#e8ecf8;padding:10px 16px;border-radius:999px;'
      + 'font:600 12px Inter,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.5);transition:all .15s}'
      + '.ufp-feed-pill:hover{border-color:#18d8c0;color:#18d8c0}'
      + '.ufp-feed-badge{background:#f04040;color:#fff;border-radius:999px;font-size:10px;padding:1px 7px;display:none}'
      + '.ufp-feed-panel{position:fixed;bottom:74px;left:22px;z-index:99992;width:min(360px,calc(100vw - 44px));max-height:50vh;'
      + 'background:#0d0f14;border:1px solid #242c40;border-radius:14px;display:none;flex-direction:column;overflow:hidden;'
      + 'box-shadow:0 12px 48px rgba(0,0,0,.7);font-family:Inter,system-ui,sans-serif}'
      + '.ufp-feed-panel.open{display:flex}'
      + '.ufp-feed-head{padding:12px 14px;border-bottom:1px solid #1c2130;background:#12151c;font:600 12px Inter,sans-serif;color:#e8ecf8}'
      + '.ufp-feed-list{overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:8px}'
      + '.ufp-feed-item{background:#171b24;border:1px solid #1c2130;border-radius:9px;padding:9px 11px}'
      + '.ufp-feed-item.alert{border-color:#480000;background:#140000}'
      + '.ufp-feed-t{font-size:12px;font-weight:600;color:#e8ecf8}'
      + '.ufp-feed-d{font-size:11px;color:#6070a0;margin-top:3px;line-height:1.45}'
      + '.ufp-feed-m{font-size:10px;color:#2a3050;margin-top:4px;font-family:JetBrains Mono,monospace}'
      + '@media(max-width:620px){.ufp-feed-pill{bottom:88px}}';
    document.head.appendChild(feedCss);

    var pill = document.createElement('button');
    pill.className = 'ufp-feed-pill';
    pill.innerHTML = '&#128225; Team Feed <span class="ufp-feed-badge" id="ufp-feed-badge"></span>';
    var fpanel = document.createElement('div');
    fpanel.className = 'ufp-feed-panel';
    fpanel.innerHTML = '<div class="ufp-feed-head">&#128225; Live Team Feed — what the 15 apps are reporting</div>'
      + '<div class="ufp-feed-list" id="ufp-feed-list"><div class="ufp-feed-item"><div class="ufp-feed-d">Loading…</div></div></div>';
    document.body.appendChild(pill);
    document.body.appendChild(fpanel);

    var lastSeen = 0;
    function renderFeed(evts) {
      var list = document.getElementById('ufp-feed-list');
      if (!evts.length) {
        list.innerHTML = '<div class="ufp-feed-item"><div class="ufp-feed-d">No team activity yet. Open TaxLink and fiscalise an invoice, or run a GuardPost crate scan — events appear here for every app to see.</div></div>';
        return;
      }
      list.innerHTML = evts.slice().reverse().map(function (e) {
        var app = (PRODUCTS[e.product] || {}).name || e.product;
        return '<div class="ufp-feed-item ' + (e.type === 'alert' ? 'alert' : '') + '">'
          + '<div class="ufp-feed-t">' + (e.type === 'alert' ? '&#128680; ' : '&#9989; ') + escapeHtml(e.title) + '</div>'
          + (e.detail ? '<div class="ufp-feed-d">' + escapeHtml(e.detail) + '</div>' : '')
          + '<div class="ufp-feed-m">' + escapeHtml(app) + ' &middot; ' + new Date(e.at).toLocaleTimeString() + '</div></div>';
      }).join('');
    }
    function escapeHtml(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }
    function pollFeed() {
      if (!API) return;
      CFG.client.feed().then(function (evts) {
        renderFeed(evts);
        var unseen = evts.filter(function (e) { return Date.parse(e.at) > lastSeen; }).length;
        var badge = document.getElementById('ufp-feed-badge');
        if (unseen && !fpanel.classList.contains('open')) { badge.style.display = 'inline'; badge.textContent = unseen; }
      }).catch(function () {
        var list = document.getElementById('ufp-feed-list');
        if (list) list.innerHTML = '<div class="ufp-feed-item"><div class="ufp-feed-d">Backend offline — the feed goes live once the Render API is deployed.</div></div>';
      });
    }
    pill.addEventListener('click', function () {
      fpanel.classList.toggle('open');
      if (fpanel.classList.contains('open')) {
        lastSeen = Date.now();
        document.getElementById('ufp-feed-badge').style.display = 'none';
        pollFeed();
      }
    });
    pollFeed();
    setInterval(pollFeed, 25000);
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
