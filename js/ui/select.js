/* Work — ui/select.js
 * A themed dropdown that replaces the native <select>, whose popup ignores our palette
 * (white list on a dark app, system-blue highlight). Keyboard: Up/Down/Home/End,
 * Enter or Space to choose, Escape or Tab to close.
 *
 * create({ options: [[value, label], ...], value, label, variant: 'quiet' | 'field',
 *          align: 'start' | 'end', onChange(value) }) -> { el, getValue }
 */
(function (W) {
  'use strict';
  const h = W.dom.h;
  let current = null; // the one open menu, if any

  function create(opts) {
    const options = opts.options;
    let value = opts.value;
    const indexOf = (v) => options.findIndex((o) => String(o[0]) === String(v));
    const labelOf = (v) => (indexOf(v) >= 0 ? options[indexOf(v)][1] : '');

    const text = h('span', { class: 'select-text', text: labelOf(value) });
    const btn = h(
      'button',
      {
        class: 'select select-' + (opts.variant || 'field'),
        type: 'button',
        'aria-haspopup': 'listbox',
        'aria-expanded': 'false',
        onClick: () => (menu ? close() : open()),
        onKeydown: (e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!menu) open(); }
        },
      },
      text,
      W.dom.icon('chevron')
    );
    const syncLabel = () => btn.setAttribute('aria-label', opts.label + ': ' + labelOf(value));
    syncLabel();

    let menu = null;
    let active = 0;
    let items = [];

    function setActive(i) {
      active = Math.max(0, Math.min(options.length - 1, i));
      items.forEach((li, n) => li.classList.toggle('is-active', n === active));
      if (menu) menu.setAttribute('aria-activedescendant', items[active].id);
    }

    function choose(i) {
      const next = options[i][0];
      const changed = String(next) !== String(value);
      value = next;
      text.textContent = labelOf(value);
      syncLabel();
      close();
      if (changed && opts.onChange) opts.onChange(value);
    }

    function onDocPointer(e) {
      if (menu && !menu.contains(e.target) && !btn.contains(e.target)) close(true);
    }
    const onDismiss = (e) => {
      if (e.type === 'scroll' && menu && menu.contains(e.target)) return;
      close(true);
    };

    function onKey(e) {
      e.stopPropagation(); // keep global shortcuts (1-4, N, Space) out of the menu
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
      else if (e.key === 'End') { e.preventDefault(); setActive(options.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') close();
    }

    function open() {
      if (current) current.close(true);
      const uid = 'opt-' + Math.random().toString(36).slice(2, 7);
      items = options.map((o, i) =>
        h('li', {
          class: 'select-option',
          id: uid + '-' + i,
          role: 'option',
          'aria-selected': String(o[0]) === String(value) ? 'true' : 'false',
          onClick: () => choose(i),
          onPointermove: () => { if (active !== i) setActive(i); },
        }, h('span', { text: o[1] }), W.dom.icon('check'))
      );
      menu = h('ul', { class: 'select-menu', role: 'listbox', tabIndex: -1, 'aria-label': opts.label, onKeydown: onKey }, items);
      document.body.appendChild(menu);

      const r = btn.getBoundingClientRect();
      menu.style.minWidth = Math.max(r.width, 132) + 'px';
      const mw = menu.offsetWidth;
      const mh = menu.offsetHeight;
      let top = r.bottom + 6;
      if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - 6 - mh);
      let left = opts.align === 'end' ? r.right - mw : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
      menu.style.top = top + 'px';
      menu.style.left = left + 'px';

      btn.setAttribute('aria-expanded', 'true');
      setActive(Math.max(0, indexOf(value)));
      requestAnimationFrame(() => menu && menu.classList.add('is-visible'));
      menu.focus({ preventScroll: true });

      document.addEventListener('pointerdown', onDocPointer, true);
      document.addEventListener('scroll', onDismiss, true);
      window.addEventListener('resize', onDismiss);
      window.addEventListener('blur', onDismiss);
      current = { close };
    }

    function close(skipFocus) {
      if (!menu) return;
      document.removeEventListener('pointerdown', onDocPointer, true);
      document.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
      window.removeEventListener('blur', onDismiss);
      const m = menu;
      menu = null;
      items = [];
      if (current && current.close === close) current = null;
      btn.setAttribute('aria-expanded', 'false');
      m.classList.remove('is-visible');
      if (W.utils.reducedMotion()) m.remove();
      else setTimeout(() => m.remove(), 140);
      if (skipFocus !== true && document.body.contains(btn)) btn.focus();
    }

    return { el: btn, getValue: () => value };
  }

  W.select = { create };
})((window.Work = window.Work || {}));
