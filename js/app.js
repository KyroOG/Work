/* Work — app.js
 * Boots every module in order and wires the tab bar to the view layer.
 */
(function (W) {
  'use strict';
  const h = W.dom.h;

  const TABS = [
    { id: 'tasks', label: 'Tasks', icon: 'task' },
    { id: 'focus', label: 'Focus', icon: 'timer' },
    { id: 'alarms', label: 'Alarms', icon: 'bell' },
    { id: 'settings', label: 'Settings', icon: 'gear' },
  ];

  let viewEl = null;
  let tabButtons = {};
  let fab = null;

  function paintTabBadge() {
    const f = W.store.state.focus;
    const btn = tabButtons.focus;
    if (!btn) return;
    btn.classList.toggle('is-running', f.status === 'running');
  }

  function showFab(name) {
    if (!fab) return;
    const view = W.views[name];
    if (view && view.fab) {
      fab.hidden = false;
      fab.onclick = view.fab;
    } else {
      fab.hidden = true;
      fab.onclick = null;
    }
  }

  function mountView(name) {
    W.dom.clear(viewEl);
    Object.keys(tabButtons).forEach((id) => {
      tabButtons[id].classList.toggle('is-active', id === name);
      tabButtons[id].setAttribute('aria-current', id === name ? 'page' : 'false');
    });
    const view = W.views[name];
    if (view) view.mount(viewEl);
    showFab(name);
    viewEl.focus({ preventScroll: true });
  }

  function buildShell() {
    viewEl = h('main', { class: 'view', id: 'view', tabIndex: -1 });
    fab = h('button', { class: 'fab', type: 'button', hidden: true, 'aria-label': 'Add' }, W.dom.icon('plus'));

    const nav = h(
      'nav',
      { class: 'tabbar', role: 'tablist', 'aria-label': 'Sections' },
      TABS.map((t) => {
        const btn = h(
          'button',
          { class: 'tab', type: 'button', role: 'tab', onClick: () => W.router.go(t.id) },
          W.dom.icon(t.icon),
          h('span', { class: 'tab-label', text: t.label })
        );
        tabButtons[t.id] = btn;
        return btn;
      })
    );

    document.body.appendChild(h('div', { class: 'app' }, viewEl, fab, nav));
  }

  function boot() {
    W.store.init();
    buildShell();
    W.router.init();
    W.timer.init();
    W.alarms.init();

    W.events.on('route', mountView);
    W.events.on('focus', paintTabBadge);
    document.addEventListener('pointerdown', () => W.audio.unlock(), { once: true, passive: true });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})((window.Work = window.Work || {}));
