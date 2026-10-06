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
    { id: 'marimba', name: 'Marimba' },
    { id: 'harp', name: 'Harp' },
    { id: 'crystal', name: 'Crystal' },
    { id: 'pulse', name: 'Pulse' },
    { id: 'dawn', name: 'Dawn' },
    { id: 'digital', name: 'Digital' },
  ];

  let ctx = null;
  let master = null;
  let ringTimer = null;
  let ringing = false;
  let custom = null; // the custom-sound <audio> currently playing (alarm or preview)
  let customUrl = null;
  let fadeTimer = null;
  let previewTimer = null;

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

  function pluck(freq, t, dur, gain) {
    // Marimba-like: a sine with a quick, bright overtone.
    [[1, 1, 1], [4, 0.22, 0.25]].forEach((p) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * p[0];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain * p[1], t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * p[2]);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur * p[2] + 0.05);
    });
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
    marimba(t) {
      [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => pluck(f, t + i * 0.16, 0.6, 0.55));
      return 1.9;
    },
    harp(t) {
      [392, 493.88, 587.33, 783.99, 987.77, 1174.66, 987.77, 783.99].forEach((f, i) => beep(f, t + i * 0.11, 1.1, 0.3, 'triangle'));
      return 2.4;
    },
    crystal(t) {
      [1318.5, 1760, 2093].forEach((f, i) => bell(f, t + i * 0.12, 1.3, 0.3));
      return 2.1;
    },
    pulse(t) {
      [440, 660, 440, 660, 440, 660].forEach((f, i) => beep(f, t + i * 0.2, 0.16, 0.35, 'sine'));
      return 1.6;
    },
    dawn(t) {
      sweep(330, 660, t, 1.4, 0.32);
      bell(880, t + 1.4, 1.8, 0.4);
      return 3.4;
    },
    digital(t) {
      [0, 0.7].forEach((g) => [0, 0.13, 0.26, 0.39].forEach((o) => beep(1000, t + g + o, 0.07, 0.2, 'square')));
      return 1.6;
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

  /* ---- Custom (user-supplied) files ---- */
  function stopCustom() {
    clearInterval(fadeTimer);
    fadeTimer = null;
    if (custom) {
      custom.onended = null;
      try { custom.pause(); } catch (e) { /* ignore */ }
      custom = null;
    }
    if (customUrl) {
      URL.revokeObjectURL(customUrl);
      customUrl = null;
    }
  }

  /** Resolves true if the file started playing, false if it was missing or blocked. */
  async function playCustom(id, opts) {
    stopCustom();
    const blob = await W.sounds.getBlob(id);
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const el = new Audio(url);
    el.loop = !!opts.loop;
    const target = opts.volume;
    el.volume = opts.fadeMs ? Math.min(0.05, target) : target;
    custom = el;
    customUrl = url;
    try {
      await el.play();
    } catch (e) {
      if (custom === el) stopCustom();
      return false;
    }
    if (opts.fadeMs) {
      const t0 = Date.now();
      fadeTimer = setInterval(() => {
        const k = Math.min(1, (Date.now() - t0) / opts.fadeMs);
        if (custom === el) el.volume = Math.min(1, Math.max(0.05, target * k));
        if (k >= 1) { clearInterval(fadeTimer); fadeTimer = null; }
      }, 250);
    }
    if (!opts.loop) el.onended = () => { if (custom === el) stopCustom(); };
    return true;
  }

  /* ---- Public API ---- */

  /** One-shot. `force` plays even when timer sounds are off (used for previews). */
  function play(name, opts) {
    opts = opts || {};
    const s = W.store.state.settings;
    if (!opts.force && !s.timerSound) return;
    if (W.sounds.isCustom(name)) {
      playCustom(name, { volume: level(opts.alarm) }).then((ok) => { if (!ok) play('done', opts); });
      return;
    }
    const c = ensure();
    if (!c || !PATTERNS[name]) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    master.gain.cancelScheduledValues(c.currentTime);
    master.gain.setValueAtTime(level(opts.alarm), c.currentTime);
    PATTERNS[name](c.currentTime + 0.03);
  }

  /** Plays the sound chosen in Settings for the end of a focus session or break. */
  function timerEnd() {
    play(W.store.state.settings.timerTone || 'done');
  }

  function stopPreview() {
    clearTimeout(previewTimer);
    previewTimer = null;
    if (!ringing) stopCustom();
  }

  /** Previews a sound (built-in or custom). Custom previews stop after 8 seconds. */
  function preview(tone) {
    stopPreview();
    play(tone, { force: true });
    if (W.sounds.isCustom(tone)) previewTimer = setTimeout(stopPreview, 8000);
  }

  /** Loops an alarm sound until stopRing(). Falls back to Chime if a custom file is gone. */
  function startRing(tone) {
    stopRing();
    ringing = true;
    const s = W.store.state.settings;
    const fadeMs = s.fadeIn ? 20000 : 0;
    const synth = (name) => {
      const c = ensure();
      if (!c || !PATTERNS[name]) return;
      master.gain.cancelScheduledValues(c.currentTime);
      if (fadeMs) {
        master.gain.setValueAtTime(0.05, c.currentTime);
        master.gain.linearRampToValueAtTime(level(true), c.currentTime + fadeMs / 1000);
      } else {
        master.gain.setValueAtTime(level(true), c.currentTime);
      }
      const once = () => {
        if (c.state === 'suspended') c.resume().catch(() => {});
        const len = PATTERNS[name](c.currentTime + 0.03);
        ringTimer = setTimeout(once, len * 1000 + 350);
      };
      once();
    };
    if (W.sounds.isCustom(tone)) {
      playCustom(tone, { loop: true, volume: level(true), fadeMs }).then((ok) => {
        if (!ringing) { stopCustom(); return; } // dismissed while the file was loading
        if (!ok) synth('chime');
      });
      return;
    }
    synth(PATTERNS[tone] ? tone : 'chime');
  }

  function stopRing() {
    ringing = false;
    clearTimeout(ringTimer);
    ringTimer = null;
    stopCustom();
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    }
  }

  /** [[id, label], ...] for dropdowns: built-ins, then your own files. `current` is kept visible even if its file is gone. */
  function soundOptions(current, withDefault) {
    const opts = [];
    if (withDefault) opts.push(['done', 'Soft bells (default)']);
    TONES.forEach((t) => opts.push([t.id, t.name]));
    W.sounds.list().forEach((x) => opts.push([x.id, '♪ ' + x.name]));
    if (W.sounds.isCustom(current) && !W.sounds.get(current)) opts.push([current, 'Missing file (plays Chime)']);
    return opts;
  }

  W.audio = { TONES, soundOptions, unlock, isReady, play, timerEnd, preview, stopPreview, startRing, stopRing };
})((window.Work = window.Work || {}));
