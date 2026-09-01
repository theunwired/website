/* The Unwired — site chrome and page behaviour.
   Shared: page transition, contact modal, reveal, progress rail, nav menu.
   Home only: the pinned hero and the agent log.
   Everything here is off under prefers-reduced-motion. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  var NAV = 72;

  /* ------------------------------------------------------- page transition */
  function initWipe() {
    var w = q('[data-wipe]');
    if (!w || reduce) return;
    function openWipe() {
      w.style.transition = 'transform .4s cubic-bezier(.65,0,.35,1)';
      w.style.transform = 'translateX(101%)';
    }
    w.style.transform = 'translateX(0)';
    requestAnimationFrame(openWipe);
    /* rAF is suspended in a background tab. Without this the panel would sit
       over the page as a black screen until the tab is focused. */
    setTimeout(openWipe, 800);
    qa('[data-wipe-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (!href || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        w.style.transition = 'none';
        w.style.transform = 'translateX(-101%)';
        /* the navigation must never depend on the animation frame: rAF is
           suspended in a background tab, and scheduling the hop inside it
           left the click covering the page and going nowhere */
        setTimeout(function () { window.location.href = href; }, 310);
        requestAnimationFrame(function () {
          w.style.transition = 'transform .3s cubic-bezier(.65,0,.35,1)';
          w.style.transform = 'translateX(0)';
        });
      });
    });
  }

  /* ---------------------------------------------------------------- nav */
  function initNav() {
    var btn = q('[data-nav-toggle]');
    var links = q('[data-navlinks]');
    if (!btn || !links) return;
    btn.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'CLOSE' : 'MENU';
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') return;
      links.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = 'MENU';
    });
  }

  /* --------------------------------------------------------------- modal */
  var FOCUSABLE = 'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])';

  function initModal() {
    var m = q('[data-modal]');
    if (!m) return;
    var panel = q('.modal__panel', m);
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      /* clear any status left over from a previous send, or reopening the
         dialog shows a stale "Got it" over an empty form */
      var status = q('[data-form-status]');
      if (status) {
        status.className = 'form-status';
        status.textContent = '';
      }
      m.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      var first = q(FOCUSABLE, panel);
      if (first) first.focus();
    }
    function close() {
      m.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    qa('[data-open-contact]').forEach(function (b) { b.addEventListener('click', open); });
    qa('[data-close-contact]').forEach(function (b) { b.addEventListener('click', close); });
    m.addEventListener('click', function (e) { if (e.target === m) close(); });

    document.addEventListener('keydown', function (e) {
      if (!m.classList.contains('is-open')) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      /* trap focus inside the dialog */
      var items = qa(FOCUSABLE, panel).filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    var f = q('[data-contact-form]');
    var st = q('[data-form-status]');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.elements._honey && f.elements._honey.value) return; /* honeypot */
      var btn = q('.submit', f);
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      fetch(f.action, {
        method: 'POST',
        body: new FormData(f),
        headers: { Accept: 'application/json' }
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r; })
        .then(function () {
          st.classList.add('is-shown');
          st.classList.remove('is-error');
          st.textContent = 'Got it. We will come back to you within a day.';
          f.reset();
        })
        .catch(function () {
          st.classList.add('is-shown', 'is-error');
          st.textContent = 'That did not send. Write to theunwired.in@gmail.com instead.';
        })
        .then(function () {
          if (btn) { btn.disabled = false; btn.textContent = 'Send it over'; }
        });
    });
  }

  /* -------------------------------------------------------------- reveal */
  function initReveal() {
    /* nothing is hidden unless we can guarantee we can show it again */
    if (reduce || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        /* also reveal on a jump-scroll past the element, or it stays
           invisible forever */
        if (en.isIntersecting || en.boundingClientRect.top < 0) {
          en.target.classList.add('is-revealed');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });

    qa('[data-reveal]').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.9) {
        el.classList.add('pre-reveal');
        io.observe(el);
      }
    });
  }

  /* ----------------------------------------------------------- the rail */
  var rail, railFill, railLabel, sections;

  function initRail() {
    rail = q('[data-rail]');
    railFill = q('[data-rail-fill]');
    railLabel = q('[data-rail-label]');
    sections = qa('[data-section]');
  }

  function frameRail(y, vh) {
    if (!rail || getComputedStyle(rail).display === 'none') return;
    var doc = document.documentElement.scrollHeight - vh;
    var prog = clamp(y / Math.max(1, doc));
    railFill.style.height = rail.getBoundingClientRect().height * prog + 'px';
    var active = -1;
    sections.forEach(function (s, i) {
      if (s.getBoundingClientRect().top < vh * 0.45) active = i;
    });
    if (active >= 0) {
      railLabel.textContent = String(active + 1).padStart(2, '0') + ' / ' +
        sections[active].getAttribute('data-section').toUpperCase();
      railLabel.style.opacity = '1';
    } else {
      railLabel.style.opacity = '0';
    }
  }

  /* ----------------------------------------------------------- the hero */
  var heroPin, pathA, pathB, leadA, leadB, heroMid, wordThe, wordWired,
      heroCopy, heroStage, heroMark, heroMeta, cue;

  function initHero() {
    heroPin = q('[data-hero-pin]');
    if (!heroPin) return;
    pathA = q('[data-path-a]');
    pathB = q('[data-path-b]');
    leadA = q('[data-lead-a]');
    leadB = q('[data-lead-b]');
    heroMid = q('[data-hero-mid]');
    wordThe = q('[data-word-the]');
    wordWired = q('[data-word-wired]');
    heroCopy = q('[data-hero-copy]');
    heroStage = q('[data-hero-stage]');
    heroMark = q('[data-hero-mark]');
    heroMeta = q('[data-hero-meta]');
    cue = q('[data-scroll-cue]');
    if (reduce) settleHero();
  }

  /* two wires crossing to make an X, untangling to a flat pair */
  function wirePath(u, up) {
    var t = 1 - u;
    var r = function (n) { return Math.round(n * 100) / 100; };
    var rest = up ? 26 : 40;
    return 'M2 ' + r(up ? rest - 6 * t : rest + 4 * t) +
           ' H30 L66 ' + r(up ? rest + 18 * t : rest - 20 * t) + ' H94';
  }

  function applyHero(untangle, converge) {
    if (!pathA) return;
    pathA.setAttribute('d', wirePath(untangle, true));
    pathB.setAttribute('d', wirePath(untangle, false));
    leadA.style.width = 50 * converge + 'px';
    leadA.style.opacity = converge;
    leadB.style.width = 29 * converge + 'px';
    leadB.style.opacity = converge;
    /* the horizontal margins have to collapse too, or the word settles
       as "theun wired" */
    heroMid.style.width = 90 * (1 - converge) + 'px';
    heroMid.style.opacity = 1 - converge;
    heroMid.style.marginLeft = 6 * (1 - converge) + 'px';
    heroMid.style.marginRight = 6 * (1 - converge) + 'px';
    var col = converge > 0.5 ? '#F2F1ED' : '#7C8177';
    wordThe.style.color = col;
    wordWired.style.color = col;
  }

  function settleHero() {
    applyHero(1, 1);
    heroPin.classList.add('is-static');
    if (heroStage) heroStage.style.transform = 'none';
    if (heroMark) heroMark.style.transform = 'none';
  }

  function frameHero() {
    if (!heroPin || reduce) return;
    var vh = window.innerHeight;
    var stickyH = vh - NAV;
    var scrollable = heroPin.offsetHeight - stickyH;
    var top = heroPin.getBoundingClientRect().top;
    var p = scrollable > 0 ? clamp((NAV - top) / scrollable) : 0;

    var untangle = ease(clamp((p - 0.10) / 0.34));
    var converge = ease(clamp((p - 0.44) / 0.18));
    applyHero(untangle, converge);
    if (heroMark) {
      /* the peak comes from CSS so the breakpoints own it: at 1.62x the
         lockup is wider than a phone viewport and gets clipped */
      var peak = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--mark-peak')) || 0.62;
      heroMark.style.transform = 'scale(' + (1 + peak * (1 - converge)) + ')';
    }

    /* On home the field belongs to the logo: it untangles as one gesture with
       the mark and then stays resolved for the rest of the page. Handing back
       to page progress makes it re-tangle and fight the logo. */
    var markMove = ease(clamp((p - 0.10) / 0.52));
    if (window.UnwiredWires) window.UnwiredWires.override = 1 - markMove;

    if (heroMeta) heroMeta.style.opacity = clamp(1 - p / 0.18);
    if (cue) cue.style.opacity = clamp(1 - p / 0.08);
    if (heroCopy && heroStage) {
      var reveal = ease(clamp((p - 0.56) / 0.14));
      var shift = (heroCopy.offsetHeight + 40) / 2;
      heroStage.style.transform = 'translateY(' + shift * (1 - reveal) + 'px)';
      heroCopy.style.opacity = reveal;
      heroCopy.style.transform = 'translateY(' + 10 * (1 - reveal) + 'px)';
    }
  }

  /* -------------------------------------------------------- the agent run */
  var runSteps, runLog, runStatus, runActive = -1, feed = [], cursor = 0,
      running = false, runTimer = null;

  var LOG = [
    ['read  invoice INV-40912 · vendor Kestrel Freight',
     'read  po 88214 · goods receipt GR-2210',
     'ok    three sources aligned'],
    ['check qty 240 = 240',
     'check price 4.0% over po',
     'rule  tolerance 5% · set by finance lead',
     'ok    inside tolerance'],
    ['post  coded 6120 · freight, inbound',
     'note  price variance 4.0%, within tolerance',
     'ok    queue item closed · 2m 14s'],
    ['read  invoice INV-40913 · vendor Kestrel Freight',
     'check price 22.0% over po',
     'stop  outside tolerance',
     'hand  to a.chen · full trail attached']
  ];

  function initRun() {
    runSteps = qa('[data-run-step]');
    runLog = q('[data-run-log]');
    runStatus = q('[data-run-status]');
    if (!runLog) return;
    /* flatten to a single feed so the log can run line by line, live */
    LOG.forEach(function (group, gi) {
      group.forEach(function (line) { feed.push({ step: gi, line: line }); });
    });
    if (reduce) {
      feed.forEach(function (item) { appendLine(item.line, true); });
      setRunStep(3);
    }
  }

  function appendLine(l, instant) {
    var tag = l.slice(0, 5).trim();
    var row = document.createElement('div');
    row.className = 'log__line' +
      (tag === 'ok' ? ' log__line--ok' : (tag === 'stop' || tag === 'hand') ? ' log__line--hand' : '');
    row.textContent = l;
    runLog.appendChild(row);
    if (instant) row.classList.add('is-in');
    else requestAnimationFrame(function () { row.classList.add('is-in'); });
    while (runLog.childNodes.length > 14) runLog.removeChild(runLog.firstChild);
  }

  function setRunStep(i) {
    if (i === runActive) return;
    runActive = i;
    runSteps.forEach(function (s, k) {
      s.classList.toggle('is-on', k <= i);
      s.classList.toggle('is-current', k === i);
    });
    if (!runStatus) return;
    runStatus.classList.remove('is-live', 'is-stop');
    if (i < 0) { runStatus.textContent = 'IDLE'; return; }
    runStatus.textContent = ['READING', 'DECIDING', 'ACTING', 'ESCALATED'][i];
    runStatus.classList.add(i === 3 ? 'is-stop' : 'is-live');
  }

  function startRun() {
    if (running || !runLog || reduce) return;
    running = true;
    (function advance() {
      if (!running) return;
      if (cursor >= feed.length) {
        /* hold the finished run, then start it over */
        runTimer = setTimeout(function () {
          if (!running) return;
          cursor = 0;
          runLog.innerHTML = '';
          setRunStep(-1);
          runTimer = setTimeout(advance, 700);
        }, 3200);
        return;
      }
      var item = feed[cursor++];
      setRunStep(item.step);
      appendLine(item.line);
      var tag = item.line.slice(0, 5).trim();
      /* a beat before each new stage, and a longer one before it escalates */
      var gap = tag === 'stop' ? 1100 : (tag === 'ok' ? 900 : 620);
      runTimer = setTimeout(advance, gap);
    })();
  }

  function stopRun() {
    running = false;
    if (runTimer) clearTimeout(runTimer);
  }

  function frameRun(vh) {
    if (!runLog || reduce) return;
    var sec = document.getElementById('run');
    if (!sec) return;
    var r = sec.getBoundingClientRect();
    var visible = r.top < vh * 0.85 && r.bottom > vh * 0.15;
    if (visible && !running) startRun();
    else if (!visible && running) stopRun();
  }

  /* ---------------------------------------------------------------- loop */
  var ticking = false;

  function frame() {
    var y = window.scrollY || window.pageYOffset;
    var vh = window.innerHeight;
    frameHero();
    frameRail(y, vh);
    frameRun(vh);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; frame(); });
  }

  /* each initialiser stands alone: one throwing must not take the rest with
     it, or a failure early in the list leaves reveal content stuck at
     opacity 0 and the hero unscrubbed */
  function safe(name, fn) {
    try { fn(); } catch (err) {
      if (window.console) console.error('[unwired] ' + name + ' failed', err);
    }
  }

  function start() {
    safe('wipe', initWipe);
    safe('nav', initNav);
    safe('modal', initModal);
    safe('reveal', initReveal);
    safe('rail', initRail);
    safe('hero', initHero);
    safe('run', initRun);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', onScroll);
    frame();

    /* the pin is scrubbed, so keep it fresh while it is on screen even when
       the scroll event coalesces */
    if (!reduce && heroPin) {
      (function idle() {
        requestAnimationFrame(idle);
        if (document.hidden) return;
        var r = heroPin.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) frame();
      })();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopRun();
      else frame();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
