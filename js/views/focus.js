/* Work — views/focus.js */
(function (W) {
  'use strict';
  const h = W.dom.h;
  const U = W.utils;

  const PHASE_LABEL = { focus: 'Focus', short: 'Short break', long: 'Long break' };

  let root = null;
  let ring = null;
  let clockEl = null;
  let phaseEl = null;
  let taskNameEl = null;
  let cyclesEl = null;
  let controlsEl = null;
  let pickerBtn = null;
  let wrapEl = null;
  let modeEl = null;
  let mode = null; // 'timer' | 'stopwatch'

  function fractionElapsed() {
    const f = W.store.state.focus;
    const remaining = f.status === 'running' ? Math.max(0, f.endsAt - Date.now()) : f.remaining;
    return { remaining, fraction: f.duration ? 1 - remaining / f.duration : 0 };
  }

  function paintClock() {
    if (!clockEl) return;
    if (mode === 'stopwatch') {
      const t = W.stopwatch.ms();
      W.dom.setClock(clockEl, W.stopwatch.fmt(t));
      clockEl.classList.toggle('is-long', t >= 3600000);
      ring.set((t % 60000) / 60000); // one sweep per minute
      return;
    }
    clockEl.classList.remove('is-long');
    const { remaining, fraction } = fractionElapsed();
    W.dom.setClock(clockEl, U.fmtClock(remaining));
    ring.set(fraction);
  }

  function taskLabel() {
    const f = W.store.state.focus;
    if (!f.taskId) return 'Choose what to focus on';
    const t = W.store.getTask(f.taskId);
    return t ? t.title : 'Choose what to focus on';
  }

  function openPicker() {
    const open = W.store.state.tasks.filter((t) => !t.done);
    const body = h(
      'div',
      { class: 'task-picker' },
      h('h2', { class: 'sheet-title', text: 'Focus on…' }),
      open.length
        ? h(
            'ul',
            { class: 'task-picker-list' },
            h('li', {},
              h('button', {
                type: 'button',
                class: 'task-picker-row',
                text: 'No task — just focus',
                onClick: () => { W.timer.switchTask(null); W.sheet.close(); },
              })
            ),
            open.map((t) =>
              h('li', {},
                h('button', {
                  type: 'button',
                  class: 'task-picker-row',
                  text: t.title,
                  onClick: () => { W.timer.switchTask(t.id); W.sheet.close(); },
                })
              )
            )
          )
        : h('p', { class: 'empty-body', text: 'Add a task first from the Tasks tab.' })
    );
    W.sheet.open({ title: 'Focus on…', body });
  }

  function controls() {
    const f = W.store.state.focus;
    const nodes = [];
    if (f.status === 'idle') {
      nodes.push(h('button', { class: 'btn btn-primary btn-lg', type: 'button', text: 'Start', onClick: () => { W.audio.unlock(); W.timer.start(); } }));
    } else if (f.status === 'running') {
      nodes.push(h('button', { class: 'btn btn-secondary btn-lg', type: 'button', text: 'Pause', onClick: () => W.timer.pause() }));
    } else {
      nodes.push(h('button', { class: 'btn btn-primary btn-lg', type: 'button', text: 'Resume', onClick: () => W.timer.resume() }));
    }
    if (f.status !== 'idle') {
      nodes.push(h('button', { class: 'btn btn-ghost', type: 'button', text: 'Reset', onClick: () => W.timer.reset() }));
    }
    nodes.push(h('button', { class: 'btn btn-ghost', type: 'button', text: 'Skip', onClick: () => W.timer.skip() }));
    return nodes;
  }

  function setMode(m) {
    if (m === mode) return;
    mode = m;
    render();
    W.events.emit('focus:mode');
  }

  /** Called from the sidebar: open the Focus tab on the stopwatch. */
  function openStopwatch() {
    mode = 'stopwatch';
    if (root) render();
    W.events.emit('focus:mode');
    W.router.go('focus');
  }

  function modeSwitch() {
    modeEl = h('div', { class: 'seg seg-inline', role: 'radiogroup', 'aria-label': 'Mode' },
      [['timer', 'Timer'], ['stopwatch', 'Stopwatch']].map(([val, label]) =>
        h('button', { type: 'button', class: 'seg-btn', role: 'radio', 'data-mode': val, text: label, onClick: () => setMode(val) })
      )
    );
    return modeEl;
  }

  function paintModeSwitch() {
    Array.from(modeEl.children).forEach((b) => {
      const on = b.getAttribute('data-mode') === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  function stopwatchControls() {
    const st = W.stopwatch.get().status;
    const nodes = [];
    if (st === 'idle') nodes.push(h('button', { class: 'btn btn-primary btn-lg', type: 'button', text: 'Start', onClick: () => W.stopwatch.start() }));
    else if (st === 'running') nodes.push(h('button', { class: 'btn btn-secondary btn-lg', type: 'button', text: 'Pause', onClick: () => W.stopwatch.pause() }));
    else nodes.push(h('button', { class: 'btn btn-primary btn-lg', type: 'button', text: 'Resume', onClick: () => W.stopwatch.start() }));
    if (st !== 'idle') {
      nodes.push(h('button', {
        class: 'btn btn-ghost', type: 'button', text: 'Reset',
        onClick: () => {
          const snap = W.stopwatch.reset();
          W.toast.show({ text: 'Stopwatch reset', actionLabel: 'Undo', onAction: () => W.stopwatch.restore(snap) });
        },
      }));
    }
    return nodes;
  }

  function render() {
    if (!root) return;
    const sw = mode === 'stopwatch';
    wrapEl.classList.toggle('is-stopwatch', sw);
    pickerBtn.hidden = sw;
    cyclesEl.hidden = sw;
    paintModeSwitch();
    if (sw) {
      const st = W.stopwatch.get().status;
      wrapEl.classList.toggle('is-running', st === 'running');
      wrapEl.setAttribute('data-phase', 'focus');
      phaseEl.textContent = 'Stopwatch';
      phaseEl.setAttribute('data-phase', 'focus');
      ring.setPhase('focus');
      paintClock();
      W.dom.clear(controlsEl);
      stopwatchControls().forEach((n) => controlsEl.appendChild(n));
      return;
    }
    const f = W.store.state.focus;
    wrapEl.classList.toggle('is-running', f.status === 'running');
    wrapEl.setAttribute('data-phase', f.phase);
    phaseEl.textContent = PHASE_LABEL[f.phase];
    phaseEl.setAttribute('data-phase', f.phase);
    ring.setPhase(f.phase);
    taskNameEl.textContent = taskLabel();
    const s = W.store.state.settings;
    cyclesEl.textContent = 'Round ' + ((f.cycle % s.cycles) + 1) + ' of ' + s.cycles;
    paintClock();
    W.dom.clear(controlsEl);
    controls().forEach((n) => controlsEl.appendChild(n));
  }

  function mount(el) {
    root = el;
    if (mode === null) mode = W.stopwatch.get().status !== 'idle' ? 'stopwatch' : 'timer';
    W.dom.clear(root);
    ring = W.ring.create();
    clockEl = h('div', { class: 'focus-clock' });
    phaseEl = h('div', { class: 'focus-phase', text: 'Focus' });
    const ringWrap = h('div', { class: 'ring-wrap' }, ring.el, h('div', { class: 'ring-center' }, phaseEl, clockEl));
    taskNameEl = h('span', { class: 'focus-task-name', text: 'Choose what to focus on' });
    pickerBtn = h('button', { class: 'focus-task-picker', type: 'button', onClick: openPicker }, W.dom.icon('task'), taskNameEl, W.dom.icon('chevron'));
    cyclesEl = h('p', { class: 'focus-cycles', text: 'Round 1 of 4' });
    const hint = h('p', { class: 'focus-hint' }, h('kbd', { class: 'kbd', text: 'Space' }), ' to start or pause');
    controlsEl = h('div', { class: 'focus-controls' });

    wrapEl = h('div', { class: 'focus-view' }, modeSwitch(), pickerBtn, ringWrap, cyclesEl, controlsEl, hint);
    root.appendChild(wrapEl);
    render();
  }

  function unmount() {
    root = wrapEl = ring = clockEl = phaseEl = taskNameEl = cyclesEl = controlsEl = pickerBtn = modeEl = null;
  }

  W.events.on('focus', render);
  W.events.on('tasks', render);
  W.events.on('settings', render);
  W.events.on('timer:tick', paintClock);
  W.events.on('stopwatch', render);
  W.events.on('stopwatch:tick', paintClock);

  W.views = W.views || {};
  W.views.focus = { mount, unmount, render, isStopwatch: () => mode === 'stopwatch', openStopwatch };
})((window.Work = window.Work || {}));
