/* Work — ui/sheet.js
 * A single reusable overlay used for the task editor, settings and confirmations.
 * Traps focus, restores it on close, closes on Escape / backdrop click.
 */
(function (W) {
  'use strict';
  const h = W.dom.h;

  let backdrop = null;
  let panel = null;
  let lastFocus = null;
  let onCloseCb = null;

  function focusables() {
    return Array.from(panel.querySelectorAll('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])'));
  }

  function onKeydown(e) {
    if (document.querySelector('.select-menu')) return; // an open dropdown owns the keyboard
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /** open({ title, body(HTMLElement), labelledBy?, onClose? }) */
  function open(opts) {
    close(true);
    lastFocus = document.activeElement;
    onCloseCb = opts.onClose || null;
    panel = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title || 'Dialog' }, opts.body);
    backdrop = h(
      'div',
      { class: 'sheet-backdrop', onClick: (e) => { if (e.target === backdrop) close(); } },
      panel
    );
    document.body.appendChild(backdrop);
    document.body.classList.add('sheet-open');
    document.addEventListener('keydown', onKeydown, true);
    requestAnimationFrame(() => {
      backdrop.classList.add('is-visible');
      const f = focusables();
      (f[0] || panel).focus();
    });
    return { close, el: panel };
  }

  function close(silent) {
    if (!backdrop) return;
    document.removeEventListener('keydown', onKeydown, true);
    document.body.classList.remove('sheet-open');
    const b = backdrop;
    backdrop = null;
    panel = null;
    b.classList.remove('is-visible');
    const done = () => b.remove();
    if (W.utils.reducedMotion()) done();
    else setTimeout(done, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
    if (!silent && onCloseCb) onCloseCb();
    onCloseCb = null;
  }

  function isOpen() {
    return !!backdrop;
  }

  W.sheet = { open, close, isOpen };
})((window.Work = window.Work || {}));
