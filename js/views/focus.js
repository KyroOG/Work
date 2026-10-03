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

  function fractionElapsed() {
    const f = W.store.state.focus;
    const remaining = f.status === 'running' ? Math.max(0, f.endsAt - Date.now()) : f.remaining;
    return { remaining, fraction: f.duration ? 1 - remaining / f.duration : 0 };
  }

  function paintClock() {
    if (!clockEl) return;
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

  function render() {
    if (!root) return;
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

    wrapEl = h('div', { class: 'focus-view' }, pickerBtn, ringWrap, cyclesEl, controlsEl, hint);
    root.appendChild(wrapEl);
    render();
  }

  function unmount() {
    root = wrapEl = ring = clockEl = phaseEl = taskNameEl = cyclesEl = controlsEl = pickerBtn = null;
  }

  W.events.on('focus', render);
  W.events.on('tasks', render);
  W.events.on('settings', render);
  W.events.on('timer:tick', paintClock);

  W.views = W.views || {};
  W.views.focus = { mount, unmount, render };
})((window.Work = window.Work || {}));
