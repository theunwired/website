/* The Unwired — the live agent log, for the pitch deck.
   Runs itself whenever its slide is on screen: one line at a time, a beat
   between stages, a longer beat before it escalates, then it loops. The
   escalation is the point of the slide, so it always plays through to it. */
(function () {
  if (window.__unwiredPitchLog) return;
  window.__unwiredPitchLog = 1;

  var FEED = [
    { step: 0, line: 'read  invoice INV-40912 · vendor Kestrel Freight' },
    { step: 0, line: 'read  po 88214 · goods receipt GR-2210' },
    { step: 0, line: 'ok    three sources aligned' },
    { step: 1, line: 'check qty 240 = 240' },
    { step: 1, line: 'check price 4.0% over po' },
    { step: 1, line: 'rule  tolerance 5% · set by your finance lead' },
    { step: 1, line: 'ok    inside tolerance' },
    { step: 2, line: 'post  coded 6120 · freight, inbound' },
    { step: 2, line: 'note  price variance 4.0%, within tolerance' },
    { step: 2, line: 'ok    queue item closed · 2m 14s' },
    { step: 3, line: 'read  invoice INV-40913 · vendor Kestrel Freight' },
    { step: 3, line: 'check price 22.0% over po' },
    { step: 3, line: 'stop  outside tolerance' },
    { step: 3, line: 'hand  to a.chen · full trail attached' }
  ];
  var STATUS = ['READING', 'DECIDING', 'ACTING', 'ESCALATED'];

  var cursor = 0, timer = null, running = false, active = -1;

  function q(s) { return document.querySelector(s); }

  function setStep(i) {
    if (i === active) return;
    active = i;
    var steps = document.querySelectorAll('[data-log-step]');
    Array.prototype.forEach.call(steps, function (s, k) {
      var on = k <= i, cur = k === i;
      s.style.background = cur ? '#12140F' : 'transparent';
      var num = s.querySelector('[data-log-num]');
      var title = s.querySelector('[data-log-title]');
      if (num) num.style.color = on ? '#4FBF9B' : '#3A3D35';
      if (title) title.style.color = on ? '#F2F1ED' : '#7C8177';
      Array.prototype.forEach.call(s.querySelectorAll('p'), function (p) {
        p.style.color = on ? '#D6D7D1' : '#7C8177';
      });
    });
    var st = q('[data-log-status]');
    if (st) {
      st.textContent = i < 0 ? 'IDLE' : STATUS[i];
      st.style.color = i === 3 ? '#F2F1ED' : (i < 0 ? '#8A8F84' : '#4FBF9B');
    }
  }

  function append(line) {
    var out = q('[data-log-out]');
    if (!out) return;
    var tag = line.slice(0, 5).trim();
    var color = tag === 'ok' ? '#4FBF9B' : (tag === 'stop' || tag === 'hand') ? '#F2F1ED' : '#8A8F84';
    var row = document.createElement('div');
    row.style.cssText = 'color:' + color + ';opacity:0;transform:translateX(-5px);' +
      'transition:opacity .25s ease-out,transform .25s ease-out';
    row.textContent = line;
    out.appendChild(row);
    requestAnimationFrame(function () { row.style.opacity = '1'; row.style.transform = 'none'; });
    while (out.childNodes.length > 15) out.removeChild(out.firstChild);
  }

  function advance() {
    if (!running) return;
    if (cursor >= FEED.length) {
      timer = setTimeout(function () {
        if (!running) return;
        cursor = 0; active = -1;
        var out = q('[data-log-out]');
        if (out) out.innerHTML = '';
        setStep(-1);
        timer = setTimeout(advance, 700);
      }, 3400);
      return;
    }
    var item = FEED[cursor++];
    setStep(item.step);
    append(item.line);
    var tag = item.line.slice(0, 5).trim();
    var gap = tag === 'stop' ? 1200 : (tag === 'ok' ? 900 : 620);
    timer = setTimeout(advance, gap);
  }

  function start() { if (!running) { running = true; advance(); } }

  /* export helper: pin the run at its most persuasive frame, the escalation */
  window.UnwiredPitchLogFinal = function () {
    stop();
    var out = q('[data-log-out]');
    if (!out) return 0;
    out.innerHTML = '';
    active = -1;
    FEED.forEach(function (f) { append(f.line); });
    setStep(3);
    Array.prototype.forEach.call(out.childNodes, function (n) { n.style.opacity = '1'; n.style.transform = 'none'; });
    return out.childNodes.length;
  };
  function stop() { running = false; if (timer) clearTimeout(timer); }

  function watch() {
    var host = q('[data-log-out]');
    if (!host) return;
    var slide = host.closest('section');
    if (!slide) return;
    var r = slide.getBoundingClientRect();
    var visible = r.width > 20 && r.right > 0 && r.left < window.innerWidth;
    if (visible && !running) start();
    else if (!visible && running) { stop(); }
  }

  function boot() {
    setInterval(watch, 400);
    watch();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(boot, 1200);
})();
