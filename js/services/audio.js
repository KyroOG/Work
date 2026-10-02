/* Work — services/audio.js
 * Every sound is synthesised with Web Audio, so the app ships zero audio files.
 * Browsers only allow audio after a user gesture; `unlock()` is wired to the first tap.
 */
(function (W) {
  'use strict';

  const TONES = [
    { id: 'chime', name: 'Chime' },
    { id: 'bell', name: 'Bell' },
    { id: 'beacon', name: 'Beacon' },
    { id: 'radar', name: 'Radar' },
  ];

  let ctx = null;
  let master = null;
  let ringTimer = null;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function isReady() {
    return !!ctx && ctx.state === 'running';
  }

  function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().then(() => W.events.emit('audio:state')).catch(() => {});
    } else {
      W.events.emit('audio:state');
    }
  }

  /* ---- Building blocks ---- */
  function bell(freq, t, dur, gain) {
    // A struck bell: a few slightly inharmonic sine partials, each decaying at its own rate.
    const partials = [[1, 1, 1], [2.01, 0.34, 0.7], [2.76, 0.2, 0.5], [4.07, 0.1, 0.35]];
    partials.forEach((p) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain * p[1], t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * p[2]);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur * p[2] + 0.05);
    });
  }

  function beep(freq, t, dur, gain, type) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function sweep(f0, f1, t, dur, gain) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.3);
  }

  /* ---- Patterns. Each schedules itself at time t and returns its length in seconds. ---- */
  const PATTERNS = {
    chime(t) {
      bell(659.25, t, 1.5, 0.5);
      bell(783.99, t + 0.17, 1.5, 0.5);
      bell(1046.5, t + 0.34, 1.9, 0.5);
      return 2.6;
    },
    bell(t) {
      bell(523.25, t, 2.0, 0.6);
      bell(523.25, t + 0.95, 2.0, 0.6);
      return 2.6;
    },
    beacon(t) {
      [0, 0.2, 0.4, 0.6].forEach((o) => beep(880, t + o, 0.11, 0.35));
      return 1.7;
    },
    radar(t) {
      sweep(520, 1250, t, 0.55, 0.45);
      sweep(520, 1250, t + 0.95, 0.55, 0.45);
      return 2.2;
    },
    done(t) {
      bell(783.99, t, 1.2, 0.32);
      bell(1046.5, t + 0.22, 1.6, 0.32);
      return 2;
    },
  };

  function level(alarm) {
    const s = W.store.state.settings;
    return alarm ? Math.max(0.35, s.volume) : s.volume;
  }

  /** One-shot. `force` plays even when timer sounds are off (used for previews). */
  function play(name, opts) {
    opts = opts || {};
    const s = W.store.state.settings;
    if (!opts.force && !s.timerSound) return;
    const c = ensure();
    if (!c || !PATTERNS[name]) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(level(opts.alarm), c.currentTime);
    PATTERNS[name](c.currentTime + 0.03);
  }

  function preview(tone) {
    play(tone, { force: true });
  }

  /** Loops an alarm tone until stopRing(). */
  function startRing(tone) {
    stopRing();
    const c = ensure();
    if (!c || !PATTERNS[tone]) return;
    const once = () => {
      if (c.state === 'suspended') c.resume().catch(() => {});
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setValueAtTime(level(true), c.currentTime);
      const len = PATTERNS[tone](c.currentTime + 0.03);
      ringTimer = setTimeout(once, len * 1000 + 350);
    };
    once();
  }

  function stopRing() {
    clearTimeout(ringTimer);
    ringTimer = null;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    }
  }

  W.audio = { TONES, unlock, isReady, play, preview, startRing, stopRing };
})((window.Work = window.Work || {}));
