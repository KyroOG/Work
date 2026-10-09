/* Work — core/utils.js
 * Small, dependency-free helpers shared by every layer.
 * Everything hangs off the single global namespace `Work`.
 */
(function (W) {
  'use strict';

  const DAY_MS = 86400000;
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const DAYS_SHORT = DAYS.map((d) => d.slice(0, 3));

  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');

  /* ---- Day keys ("YYYY-MM-DD", always local time) ---- */
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function parseDayKey(k) {
    const p = String(k).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function isValidDayKey(k) {
    return typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) && dayKey(parseDayKey(k)) === k;
  }
  function addDays(k, n) {
    const d = parseDayKey(k);
    d.setDate(d.getDate() + n);
    return dayKey(d);
  }
  /** Whole days from a to b (b - a). DST-safe. */
  function diffDays(a, b) {
    const A = parseDayKey(a);
    const B = parseDayKey(b);
    return Math.round((Date.UTC(B.getFullYear(), B.getMonth(), B.getDate()) - Date.UTC(A.getFullYear(), A.getMonth(), A.getDate())) / DAY_MS);
  }

  /* ---- Time of day ("HH:MM") ---- */
  function hhmm(d) {
    d = d || new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function splitTime(t) {
    const p = String(t).split(':').map(Number);
    return { h: p[0] || 0, m: p[1] || 0 };
  }
  function isValidTime(t) {
    return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  }
  function fmtTime(t, is24) {
    const s = splitTime(t);
    if (is24) return pad(s.h) + ':' + pad(s.m);
    return (s.h % 12 || 12) + ':' + pad(s.m) + ' ' + (s.h < 12 ? 'AM' : 'PM');
  }

  /* ---- Human formatting ---- */
  function fmtDate(d) {
    return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  }
  function fmtDue(key, time, is24, now) {
    now = now || new Date();
    const diff = diffDays(dayKey(now), key);
    const d = parseDayKey(key);
    let label;
    if (diff === 0) label = 'Today';
    else if (diff === 1) label = 'Tomorrow';
    else if (diff === -1) label = 'Yesterday';
    else if (diff > 1 && diff < 7) label = DAYS_SHORT[d.getDay()];
    else {
      label = d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()];
      if (d.getFullYear() !== now.getFullYear()) label += ' ' + d.getFullYear();
    }
    return time ? label + ', ' + fmtTime(time, is24) : label;
  }
  /** 90 -> "1m", 4500 -> "1h 15m" */
  function fmtDuration(sec) {
    sec = Math.max(0, Math.round(sec));
    if (sec < 60) return sec + 's';
    const m = Math.round(sec / 60);
    if (m < 60) return m + 'm';
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return mm ? hh + 'h ' + mm + 'm' : hh + 'h';
  }
  /** Countdown clock for the timer. Rounds up so a fresh 25 min timer reads 25:00. */
  function fmtClock(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  }
  /** "8 hr 12 min" style phrase for alarms. */
  function fmtIn(ms) {
    if (ms < 60000) return 'less than a minute';
    const min = Math.floor(ms / 60000);
    const d = Math.floor(min / 1440);
    const hr = Math.floor((min % 1440) / 60);
    const m = min % 60;
    if (d) return d + (d === 1 ? ' day' : ' days') + (hr ? ' ' + hr + ' hr' : '');
    if (hr) return hr + ' hr' + (m ? ' ' + m + ' min' : '');
    return m + ' min';
  }
  function greeting(hour) {
    if (hour >= 4 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /* ---- Misc ---- */
  function debounce(fn, wait) {
    let t = null;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), wait);
    };
  }
  function isTyping(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const VERSION = '1.1.0';

  W.utils = {
    VERSION,
    DAY_MS, MONTHS, MONTHS_SHORT, DAYS, DAYS_SHORT,
    pad, clamp, uid, plural,
    dayKey, parseDayKey, isValidDayKey, addDays, diffDays,
    hhmm, splitTime, isValidTime, fmtTime,
    fmtDate, fmtDue, fmtDuration, fmtClock, fmtIn, greeting,
    debounce, isTyping, reducedMotion, download,
  };
})((window.Work = window.Work || {}));
