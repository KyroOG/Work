/* Work — services/stopwatch.js
 * Count-up timer for long work stretches. Stores a real start timestamp, so it stays
 * correct through reloads, sleep and restarts.
 */
(function (W) {
  'use strict';

  const KEY = 'work.stopwatch.v1';
  let s = { status: 'idle', startedAt: 0, elapsed: 0 }; // elapsed = ms banked before the current run
  let ticker = null;

  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && ['idle', 'running', 'paused'].includes(d.status)) {
      s = { status: d.status, startedAt: Number(d.startedAt) || 0, elapsed: Math.max(0, Number(d.elapsed) || 0) };
      if (s.status === 'running' && !s.startedAt) s.status = 'paused';
    }
  } catch (e) { /* start fresh */ }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ } };
  const ms = () => (s.status === 'running' ? s.elapsed + Math.max(0, Date.now() - s.startedAt) : s.elapsed);

  function runTicker() {
    if (ticker) return;
    ticker = setInterval(() => {
      if (s.status !== 'running') { clearInterval(ticker); ticker = null; return; }
      W.events.emit('stopwatch:tick', ms());
    }, 250);
  }
  function change() {
    save();
    W.events.emit('stopwatch');
  }

  function start() {
    if (s.status === 'running') return;
    s = { status: 'running', startedAt: Date.now(), elapsed: s.elapsed };
    runTicker();
    change();
  }
  function pause() {
    if (s.status !== 'running') return;
    s = { status: 'paused', startedAt: 0, elapsed: ms() };
    change();
  }
  function toggle() {
    if (s.status === 'running') pause();
    else start();
  }

  /** Returns a snapshot so the caller can offer Undo. */
  function reset() {
    const snap = Object.assign({}, s);
    s = { status: 'idle', startedAt: 0, elapsed: 0 };
    change();
    return snap;
  }
  function restore(snap) {
    if (!snap) return;
    s = Object.assign({}, snap);
    if (s.status === 'running') runTicker();
    change();
  }

  /** 4:05 -> "04:05"; past an hour -> "1:04:05". */
  function fmt(t) {
    const sec = Math.floor(Math.max(0, t) / 1000);
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    const p = W.utils.pad;
    return (hh ? hh + ':' + p(mm) : p(mm)) + ':' + p(sec % 60);
  }

  if (s.status === 'running') runTicker();

  W.stopwatch = { start, pause, toggle, reset, restore, ms, fmt, get: () => Object.assign({}, s) };
})((window.Work = window.Work || {}));
