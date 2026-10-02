/* Work — ui/ring.js
 * A single SVG progress ring, reused for the Focus view. `set(fraction)` animates
 * via CSS (transition on stroke-dashoffset), so it respects reduced-motion globally.
 */
(function (W) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const R = 90;
  const C = 2 * Math.PI * R;

  function create() {
    // Sizing is left entirely to CSS (.ring-wrap), so the ring scales fluidly
    // on narrow phone screens instead of overflowing at a fixed pixel size.
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('class', 'ring');
    svg.setAttribute('aria-hidden', 'true');

    const track = document.createElementNS(NS, 'circle');
    track.setAttribute('cx', 100);
    track.setAttribute('cy', 100);
    track.setAttribute('r', R);
    track.setAttribute('class', 'ring-track');

    const bar = document.createElementNS(NS, 'circle');
    bar.setAttribute('cx', 100);
    bar.setAttribute('cy', 100);
    bar.setAttribute('r', R);
    bar.setAttribute('class', 'ring-bar');
    bar.setAttribute('stroke-dasharray', C.toFixed(2));
    bar.setAttribute('stroke-dashoffset', '0');
    bar.setAttribute('transform', 'rotate(-90 100 100)');

    svg.appendChild(track);
    svg.appendChild(bar);

    return {
      el: svg,
      /** fraction: 0 = full ring (start), 1 = empty ring (elapsed) */
      set(fraction) {
        bar.setAttribute('stroke-dashoffset', (C * W.utils.clamp(fraction, 0, 1)).toFixed(2));
      },
      setPhase(phase) {
        svg.setAttribute('data-phase', phase);
      },
    };
  }

  W.ring = { create };
})((window.Work = window.Work || {}));
