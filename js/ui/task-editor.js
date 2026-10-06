/* Work — ui/task-editor.js
 * Full edit form for a task (as opposed to the quick-add bar's one-liner).
 * Opens in the shared sheet primitive.
 */
(function (W) {
  'use strict';
  const h = W.dom.h;
  const U = W.utils;

  const PRIORITIES = [
    ['none', 'None'],
    ['low', 'Low'],
    ['medium', 'Medium'],
    ['high', 'High'],
  ];

  function open(task) {
    const isNew = !task;
    const draft = Object.assign(
      { title: '', notes: '', priority: 'none', due: null, time: null, estimate: 0 },
      task
    );

    const titleInput = h('input', { class: 'field-title', type: 'text', value: draft.title, placeholder: 'Task name', maxlength: 300, 'aria-label': 'Task name' });
    const notesInput = h('textarea', { class: 'field-notes', placeholder: 'Notes (optional)', rows: 3, 'aria-label': 'Notes', text: draft.notes });
    const dateInput = h('input', { type: 'date', class: 'field-date', value: draft.due || '', 'aria-label': 'Due date' });
    const timeInput = W.timeField.create({ value: draft.time || '', label: 'Due time', disabled: !draft.due });
    const estInput = h('input', { type: 'number', class: 'field-estimate', min: 0, max: 24, value: draft.estimate || '', placeholder: '0', 'aria-label': 'Estimated pomodoros' });

    dateInput.addEventListener('change', () => {
      timeInput.disabled = !dateInput.value;
      if (!dateInput.value) timeInput.value = '';
    });

    let priority = draft.priority;
    const priorityGroup = h(
      'div',
      { class: 'seg', role: 'radiogroup', 'aria-label': 'Priority' },
      PRIORITIES.map(([val, label]) =>
        h('button', {
          type: 'button',
          class: 'seg-btn' + (priority === val ? ' is-active' : '') + (val !== 'none' ? ' seg-' + val : ''),
          role: 'radio',
          'aria-checked': priority === val ? 'true' : 'false',
          text: label,
          onClick: (e) => {
            priority = val;
            Array.from(priorityGroup.children).forEach((c) => {
              c.classList.toggle('is-active', c === e.currentTarget);
              c.setAttribute('aria-checked', c === e.currentTarget ? 'true' : 'false');
            });
          },
        })
      )
    );

    function save() {
      const title = titleInput.value.trim();
      if (!title) {
        titleInput.focus();
        titleInput.classList.add('field-error');
        return;
      }
      const payload = {
        title,
        notes: notesInput.value.trim(),
        priority,
        due: dateInput.value || null,
        time: dateInput.value && timeInput.value ? timeInput.value : null,
        estimate: parseInt(estInput.value, 10) || 0,
      };
      if (isNew) W.store.addTask(payload);
      else W.store.updateTask(task.id, payload);
      W.sheet.close();
    }

    function del() {
      if (!task) return;
      const snap = W.store.deleteTask(task.id);
      W.sheet.close();
      if (snap) {
        W.toast.show({ text: 'Task deleted', actionLabel: 'Undo', onAction: () => W.store.restoreTask(snap) });
      }
    }

    const body = h(
      'form',
      { class: 'task-editor', onSubmit: (e) => { e.preventDefault(); save(); } },
      h('h2', { class: 'sheet-title', text: isNew ? 'New task' : 'Edit task' }),
      titleInput,
      notesInput,
      h('div', { class: 'field-row' },
        h('label', { class: 'field-label' },
          h('span', { text: 'Due date' }),
          dateInput
        ),
        h('div', { class: 'field-label' },
          h('span', { text: 'Time' }),
          timeInput.el
        )
      ),
      h('div', { class: 'field-label' }, h('span', { text: 'Priority' }), priorityGroup),
      h('label', { class: 'field-label field-label-inline' },
        h('span', { text: 'Estimated pomodoros' }),
        estInput
      ),
      h(
        'div',
        { class: 'sheet-actions' },
        isNew ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-danger', text: 'Delete', onClick: del }),
        h('div', { class: 'sheet-actions-right' },
          h('button', { type: 'button', class: 'btn btn-ghost', text: 'Cancel', onClick: () => W.sheet.close() }),
          h('button', { type: 'submit', class: 'btn btn-primary', text: isNew ? 'Add task' : 'Save' })
        )
      )
    );

    W.sheet.open({ title: isNew ? 'New task' : 'Edit task', body });
    setTimeout(() => titleInput.focus(), 0);
  }

  W.taskEditor = { open };
})((window.Work = window.Work || {}));
