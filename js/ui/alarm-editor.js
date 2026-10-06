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
    const draft = Object.assign({ time: '07:00', label: '', days: [], sound: st.tone, snooze: st.snooze }, alarm);

    const timeInput = h('input', { type: 'time', class: 'field-time-lg', value: draft.time, 'aria-label': 'Alarm time', required: true });
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
          onClick: (e) => {
            days = days.includes(idx) ? days.filter((d) => d !== idx) : days.concat(idx);
            e.currentTarget.classList.toggle('is-active');
            e.currentTarget.setAttribute('aria-pressed', days.includes(idx) ? 'true' : 'false');
          },
        })
      )
    );

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
      const payload = { time: timeInput.value, label: labelInput.value.trim(), days, sound, snooze: parseInt(snoozeSelect.getValue(), 10) };
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
      h('div', { class: 'time-picker-row' }, timeInput),
      labelInput,
      h('div', { class: 'field-label' }, h('span', { text: 'Repeat' }), dayGroup),
      h('div', { class: 'field-label' }, h('span', { text: 'Sound' }), soundRow),
      h('div', { class: 'field-label field-label-inline' }, h('span', { text: 'Snooze' }), snoozeSelect.el),
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
