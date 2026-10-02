/* Work — views/tasks.js */
(function (W) {
  'use strict';
  const h = W.dom.h;
  const U = W.utils;
  const A = W.assistant;

  let root = null;

  function quickAdd() {
    const input = h('input', {
      type: 'text',
      class: 'quickadd-input',
      placeholder: 'Add a task… try “Report Friday 5pm !high”',
      'aria-label': 'Add a task',
      autocomplete: 'off',
    });
    const form = h(
      'form',
      { class: 'quickadd', onSubmit: submit },
      W.dom.icon('plus'),
      input,
      h('button', { type: 'submit', class: 'quickadd-go', 'aria-label': 'Add task' }, W.dom.icon('arrow-up'))
    );
    function submit(e) {
      e.preventDefault();
      const raw = input.value.trim();
      if (!raw) return;
      const parsed = W.dates.parseQuick(raw);
      W.store.addTask(parsed);
      input.value = '';
      input.focus();
    }
    return form;
  }

  function summaryCard() {
    const s = A.daySummary(W.store.state.tasks);
    return h('div', { class: 'day-summary' },
      h('p', { class: 'day-summary-hello', text: s.hello }),
      h('p', { class: 'day-summary-line', text: s.line })
    );
  }

  function taskRow(t) {
    const overdue = !t.done && t.due && t.due < U.dayKey();
    const row = h(
      'li',
      { class: 'task' + (t.done ? ' is-done' : '') + (overdue ? ' is-overdue' : ''), 'data-id': t.id },
      h('button', {
        class: 'task-check',
        type: 'button',
        role: 'checkbox',
        'aria-checked': t.done ? 'true' : 'false',
        'aria-label': t.done ? 'Mark not done' : 'Mark done',
        onClick: () => W.store.updateTask(t.id, { done: !t.done }),
      }, W.dom.icon('check')),
      h(
        'div',
        { class: 'task-body', onClick: () => W.taskEditor.open(t), role: 'button', tabIndex: 0, onKeydown: (e) => { if (e.key === 'Enter') W.taskEditor.open(t); } },
        h('p', { class: 'task-title', text: t.title }),
        h('div', { class: 'task-meta' },
          t.priority !== 'none' ? h('span', { class: 'chip chip-' + t.priority, text: t.priority }) : null,
          t.due ? h('span', { class: 'task-due' + (overdue ? ' is-overdue' : ''), text: U.fmtDue(t.due, t.time, W.store.state.settings.clock24) }) : null,
          t.pomodoros ? h('span', { class: 'task-poms', text: '🍅×' + t.pomodoros }) : null
        )
      ),
      !t.done
        ? h('button', {
            class: 'task-focus',
            type: 'button',
            'aria-label': 'Start a focus session for ' + t.title,
            onClick: () => {
              W.router.go('focus');
              W.timer.switchTask(t.id);
              if (W.store.state.focus.status !== 'running') W.timer.start(t.id);
            },
          }, W.dom.icon('play'))
        : null
    );
    return row;
  }

  function emptyState() {
    return h(
      'div',
      { class: 'empty-state' },
      W.dom.icon('leaf'),
      h('p', { class: 'empty-title', text: 'Nothing on your list' }),
      h('p', { class: 'empty-body', text: 'Add a task above whenever you’re ready.' })
    );
  }

  function sortControl() {
    const modes = [['smart', 'Smart'], ['priority', 'Priority'], ['due', 'Due date'], ['manual', 'Manual']];
    const current = W.store.state.settings.sort;
    return h(
      'div',
      { class: 'sort-row' },
      h('span', { class: 'sort-label', text: 'Sort' }),
      h(
        'select',
        { class: 'field-select sort-select', 'aria-label': 'Sort tasks by', onChange: (e) => W.store.setSettings({ sort: e.target.value }) },
        modes.map(([val, label]) => h('option', { value: val, selected: val === current ? true : null, text: label }))
      )
    );
  }

  function render() {
    if (!root) return;
    W.dom.clear(root);
    const state = W.store.state;
    const sorted = A.sortTasks(state.tasks, state.settings.sort);
    const today = U.dayKey();

    root.appendChild(summaryCard());
    root.appendChild(quickAdd());
    root.appendChild(sortControl());

    if (!state.tasks.length) {
      root.appendChild(emptyState());
      return;
    }

    const list = h('ul', { class: 'task-list' });
    let lastGroup = null;
    let doneStarted = false;
    sorted.forEach((t) => {
      if (t.done && !doneStarted) {
        doneStarted = true;
        list.appendChild(h('li', { class: 'task-group-label', text: 'Completed' }));
      } else if (!t.done && state.settings.sort === 'smart') {
        const g = A.groupLabel(t, today);
        if (g !== lastGroup) {
          lastGroup = g;
          list.appendChild(h('li', { class: 'task-group-label', text: g }));
        }
      }
      list.appendChild(taskRow(t));
    });
    root.appendChild(list);

    if (state.tasks.some((t) => t.done)) {
      root.appendChild(
        h('button', {
          class: 'btn btn-ghost btn-clear',
          type: 'button',
          text: 'Clear completed',
          onClick: () => {
            const snaps = W.store.clearCompleted();
            if (snaps.length) W.toast.show({ text: 'Completed tasks cleared', actionLabel: 'Undo', onAction: () => W.store.restoreTasks(snaps) });
          },
        })
      );
    }
  }

  function mount(el) {
    root = el;
    render();
  }

  W.events.on('tasks', render);
  W.events.on('settings', render);

  W.views = W.views || {};
  W.views.tasks = { mount, render, fab: () => W.taskEditor.open(null) };
})((window.Work = window.Work || {}));
