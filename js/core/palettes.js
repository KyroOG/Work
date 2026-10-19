/* Work — core/palettes.js
 * Colour themes. Each theme is 8 colours; everything else (soft ink, lines, washes)
 * is derived in CSS with color-mix, so a custom theme only needs a handful of picks.
 * Loaded in <head> before theme.js so the palette is on screen before first paint.
 */
(function (W) {
  'use strict';

  // Fallbacks for the colours a theme doesn't spell out (used by custom themes).
  const BASE = {
    light: { danger: '#c0452f', warn: '#b8862b', rest: '#b98a4e' },
    dark: { danger: '#ec9783', warn: '#dcb15f', rest: '#d3ae7c' },
  };

  // The built-in look (tokens.css). Only used to draw the Default tile.
  const DEFAULTS = {
    light: { paper: '#f7f7f4', surface: '#ffffff', ink: '#1c1c1a', accent: '#407a5a' },
    dark: { paper: '#1a1a18', surface: '#242422', ink: '#f1f0ea', accent: '#86c09f' },
  };

  const t = (id, name, mode, paper, surface, ink, accent, good, warn, danger, rest) =>
    ({ id, name, mode, paper, surface, ink, accent, good, warn, danger, rest });

  const BUILTIN = [
    t('dracula', 'Dracula', 'dark', '#21222c', '#282a36', '#f8f8f2', '#bd93f9', '#50fa7b', '#ffb86c', '#ff5555', '#8be9fd'),
    t('catppuccin-latte', 'Catppuccin Latte', 'light', '#e6e9ef', '#eff1f5', '#4c4f69', '#8839ef', '#40a02b', '#df8e1d', '#d20f39', '#dc8a78'),
    t('catppuccin-frappe', 'Catppuccin Frappé', 'dark', '#292c3c', '#303446', '#c6d0f5', '#ca9ee6', '#a6d189', '#e5c890', '#e78284', '#ef9f76'),
    t('catppuccin-macchiato', 'Catppuccin Macchiato', 'dark', '#1e2030', '#24273a', '#cad3f5', '#c6a0f6', '#a6da95', '#eed49f', '#ed8796', '#f5a97f'),
    t('catppuccin-mocha', 'Catppuccin Mocha', 'dark', '#181825', '#1e1e2e', '#cdd6f4', '#cba6f7', '#a6e3a1', '#f9e2af', '#f38ba8', '#fab387'),
    t('nord', 'Nord', 'dark', '#2e3440', '#3b4252', '#eceff4', '#88c0d0', '#a3be8c', '#ebcb8b', '#d9737e', '#d08770'),
    t('gruvbox', 'Gruvbox', 'dark', '#1d2021', '#282828', '#ebdbb2', '#fabd2f', '#b8bb26', '#fe8019', '#fb4934', '#83a598'),
    t('tokyo-night', 'Tokyo Night', 'dark', '#16161e', '#1a1b26', '#c0caf5', '#7aa2f7', '#9ece6a', '#e0af68', '#f7768e', '#ff9e64'),
    t('rose-pine', 'Rosé Pine', 'dark', '#191724', '#1f1d2e', '#e0def4', '#c4a7e7', '#9ccfd8', '#f6c177', '#eb6f92', '#ebbcba'),
    t('solarized-light', 'Solarized Light', 'light', '#eee8d5', '#fdf6e3', '#073642', '#268bd2', '#859900', '#b58900', '#dc322f', '#cb4b16'),
  ];

  const HEX = /^#[0-9a-f]{6}$/i;
  const hex = (v, fallback) => (typeof v === 'string' && HEX.test(v.trim()) ? v.trim().toLowerCase() : fallback);

  /** The user's own theme: 5 choices. Anything invalid falls back to the dark default. */
  function cleanCustom(c) {
    c = c && typeof c === 'object' ? c : {};
    const mode = c.mode === 'light' ? 'light' : 'dark';
    const d = DEFAULTS[mode];
    return {
      mode,
      paper: hex(c.paper, d.paper),
      surface: hex(c.surface, d.surface),
      ink: hex(c.ink, d.ink),
      accent: hex(c.accent, d.accent),
    };
  }

  function lum(h) {
    const ch = [1, 3, 5].map((i) => {
      const v = parseInt(h.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  /** Text colour that stays readable on top of the accent. */
  function inkOn(bg) {
    const L = lum(bg);
    return 1.05 / (L + 0.05) >= (L + 0.05) / 0.056 ? '#ffffff' : '#111111';
  }

  function get(id, custom) {
    if (id === 'custom') return Object.assign({ id: 'custom', name: 'Custom' }, cleanCustom(custom));
    return BUILTIN.find((x) => x.id === id) || null;
  }
  const has = (id) => id === 'default' || id === 'custom' || BUILTIN.some((x) => x.id === id);

  /** CSS variables for a theme, ready for element.style.setProperty. */
  function vars(th) {
    const base = BASE[th.mode] || BASE.dark;
    const accent = th.accent;
    const good = th.good || accent;
    const warn = th.warn || base.warn;
    const danger = th.danger || base.danger;
    const rest = th.rest || base.rest;
    return {
      '--ink': th.ink,
      '--paper': th.paper,
      '--surface': th.surface,
      '--ink-soft': 'color-mix(in srgb, var(--ink) 70%, var(--paper))',
      '--ink-faint': 'color-mix(in srgb, var(--ink) 48%, var(--paper))',
      '--surface-sunken': 'color-mix(in srgb, var(--ink) 6%, var(--surface))',
      '--line': 'color-mix(in srgb, var(--ink) 13%, var(--surface))',
      '--accent': accent,
      '--accent-ink': inkOn(accent),
      '--accent-wash': 'color-mix(in srgb, var(--accent) 16%, var(--surface))',
      '--danger': danger,
      '--danger-wash': 'color-mix(in srgb, var(--danger) 16%, var(--surface))',
      '--good': good,
      '--rest': rest,
      '--priority-low': good,
      '--priority-medium': warn,
      '--priority-high': danger,
      '--focus-ring': accent,
    };
  }

  W.palettes = { BUILTIN, DEFAULTS, get, has, vars, cleanCustom, inkOn };
})((window.Work = window.Work || {}));
