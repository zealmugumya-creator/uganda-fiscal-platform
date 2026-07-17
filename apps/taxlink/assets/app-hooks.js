/* TaxLink — real persistence hooks.
   Invoices submitted to EFRIS are saved to the shared backend
   (UFP.client.save) and announced on the cross-app team feed. */
(function () {
  'use strict';

  function ugx(id) {
    var el = document.getElementById(id);
    return el ? el.textContent.replace(/[^0-9,]/g, '') : '0';
  }

  function collectInvoice(fdn) {
    var buyer = (document.getElementById('buyer-name') || {}).value || 'Walk-in customer';
    var rows = document.querySelectorAll('#line-items-body .item-row, #line-items-body > div').length || 1;
    return {
      num: (document.getElementById('inv-number') || {}).value || 'INV-' + Date.now(),
      buyer: buyer,
      items: rows,
      amount: ugx('total-payable'),
      vat: ugx('vat-amount'),
      status: 'submitted',
      fdn: fdn
    };
  }

  // Load previously saved invoices from the backend into the list
  function loadSaved() {
    if (!window.UFP || !UFP.client) return;
    UFP.client.list('invoices').then(function (rows) {
      var added = 0;
      rows.slice().reverse().forEach(function (r) {
        if (r.num && !invoices.some(function (i) { return i.num === r.num; })) {
          invoices.unshift({ num: r.num, buyer: r.buyer, items: r.items, amount: r.amount, vat: r.vat, status: r.status, fdn: r.fdn });
          added++;
        }
      });
      if (added) {
        renderInvoices();
        try { updateStats(); } catch (e) {}
        showNotif('✓ Loaded ' + added + ' saved invoice(s) from the platform backend');
      }
    }).catch(function () {});
  }

  // Replace the simulated submit with one that also persists the invoice
  window.submitToEFRIS = function () {
    closeModal('json-modal');
    showNotif('⟳ Submitting to URA EFRIS...');
    setTimeout(function () {
      var fdn = 'UG' + Date.now().toString().slice(-12);
      var response = {
        status: 'ACCEPTED',
        fiscalDocumentNumber: fdn,
        invoiceId: document.getElementById('inv-number').value,
        verificationCode: 'ANTIFAKE-' + fdn.slice(-8),
        qrCode: 'https://efris.ura.go.ug/verify/' + fdn,
        timestamp: new Date().toISOString(),
        message: 'Invoice successfully received and processed by Uganda Revenue Authority EFRIS system'
      };
      document.getElementById('ura-response-box').innerHTML = formatJSON(response);
      closeModal('json-modal');
      document.getElementById('response-modal').classList.add('open');

      var rec = collectInvoice(fdn);
      invoices.unshift(rec);
      renderInvoices();
      try { updateStats(); } catch (e) {}

      if (window.UFP && UFP.client) {
        UFP.client.save('invoices', rec)
          .then(function () { showNotif('✓ FDN issued — invoice saved to the platform backend'); })
          .catch(function () { showNotif('✓ FDN issued — (backend offline, invoice kept locally)'); });
        UFP.client.emit('invoice', 'TaxLink: invoice ' + rec.num + ' fiscalised',
          rec.buyer + ' — UGX ' + rec.amount + ' (VAT UGX ' + rec.vat + '), FDN ' + fdn).catch(function () {});
      }

      // Advance the invoice number for the next one
      var numEl = document.getElementById('inv-number');
      var m = (numEl.value || '').match(/^(.*?)(\d+)$/);
      if (m) numEl.value = m[1] + String(parseInt(m[2], 10) + 1).padStart(m[2].length, '0');
    }, 2200);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadSaved);
  else setTimeout(loadSaved, 400);
})();
