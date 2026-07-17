/* GuardPost — real persistence hooks.
   Every crate scan is recorded to the shared backend; mismatches and
   truck lockdowns are broadcast to the whole platform on the team feed,
   so CreditTrack, ProcureGuard and the portal see the alert instantly. */
(function () {
  'use strict';

  var _scanCrate = window.scanCrate;
  window.scanCrate = function (result) {
    _scanCrate(result);
    if (!window.UFP || !UFP.client) return;
    UFP.client.save('scans', {
      crate: 'NBL-CRATE-2025-004821',
      invoice: 'NBL-DSP-0847',
      result: result === 'ok' ? 'verified' : 'MISMATCH',
      totalScanned: typeof scanCount !== 'undefined' ? scanCount : null
    }).catch(function () {});
    if (result !== 'ok') {
      UFP.client.emit('alert', 'GuardPost: LOAD MISMATCH — loading paused',
        'Crate NBL-CRATE-2025-004821 is not on invoice NBL-DSP-0847. Warehouse manager and security notified. All apps: hold related transactions.')
        .then(function () { showNotif('🚨 Mismatch logged + alert broadcast to all platform apps'); })
        .catch(function () {});
    }
  };

  var _lockTruck = window.lockTruck;
  window.lockTruck = function () {
    _lockTruck();
    if (!window.UFP || !UFP.client) return;
    UFP.client.save('cases', { ref: 'CID-2025-0847', action: 'truck-lockdown', escalatedTo: 'Uganda Police CID' }).catch(function () {});
    UFP.client.emit('alert', 'GuardPost: truck lockdown — Police CID engaged',
      'Case CID-2025-0847 escalated to Uganda Police Force CID. Vehicle held pending investigation.').catch(function () {});
  };
})();
