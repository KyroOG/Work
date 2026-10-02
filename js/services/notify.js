/* Work — services/notify.js
 * Thin wrapper around the Notification API. Everything degrades quietly
 * when permission isn't granted — the in-app UI is always the source of truth.
 */
(function (W) {
  'use strict';

  function supported() {
    return 'Notification' in window;
  }
  function permission() {
    return supported() ? Notification.permission : 'unsupported';
  }
  async function request() {
    if (!supported()) return 'unsupported';
    try {
      const p = await Notification.requestPermission();
      W.events.emit('notify:permission', p);
      return p;
    } catch (e) {
      return permission();
    }
  }
  function send(title, opts) {
    if (!supported() || Notification.permission !== 'granted') return null;
    if (!W.store.state.settings.notifications) return null;
    try {
      const n = new Notification(title, Object.assign({ icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }, opts));
      if (opts && opts.onClick) n.onclick = opts.onClick;
      return n;
    } catch (e) {
      return null;
    }
  }

  W.notify = { supported, permission, request, send };
})((window.Work = window.Work || {}));
