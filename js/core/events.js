/* Work — core/events.js
 * Minimal pub/sub. Handlers are isolated: one throwing never breaks the rest.
 */
(function (W) {
  'use strict';

  const channels = new Map();

  function on(name, fn) {
    if (!channels.has(name)) channels.set(name, new Set());
    channels.get(name).add(fn);
    return function off() {
      const set = channels.get(name);
      if (set) set.delete(fn);
    };
  }

  function emit(name, payload) {
    const set = channels.get(name);
    if (!set) return;
    Array.from(set).forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('[Work] handler for "' + name + '" failed:', err);
      }
    });
  }

  W.events = { on, emit };
})((window.Work = window.Work || {}));
