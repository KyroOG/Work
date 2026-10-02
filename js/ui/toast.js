/* Work — ui/toast.js */
(function (W) {
  'use strict';
  const h = W.dom.h;

  let root = null;
  let hideTimer = null;

  function ensure() {
    if (root) return root;
    root = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(root);
    return root;
  }

  /** show({ text, actionLabel, onAction, duration }) */
  function show(opts) {
    const el = ensure();
    clearTimeout(hideTimer);
    W.dom.clear(el);
    el.appendChild(h('span', { class: 'toast-text', text: opts.text }));
    if (opts.actionLabel && opts.onAction) {
      el.appendChild(
        h('button', {
          class: 'toast-action',
          type: 'button',
          text: opts.actionLabel,
          onClick: () => {
            opts.onAction();
            hide();
          },
        })
      );
    }
    el.classList.add('is-visible');
    hideTimer = setTimeout(hide, opts.duration || 5000);
  }
  function hide() {
    if (root) root.classList.remove('is-visible');
    clearTimeout(hideTimer);
  }

  W.toast = { show, hide };
})((window.Work = window.Work || {}));
