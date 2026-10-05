/* Work — services/assistant.js
 * Sorting/grouping logic for tasks, plus the small pieces of "an assistant, not
 * a chore": which task to suggest next, and the calm one-line day summary.
 * No task is ever hidden or reordered without the user seeing why (group labels).
 */
(function (W) {
  'use strict';

  const U = W.utils;
  const PRIORITY_RANK = { high: 0, medium: 1, low: 2, none: 3 };

  function overdue(t, today) {
    return !t.done && t.due && t.due < today;
  }

  function dueRank(t, today) {
    if (!t.due) return 9999;
    const d = U.diffDays(today, t.due);
    return d < 0 ? d : d; // negative sorts first (most overdue), then soonest first
  }

  /** Score used by the default "Smart" sort: overdue, then due soon, then priority. */
  function smartScore(t, today) {
    const due = t.due ? U.diffDays(today, t.due) : 999;
    const bucket = due < 0 ? 0 : due === 0 ? 1 : due <= 6 ? 2 : 3;
    return [bucket, due < 0 ? 0 : due, PRIORITY_RANK[t.priority]];
  }

  function cmp(a, b) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  }

  /**
   * Sort open tasks for display. Completed tasks are always pushed to the end,
   * most recently finished first.
   */
  function sortTasks(tasks, mode, today) {
    today = today || U.dayKey();
    const open = tasks.filter((t) => !t.done);
    const done = tasks.filter((t) => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    let sorted;
    if (mode === 'manual') {
      sorted = open.slice().sort((a, b) => a.order - b.order);
    } else if (mode === 'priority') {
      sorted = open.slice().sort((a, b) => cmp([PRIORITY_RANK[a.priority], dueRank(a, today)], [PRIORITY_RANK[b.priority], dueRank(b, today)]));
    } else if (mode === 'due') {
      sorted = open.slice().sort((a, b) => cmp([dueRank(a, today), PRIORITY_RANK[a.priority]], [dueRank(b, today), PRIORITY_RANK[b.priority]]));
    } else {
      sorted = open.slice().sort((a, b) => cmp(smartScore(a, today), smartScore(b, today)));
    }
    return sorted.concat(done);
  }

  /** Section labels for the open tasks, driven by the same due-date logic as Smart sort. */
  function groupLabel(t, today) {
    if (!t.due) return 'No date';
    const d = U.diffDays(today, t.due);
    if (d < 0) return 'Overdue';
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    if (d <= 6) return 'This week';
    return 'Later';
  }

  const GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later', 'No date'];

  /** The single most useful next task: overdue or due today, highest priority, wins. */
  function suggestNext(tasks, today) {
    today = today || U.dayKey();
    const open = tasks.filter((t) => !t.done);
    const urgent = open.filter((t) => t.due && t.due <= today);
    const pool = urgent.length ? urgent : open;
    if (!pool.length) return null;
    return pool.slice().sort((a, b) => cmp(smartScore(a, today), smartScore(b, today)))[0];
  }

  function daySummary(tasks, now) {
    now = now || new Date();
    const today = U.dayKey(now);
    const open = tasks.filter((t) => !t.done);
    const overdueN = open.filter((t) => overdue(t, today)).length;
    const todayN = open.filter((t) => t.due === today).length;
    const name = W.store.state.settings.name;
    const hello = U.greeting(now.getHours()) + (name ? ', ' + name : '');
    if (!open.length) return { hello, line: 'Nothing on your list.' };
    let line;
    if (overdueN && todayN) line = overdueN + ' overdue, ' + U.plural(todayN, 'task') + ' due today.';
    else if (overdueN) line = U.plural(overdueN, 'task') + ' overdue.';
    else if (todayN) line = U.plural(todayN, 'task') + ' due today.';
    else line = 'Nothing due today.';
    return { hello, line };
  }

  W.assistant = { sortTasks, groupLabel, GROUP_ORDER, suggestNext, daySummary };
})((window.Work = window.Work || {}));
