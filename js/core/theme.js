/* Work — core/theme.js
 * Light / Dark / System. Loaded in <head> so the right palette is on screen before first paint.
 * The resolved theme lives on <html data-theme="light|dark">; tokens.css does the rest.
 */
(function (W) {
  'use strict';

  const KEY = 'work.app.v1';
  const MODES = ['light', 'dark', 'system'];
  const PAPER = { light: '#f7f7f4', dark: '#1a1a18' };
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let mode = 'light';

  function resolve(m) {
    if (m === 'dark') return 'dark';
    if (m === 'system') return mq && mq.matches ? 'dark' : 'light';
    return 'light';
  }

  function paint(fade) {
    const root = document.documentElement;
    const next = resolve(mode);
    if (root.getAttribute('data-theme') !== next) {
      if (fade) {
        root.classList.add('theme-switching');
        setTimeout(() => root.classList.remove('theme-switching'), 400);
      }
      root.setAttribute('data-theme', next);
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', PAPER[next]);
  }

  function set(m) {
    mode = MODES.indexOf(m) >= 0 ? m : 'light';
    paint(true);
  }

  // First paint: read the saved choice straight from storage.
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && saved.settings && MODES.indexOf(saved.settings.theme) >= 0) mode = saved.settings.theme;
  } catch (e) { /* default to light */ }
  paint(false);

  if (mq) {
    const onChange = () => { if (mode === 'system') paint(true); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  W.theme = { set, MODES, get mode() { return mode; }, get resolved() { return resolve(mode); } };
})((window.Work = window.Work || {}));
