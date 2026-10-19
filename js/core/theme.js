/* Work — core/theme.js
 * Light / Dark / System, plus named colour themes (core/palettes.js).
 * Loaded in <head> so the right palette is on screen before first paint.
 * The resolved mode lives on <html data-theme="light|dark">; tokens.css does the rest.
 * A named theme sets its colours as inline variables on <html>, which win over tokens.css.
 */
(function (W) {
  'use strict';

  const KEY = 'work.app.v1';
  const MODES = ['light', 'dark', 'system'];
  const PAPER = { light: '#f7f7f4', dark: '#1a1a18' };
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const P = W.palettes;
  let mode = 'light';
  let palette = 'default';
  let custom = null;
  let applied = [];
  let sig = '';

  function resolve(m) {
    if (m === 'dark') return 'dark';
    if (m === 'system') return mq && mq.matches ? 'dark' : 'light';
    return 'light';
  }

  function paint(fade) {
    const root = document.documentElement;
    const th = palette === 'default' ? null : P.get(palette, custom);
    const next = th ? th.mode : resolve(mode);
    const nextSig = th ? JSON.stringify(th) : next;
    if (nextSig !== sig) {
      if (fade && sig) {
        root.classList.add('theme-switching');
        setTimeout(() => root.classList.remove('theme-switching'), 400);
      }
      sig = nextSig;
      applied.forEach((k) => root.style.removeProperty(k));
      applied = [];
      if (th) {
        const v = P.vars(th);
        Object.keys(v).forEach((k) => { root.style.setProperty(k, v[k]); applied.push(k); });
      }
    }
    if (root.getAttribute('data-theme') !== next) root.setAttribute('data-theme', next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', th ? th.paper : PAPER[next]);
  }

  function set(m) {
    mode = MODES.indexOf(m) >= 0 ? m : 'light';
    paint(true);
  }

  /** Apply the theme-related settings: { theme, palette, customTheme }. */
  function apply(s) {
    mode = MODES.indexOf(s.theme) >= 0 ? s.theme : 'light';
    palette = P.has(s.palette) ? s.palette : 'default';
    custom = P.cleanCustom(s.customTheme);
    paint(true);
  }

  // First paint: read the saved choice straight from storage.
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.settings) {
      if (MODES.indexOf(saved.settings.theme) >= 0) mode = saved.settings.theme;
      if (P.has(saved.settings.palette)) palette = saved.settings.palette;
      custom = P.cleanCustom(saved.settings.customTheme);
    }
  } catch (e) { /* default to light */ }
  paint(false);

  if (mq) {
    const onChange = () => { if (mode === 'system') paint(true); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  W.theme = { set, apply, MODES, get mode() { return mode; }, get resolved() { return resolve(mode); } };
})((window.Work = window.Work || {}));
