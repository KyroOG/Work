/* Work — core/store.js
 * The single source of truth.
 *  - Versioned schema with a migration table
 *  - Every load passes through sanitisers, so bad or hand-edited data can't crash the UI
 *  - Views never mutate state directly: they call actions and listen for events
 *
 * Events: 'tasks' | 'alarms' | 'settings' | 'focus' | 'sessions' | 'change'
 */
(function (W) {
  'use strict';

  const U = W.utils;
  const KEY = 'work.app.v1';
  const SCHEMA = 1;

  const PRIORITIES = ['none', 'low', 'medium', 'high'];
  const TONES = ['chime', 'bell', 'beacon', 'radar', 'marimba', 'harp', 'crystal', 'pulse', 'dawn', 'digital'];
  const SNOOZES = [5, 10, 15, 30];
  const SCALES = [0.8, 0.9, 1, 1.1, 1.25];
  const RING_LIMITS = [0, 1, 2, 5, 10]; // minutes before an unanswered alarm stops itself; 0 = never
  const isCustomSound = (id) => typeof id === 'string' && /^custom:[\w-]+$/.test(id);
  const validSound = (id) => TONES.includes(id) || isCustomSound(id);
  const PHASES = ['focus', 'short', 'long'];
  const SORTS = ['smart', 'priority', 'due', 'manual'];
  const THEMES = ['light', 'dark', 'system'];
  const MAX_SESSIONS = 3000;

  const DEFAULT_SETTINGS = Object.freeze({
    name: '',
    focusMin: 25,
    shortMin: 5,
    longMin: 15,
    cycles: 4,
    autoStartBreaks: true,
    autoStartFocus: false,
    keepAwake: true,
    timerSound: true,
    volume: 0.7,
    tone: 'chime',
    timerTone: 'done',
    snooze: 10,
    ringLimit: 0,
    fadeIn: false,
    notifications: false,
    clock24: false,
    sort: 'smart',
    hideCompleted: false,
    theme: 'light',
    uiScale: 0.9,
  });

  /* ------------------------------------------------------------------ */
  /* Sanitisers                                                          */
  /* ------------------------------------------------------------------ */
  function normTask(t) {
    const now = Date.now();
    const hasDue = U.isValidDayKey(t.due);
    return {
      id: String(t.id || U.uid()),
      title: String(t.title || '').slice(0, 300),
      notes: String(t.notes || '').slice(0, 5000),
      priority: PRIORITIES.includes(t.priority) ? t.priority : 'none',
      due: hasDue ? t.due : null,
      time: hasDue && U.isValidTime(t.time) ? t.time : null,
      done: !!t.done,
      doneAt: t.done ? Number(t.doneAt) || now : null,
      createdAt: Number(t.createdAt) || now,
      order: Number.isFinite(Number(t.order)) ? Number(t.order) : 0,
      estimate: U.clamp(parseInt(t.estimate, 10) || 0, 0, 24),
      pomodoros: Math.max(0, parseInt(t.pomodoros, 10) || 0),
      spent: Math.max(0, Math.round(Number(t.spent) || 0)),
    };
  }

  function normAlarm(a) {
    const days = Array.isArray(a.days) ? a.days.map(Number).filter((d) => d >= 0 && d <= 6) : [];
    return {
      id: String(a.id || U.uid()),
      time: U.isValidTime(a.time) ? a.time : '07:00',
      label: String(a.label || '').slice(0, 60),
      days: Array.from(new Set(days)).sort((x, y) => x - y),
      enabled: a.enabled !== false,
      sound: validSound(a.sound) ? a.sound : 'chime',
      snooze: SNOOZES.includes(Number(a.snooze)) ? Number(a.snooze) : 10,
      armedAt: Number(a.armedAt) || 0,
      lastFired: Number(a.lastFired) || 0,
      snoozeUntil: Number(a.snoozeUntil) || 0,
      createdAt: Number(a.createdAt) || Date.now(),
    };
  }

  function normSettings(s) {
    s = s && typeof s === 'object' ? s : {};
    const d = DEFAULT_SETTINGS;
    const num = (v, lo, hi, def) => {
      v = Number(v);
      return Number.isFinite(v) ? U.clamp(Math.round(v), lo, hi) : def;
    };
    const bool = (v, def) => (typeof v === 'boolean' ? v : def);
    const vol = Number(s.volume);
    return {
      name: String(s.name || '').slice(0, 40),
      focusMin: num(s.focusMin, 1, 120, d.focusMin),
      shortMin: num(s.shortMin, 1, 60, d.shortMin),
      longMin: num(s.longMin, 1, 90, d.longMin),
      cycles: num(s.cycles, 2, 8, d.cycles),
      autoStartBreaks: bool(s.autoStartBreaks, d.autoStartBreaks),
      autoStartFocus: bool(s.autoStartFocus, d.autoStartFocus),
      keepAwake: bool(s.keepAwake, d.keepAwake),
      timerSound: bool(s.timerSound, d.timerSound),
      volume: Number.isFinite(vol) ? U.clamp(vol, 0, 1) : d.volume,
      tone: validSound(s.tone) ? s.tone : d.tone,
      timerTone: s.timerTone === 'done' || validSound(s.timerTone) ? s.timerTone : d.timerTone,
      snooze: SNOOZES.includes(Number(s.snooze)) ? Number(s.snooze) : d.snooze,
      ringLimit: RING_LIMITS.includes(Number(s.ringLimit)) ? Number(s.ringLimit) : d.ringLimit,
      fadeIn: bool(s.fadeIn, d.fadeIn),
      notifications: bool(s.notifications, d.notifications),
      clock24: bool(s.clock24, d.clock24),
      sort: SORTS.includes(s.sort) ? s.sort : d.sort,
      hideCompleted: bool(s.hideCompleted, d.hideCompleted),
      theme: THEMES.includes(s.theme) ? s.theme : d.theme,
      uiScale: SCALES.includes(Number(s.uiScale)) ? Number(s.uiScale) : d.uiScale,
    };
  }

  function normFocus(f, settings) {
    f = f && typeof f === 'object' ? f : {};
    const phase = PHASES.includes(f.phase) ? f.phase : 'focus';
    const base = { focus: settings.focusMin, short: settings.shortMin, long: settings.longMin }[phase] * 60000;
    let status = ['idle', 'running', 'paused'].includes(f.status) ? f.status : 'idle';
    let duration = Number(f.duration) > 0 ? Number(f.duration) : base;
    let remaining = Number.isFinite(Number(f.remaining)) ? U.clamp(Number(f.remaining), 0, duration) : duration;
    let endsAt = Number(f.endsAt) || 0;
    if (status === 'running' && !endsAt) status = 'paused';
    if (status === 'idle') {
      duration = base;
      remaining = base;
      endsAt = 0;
    }
    if (status !== 'running') endsAt = 0;
    return {
      taskId: f.taskId ? String(f.taskId) : null,
      phase,
      status,
      duration,
      remaining,
      endsAt,
      cycle: U.clamp(parseInt(f.cycle, 10) || 0, 0, 8),
    };
  }

  function normSession(s) {
    return {
      id: String(s.id || U.uid()),
      taskId: s.taskId ? String(s.taskId) : null,
      phase: 'focus',
      seconds: Math.max(0, Math.round(Number(s.seconds) || 0)),
      completed: !!s.completed,
      at: Number(s.at) || Date.now(),
    };
  }

  function uniqueIds(list) {
    const seen = new Set();
    list.forEach((item) => {
      if (seen.has(item.id)) item.id = U.uid();
      seen.add(item.id);
    });
    return list;
  }

  function sanitize(d) {
    const settings = normSettings(d.settings);
    const tasks = uniqueIds(
      (Array.isArray(d.tasks) ? d.tasks : [])
        .filter((t) => t && typeof t === 'object' && String(t.title || '').trim())
        .map(normTask)
    );
    const alarms = uniqueIds((Array.isArray(d.alarms) ? d.alarms : []).filter((a) => a && typeof a === 'object').map(normAlarm));
    const sessions = (Array.isArray(d.sessions) ? d.sessions : []).filter((s) => s && typeof s === 'object').map(normSession).slice(-MAX_SESSIONS);
    const focus = normFocus(d.focus, settings);
    if (focus.taskId && !tasks.some((t) => t.id === focus.taskId)) focus.taskId = null;
    return { schema: SCHEMA, tasks, alarms, sessions, settings, focus };
  }

  /* Add one function per schema bump: MIGRATIONS[n] upgrades schema n -> n + 1. */
  const MIGRATIONS = {};

  function migrate(data) {
    let guard = 0;
    data.schema = Number(data.schema) || 1;
    while (data.schema < SCHEMA && guard++ < 50) {
      const step = MIGRATIONS[data.schema];
      if (!step) break;
      step(data);
      data.schema += 1;
    }
    return data;
  }

  function blank() {
    return sanitize({});
  }

  /** First-run content: three gentle tasks that double as a tour. */
  function seeded() {
    const s = blank();
    const today = U.dayKey();
    const now = Date.now();
    s.tasks = [
      { title: 'Try a focus session', notes: 'Click the play button on any task to start a Pomodoro for it.', priority: 'high', due: today, estimate: 1 },
      { title: 'Add your first real task', notes: 'Type in the bar above, like “Call mom tomorrow 5pm !high”.', priority: 'medium', due: today },
      { title: 'Set a morning alarm', notes: 'Alarms live in their own tab and ring while Work is open.', priority: 'low', due: U.addDays(today, 1), time: '09:00' },
    ].map((t, i) => normTask(Object.assign({}, t, { id: U.uid(), createdAt: now + i, order: i + 1 })));
    return s;
  }

  function parseStored(raw) {
    let data = null;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    if (!data || typeof data !== 'object') return null;
    return sanitize(migrate(data));
  }

  /* ------------------------------------------------------------------ */
  /* Persistence                                                         */
  /* ------------------------------------------------------------------ */
  let state = blank();
  let lastRaw = null;
  let saveTimer = null;

  function flush() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      const raw = JSON.stringify(state);
      if (raw === lastRaw) return;
      localStorage.setItem(KEY, raw);
      lastRaw = raw;
    } catch (err) {
      console.warn('[Work] could not save:', err);
      W.events.emit('store:error', err);
    }
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 150);
  }

  function emitAll() {
    ['tasks', 'alarms', 'settings', 'focus', 'sessions', 'change'].forEach((c) => W.events.emit(c));
  }
  function commit() {
    scheduleSave();
    for (let i = 0; i < arguments.length; i++) W.events.emit(arguments[i]);
    W.events.emit('change');
  }

  /** Pull in changes another tab (or an installed copy) wrote. */
  function syncFromDisk() {
    if (saveTimer) return false; // we have newer local edits pending
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      return false;
    }
    if (!raw || raw === lastRaw) return false;
    const next = parseStored(raw);
    if (!next) return false;
    lastRaw = raw;
    state = next;
    emitAll();
    return true;
  }

  function init() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      raw = null;
    }
    if (raw == null) {
      state = seeded();
      flush();
    } else {
      const parsed = parseStored(raw);
      if (parsed) {
        state = parsed;
        lastRaw = raw;
      } else {
        // Keep the unreadable blob around instead of destroying it.
        try {
          localStorage.setItem(KEY + '.corrupt', raw);
        } catch (e) { /* ignore */ }
        state = blank();
        flush();
      }
    }
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) syncFromDisk();
    });
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Tasks                                                               */
  /* ------------------------------------------------------------------ */
  const getTask = (id) => state.tasks.find((t) => t.id === id) || null;

  function addTask(data) {
    const maxOrder = state.tasks.reduce((m, t) => Math.max(m, t.order), 0);
    const task = normTask({
      id: U.uid(),
      title: String(data.title || '').trim(),
      notes: data.notes,
      priority: data.priority,
      due: data.due,
      time: data.time,
      estimate: data.estimate,
      createdAt: Date.now(),
      order: maxOrder + 1,
    });
    if (!task.title) return null;
    state.tasks.push(task);
    commit('tasks');
    return task;
  }

  function updateTask(id, patch) {
    const i = state.tasks.findIndex((t) => t.id === id);
    if (i < 0) return null;
    const cur = state.tasks[i];
    const next = Object.assign({}, cur, patch);
    if ('done' in patch && patch.done !== cur.done) next.doneAt = patch.done ? Date.now() : null;
    if ('title' in patch && !String(patch.title || '').trim()) next.title = cur.title;
    state.tasks[i] = normTask(next);
    commit('tasks');
    return state.tasks[i];
  }

  function deleteTask(id) {
    const i = state.tasks.findIndex((t) => t.id === id);
    if (i < 0) return null;
    const snap = { task: state.tasks[i], index: i };
    state.tasks.splice(i, 1);
    if (state.focus.taskId === id) {
      state.focus.taskId = null;
      commit('tasks', 'focus');
    } else {
      commit('tasks');
    }
    return snap;
  }

  function restoreTask(snap) {
    if (!snap || getTask(snap.task.id)) return;
    state.tasks.splice(Math.min(snap.index, state.tasks.length), 0, normTask(snap.task));
    commit('tasks');
  }

  function clearCompleted() {
    const removed = [];
    state.tasks.forEach((t, i) => {
      if (t.done) removed.push({ task: t, index: i });
    });
    if (!removed.length) return [];
    state.tasks = state.tasks.filter((t) => !t.done);
    commit('tasks');
    return removed;
  }

  function restoreTasks(snaps) {
    snaps
      .slice()
      .sort((a, b) => a.index - b.index)
      .forEach((s) => {
        if (!getTask(s.task.id)) state.tasks.splice(Math.min(s.index, state.tasks.length), 0, normTask(s.task));
      });
    commit('tasks');
  }

  /** Persist a manual order for the given ids (top to bottom). */
  function reorderTasks(ids) {
    ids.forEach((id, i) => {
      const t = getTask(id);
      if (t) t.order = i + 1;
    });
    commit('tasks');
  }

  /* ------------------------------------------------------------------ */
  /* Alarms                                                              */
  /* ------------------------------------------------------------------ */
  const getAlarm = (id) => state.alarms.find((a) => a.id === id) || null;

  function addAlarm(data) {
    const alarm = normAlarm({
      id: U.uid(),
      time: data.time,
      label: data.label,
      days: data.days,
      sound: data.sound,
      snooze: data.snooze,
      enabled: true,
      armedAt: Date.now(),
      createdAt: Date.now(),
    });
    state.alarms.push(alarm);
    commit('alarms');
    return alarm;
  }

  /** Low-level patch used by the alarm engine (does not re-arm). */
  function patchAlarm(id, patch) {
    const i = state.alarms.findIndex((a) => a.id === id);
    if (i < 0) return null;
    state.alarms[i] = normAlarm(Object.assign({}, state.alarms[i], patch));
    commit('alarms');
    return state.alarms[i];
  }

  /** User-facing edit. Changing time/days or switching on re-arms the alarm. */
  function updateAlarm(id, patch) {
    if (!getAlarm(id)) return null;
    const next = Object.assign({}, patch);
    if ('time' in patch || 'days' in patch || patch.enabled === true) {
      next.armedAt = Date.now();
      next.snoozeUntil = 0;
    }
    if (patch.enabled === false) next.snoozeUntil = 0;
    return patchAlarm(id, next);
  }

  function deleteAlarm(id) {
    const i = state.alarms.findIndex((a) => a.id === id);
    if (i < 0) return null;
    const snap = { alarm: state.alarms[i], index: i };
    state.alarms.splice(i, 1);
    commit('alarms');
    return snap;
  }

  function restoreAlarm(snap) {
    if (!snap || getAlarm(snap.alarm.id)) return;
    state.alarms.splice(Math.min(snap.index, state.alarms.length), 0, normAlarm(Object.assign({}, snap.alarm, { armedAt: Date.now() })));
    commit('alarms');
  }

  /* ------------------------------------------------------------------ */
  /* Settings, focus, sessions                                           */
  /* ------------------------------------------------------------------ */
  function setSettings(patch) {
    state.settings = normSettings(Object.assign({}, state.settings, patch));
    commit('settings');
  }

  function setFocus(patch) {
    state.focus = normFocus(Object.assign({}, state.focus, patch), state.settings);
    // normFocus resets idle durations from settings; honour an explicit request.
    if (state.focus.status === 'idle') {
      if (patch.duration > 0) state.focus.duration = patch.duration;
      if (patch.remaining > 0) state.focus.remaining = patch.remaining;
    }
    if (state.focus.taskId && !getTask(state.focus.taskId)) state.focus.taskId = null;
    commit('focus');
  }

  /** Account for focused time. `completed` counts a full Pomodoro. */
  function recordFocus(o) {
    const sec = Math.max(0, Math.round(o.seconds || 0));
    const changed = [];
    const t = o.taskId ? getTask(o.taskId) : null;
    if (t) {
      t.spent += sec;
      if (o.completed) t.pomodoros += 1;
      changed.push('tasks');
    }
    if (o.completed || sec >= 60) {
      state.sessions.push({ id: U.uid(), taskId: o.taskId || null, phase: 'focus', seconds: sec, completed: !!o.completed, at: Date.now() });
      if (state.sessions.length > MAX_SESSIONS) state.sessions.splice(0, state.sessions.length - MAX_SESSIONS);
      changed.push('sessions');
    }
    if (changed.length) commit.apply(null, changed);
  }

  /* ------------------------------------------------------------------ */
  /* Backup                                                              */
  /* ------------------------------------------------------------------ */
  function exportData() {
    return Object.assign({ app: 'work', exportedAt: new Date().toISOString() }, JSON.parse(JSON.stringify(state)));
  }

  function importData(obj) {
    const src = obj && typeof obj === 'object' ? (Array.isArray(obj.tasks) || Array.isArray(obj.alarms) ? obj : obj.data) : null;
    if (!src || typeof src !== 'object' || (!Array.isArray(src.tasks) && !Array.isArray(src.alarms))) {
      return { ok: false, error: 'This file doesn’t look like a Work backup.' };
    }
    state = sanitize(migrate(JSON.parse(JSON.stringify(src))));
    flush();
    emitAll();
    return { ok: true, tasks: state.tasks.length, alarms: state.alarms.length };
  }

  function reset() {
    state = blank();
    flush();
    emitAll();
  }

  W.store = {
    get state() { return state; },
    KEY, SCHEMA, PRIORITIES, TONES, SNOOZES, SCALES, RING_LIMITS, PHASES, SORTS, DEFAULT_SETTINGS,
    init, flush, syncFromDisk, exportData, importData, reset,
    getTask, addTask, updateTask, deleteTask, restoreTask, restoreTasks, clearCompleted, reorderTasks,
    getAlarm, addAlarm, updateAlarm, patchAlarm, deleteAlarm, restoreAlarm,
    setSettings, setFocus, recordFocus,
  };
})((window.Work = window.Work || {}));
