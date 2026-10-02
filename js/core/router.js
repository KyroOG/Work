/* Work — core/router.js
 * Three views, no history stack complexity needed: the hash IS the state.
 */
(function (W) {
  'use strict';

  const VALID = ['tasks', 'focus', 'alarms', 'settings'];
  let current = 'tasks';

  function parse() {
    const h = location.hash.replace('#', '');
    return VALID.includes(h) ? h : 'tasks';
  }

  function go(name) {
    if (!VALID.includes(name)) return;
    location.hash = name;
  }

  function onHashChange() {
    const next = parse();
    if (next === current && document.querySelector('.view.is-active')) return;
    current = next;
    W.events.emit('route', current);
  }

  function init() {
    current = parse();
    window.addEventListener('hashchange', onHashChange);
    W.events.emit('route', current);
  }

  W.router = { init, go, get current() { return current; } };
})((window.Work = window.Work || {}));
