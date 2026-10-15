/* The Unwired — the Lab run.
   Shared by every Lab page. Each stage records what the visitor did with
   UnwiredLab.save(stage, data); the "Your run" panel reads it back and can
   pre-fill the contact form with it.

   Stored in sessionStorage only: it lives for this tab and is gone when the
   tab closes. Nothing is sent anywhere. Every read and write is guarded, so
   a blocked storage leaves the panel showing "not tried yet", never broken. */
(function () {
  'use strict';

  var KEY = 'unwired-lab-run';

  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(stage, data) {
    var all = load();
    all[stage] = data;
    try { sessionStorage.setItem(KEY, JSON.stringify(all)); } catch (e) { /* private mode: the panel just stays empty */ }
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
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-stamp]'), function (st) { st.hidden = !sig; });
  }

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
      canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      redraw();
    }
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
    { key: 'tolerance', num: '01', name: 'Set the line', href: 'lab-tolerance.html' },
    { key: 'handover', num: '02', name: 'Pass the handover', href: 'lab-handover.html' },
    { key: 'documents', num: '03', name: 'Worst-document bench', href: 'lab-documents.html' }
  ];

  /* one plain sentence per stage, used on the page and in the message */
  function sentence(key, d) {
    if (!d) return null;
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
      return docs + 'Of the ' + d.wrong + (d.wrong === 1 ? ' field' : ' fields') + ' that were actually wrong, you would have checked ' +
        d.youCaught + ' and the agent flagged ' + d.agentCaught + ' at a ' + d.threshold + '% review threshold.';
    }
    return null;
  }

  function render() {
    var data = load();
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-run]'), function (box) {
      var list = box.querySelector('[data-lab-run-list]');
      var send = box.querySelector('[data-lab-run-send]');
      if (!list) return;
      list.innerHTML = '';
      var any = false;
      STAGES.forEach(function (s) {
        var text = sentence(s.key, data[s.key]);
        if (text) any = true;
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
          a.textContent = 'Open stage ' + s.num;
          body.appendChild(a);
        }
        li.appendChild(num);
        li.appendChild(body);
        list.appendChild(li);
      });
      if (send) send.hidden = !any;
    });
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
    render();
    paintSignatures();
    try { initPad(); } catch (e) { if (window.console) console.error('[unwired] lab signature failed', e); }
    Array.prototype.forEach.call(document.querySelectorAll('[data-lab-run-send]'), function (b) {
      b.addEventListener('click', function () {
        /* the message is filled in; site.js opens the dialog with the
           focus on Name, which the visitor still has to give us */
        var f = document.getElementById('f-msg');
        if (f) f.value = message();
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
