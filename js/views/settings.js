/* Work — views/settings.js */
(function (W) {
  'use strict';
  const h = W.dom.h;

  let root = null;

  function section(title, ...children) {
    return h('section', { class: 'settings-section' }, h('h2', { class: 'settings-heading', text: title }), ...children);
  }
  function row(label, control, hint) {
    return h('div', { class: 'settings-row' },
      h('div', { class: 'settings-row-text' },
        h('span', { class: 'settings-row-label', text: label }),
        hint ? h('span', { class: 'settings-row-hint', text: hint }) : null
      ),
      control
    );
  }
  function toggle(checked, onChange, label) {
    return h('button', {
      class: 'switch' + (checked ? ' is-on' : ''),
      type: 'button',
      role: 'switch',
      'aria-checked': checked ? 'true' : 'false',
      'aria-label': label,
      onClick: (e) => {
        const next = !e.currentTarget.classList.contains('is-on');
        onChange(next);
      },
    });
  }
  function numberField(value, onChange, min, max) {
    return h('input', {
      type: 'number', class: 'field-number', value, min, max,
      onChange: (e) => onChange(Math.round(Number(e.target.value)) || value),
    });
  }

  function render() {
    if (!root) return;
    W.dom.clear(root);
    const s = W.store.state.settings;

    root.appendChild(h('h1', { class: 'view-title', text: 'Settings' }));

    root.appendChild(
      section(
        'Timer',
        row('Focus length', numberField(s.focusMin, (v) => W.store.setSettings({ focusMin: v }), 1, 120), 'minutes'),
        row('Short break', numberField(s.shortMin, (v) => W.store.setSettings({ shortMin: v }), 1, 60), 'minutes'),
        row('Long break', numberField(s.longMin, (v) => W.store.setSettings({ longMin: v }), 1, 90), 'minutes'),
        row('Rounds before long break', numberField(s.cycles, (v) => W.store.setSettings({ cycles: v }), 2, 8)),
        row('Auto-start breaks', toggle(s.autoStartBreaks, (v) => W.store.setSettings({ autoStartBreaks: v }), 'Auto-start breaks')),
        row('Auto-start focus', toggle(s.autoStartFocus, (v) => W.store.setSettings({ autoStartFocus: v }), 'Auto-start focus')),
        row('Keep screen on while focusing', toggle(s.keepAwake, (v) => W.store.setSettings({ keepAwake: v }), 'Keep screen on'))
      )
    );

    root.appendChild(
      section(
        'Sound & notifications',
        row('Sounds', toggle(s.timerSound, (v) => W.store.setSettings({ timerSound: v }), 'Sounds')),
        row(
          'Notifications',
          toggle(s.notifications, async (v) => {
            if (v) {
              const p = await W.notify.request();
              W.store.setSettings({ notifications: p === 'granted' });
            } else {
              W.store.setSettings({ notifications: false });
            }
          }, 'Notifications'),
          W.notify.permission() === 'denied' ? 'Blocked in your browser settings' : 'While a tab is open'
        )
      )
    );

    root.appendChild(
      section(
        'Display',
        row('24-hour clock', toggle(s.clock24, (v) => W.store.setSettings({ clock24: v }), '24-hour clock')),
        row('Your name', h('input', { type: 'text', class: 'field-inline', value: s.name, maxlength: 40, placeholder: 'Optional', onChange: (e) => W.store.setSettings({ name: e.target.value.trim() }) }), 'Used in the daily greeting')
      )
    );

    root.appendChild(
      section(
        'Backup',
        row('Export data', h('button', { class: 'btn btn-ghost', type: 'button', text: 'Export', onClick: doExport })),
        row('Import data', h('label', { class: 'btn btn-ghost file-btn', text: 'Import' }, h('input', { type: 'file', accept: 'application/json', class: 'file-input', onChange: doImport }))),
        row('Reset app', h('button', { class: 'btn btn-ghost btn-danger', type: 'button', text: 'Reset', onClick: doReset }), 'Deletes everything on this device')
      )
    );
  }

  function doExport() {
    const data = W.store.exportData();
    W.utils.download('work-backup-' + W.utils.dayKey() + '.json', JSON.stringify(data, null, 2), 'application/json');
  }
  function doImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = W.store.importData(JSON.parse(reader.result));
        W.toast.show({ text: result.ok ? 'Backup restored' : result.error });
      } catch (err) {
        W.toast.show({ text: 'That file couldn’t be read.' });
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }
  function doReset() {
    const body = h(
      'div',
      { class: 'confirm' },
      h('div', { class: 'sheet-handle' }),
      h('h2', { class: 'sheet-title', text: 'Reset Work?' }),
      h('p', { class: 'confirm-body', text: 'This deletes every task, alarm and setting on this device. It can’t be undone.' }),
      h(
        'div',
        { class: 'sheet-actions' },
        h('div', { class: 'sheet-actions-right' },
          h('button', { class: 'btn btn-ghost', type: 'button', text: 'Cancel', onClick: () => W.sheet.close() }),
          h('button', { class: 'btn btn-primary btn-danger', type: 'button', text: 'Reset', onClick: () => { W.store.reset(); W.sheet.close(); } })
        )
      )
    );
    W.sheet.open({ title: 'Reset Work?', body });
  }

  function mount(el) {
    root = el;
    render();
  }

  W.events.on('settings', render);

  W.views = W.views || {};
  W.views.settings = { mount, render };
})((window.Work = window.Work || {}));
