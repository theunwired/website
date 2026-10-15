/* The Unwired — responsive + production behaviour.
   The design is authored with inline styles at desktop scale. This adapts it
   down without a stylesheet: multi-column grids collapse, the nav folds into
   a menu, section rhythm tightens, and the wire field steps aside.
   Everything stores its authored value first, so resizing back up restores
   the design exactly as written. */
(function () {
  if (window.__unwiredResponsive) return;
  window.__unwiredResponsive = 1;

  var STACK = 860;   /* below this, multi-column grids become one column */
  var navNeed = 0;   /* measured: the width the nav actually needs in a row */

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  function grids() {
    var stack = window.innerWidth < STACK;
    each('[style*="grid-template-columns"]', function (el) {
      if (el.__cols === undefined) el.__cols = el.style.gridTemplateColumns;
      if (!el.__cols || el.__cols.indexOf('1fr') === -1) return;
      el.style.gridTemplateColumns = stack ? '1fr' : el.__cols;
      if (stack && el.__gap === undefined) el.__gap = el.style.gap;
      if (el.__gap !== undefined) el.style.gap = stack && el.__gap === '1px' ? '1px' : (stack ? '20px' : el.__gap);
    });
  }

  function rhythm() {
    var tight = window.innerWidth < 720;
    each('section', function (el) {
      if (el.__pad === undefined) el.__pad = el.style.padding;
      if (!el.__pad) return;
      el.style.padding = tight ? el.__pad.replace(/(^|\s)1[01]0px/g, ' 64px') : el.__pad;
    });
    each('[style*="max-width:1120px"]', function (el) {
      el.style.paddingLeft = tight ? '20px' : '32px';
      el.style.paddingRight = tight ? '20px' : '32px';
    });
    /* generous desktop panel padding is unusable on a phone */
    each('[style*="padding:64px 48px"],[style*="padding:56px 48px"],[style*="padding:52px 44px"]', function (el) {
      if (el.__p2 === undefined) el.__p2 = el.style.padding;
      el.style.padding = tight ? '36px 24px' : el.__p2;
    });
  }

  function nav() {
    var links = document.querySelector('[data-navlinks]');
    if (!links) return;
    /* measure what the nav genuinely needs rather than guessing a breakpoint:
       while it is laid out in a row, sum its parts once and fold below that */
    var bar = links.parentNode;
    if (links.style.position !== 'absolute' && bar) {
      var need = 0;
      Array.prototype.forEach.call(bar.children, function (c) {
        if (c.id === 'unwired-menu-btn') return;
        need += c.getBoundingClientRect().width;
      });
      need += 48 + 64 + 24; /* gaps, wrap padding, breathing room */
      if (need > navNeed) navNeed = need;
    }
    var fold = window.innerWidth < (navNeed || 840);
    if (links.__orig === undefined) links.__orig = links.style.display || 'flex';

    var btn = document.getElementById('unwired-menu-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'unwired-menu-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Open menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'MENU';
      btn.style.cssText = "font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.12em;" +
        'padding:9px 14px;border:1px solid #24261F;color:#F2F1ED;background:none;cursor:pointer;display:none';
      links.parentNode.insertBefore(btn, links.nextSibling);
      btn.addEventListener('click', function () {
        var open = links.style.display !== 'none';
        links.style.display = open ? 'none' : 'flex';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        btn.textContent = open ? 'MENU' : 'CLOSE';
      });
    }

    btn.style.display = fold ? 'inline-block' : 'none';
    if (fold) {
      links.style.position = 'absolute';
      links.style.top = '72px';
      links.style.left = '0';
      links.style.right = '0';
      links.style.flexDirection = 'column';
      links.style.gap = '0';
      links.style.background = '#0B0C0B';
      links.style.borderBottom = '1px solid #24261F';
      links.style.padding = '8px 20px 16px';
      links.style.display = 'none';
      Array.prototype.forEach.call(links.children, function (a) {
        a.style.padding = '13px 0';
        a.style.fontSize = '15px';
        a.style.borderTop = '1px solid #171914';
      });
      btn.textContent = 'MENU';
      btn.setAttribute('aria-expanded', 'false');
    } else {
      links.style.position = '';
      links.style.top = ''; links.style.left = ''; links.style.right = '';
      links.style.flexDirection = 'row';
      links.style.gap = '24px';
      links.style.background = '';
      links.style.borderBottom = '';
      links.style.padding = '';
      links.style.display = links.__orig;
      Array.prototype.forEach.call(links.children, function (a) {
        a.style.padding = ''; a.style.fontSize = ''; a.style.borderTop = '';
      });
    }
    if (bar) bar.style.position = 'relative';
  }

  /* the hero mark is authored for a wide screen */
  function hero() {
    var narrow = window.innerWidth < 720;
    each('[data-word-the],[data-word-wired]', function (el) {
      el.style.fontSize = narrow ? '30px' : '44px';
    });
    each('[data-hero-meta] span', function (el) {
      el.style.display = narrow ? 'none' : '';
    });
  }

  /* keyboard focus has to be visible; the design has no :focus styles */
  function focusRing() {
    each('a,button,input,textarea', function (el) {
      if (el.__focus) return;
      el.__focus = 1;
      el.addEventListener('focus', function () { el.style.outline = '2px solid #4FBF9B'; el.style.outlineOffset = '2px'; });
      el.addEventListener('blur', function () { el.style.outline = ''; el.style.outlineOffset = ''; });
    });
  }

  function apply() { grids(); rhythm(); nav(); hero(); focusRing(); }

  var t;
  function schedule() { clearTimeout(t); t = setTimeout(apply, 60); }
  window.addEventListener('resize', schedule);

  /* The design streams in after DOMContentLoaded and React re-renders can
     reset the inline styles we write. Watching the tree means the adaptation
     lands with the markup instead of half a second later, and survives any
     re-render, which is what caused the nav to visibly fold on load. */
  function watch() {
    apply();
    var mo = new MutationObserver(function () { schedule(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();
  setTimeout(apply, 1200); /* backstop only */
})();
