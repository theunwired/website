/* The Unwired — the Lab run.
   Shared by every Lab page. Each stage records what the visitor did with
   UnwiredLab.save(stage, data); the "Your run" panel reads it back and can
   pre-fill the contact form with it.

   Stored in sessionStorage only: it lives for this tab and is gone when the
   tab closes. Nothing is sent anywhere. Every read and write is guarded, so
   a blocked storage leaves the panel hidden, never broken.

   Lessons are never printed before the visitor plays. Each stage's lesson is
   stamped, on the stage page and on its hub card, once the stage has earned
   it (see earned() below). */
(function () {
  'use strict';

  var KEY = 'unwired-lab-run';
  var memoRun = null;

  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') || memoRun || {}; } catch (e) { return memoRun || {}; }
  }
  function save(stage, data) {
    var all = load();
    all[stage] = data;
    memoRun = all;
    try { sessionStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* private mode: this page still shows the run */ }
    render();
  }
  window.UnwiredLab = { save: save, load: load };

  /* ------------------------------------------------- signing the sheet */
  /* The visitor's initials, drawn with the pen or typed. Stored for this tab
     only, as strokes normalised to a 300 x 100 box, then drawn into the
     "Checked by" cell of every title block on every Lab sheet. */
  var SIGN = 'unwired-lab-sign';
  var NS = 'http://www.w3.org/2000/svg';
  function getSign() {
    try { return JSON.parse(sessionStorage.getItem(SIGN) || 'null'); } catch (e) { return null; }
  }
  function setSign(v) {
    try {
      if (v) sessionStorage.setItem(SIGN, JSON.stringify(v));
      else sessionStorage.removeItem(SIGN);
    } catch (e) { /* blocked storage: the signature still shows on this page */ }
    memo = v;
    paintSignatures();
  }
  var memo = null;
  function signature() { return memo || getSign(); }

  function pathFor(strokes) {
    return strokes.map(function (st) {
      return st.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1); }).join(' ');
    }).join(' ');
  }

  /* a run means something was played: on the hub, the line moved or the word
     struck, not just the first call */
  function played(key, d) {
    if (!d) return false;
    if (key === 'hub') return !!(d.moved || d.struck);
    return true;
  }
  function anyRun() {
    var data = load();
    return STAGES.some(function (s) { return played(s.key, data[s.key]); });
  }

  function paintSignatures() {
    var sig = signature();
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-signature]'), function (slot) {
      slot.innerHTML = '';
      if (!sig) {
        var e = document.createElement('span');
        e.className = 'titleblock__empty';
        e.textContent = 'unsigned';
        slot.appendChild(e);
        return;
      }
      if (sig.text) { slot.textContent = sig.text; return; }
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 300 100');
      svg.setAttribute('class', 'titleblock__sig');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Your initials');
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', pathFor(sig.strokes));
      svg.appendChild(path);
      slot.appendChild(svg);
    });
    /* the stamp means a person checked finished work: signed, and at least
       one stage actually run */
    var stamped = !!sig && anyRun();
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-stamp]'), function (st) { st.hidden = !stamped; });
  }

  var refitPad = null;
  function initPad() {
    var pad = document.querySelector('[data-lab-sign-pad]');
    if (!pad) return;
    var canvas = pad.querySelector('canvas');
    var hint = document.querySelector('[data-lab-sign-hint]');
    var typed = document.querySelector('[data-lab-sign-typed]');
    var clear = document.querySelector('[data-lab-sign-clear]');
    var ctx = canvas.getContext('2d');
    var strokes = [], cur = null;

    function ink() { return getComputedStyle(document.documentElement).getPropertyValue('--pen').trim() || '#EAF2F8'; }
    function fit() {
      var r = pad.getBoundingClientRect(), d = window.devicePixelRatio || 1;
      if (!r.width) return;
      canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      redraw();
    }
    refitPad = fit;
    function redraw() {
      var r = pad.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.strokeStyle = ink(); ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokes.forEach(function (st) {
        ctx.beginPath();
        st.forEach(function (pt, i) { var x = pt[0] / 300 * r.width, y = pt[1] / 100 * r.height; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke();
      });
      if (hint) hint.hidden = strokes.length > 0;
    }
    function point(e) {
      var r = pad.getBoundingClientRect();
      return [Math.max(0, Math.min(300, (e.clientX - r.left) / r.width * 300)), Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100))];
    }
    pad.addEventListener('pointerdown', function (e) {
      pad.setPointerCapture(e.pointerId);
      cur = [point(e)]; strokes.push(cur); redraw();
    });
    pad.addEventListener('pointermove', function (e) { if (!cur) return; cur.push(point(e)); redraw(); });
    function end() {
      if (!cur) return;
      cur = null;
      /* keep only strokes with some length: a tap is not a signature */
      strokes = strokes.filter(function (st) { return st.length > 2; });
      if (strokes.length) { if (typed) typed.value = ''; setSign({ strokes: strokes }); }
      redraw();
    }
    pad.addEventListener('pointerup', end);
    pad.addEventListener('pointercancel', end);
    if (typed) {
      typed.addEventListener('input', function () {
        var v = typed.value.trim().slice(0, 4).toUpperCase();
        strokes = []; redraw();
        setSign(v ? { text: v } : null);
      });
    }
    if (clear) clear.addEventListener('click', function () { strokes = []; if (typed) typed.value = ''; redraw(); setSign(null); });
    document.addEventListener('unwired:theme', redraw);
    window.addEventListener('resize', fit);
    var existing = getSign();
    if (existing && existing.strokes) strokes = existing.strokes;
    if (existing && existing.text && typed) typed.value = existing.text;
    fit();
  }

  var STAGES = [
    { key: 'hub', num: '00', name: 'The bet', href: 'lab.html#bet',
      lesson: 'The line matters. The rule matters more.' },
    { key: 'tolerance', num: '01', name: 'Set the line', href: 'lab-tolerance.html',
      lesson: 'One number decides what nobody checks.' },
    { key: 'handover', num: '02', name: 'Pass the handover', href: 'lab-handover.html',
      lesson: "If your team can't change it, we built it wrong." },
    { key: 'documents', num: '03', name: 'Worst-document bench', href: 'lab-documents.html',
      lesson: 'Confidence is not the same as correct.' }
  ];
  var SITE = 'https://theunwired.in/';

  /* a stage earns its lesson when the visitor has seen the thing it is about:
     let go of the line, passed all three tasks, met a confident mistake */
  function earned(key, d) {
    if (!d) return false;
    if (key === 'hub') return !!d.struck;
    if (key === 'tolerance') return !!d.done;
    if (key === 'handover') return d.done === 3;
    if (key === 'documents') return !!d.trapConf;
    return false;
  }

  function money(v) { return '$' + Math.round(v).toLocaleString('en-US'); }

  /* one plain sentence per stage, used on the page and in the message */
  function sentence(key, d) {
    if (!d) return null;
    if (key === 'hub') {
      var call = d.call === 'post' ? 'Called the first invoice: posted it. It was a duplicate. '
        : d.call === 'person' ? 'Called the first invoice: sent it to a person. It was a duplicate. ' : '';
      if (d.struck) return call + 'Struck the no in hold_duplicates: no. One word stopped ' + money(d.word) + ' of duplicate payments. The whole slider moved ' + money(d.whole) + '.';
      if (d.moved) return call + 'Drew the line at ' + d.pct.toFixed(1) + '%. The duplicate rule is still off.';
      return call ? call.trim() : null;
    }
    if (key === 'tolerance') {
      return 'Left the price tolerance at ' + d.pct.toFixed(1) + '%: ' + d.touch + ' of 200 invoices posted on their own, ' +
        d.person + ' went to a person, ' + d.slip + ' problems slipped through.';
    }
    if (key === 'handover') {
      return d.done === 3 ? 'Passed the handover test: changed a tolerance, added an escalation rule and explained a decision.'
        : d.done + ' of 3 handover tasks done.';
    }
    if (key === 'documents') {
      var docs = 'Worked through ' + d.docs + ' of 6 documents. ';
      if (!d.wrong) return docs + 'Nothing on those was wrong. The hard ones are further along.';
      return docs + 'Of the ' + d.wrong + (d.wrong === 1 ? ' field that was' : ' fields that were') + ' actually wrong, you would have checked ' +
        d.youCaught + ' and the agent flagged ' + d.agentCaught + ' at a ' + d.threshold + '% review threshold.';
    }
    return null;
  }

  /* ------------------------------------------------- copy the sheet */
  /* Plain text a visitor can paste into a post or a message: the lesson
     first, in the visitor's own numbers, then where it came from, the link
     last. "/" separators and no emoji: a post sets them in a proportional
     font, and coloured squares would bring in colour that means nothing */
  function lead(key, d) {
    if (key === 'hub') {
      return "One word in an invoice agent's config stopped " + money(d.word) + ' of duplicate payments. Moving its price tolerance all the way from 0% to 15% changed what got paid wrong by ' + money(d.whole) + '.';
    }
    if (key === 'tolerance') {
      var mine = 'My ' + d.pct.toFixed(1) + '% line ';
      if (d.over === 0) return mine + 'caught all ' + d.overAll + ' overbilled invoices. ' + d.fine + (d.fine === 1 ? ' invoice that was fine' : ' invoices that were fine') + ' went to a person as well.';
      if (d.over === 1) return mine + 'let 1 overbilled invoice through: ' + d.nearId + ', ' + d.nearVar.toFixed(1) + '% over the PO.';
      if (d.over > 1) return mine + 'let ' + d.over + ' overbilled invoices through. The widest line on the slider that catches them all is ' + d.safe.toFixed(1) + '%, just under ' + d.nearId + ' at ' + d.nearVar.toFixed(1) + '%.';
      return 'At my ' + d.pct.toFixed(1) + '% line, ' + d.slip + ' problem invoices got paid.';
    }
    if (key === 'handover') {
      return "I changed a tolerance and added an escalation rule to an invoice agent myself, and found out from its log why one invoice went to a person. If a team can't do that, the build isn't finished.";
    }
    if (key === 'documents') {
      return 'The agent was ' + d.trapConf + '% sure of a field, and it was wrong. Confidence is not the same as correct.';
    }
    return '';
  }
  function detail(key, d) {
    if (key === 'tolerance') {
      return d.touch + ' of 200 posted on their own and ' + d.person + ' went to a person.' +
        (d.dups ? ' ' + d.dups + ' duplicates got paid at every line: no price tolerance can see a duplicate.' : '');
    }
    if (key === 'documents' && d.wrong) {
      return 'Of the ' + d.wrong + (d.wrong === 1 ? ' field that was' : ' fields that were') + ' wrong, I would have checked ' + d.youCaught +
        '. The agent flagged ' + d.agentCaught + ' at a ' + d.threshold + '% review line.';
    }
    return '';
  }
  function sheetText(key) {
    var data = load();
    var lines = [];
    /* share text carries only lessons the visitor has earned */
    if (key === 'run') {
      STAGES.forEach(function (s) { if (earned(s.key, data[s.key])) lines.push(lead(s.key, data[s.key])); });
      lines.push('', 'THE UNWIRED LAB / ' + lines.length + (lines.length === 1 ? ' SHEET' : ' SHEETS') + ' / Illustrative, the same for everyone');
      lines.push(SITE + 'lab.html');
      return lines.join('\n');
    }
    var s = STAGES.filter(function (x) { return x.key === key; })[0];
    var d = data[key];
    if (!s || !earned(key, d)) return '';
    lines.push(lead(key, d));
    var more = detail(key, d);
    if (more) lines.push(more);
    var src = key === 'documents' ? 'Illustrative documents, the same six for everyone' : 'Illustrative queue, the same 200 invoices for everyone';
    lines.push('', 'THE UNWIRED LAB / SHEET ' + s.num + ' / ' + s.name.toUpperCase() + ' / ' + src);
    lines.push(SITE + s.href.replace(/#.*$/, ''));
    return lines.join('\n');
  }

  /* the fallback box: sized to its text, all of it selected, first line in view */
  function fill(box, text) {
    box.value = text;
    box.style.height = 'auto';
    box.style.height = (box.scrollHeight + 2) + 'px';
    if (document.activeElement === box) box.setSelectionRange(0, text.length, 'backward');
    box.scrollTop = 0;
  }

  function copySheet(btn) {
    var key = btn.getAttribute('data-lab-copy');
    var row = btn.closest('.lab-copy-row') || btn.parentNode;
    var status = row.querySelector('.lab-copy__status');
    var text = sheetText(key);
    if (!text) return;
    function say(msg) { if (status) status.textContent = msg; }
    function fallback() {
      /* the browser refused the clipboard: show the text, selected, so the
         visitor can copy it themselves */
      var box = row.parentNode.querySelector('.lab-copy__text');
      if (!box) {
        box = document.createElement('textarea');
        box.className = 'lab-copy__text';
        box.readOnly = true;
        box.setAttribute('aria-label', 'Your sheet as text');
        row.parentNode.insertBefore(box, row.nextSibling);
      }
      box.hidden = false;
      fill(box, text);
      /* focus without letting the browser scroll to the caret, then bring the
         whole box into view below the sticky bars, first line first */
      box.focus({ preventScroll: true });
      fill(box, text);
      var r = box.getBoundingClientRect();
      var bar = document.querySelector('.lab-stagebar');
      var under = bar ? bar.getBoundingClientRect().bottom : 0;
      if (r.top < under || r.bottom > window.innerHeight) box.scrollIntoView({ block: 'start' });
      say('Copying was blocked here. The text is selected below: copy it yourself.');
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say('Copied. Paste it anywhere.'); }, fallback);
      } else fallback();
    } catch (e) { fallback(); }
  }

  /* ------------------------------------------------- render */
  function render() {
    var data = load();
    var any = false;
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-run]'), function (box) {
      var list = box.querySelector('[data-lab-run-list]');
      var send = box.querySelector('[data-lab-run-send]');
      if (!list) return;
      list.innerHTML = '';
      var some = false;
      STAGES.forEach(function (s) {
        var text = sentence(s.key, data[s.key]);
        if (text) some = true;
        var li = document.createElement('li');
        li.className = 'lab-run__row' + (text ? ' is-done' : '');
        var num = document.createElement('span');
        num.className = 'lab-run__num';
        num.textContent = s.num;
        var body = document.createElement('span');
        var name = document.createElement('strong');
        name.textContent = s.name + '. ';
        body.appendChild(name);
        if (text) {
          body.appendChild(document.createTextNode(text));
        } else {
          body.appendChild(document.createTextNode('Not tried yet. '));
          var a = document.createElement('a');
          a.href = s.href;
          a.setAttribute('data-wipe-link', '');
          a.textContent = s.key === 'hub' ? 'Make the call' : 'Open stage ' + s.num;
          body.appendChild(a);
        }
        li.appendChild(num);
        li.appendChild(body);
        list.appendChild(li);
      });
      if (send) send.hidden = !some;
      any = any || some;
      /* an empty run is not shown at all: no list of blanks, no sign pad */
      var sec = box.closest('#your-run') || box;
      var was = sec.hidden;
      sec.hidden = !some;
      if (was && some && refitPad) setTimeout(refitPad, 0);
    });

    /* lessons, stamped once earned */
    STAGES.forEach(function (s) {
      var on = earned(s.key, data[s.key]);
      Array.prototype.forEach.call(document.querySelectorAll('[data-lab-earned="' + s.key + '"]'), function (n) { n.hidden = !on; });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-copy]'), function (b) {
      var k = b.getAttribute('data-lab-copy');
      var ok = k === 'run' ? STAGES.some(function (s) { return earned(s.key, data[s.key]); }) : earned(k, data[k]);
      var row = b.closest('.lab-copy-row');
      (row || b).hidden = !ok;
      /* a fallback box already open must not keep an older run's numbers */
      var box = row && row.parentNode.querySelector('.lab-copy__text');
      if (box && !box.hidden) fill(box, sheetText(k));
    });

    paintSignatures();
  }

  /* pre-fill the contact form, then let site.js open it as usual */
  function message() {
    var data = load();
    var lines = ['From the Lab:'];
    STAGES.forEach(function (s) {
      var t = sentence(s.key, data[s.key]);
      if (t) lines.push('- ' + s.num + ' ' + s.name + ': ' + t);
    });
    var sig = signature();
    if (sig) lines.push('- Signed the sheet' + (sig.text ? ' as ' + sig.text : '') + '.');
    lines.push('', 'The process I would like to try this on: ');
    return lines.join('\n');
  }

  function start() {
    try { initPad(); } catch (e) { if (window.console) console.error('[unwired] lab signature failed', e); }
    render();
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-run-send]'), function (b) {
      b.addEventListener('click', function () {
        /* the message is filled in; site.js opens the dialog with the
           focus on Name, which the visitor still has to give us */
        var f = document.getElementById('f-msg');
        if (f) f.value = message();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-copy]'), function (b) {
      b.addEventListener('click', function () { copySheet(b); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
