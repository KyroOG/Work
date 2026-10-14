/* Work — ui/alarm-editor.js */
(function (W) {
  'use strict';
  const h = W.dom.h;

  const DAYS = [
    ['S', 0], ['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6],
  ];

  function open(alarm) {
    const isNew = !alarm;
    const st = W.store.state.settings;
    const draft = Object.assign({ time: '07:00', label: '', days: [], sound: st.tone, snooze: st.snooze, focus: false }, alarm);

    const timeInput = W.timeField.create({ value: draft.time, label: 'Alarm time', large: true });
    const labelInput = h('input', { type: 'text', class: 'field-title', placeholder: 'Label (optional)', maxlength: 60, value: draft.label });

    let days = draft.days.slice();
    const dayGroup = h(
      'div',
      { class: 'day-picker', role: 'group', 'aria-label': 'Repeat on' },
      DAYS.map(([letter, idx]) =>
        h('button', {
          type: 'button',
          class: 'day-btn' + (days.includes(idx) ? ' is-active' : ''),
          text: letter,
          'aria-pressed': days.includes(idx) ? 'true' : 'false',
          'aria-label': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx],
          onClick: () => {
            days = days.includes(idx) ? days.filter((d) => d !== idx) : days.concat(idx);
            paintDays();
          },
        })
      )
    );
    function paintDays() {
      Array.from(dayGroup.children).forEach((btn, i) => {
        const on = days.includes(DAYS[i][1]);
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    // Focus lock link (Windows app only): marks this as the reminder for when blocked apps close.
    let focus = !!draft.focus;
    const lockAvailable = !!(window.workDesktop && window.workDesktop.focusGet);
    const focusSwitch = h('button', {
      class: 'switch' + (focus ? ' is-on' : ''), type: 'button', role: 'switch',
      'aria-checked': focus ? 'true' : 'false', 'aria-label': 'Focus lock alarm',
      onClick: () => {
        focus = !focus;
        focusSwitch.classList.toggle('is-on', focus);
        focusSwitch.setAttribute('aria-checked', focus ? 'true' : 'false');
        if (!focus) return;
        // Line it up with the lock: ring when the open window ends, on the lock's days.
        window.workDesktop.focusGet().then((c) => {
          if (!c) return;
          timeInput.value = c.openTo;
          days = c.days.slice();
          paintDays();
        }).catch(() => {});
      },
    });

    let sound = draft.sound;
    const soundRow = h('div', { class: 'sound-row' });
    function buildSound() {
      const sel = W.select.create({
        options: W.audio.soundOptions(sound, false),
        value: sound,
        label: 'Sound',
        variant: 'field',
        onChange: (v) => { sound = v; W.audio.preview(v); },
      });
      W.dom.clear(soundRow);
      soundRow.appendChild(sel.el);
      soundRow.appendChild(h('button', { type: 'button', class: 'btn btn-ghost', text: 'Play', onClick: () => W.audio.preview(sound) }));
      soundRow.appendChild(
        h('label', { class: 'btn btn-ghost file-btn', text: 'Add file…' },
          h('input', {
            type: 'file', accept: 'audio/*', class: 'file-input',
            onChange: (e) => {
              const f = e.target.files && e.target.files[0];
              e.target.value = '';
              if (!f) return;
              W.sounds.add(f).then((snd) => { sound = snd.id; buildSound(); W.audio.preview(sound); })
                .catch((err) => W.toast.show({ text: err.message }));
            },
          }))
      );
    }
    buildSound();

    const snoozeSelect = W.select.create({
      options: W.store.SNOOZES.map((n) => [n, n + ' min']),
      value: draft.snooze,
      label: 'Snooze length',
      variant: 'field',
    });

    function save() {
      if (!timeInput.value) {
        timeInput.focus();
        return;
      }
      const payload = { time: timeInput.value, label: labelInput.value.trim() || (focus ? 'Focus time' : ''), days, sound, snooze: parseInt(snoozeSelect.getValue(), 10), focus };
      if (isNew) W.store.addAlarm(payload);
      else W.store.updateAlarm(alarm.id, payload);
      W.sheet.close();
    }
    function del() {
      if (!alarm) return;
      const snap = W.store.deleteAlarm(alarm.id);
      W.sheet.close();
      if (snap) W.toast.show({ text: 'Alarm deleted', actionLabel: 'Undo', onAction: () => W.store.restoreAlarm(snap) });
    }

    const body = h(
      'form',
      { class: 'alarm-editor', onSubmit: (e) => { e.preventDefault(); save(); } },
      h('h2', { class: 'sheet-title', text: isNew ? 'New alarm' : 'Edit alarm' }),
      h('div', { class: 'time-picker-row' }, timeInput.el),
      labelInput,
      h('div', { class: 'field-label' }, h('span', { text: 'Repeat' }), dayGroup),
      h('div', { class: 'field-label' }, h('span', { text: 'Sound' }), soundRow),
      h('div', { class: 'field-label field-label-inline' }, h('span', { text: 'Snooze' }), snoozeSelect.el),
      lockAvailable || focus ? h('div', { class: 'field-label field-label-inline' }, h('span', { text: 'Focus lock alarm' }), focusSwitch) : null,
      h(
        'div',
        { class: 'sheet-actions' },
        isNew ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-danger', text: 'Delete', onClick: del }),
        h('div', { class: 'sheet-actions-right' },
          h('button', { type: 'button', class: 'btn btn-ghost', text: 'Cancel', onClick: () => W.sheet.close() }),
          h('button', { type: 'submit', class: 'btn btn-primary', text: isNew ? 'Add alarm' : 'Save' })
        )
      )
    );

    W.sheet.open({ title: isNew ? 'New alarm' : 'Edit alarm', body, onClose: () => W.audio.stopPreview() });
  }

  W.alarmEditor = { open };
})((window.Work = window.Work || {}));
