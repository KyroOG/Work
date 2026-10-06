/* Work — services/timer.js
 * Drives store.focus. Never trusts setInterval's own clock for the countdown —
 * always recomputes from `endsAt` (a real timestamp), so the timer is correct
 * even after the tab was backgrounded or the device slept.
 */
(function (W) {
  'use strict';

  const U = W.utils;
  const store = W.store;
  let raf = null;
  let sessionStart = 0; // wall-clock ms when the current run began, for logging partial sessions

  function phaseMinutes(phase, s) {
    return { focus: s.focusMin, short: s.shortMin, long: s.longMin }[phase];
  }

  function tick() {
    const f = store.state.focus;
    if (f.status !== 'running') {
      raf = null;
      return;
    }
    const remaining = Math.max(0, f.endsAt - Date.now());
    if (remaining <= 0) {
      complete();
      return;
    }
    W.events.emit('timer:tick', remaining);
    raf = requestAnimationFrame(tick);
  }

  function loop() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function start(taskId) {
    const f = store.state.focus;
    const s = store.state.settings;
    const taskChanged = taskId !== undefined && taskId !== f.taskId;
    const duration = taskChanged || f.status === 'idle' ? phaseMinutes(f.phase, s) * 60000 : f.duration;
    const remaining = f.status === 'paused' && !taskChanged ? f.remaining : duration;
    sessionStart = Date.now();
    store.setFocus({
      taskId: taskId !== undefined ? taskId : f.taskId,
      status: 'running',
      duration,
      remaining,
      endsAt: Date.now() + remaining,
    });
    W.wake.acquire();
    loop();
    W.events.emit('timer:start');
  }

  function pause() {
    const f = store.state.focus;
    if (f.status !== 'running') return;
    logPartial(false);
    const remaining = Math.max(0, f.endsAt - Date.now());
    store.setFocus({ status: 'paused', remaining, endsAt: 0 });
    W.wake.release();
    W.events.emit('timer:pause');
  }

  function resume() {
    const f = store.state.focus;
    if (f.status !== 'paused') return;
    sessionStart = Date.now();
    store.setFocus({ status: 'running', endsAt: Date.now() + f.remaining });
    W.wake.acquire();
    loop();
    W.events.emit('timer:start');
  }

  /** Back to a fresh instance of the current phase. */
  function reset() {
    const f = store.state.focus;
    logPartial(false);
    const s = store.state.settings;
    const duration = phaseMinutes(f.phase, s) * 60000;
    store.setFocus({ status: 'idle', duration, remaining: duration, endsAt: 0 });
    W.wake.release();
    W.events.emit('timer:reset');
  }

  function skip() {
    const f = store.state.focus;
    if (f.status === 'running') logPartial(false);
    advancePhase();
  }

  function logPartial(completed) {
    const f = store.state.focus;
    if (f.phase !== 'focus' || !sessionStart) return;
    const sec = (Date.now() - sessionStart) / 1000;
    if (sec >= 1) store.recordFocus({ taskId: f.taskId, seconds: sec, completed });
    sessionStart = 0;
  }

  function complete() {
    const f = store.state.focus;
    if (f.phase === 'focus') logPartial(true);
    sessionStart = 0;
    W.wake.release();
    W.audio.timerEnd();
    const label = f.phase === 'focus' ? 'Focus session complete' : 'Break’s over';
    W.notify.send(label, { body: f.phase === 'focus' ? 'Time for a break.' : 'Ready for another round?' });
    W.events.emit('timer:complete', f.phase);
    advancePhase(true);
  }

  function advancePhase(fromComplete) {
    const f = store.state.focus;
    const s = store.state.settings;
    let phase = f.phase;
    let cycle = f.cycle;
    if (f.phase === 'focus') {
      cycle += 1;
      phase = cycle % s.cycles === 0 ? 'long' : 'short';
    } else {
      phase = 'focus';
    }
    const duration = phaseMinutes(phase, s) * 60000;
    const autoStart = fromComplete && (phase === 'focus' ? s.autoStartFocus : s.autoStartBreaks);
    if (autoStart) {
      sessionStart = Date.now();
      store.setFocus({ phase, cycle, status: 'running', duration, remaining: duration, endsAt: Date.now() + duration });
      W.wake.acquire();
      loop();
    } else {
      store.setFocus({ phase, cycle, status: 'idle', duration, remaining: duration, endsAt: 0 });
    }
  }

  function switchTask(taskId) {
    const f = store.state.focus;
    if (f.status === 'running') logPartial(false);
    sessionStart = f.status === 'running' ? Date.now() : 0;
    store.setFocus({ taskId, endsAt: f.status === 'running' ? Date.now() + f.remaining : 0 });
  }

  // Recompute immediately on return to the tab, in case rAF was throttled while hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && store.state.focus.status === 'running') {
      const remaining = Math.max(0, store.state.focus.endsAt - Date.now());
      if (remaining <= 0) complete();
      else loop();
    }
  });

  function init() {
    if (store.state.focus.status === 'running') {
      const remaining = Math.max(0, store.state.focus.endsAt - Date.now());
      if (remaining <= 0) complete();
      else { W.wake.acquire(); loop(); }
    }
  }

  W.timer = { init, start, pause, resume, reset, skip, switchTask };
})((window.Work = window.Work || {}));
