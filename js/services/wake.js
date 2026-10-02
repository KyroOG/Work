/* Work — services/wake.js
 * Keeps the screen on while a focus session is running, when supported and enabled.
 */
(function (W) {
  'use strict';

  let sentinel = null;

  async function acquire() {
    if (!W.store.state.settings.keepAwake) return;
    if (!('wakeLock' in navigator)) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
    } catch (e) {
      sentinel = null;
    }
  }
  function release() {
    if (sentinel) sentinel.release().catch(() => {});
    sentinel = null;
  }
  // Wake locks drop when the tab is hidden; re-acquire on return if still needed.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && W.store.state.focus.status === 'running' && !sentinel) acquire();
  });

  W.wake = { acquire, release };
})((window.Work = window.Work || {}));
