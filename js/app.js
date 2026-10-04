/* Work — app.js
 * Boots every module in order and wires the tab bar to the view layer.
 */
(function (W) {
  'use strict';
  const h = W.dom.h;

  const TABS = [
    { id: 'tasks', label: 'Tasks', icon: 'task', key: '1' },
    { id: 'focus', label: 'Focus', icon: 'timer', key: '2' },
    { id: 'alarms', label: 'Alarms', icon: 'bell', key: '3' },
    { id: 'settings', label: 'Settings', icon: 'gear', key: '4' },
  ];

  let viewEl = null;
  let tabButtons = {};
  let mini = null;
  const PHASE = { focus: 'Focus', short: 'Short break', long: 'Long break' };
  let active = null;
  let lastTitleSecond = -1;

  function paintMini() {
    if (!mini) return;
    const f = W.store.state.focus;
    document.body.classList.toggle('is-immersed', f.status === 'running' && W.router.current === 'focus');
    const show = f.status !== 'idle' && W.router.current !== 'focus';
    mini.hidden = !show;
    if (!show) return;
    const remaining = f.status === 'running' ? Math.max(0, f.endsAt - Date.now()) : f.remaining;
    mini.querySelector('.mini-phase').textContent = PHASE[f.phase] + (f.status === 'paused' ? ' · paused' : '');
    W.dom.setClock(mini.querySelector('.mini-clock'), W.utils.fmtClock(remaining));
    const t = f.taskId && W.store.getTask(f.taskId);
    mini.querySelector('.mini-task').textContent = t ? t.title : 'No task';
    mini.querySelector('.mini-bar').style.width = (f.duration ? (1 - remaining / f.duration) * 100 : 0).toFixed(1) + '%';
    mini.classList.toggle('is-running', f.status === 'running');
  }

  function paintTitle() {
    const f = W.store.state.focus;
    if (f.status !== 'running') {
      W.title.clear('timer');
      lastTitleSecond = -1;
      return;
    }
    const remaining = Math.max(0, f.endsAt - Date.now());
    const sec = Math.ceil(remaining / 1000);
    if (sec === lastTitleSecond) return;
    lastTitleSecond = sec;
    const label = { focus: 'Focus', short: 'Short break', long: 'Long break' }[f.phase];
    W.title.set('timer', W.utils.fmtClock(remaining) + ' · ' + label);
  }

  function mountView(name) {
    // Tell the outgoing view to let go of the shared container first.
    if (active && W.views[active] && W.views[active].unmount) W.views[active].unmount();
    active = name;
    W.dom.clear(viewEl);
    viewEl.scrollTop = 0;
    const page = h('div', { class: 'page', 'data-view': name });
    viewEl.appendChild(page);
    Object.keys(tabButtons).forEach((id) => {
      tabButtons[id].classList.toggle('is-active', id === name);
      tabButtons[id].setAttribute('aria-current', id === name ? 'page' : 'false');
    });
    const view = W.views[name];
    if (view) view.mount(page);
    paintMini();
    viewEl.focus({ preventScroll: true });
  }

  function currentAdd() {
    const v = W.views[W.router.current];
    return v && v.add;
  }

  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const t = e.target;
    const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if (typing || W.sheet.isOpen() || document.querySelector('.ring-overlay')) return;
    const tab = TABS.find((x) => x.key === e.key);
    if (tab) { e.preventDefault(); W.router.go(tab.id); return; }
    if (e.key === 'n' || e.key === 'N') {
      const add = currentAdd();
      if (add) { e.preventDefault(); add(); }
    } else if (e.key === '/') {
      e.preventDefault();
      const focusInput = () => { const i = document.querySelector('.quickadd-input'); if (i) i.focus(); };
      if (W.router.current === 'tasks') focusInput();
      else { W.router.go('tasks'); setTimeout(focusInput, 0); }
    } else if (e.key === ' ' && W.router.current === 'focus' && t.tagName !== 'BUTTON') {
      e.preventDefault();
      const st = W.store.state.focus.status;
      if (st === 'running') W.timer.pause();
      else if (st === 'paused') W.timer.resume();
      else W.timer.start();
    }
  }

  function buildShell() {
    viewEl = h('main', { class: 'view', id: 'view', tabIndex: -1 });

    mini = h('button', { class: 'mini-timer', type: 'button', hidden: true, 'aria-label': 'Open focus timer', onClick: () => W.router.go('focus') },
      h('span', { class: 'mini-phase' }),
      h('span', { class: 'mini-clock' }),
      h('span', { class: 'mini-task' }),
      h('span', { class: 'mini-track' }, h('span', { class: 'mini-bar' }))
    );

    const sidebar = h(
      'aside',
      { class: 'sidebar' },
      h('div', { class: 'brand' }, W.dom.icon('logo'), h('span', { class: 'brand-name', text: 'Work' })),
      h(
        'nav',
        { class: 'nav', 'aria-label': 'Sections' },
        TABS.map((t) => {
          const btn = h(
            'button',
            { class: 'tab', type: 'button', title: t.label + ' (' + t.key + ')', onClick: () => W.router.go(t.id) },
            W.dom.icon(t.icon),
            h('span', { class: 'tab-label', text: t.label }),
            h('kbd', { class: 'kbd', text: t.key })
          );
          tabButtons[t.id] = btn;
          return btn;
        })
      ),
      mini
    );

    document.body.appendChild(h('div', { class: 'app' }, sidebar, viewEl));
  }

  function boot() {
    W.store.init();
    buildShell();
    W.events.on('route', mountView);
    W.router.init();
    W.timer.init();
    W.alarms.init();

    W.events.on('focus', paintMini);
    W.events.on('tasks', paintMini);
    W.events.on('route', paintMini);
    document.addEventListener('keydown', onKey);
    W.events.on('focus', paintTitle);
    W.events.on('timer:tick', paintTitle);
    W.events.on('timer:tick', paintMini);
    document.addEventListener('pointerdown', () => W.audio.unlock(), { once: true, passive: true });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})((window.Work = window.Work || {}));
