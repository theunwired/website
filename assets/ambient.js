/* The Unwired — ambient life.
   Two behaviours, both drawn from the brand's own grammar:

   1. Hairline draw-on. Bordered panels do not fade in, a green hairline
      sweeps across them as they land, so the page builds its own structure
      in front of you. Driven by a CSS class, not inline styles.
   2. Breathing signal. Every green accent shifts brightness on a slow shared
      cycle, so the page is never completely still without ever moving.
      One clock for the whole page, written to a single custom property. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.__unwiredAmbient) return;
  window.__unwiredAmbient = 1;

  function sweep() {
    if (!('IntersectionObserver' in window)) return;
    var panels = Array.prototype.slice.call(document.querySelectorAll('[data-sweep]'));
    if (!panels.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target;
        /* re-arm once the panel has fully left the viewport, so scrolling
           back up and down plays the sweep again rather than once ever */
        if (!en.isIntersecting) { el.__armed = 1; return; }
        var now = performance.now();
        if (el.__drawn && (!el.__armed || now - el.__last < 900)) return;
        el.__drawn = 1;
        el.__armed = 0;
        el.__last = now;
        el.classList.remove('sweeping');
        /* force a reflow so the animation restarts on every pass */
        void el.offsetWidth;
        el.classList.add('sweeping');
        setTimeout(function () { el.classList.remove('sweeping'); }, 950);
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    panels.forEach(function (el) { el.__armed = 1; io.observe(el); });
  }

  /* one shared clock so every accent breathes together, never out of phase */
  function breathe() {
    var t0 = performance.now();
    var root = document.documentElement;
    (function loop(now) {
      if (!document.hidden) {
        var k = 0.5 + 0.5 * Math.sin((now - t0) * 0.00092);
        /* Signal #2E8B6E dimming toward Forest and back, ~7s cycle */
        var r = Math.round(38 + 8 * k);
        var g = Math.round(118 + 21 * k);
        var b = Math.round(94 + 16 * k);
        root.style.setProperty('--breath', 'rgb(' + r + ',' + g + ',' + b + ')');
      }
      requestAnimationFrame(loop);
    })(t0);
  }

  function start() {
    try { sweep(); } catch (e) { /* the sweep is decorative, never fatal */ }
    breathe();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
