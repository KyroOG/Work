/* Work — services/alarms.js
 * Polls once a second. An alarm fires when the clock matches its time and,
 * for repeating alarms, today is one of its days — but only once per minute
 * (guarded by lastFired) so it can't refire while the ringing overlay is open.
 */
(function (W) {
  'use strict';

  const U = W.utils;
  const store = W.store;
  let poll = null;
  let ringing = null; // the alarm object currently sounding, or null
  let ringSince = 0;

  function isRingingNow() {
    return ringing;
  }

  function dueToday(alarm, now) {
    return alarm.days.length === 0 || alarm.days.includes(now.getDay());
  }

  function checkOnce() {
    if (ringing) {
      const limit = store.state.settings.ringLimit;
      if (limit && Date.now() - ringSince >= limit * 60000) dismiss(); // nobody answered
      return;
    }
    const now = new Date();
    const hm = U.hhmm(now);
    const minuteStamp = Math.floor(now.getTime() / 60000);

    store.state.alarms.forEach((a) => {
      if (!a.enabled) return;
      if (a.snoozeUntil && now.getTime() >= a.snoozeUntil) {
        fire(a);
        return;
      }
      if (a.snoozeUntil) return; // still snoozed, waiting for its own time
      if (a.time !== hm) return;
      if (!dueToday(a, now)) return;
      if (Math.floor(a.lastFired / 60000) === minuteStamp) return; // already handled this minute
      fire(a);
    });
  }

  function fire(alarm) {
    ringing = alarm;
    ringSince = Date.now();
    store.patchAlarm(alarm.id, { lastFired: Date.now(), snoozeUntil: 0 });
    // One-off alarms turn themselves off once they've rung.
    if (alarm.days.length === 0) store.patchAlarm(alarm.id, { enabled: false });
    W.audio.startRing(alarm.sound);
    W.title.set('alarm', (alarm.label || 'Alarm') + ' — Work');
    W.notify.send(alarm.label || 'Alarm', { body: U.fmtTime(alarm.time, store.state.settings.clock24), requireInteraction: true });
    if (window.workDesktop) window.workDesktop.alarmRinging(); // surface the window if it's in the tray
    W.events.emit('alarm:ring', alarm);
  }

  function dismiss() {
    if (!ringing) return;
    W.audio.stopRing();
    W.title.clear('alarm');
    W.events.emit('alarm:dismiss', ringing);
    ringing = null;
  }

  function snooze() {
    if (!ringing) return;
    const a = ringing;
    W.audio.stopRing();
    W.title.clear('alarm');
    store.patchAlarm(a.id, { snoozeUntil: Date.now() + a.snooze * 60000 });
    W.events.emit('alarm:snooze', a);
    ringing = null;
  }

  function init() {
    checkOnce();
    poll = setInterval(checkOnce, 1000);
  }

  W.alarms = { init, isRingingNow, dismiss, snooze };
})((window.Work = window.Work || {}));
