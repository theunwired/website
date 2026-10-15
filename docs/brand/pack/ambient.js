/* The Unwired — ambient life.
   Two behaviours, both drawn from the brand's own grammar:

   1. Hairline draw-on. Bordered panels do not fade in, their 1px rules draw
      themselves left to right as the panel enters view. Structure is drawn
      with hairlines, so the page builds its own structure in front of you.
   2. Breathing signal. Every green accent shifts brightness on a slow shared
      cycle, so the page is never completely still without ever moving. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.__unwiredAmbient) return;
  window.__unwiredAmbient = 1;

  function drawOn() {
    var panels = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'))
      .filter(function (el) {
        var cs = getComputedStyle(el);
        return cs.borderTopWidth === '1px' || cs.borderLeftWidth === '2px' || el.style.background === 'rgb(36, 38, 31)';
      });
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
        /* a hairline sweep travelling across the panel as it lands */
        var sweep = document.createElement('div');
        sweep.style.cssText = 'position:absolute;left:0;top:0;height:100%;width:100%;pointer-events:none;' +
          'background:linear-gradient(90deg,rgba(46,139,110,0) 0%,rgba(46,139,110,0.14) 45%,rgba(46,139,110,0) 100%);' +
          'transform:translateX(-100%);transition:transform .85s cubic-bezier(.22,.61,.36,1);opacity:.9';
        var prevPos = getComputedStyle(el).position;
        if (prevPos === 'static') el.style.position = 'relative';
        el.style.overflow = 'hidden';
        el.appendChild(sweep);
        requestAnimationFrame(function () {
          sweep.style.transform = 'translateX(100%)';
          setTimeout(function () { sweep.remove(); el.style.overflow = ''; }, 950);
        });
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    panels.forEach(function (el) { el.__armed = 1; io.observe(el); });
  }

  /* one shared clock so every accent breathes together, never out of phase */
  function breathe() {
    var t0 = performance.now();
    var targets = [];
    function collect() {
      targets = Array.prototype.slice.call(document.querySelectorAll('span,div'))
        .filter(function (el) {
          var c = el.style && el.style.color;
          return c === 'rgb(46, 139, 110)' || c === '#2E8B6E';
        });
    }
    collect();
    setTimeout(collect, 800);
    (function loop(now) {
      var k = 0.5 + 0.5 * Math.sin((now - t0) * 0.00092);
      /* Signal #2E8B6E dimming toward Forest and back, ~7s cycle */
      var r = Math.round(38 + 8 * k), g = Math.round(118 + 21 * k), b = Math.round(94 + 16 * k);
      var c = 'rgb(' + r + ',' + g + ',' + b + ')';
      for (var i = 0; i < targets.length; i++) targets[i].style.color = c;
      requestAnimationFrame(loop);
    })(t0);
  }

  function start() { drawOn(); breathe(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  setTimeout(start, 600);
})();
