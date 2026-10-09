/* Work — views/settings.js */
(function (W) {
  'use strict';
  const h = W.dom.h;

  let root = null;
  let desktopPrefs = null; // only exists inside the Windows app

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
  function themeControl(current) {
    const modes = [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']];
    return h(
      'div',
      { class: 'seg seg-inline', role: 'radiogroup', 'aria-label': 'Appearance' },
      modes.map(([val, label]) =>
        h('button', {
          type: 'button',
          class: 'seg-btn' + (val === current ? ' is-active' : ''),
          role: 'radio',
          'aria-checked': val === current ? 'true' : 'false',
          text: label,
          onClick: () => W.store.setSettings({ theme: val }),
        })
      )
    );
  }
  function selectField(label, options, value, onChange) {
    return W.select.create({ options, value, label, variant: 'field', align: 'end', onChange }).el;
  }
  function addSoundFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    W.sounds.add(f).then((snd) => W.toast.show({ text: '“' + snd.name + '” added' })).catch((err) => W.toast.show({ text: err.message }));
  }
  function fmtSize(b) {
    return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  }
  function mySoundsSection() {
    const rows = W.sounds.list().map((snd) =>
      row(snd.name, h('div', { class: 'row-actions' },
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Play', onClick: () => W.audio.preview(snd.id) }),
        h('button', {
          class: 'btn btn-ghost btn-danger', type: 'button', text: 'Remove',
          onClick: () => { W.audio.stopPreview(); W.sounds.remove(snd.id).then(() => W.toast.show({ text: '“' + snd.name + '” removed' })); },
        })
      ), fmtSize(snd.size))
    );
    const full = W.sounds.list().length >= W.sounds.MAX_COUNT;
    rows.push(row(
      'Add a sound',
      h('label', { class: 'btn btn-ghost file-btn' + (full ? ' is-disabled' : ''), text: 'Choose file' },
        h('input', { type: 'file', accept: 'audio/*', class: 'file-input', disabled: full, onChange: addSoundFile })),
      full ? 'You’ve reached ' + W.sounds.MAX_COUNT + ' sounds' : 'MP3, WAV, M4A or OGG · up to 10 MB · stays on this device, not in backups'
    ));
    return section('My sounds', ...rows);
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

    root.appendChild(W.dom.pageHeader({ title: 'Settings', sub: 'Everything is stored on this computer.' }));
    const grid = h('div', { class: 'settings-grid' });
    root.appendChild(grid);

    grid.appendChild(
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

    const vol = h('input', {
      type: 'range', class: 'slider', min: 0, max: 100, step: 5, value: Math.round(s.volume * 100), 'aria-label': 'Volume',
      onChange: (e) => { W.store.setSettings({ volume: Number(e.target.value) / 100 }); W.audio.preview('chime'); },
    });
    grid.appendChild(
      section(
        'Sound & notifications',
        row('Sounds', toggle(s.timerSound, (v) => W.store.setSettings({ timerSound: v }), 'Sounds'), 'Focus and break chimes'),
        row('Volume', vol),
        row('Timer end sound', selectField('Timer end sound', W.audio.soundOptions(s.timerTone, true), s.timerTone, (v) => { W.store.setSettings({ timerTone: v }); W.audio.preview(v); })),
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

    grid.appendChild(
      section(
        'Alarms',
        row('Default sound', selectField('Default alarm sound', W.audio.soundOptions(s.tone, false), s.tone, (v) => { W.store.setSettings({ tone: v }); W.audio.preview(v); }), 'For new alarms'),
        row('Default snooze', selectField('Default snooze', W.store.SNOOZES.map((n) => [n, n + ' min']), s.snooze, (v) => W.store.setSettings({ snooze: Number(v) })), 'For new alarms'),
        row('Stop ringing after', selectField('Stop ringing after', W.store.RING_LIMITS.map((n) => [n, n ? n + ' min' : 'Never']), s.ringLimit, (v) => W.store.setSettings({ ringLimit: Number(v) })), 'If nobody answers'),
        row('Gentle wake-up', toggle(s.fadeIn, (v) => W.store.setSettings({ fadeIn: v }), 'Gentle wake-up'), 'Volume rises over 20 seconds')
      )
    );

    grid.appendChild(mySoundsSection());

    if (window.workDesktop && desktopPrefs) {
      const set = (patch) => window.workDesktop.set(patch).then((p) => { desktopPrefs = p; render(); });
      grid.appendChild(
        section(
          'Desktop app',
          row('Launch when Windows starts', toggle(desktopPrefs.launchAtStartup, (v) => set({ launchAtStartup: v }), 'Launch when Windows starts'), 'Opens quietly in the tray'),
          row('Keep running in the tray', toggle(desktopPrefs.runInTray, (v) => set({ runInTray: v }), 'Keep running in the tray'), 'Closing the window keeps alarms ringing')
        )
      );
    }

    grid.appendChild(
      section(
        'Display',
        row('Appearance', themeControl(s.theme)),
        ...(window.workDesktop
          ? [row('Interface size', selectField('Interface size', W.store.SCALES.map((n) => [n, Math.round(n * 100) + '%']), s.uiScale, (v) => W.store.setSettings({ uiScale: Number(v) })), 'Size of the whole app')]
          : []),
        row('24-hour clock', toggle(s.clock24, (v) => W.store.setSettings({ clock24: v }), '24-hour clock')),
        row('Your name', h('input', { type: 'text', class: 'field-inline', value: s.name, maxlength: 40, placeholder: 'Optional', onChange: (e) => W.store.setSettings({ name: e.target.value.trim() }) }), 'Used in the daily greeting')
      )
    );

    grid.appendChild(
      section(
        'Backup',
        row('Export data', h('button', { class: 'btn btn-ghost', type: 'button', text: 'Export', onClick: doExport })),
        row('Import data', h('label', { class: 'btn btn-ghost file-btn', text: 'Import' }, h('input', { type: 'file', accept: 'application/json', class: 'file-input', onChange: doImport }))),
        row('Version', h('span', { class: 'settings-row-hint', text: 'Work ' + W.utils.VERSION }), 'Everything stays on this device'),
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
    if (window.workDesktop) window.workDesktop.get().then((p) => { desktopPrefs = p; render(); }).catch(() => {});
  }
  function unmount() {
    root = null;
  }

  W.events.on('settings', render);
  W.events.on('sounds', render);

  W.views = W.views || {};
  W.views.settings = { mount, unmount, render };
})((window.Work = window.Work || {}));
