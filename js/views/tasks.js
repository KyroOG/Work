/* Work — views/tasks.js */
(function (W) {
  'use strict';
  const h = W.dom.h;
  const U = W.utils;
  const A = W.assistant;

  let root = null;
  let quickEl = null;
  let knownIds = null; // task ids from the previous render, so only genuinely new rows animate in
  let landedId = null; // the task that just finished its exit animation; it settles into Completed
  let revealDone = false; // true for one render after the Completed group is expanded

  function quickAdd() {
    const input = h('input', {
      type: 'text',
      class: 'quickadd-input',
      placeholder: 'Add a task, like “Report Friday 5pm !high”',
      'aria-label': 'Add a task',
      autocomplete: 'off',
    });
    const form = h(
      'form',
      { class: 'quickadd', onSubmit: submit },
      W.dom.icon('plus'),
      input,
      h('kbd', { class: 'kbd', text: 'N' }),
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

  function focusQuick() {
    const input = document.querySelector('.quickadd-input');
    if (input) input.focus();
  }

  function taskRow(t, reveal, isNew, landed) {
    const overdue = !t.done && t.due && t.due < U.dayKey();
    const row = h(
      'li',
      { class: 'task' + (t.done ? ' is-done' : '') + (overdue ? ' is-overdue' : '') + (reveal ? ' is-revealed' : '') + (isNew ? ' is-new' : '') + (landed ? ' is-landed' : ''), 'data-id': t.id },
      h('button', {
        class: 'task-check',
        type: 'button',
        role: 'checkbox',
        'aria-checked': t.done ? 'true' : 'false',
        'aria-label': t.done ? 'Mark not done' : 'Mark done',
        onClick: (e) => {
          if (t.done) { W.store.updateTask(t.id, { done: false }); return; }
          if (row.classList.contains('is-completing')) return;
          // 1) tick + strike drawn across the title  2) a short beat so it registers
          // 3) the row folds away  4) it lands under Completed.
          row.classList.add('is-done', 'is-completing');
          e.currentTarget.setAttribute('aria-checked', 'true');
          const finish = () => { landedId = t.id; W.store.updateTask(t.id, { done: true }); };
          if (U.reducedMotion()) { finish(); return; }
          setTimeout(() => {
            row.style.height = row.offsetHeight + 'px';
            void row.offsetHeight;
            row.classList.add('is-leaving');
            row.style.height = '0px';
            setTimeout(finish, 420);
          }, 950);
        },
      }, W.dom.icon('check')),
      h(
        'div',
        { class: 'task-body', onClick: () => W.taskEditor.open(t), role: 'button', tabIndex: 0, onKeydown: (e) => { if (e.key === 'Enter') W.taskEditor.open(t); } },
        h('p', { class: 'task-title' }, h('span', { class: 'task-title-text', text: t.title })),
        t.notes ? h('p', { class: 'task-notes', text: t.notes }) : null,
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

  function completedToggle(count, collapsed) {
    return h('li', { class: 'task-group-label' },
      h('button', {
        class: 'group-toggle' + (collapsed ? '' : ' is-open'),
        type: 'button',
        'aria-expanded': collapsed ? 'false' : 'true',
        onClick: () => {
          revealDone = collapsed;
          W.store.setSettings({ hideCompleted: !collapsed });
        },
      }, W.dom.icon('chevron'), h('span', { text: 'Completed' }), h('span', { class: 'group-count', text: String(count) }))
    );
  }

  function emptyState() {
    return h(
      'div',
      { class: 'empty-state' },
      W.dom.icon('leaf'),
      h('p', { class: 'empty-title', text: 'Nothing on your list' }),
      h('p', { class: 'empty-body', text: 'Add a task above to get started.' })
    );
  }

  function sortControl() {
    const modes = [['smart', 'Smart'], ['priority', 'Priority'], ['due', 'Due date'], ['manual', 'Manual']];
    const current = W.store.state.settings.sort;
    const sel = W.select.create({
      options: modes,
      value: current,
      label: 'Sort tasks by',
      variant: 'quiet',
      align: 'end',
      onChange: (v) => W.store.setSettings({ sort: v }),
    });
    return h('div', { class: 'rail-field' }, h('span', { class: 'rail-label', text: 'Sort by' }), sel.el);
  }

  function stat(num, label, tone) {
    return h('div', { class: 'stat' + (tone ? ' stat-' + tone : '') },
      h('span', { class: 'stat-label', text: label }),
      h('span', { class: 'stat-num', text: String(num) })
    );
  }

  function rail(state, today) {
    const open = state.tasks.filter((t) => !t.done);
    const overdue = open.filter((t) => t.due && t.due < today).length;
    const dueToday = open.filter((t) => t.due === today).length;
    const done = state.tasks.length - open.length;
    const next = A.sortTasks(state.tasks, 'smart')[0];
    return h(
      'aside',
      { class: 'rail' },
      h('div', { class: 'card' },
        h('div', { class: 'stat-grid' },
          stat(open.length, 'Open'),
          stat(dueToday, 'Due today'),
          stat(overdue, 'Overdue', overdue ? 'warn' : null),
          stat(done, 'Done')
        )
      ),
      next && !next.done
        ? h('div', { class: 'card' },
            h('span', { class: 'rail-label', text: 'Up next' }),
            h('p', { class: 'next-title', text: next.title }),
            h('button', {
              class: 'btn btn-secondary btn-block', type: 'button',
              onClick: () => { W.router.go('focus'); W.timer.switchTask(next.id); if (W.store.state.focus.status !== 'running') W.timer.start(next.id); },
            }, W.dom.icon('play'), 'Start focus')
          )
        : null,
      h('div', { class: 'card' }, sortControl()),
      done
        ? h('button', {
            class: 'btn btn-ghost btn-danger btn-block', type: 'button', text: 'Clear completed',
            onClick: () => {
              const snaps = W.store.clearCompleted();
              if (snaps.length) W.toast.show({ text: 'Completed tasks cleared', actionLabel: 'Undo', onAction: () => W.store.restoreTasks(snaps) });
            },
          })
        : null
    );
  }

  function render() {
    if (!root) return;
    W.dom.clear(root);
    const state = W.store.state;
    const sorted = A.sortTasks(state.tasks, state.settings.sort);
    const today = U.dayKey();
    const sum = A.daySummary(state.tasks);
    const fresh = knownIds ? new Set(state.tasks.filter((t) => !knownIds.has(t.id)).map((t) => t.id)) : new Set();
    knownIds = new Set(state.tasks.map((t) => t.id));

    root.appendChild(W.dom.pageHeader({ title: sum.hello, sub: sum.line }));
    if (!quickEl) quickEl = quickAdd();
    root.appendChild(quickEl);

    const main = h('div', { class: 'tasks-main' });
    if (!state.tasks.length) {
      main.appendChild(emptyState());
    } else {
      const list = h('ul', { class: 'task-list' });
      let lastGroup = null;
      let doneStarted = false;
      const collapsed = state.settings.hideCompleted;
      const doneCount = state.tasks.filter((t) => t.done).length;
      sorted.forEach((t) => {
        if (t.done && !doneStarted) {
          doneStarted = true;
          list.appendChild(completedToggle(doneCount, collapsed));
        }
        if (t.done && collapsed) return;
        if (!t.done && state.settings.sort === 'smart') {
          const g = A.groupLabel(t, today);
          if (g !== lastGroup) {
            lastGroup = g;
            list.appendChild(h('li', { class: 'task-group-label', text: g }));
          }
        }
        list.appendChild(taskRow(t, t.done && revealDone, fresh.has(t.id), t.id === landedId && t.done));
      });
      revealDone = false;
      landedId = null;
      main.appendChild(list);
    }
    root.appendChild(h('div', { class: 'tasks-layout' }, main, state.tasks.length ? rail(state, today) : null));
  }

  function mount(el) {
    root = el;
    quickEl = null;
    knownIds = null;
    render();
  }
  function unmount() {
    root = null;
    quickEl = null;
    knownIds = null;
  }

  W.events.on('tasks', render);
  W.events.on('settings', render);

  W.views = W.views || {};
  W.views.tasks = { mount, unmount, render, add: focusQuick };
})((window.Work = window.Work || {}));
