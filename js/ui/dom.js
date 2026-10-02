/* Work — ui/dom.js
 * A tiny `h()` hyperscript helper — no framework, just less boilerplate.
 */
(function (W) {
  'use strict';

  function h(tag, attrs) {
    const el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach((k) => {
      const v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in el && k !== 'list') el[k] = v;
      else el.setAttribute(k, v);
    });
    for (let i = 2; i < arguments.length; i++) {
      const c = arguments[i];
      if (c == null) continue;
      if (Array.isArray(c)) c.forEach((cc) => cc && el.appendChild(typeof cc === 'string' ? document.createTextNode(cc) : cc));
      else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }
  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }
  function icon(name) {
    const span = document.createElement('span');
    span.className = 'icon icon-' + name;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }

  W.dom = { h, clear, icon };
})((window.Work = window.Work || {}));
