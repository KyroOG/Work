/* Work — ui/time-field.js
 * A time input that follows the app's 12/24-hour setting instead of the OS locale
 * (the native <input type="time"> ignores it). Value is "HH:MM" in 24-hour form, or "" when empty.
 * Type digits, use Up/Down to step, press A or P to flip AM/PM.
 * create({ value, label, large, disabled }) -> { el, value (get/set), disabled (set), focus() }
 */
(function (W) {
  'use strict';
  const h = W.dom.h;
  const U = W.utils;

  function create(o) {
    o = o || {};
    const is24 = !!W.store.state.settings.clock24;
    const label = o.label || 'Time';
    let val = U.isValidTime(o.value) ? o.value : '';

    const hr = h('input', { class: 'tf-seg', type: 'text', inputmode: 'numeric', maxlength: 2, placeholder: '--', autocomplete: 'off', 'aria-label': label + ', hour' });
    const mn = h('input', { class: 'tf-seg', type: 'text', inputmode: 'numeric', maxlength: 2, placeholder: '--', autocomplete: 'off', 'aria-label': label + ', minutes' });
    const ap = is24 ? null : h('button', { class: 'tf-ampm', type: 'button', text: 'AM', 'aria-label': label + ', AM or PM', onClick: () => flip() });
    const el = h('div', { class: 'time-field' + (o.large ? ' is-large' : '') + (o.disabled ? ' is-disabled' : '') }, hr, h('span', { class: 'tf-colon', text: ':' }), mn, ap);

    const parts = () => { const s = U.splitTime(val); return { h: s.h, m: s.m }; };

    function paint() {
      if (!val) {
        hr.value = '';
        mn.value = '';
        if (ap) ap.textContent = 'AM';
        return;
      }
      const p = parts();
      hr.value = U.pad(is24 ? p.h : p.h % 12 || 12);
      mn.value = U.pad(p.m);
      if (ap) ap.textContent = p.h < 12 ? 'AM' : 'PM';
    }

    function set(h24, m) {
      val = U.pad(((h24 % 24) + 24) % 24) + ':' + U.pad(((m % 60) + 60) % 60);
      paint();
    }

    /** Read what was typed into the boxes. */
    function commit() {
      const hs = hr.value.trim();
      const ms = mn.value.trim();
      if (!hs && !ms) { val = ''; paint(); return; }
      let hv = parseInt(hs, 10);
      let mv = parseInt(ms, 10);
      if (isNaN(hv)) { paint(); return; }
      if (isNaN(mv)) mv = 0;
      mv = U.clamp(mv, 0, 59);
      if (is24) hv = U.clamp(hv, 0, 23);
      else {
        hv = U.clamp(hv, 1, 12) % 12;
        if (ap.textContent === 'PM') hv += 12;
      }
      set(hv, mv);
    }

    function step(unit, dir) {
      commit();
      if (!val) val = '07:00';
      const p = parts();
      if (unit === 'h') set(p.h + dir, p.m);
      else set(p.h, p.m + dir);
    }

    function flip(to) {
      commit();
      if (!val) { val = '09:00'; paint(); return; }
      const p = parts();
      const wantPm = to === undefined ? p.h < 12 : to === 'PM';
      if (wantPm !== p.h >= 12) set(p.h + (wantPm ? 12 : -12), p.m);
    }

    [hr, mn].forEach((inp, i) => {
      inp.addEventListener('focus', () => inp.select());
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '');
        if (inp.value.length === 2) {
          if (i === 0) { commit(); mn.focus(); }
          else commit();
        }
      });
      inp.addEventListener('blur', commit);
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          step(i === 0 ? 'h' : 'm', e.key === 'ArrowUp' ? 1 : -1);
          inp.select();
        } else if (!is24 && /^[ap]$/i.test(e.key)) {
          e.preventDefault();
          flip(e.key.toLowerCase() === 'p' ? 'PM' : 'AM');
        } else if (e.key === 'Backspace' && i === 1 && !mn.value) {
          hr.focus();
        }
      });
    });

    paint();
    if (o.disabled) { hr.disabled = true; mn.disabled = true; if (ap) ap.disabled = true; }

    return {
      el,
      get value() { commit(); return val; },
      set value(v) { val = U.isValidTime(v) ? v : ''; paint(); },
      set disabled(d) {
        hr.disabled = mn.disabled = !!d;
        if (ap) ap.disabled = !!d;
        el.classList.toggle('is-disabled', !!d);
      },
      focus() { hr.focus(); },
    };
  }

  W.timeField = { create };
})((window.Work = window.Work || {}));
