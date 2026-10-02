/* Work — core/title.js
 * Several systems want the browser tab title (ringing alarm, running timer).
 * This resolves the conflict by priority: alarm > timer > "Work".
 */
(function (W) {
  'use strict';

  const BASE = 'Work';
  const PRIORITY = ['alarm', 'timer'];
  const layers = {};

  function paint() {
    for (let i = 0; i < PRIORITY.length; i++) {
      if (layers[PRIORITY[i]]) {
        document.title = layers[PRIORITY[i]];
        return;
      }
    }
    document.title = BASE;
  }

  W.title = {
    set(key, text) {
      if (layers[key] === text) return;
      layers[key] = text;
      paint();
    },
    clear(key) {
      if (!(key in layers)) return;
      delete layers[key];
      paint();
    },
  };
})((window.Work = window.Work || {}));
