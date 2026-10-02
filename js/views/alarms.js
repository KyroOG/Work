/* Work — views/alarms.js */
(function (W) {
  'use strict';
  const h = W.dom.h;
  const U = W.utils;

  let root = null;
  let overlay = null;

  function dayLetters(days) {
    if (!days.length) return 'Once';
    const L = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
    return days.map((d) => L[d]).join(' ');
  }

  function alarmRow(a) {
    return h(
      'li',
      { class: 'alarm' + (a.enabled ? '' : ' is-off'), 'data-id': a.id },
      h(
        'div',
        { class: 'alarm-body', onClick: () => W.alarmEditor.open(a), role: 'button', tabIndex: 0, onKeydown: (e) => { if (e.key === 'Enter') W.alarmEditor.open(a); } },
        h('span', { class: 'alarm-time', text: U.fmtTime(a.time, W.store.state.settings.clock24) }),
        h('span', { class: 'alarm-meta', text: (a.label ? a.label + ' · ' : '') + dayLetters(a.days) })
      ),
      h('button', {
        class: 'switch' + (a.enabled ? ' is-on' : ''),
        type: 'button',
        role: 'switch',
        'aria-checked': a.enabled ? 'true' : 'false',
        'aria-label': (a.enabled ? 'Turn off' : 'Turn on') + ' alarm',
        onClick: () => W.store.updateAlarm(a.id, { enabled: !a.enabled }),
      })
    );
  }

  function emptyState() {
    return h(
      'div',
      { class: 'empty-state' },
      W.dom.icon('bell'),
      h('p', { class: 'empty-title', text: 'No alarms yet' }),
      h('p', { class: 'empty-body', text: 'Add one below — it’ll ring while Work is open in this browser.' })
    );
  }

  function render() {
    if (!root) return;
    W.dom.clear(root);
    const alarms = W.store.state.alarms.slice().sort((a, b) => a.time.localeCompare(b.time));
    root.appendChild(h('h1', { class: 'view-title', text: 'Alarms' }));
    if (!alarms.length) {
      root.appendChild(emptyState());
    } else {
      root.appendChild(h('ul', { class: 'alarm-list' }, alarms.map(alarmRow)));
    }
    root.appendChild(
      h('button', { class: 'btn btn-primary btn-add-alarm', type: 'button', text: '+ Add alarm', onClick: () => W.alarmEditor.open(null) })
    );
  }

  function showRingingOverlay(alarm) {
    hideRingingOverlay();
    const body = h(
      'div',
      { class: 'ring-overlay-body' },
      W.dom.icon('bell-ringing'),
      h('p', { class: 'ring-overlay-time', text: U.fmtTime(alarm.time, W.store.state.settings.clock24) }),
      h('p', { class: 'ring-overlay-label', text: alarm.label || 'Alarm' }),
      h(
        'div',
        { class: 'ring-overlay-actions' },
        h('button', { class: 'btn btn-secondary btn-lg', type: 'button', text: 'Snooze ' + alarm.snooze + ' min', onClick: () => W.alarms.snooze() }),
        h('button', { class: 'btn btn-primary btn-lg', type: 'button', text: 'Dismiss', onClick: () => W.alarms.dismiss() })
      )
    );
    overlay = h('div', { class: 'ring-overlay', role: 'alertdialog', 'aria-label': 'Alarm ringing' }, body);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    const btn = body.querySelector('.btn-primary');
    if (btn) btn.focus();
  }
  function hideRingingOverlay() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
  }

  function mount(el) {
    root = el;
    render();
  }

  W.events.on('alarms', render);
  W.events.on('settings', render);
  W.events.on('alarm:ring', showRingingOverlay);
  W.events.on('alarm:dismiss', hideRingingOverlay);
  W.events.on('alarm:snooze', hideRingingOverlay);

  W.views = W.views || {};
  W.views.alarms = { mount, render, fab: () => W.alarmEditor.open(null) };
})((window.Work = window.Work || {}));
