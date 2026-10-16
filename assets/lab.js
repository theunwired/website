/* The Unwired — the Lab.
   Two tools on one synthetic queue of 200 invoices, run entirely in the
   browser. Nothing here touches the network.

   01 Tolerance Lab: one slider, the price-variance tolerance. Watch what
      posts on its own, what goes to a person, and what slips through.
   02 The handover test: the agent's rules as a plain config the visitor
      edits. The queue reruns on every valid change, and three tasks tick
      off as the visitor does what a client team does before handover.

   The queue is seeded, so every visitor sees the same 200 invoices and the
   numbers on the page are reproducible. They are illustrative, not
   measured, and the page says so. */
(function () {
  'use strict';

  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ---------------------------------------------------------- the queue */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var VENDORS = ['Kestrel Freight', 'Brightwater Supply', 'Corvid Logistics', 'Fenwick Metals',
    'Larkspur Office', 'Meridian Cold Chain', 'Northgate Fasteners', 'Pellham Industrial',
    'Quarry Lane Print', 'Redfern Chemicals', 'Sable Packaging', 'Tamsin Electrical'];
  var NEW_VENDORS = ['Halden Packaging', 'Ostrava Tooling'];
  var LEGIT = ['freight surcharge on the invoice, not on the po', 'rounding across 40 line items',
    'fx rate on the invoice date, po raised in usd', 'fuel surcharge per the contract schedule',
    'unit price updated after the po, contract allows it'];
  var BAD = ['unit price above the contract rate', 'line billed twice inside one invoice',
    'quantity billed above the goods receipt', 'expired discount not applied'];

  function buildQueue() {
    var r = mulberry32(40912);
    var pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var amount = function () {
      /* log-normal-ish: most invoices a few thousand, a long tail to ~60k */
      var v = Math.exp(7.9 + (r() + r() + r() - 1.5) * 1.9);
      return Math.max(180, Math.min(62000, Math.round(v / 10) * 10));
    };
    /* 124 exact matches, 50 explained variances, 20 overbills, 6 from new
       vendors; then up to 10 duplicates of earlier matches are spliced in.
       After the cut to 200, the queue holds 19 overbills and 9 duplicates */
    var plan = [];
    var i;
    for (i = 0; i < 124; i++) plan.push('match');
    for (i = 0; i < 50; i++) plan.push('legit');
    for (i = 0; i < 20; i++) plan.push('overbill');
    for (i = 0; i < 6; i++) plan.push('newvendor');
    for (i = plan.length - 1; i > 0; i--) {
      var j = Math.floor(r() * (i + 1)), t = plan[i]; plan[i] = plan[j]; plan[j] = t;
    }
    var out = [];
    plan.forEach(function (kind) {
      var inv = { vendor: pick(VENDORS), amount: amount(), variance: 0, kind: kind,
        problem: false, newVendor: false, note: 'po, receipt and invoice agree' };
      if (kind === 'legit') {
        /* explained variances sit mostly under 4%, a few run higher */
        inv.variance = Math.round(Math.min(9.5, 0.2 + Math.pow(r(), 2.2) * 9) * 10) / 10;
        inv.note = pick(LEGIT);
      } else if (kind === 'overbill') {
        inv.variance = Math.round((2.5 + Math.pow(r(), 0.9) * 20) * 10) / 10;
        inv.problem = true;
        inv.note = pick(BAD);
      } else if (kind === 'newvendor') {
        inv.vendor = pick(NEW_VENDORS);
        inv.newVendor = true;
        inv.variance = r() < 0.5 ? 0 : Math.round(r() * 3 * 10) / 10;
        inv.note = inv.variance ? pick(LEGIT) : 'po, receipt and invoice agree';
      }
      out.push(inv);
    });
    /* duplicates: same vendor, amount and po as a match earlier in the queue,
       with no variance at all. Tolerance can never see these */
    for (i = 0; i < 10; i++) {
      var at = 30 + Math.floor(r() * 165);
      var src = null;
      for (var k = at - 1; k >= 0; k--) { if (out[k].kind === 'match' && !out[k].dupTarget) { src = out[k]; break; } }
      if (!src) continue;
      src.dupTarget = true;
      out.splice(at, 0, { vendor: src.vendor, amount: src.amount, variance: 0, kind: 'duplicate',
        problem: true, newVendor: false, dupOf: src, note: 'same vendor, amount and po as an earlier invoice' });
    }
    out.length = 200;
    out.forEach(function (inv, n) {
      inv.n = n;
      inv.id = 'INV-' + (40101 + n);
      inv.po = 'PO ' + (88100 + Math.floor(mulberry32(n + 7)() * 800));
    });
    out.forEach(function (inv) { if (inv.dupOf) inv.po = inv.dupOf.po; });
    return out;
  }

  /* ------------------------------------------------------------ the rules */
  var DEFAULTS = {
    price_tolerance_pct: 5,
    auto_post_max_amount: 25000,
    hold_duplicates: true,
    new_vendor_review: true,
    always_escalate_vendor: []
  };

  function money(v) { return '$' + Math.round(v).toLocaleString('en-US'); }
  function pct(v) { return v.toFixed(1) + '%'; }

  function decide(inv, cfg) {
    if (cfg.hold_duplicates && inv.dupOf) {
      return { to: 'person', rule: 'hold_duplicates',
        why: 'same vendor, amount and ' + inv.po + ' as ' + inv.dupOf.id + '. held as a suspected duplicate' };
    }
    if (cfg.always_escalate_vendor.indexOf(inv.vendor.toLowerCase()) !== -1) {
      return { to: 'person', rule: 'always_escalate_vendor',
        why: inv.vendor + ' is on the always-escalate list' };
    }
    if (inv.amount > cfg.auto_post_max_amount) {
      return { to: 'person', rule: 'auto_post_max_amount',
        why: money(inv.amount) + ' is above the auto-post ceiling of ' + money(cfg.auto_post_max_amount) };
    }
    if (cfg.new_vendor_review && inv.newVendor) {
      return { to: 'person', rule: 'new_vendor_review',
        why: 'first invoices from a new vendor go to a person' };
    }
    if (inv.variance > cfg.price_tolerance_pct) {
      return { to: 'person', rule: 'price_tolerance_pct',
        why: 'price ' + pct(inv.variance) + ' over po, outside the ' + pct(cfg.price_tolerance_pct) + ' tolerance' };
    }
    return { to: 'post', rule: inv.variance ? 'price_tolerance_pct' : null,
      why: inv.variance ? 'price ' + pct(inv.variance) + ' over po, inside the ' + pct(cfg.price_tolerance_pct) + ' tolerance'
        : 'po, receipt and invoice agree' };
  }

  /* posted clean, slipped through, sent to a person, caught */
  function outcome(inv, d) {
    if (d.to === 'post') return inv.problem ? 'slip' : 'post';
    return inv.problem ? 'caught' : 'person';
  }

  function runQueue(queue, cfg) {
    var res = { post: 0, person: 0, caught: 0, slip: 0, slipValue: 0, rows: [] };
    queue.forEach(function (inv) {
      var d = decide(inv, cfg), o = outcome(inv, d);
      res[o]++;
      if (o === 'slip') res.slipValue += inv.amount * (inv.kind === 'duplicate' ? 1 : inv.variance / (100 + inv.variance));
      res.rows.push({ inv: inv, d: d, o: o });
    });
    return res;
  }

  /* --------------------------------------------------- 01 Tolerance Lab */
  var NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  var LABEL = { post: 'Posted on its own', person: 'Sent to a person', caught: 'Caught, a person checks it', slip: 'Slipped through' };

  function initTolerance(queue) {
    var root = q('[data-lab-tolerance]');
    if (!root) return;
    var range = q('[data-lab-range]', root);
    var readout = q('[data-lab-readout]', root);
    var chartBox = q('[data-lab-chart]', root);
    var tip = q('[data-lab-tip]', root);
    var summary = q('[data-lab-summary]', root);
    var cfg = { price_tolerance_pct: 5, auto_post_max_amount: Infinity, hold_duplicates: false,
      new_vendor_review: false, always_escalate_vendor: [] };
    var marks = [];
    var svg, line, lineLabel, layout, dims;
    /* a visitor coming back finds their own line, not the default. "released"
       is set once they let go of the line, which earns the lesson and lets the
       summary name the duplicates. Nothing is saved on load */
    var prev = window.UnwiredLab ? window.UnwiredLab.load().tolerance : null;
    var released = !!(prev && prev.done);
    if (prev && isFinite(prev.pct)) range.value = prev.pct;

    function build() {
      var narrow = chartBox.clientWidth < 620;
      var bin = narrow ? 1 : 0.5;
      var maxV = 24;
      var bins = Math.round(maxV / bin);
      var counts = [];
      var zero = [];
      queue.forEach(function (inv) {
        if (inv.variance === 0) { zero.push(inv); return; }
        var b = Math.min(bins - 1, Math.floor(inv.variance / bin));
        (counts[b] = counts[b] || []).push(inv);
      });
      var rows = Math.max(12, counts.reduce(function (m, c) { return Math.max(m, c ? c.length : 0); }, 0));
      var zcols = Math.ceil(zero.length / rows);
      var S = 8, G = 2, P = S + G;
      var left = 4, top = 26, gap = 22;
      var x0 = left + zcols * P + gap;
      var W = x0 + bins * P + 6;
      var H = top + rows * P + 78;
      layout = { x0: x0, bin: bin, P: P, top: top, rows: rows, H: H, W: W };

      chartBox.innerHTML = '';
      svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'class': 'lab-chart__svg' });
      chartBox.appendChild(svg);

      /* the exact-match block, then one column per variance bin */
      var base = top + rows * P;
      svg.appendChild(svgEl('line', { x1: 0, x2: W, y1: base + 1, y2: base + 1, 'class': 'lab-axis' }));
      marks = [];
      zero.forEach(function (inv, k) {
        var c = Math.floor(k / rows), rr = k % rows;
        marks.push(mark(inv, left + c * P, base - (rr + 1) * P, S));
      });
      counts.forEach(function (col, b) {
        if (!col) return;
        col.sort(function (a, c) { return a.variance - c.variance; });
        col.forEach(function (inv, k) { marks.push(mark(inv, x0 + b * P, base - (k + 1) * P, S)); });
      });
      var t1 = svgEl('text', { x: left, y: base + 18, 'class': 'lab-tick' });
      /* the block is narrower on a phone, so the label gets shorter with it */
      t1.textContent = (narrow ? 'MATCH · ' : 'EXACT MATCH · ') + zero.length;
      svg.appendChild(t1);
      for (var v = 0; v <= maxV; v += narrow ? 6 : 4) {
        /* the first tick starts at its bin, the last ends there, so neither
           hangs past the edge of the chart */
        var anchor = v === 0 ? 'start' : (v + (narrow ? 6 : 4) > maxV ? 'end' : 'middle');
        var tx = svgEl('text', { x: x0 + (v / bin) * P, y: base + 18, 'class': 'lab-tick', 'text-anchor': anchor });
        tx.textContent = v + '%';
        svg.appendChild(tx);
      }
      var cap = svgEl('text', { x: x0, y: base + 34, 'class': 'lab-tick lab-tick--quiet' });
      cap.textContent = 'PRICE VARIANCE AGAINST THE PO';
      svg.appendChild(cap);

      /* dimension lines: what posts on its own spans left of the line,
         what goes to a person spans right of it */
      var dy = base + 56;
      dims = {
        left: svgEl('path', { 'class': 'lab-dim' }), right: svgEl('path', { 'class': 'lab-dim' }),
        lText: svgEl('text', { y: dy + 16, 'class': 'lab-dim__label', 'text-anchor': 'middle' }),
        rText: svgEl('text', { y: dy + 16, 'class': 'lab-dim__label', 'text-anchor': 'middle' }),
        y: dy, x0: left, x1: W - 6
      };
      [dims.left, dims.right, dims.lText, dims.rText].forEach(function (n) { svg.appendChild(n); });

      line = svgEl('line', { y1: 10, y2: base + 4, 'class': 'lab-line' });
      lineLabel = svgEl('text', { y: 14, 'class': 'lab-line__label' });
      svg.appendChild(line);
      svg.appendChild(lineLabel);
      paint();
    }

    function mark(inv, x, y, S) {
      var g = svgEl('g', { 'data-i': inv.n, 'class': 'lab-mark' });
      var hit = svgEl('rect', { x: x - 1, y: y - 1, width: S + 2, height: S + 2, 'class': 'lab-mark__hit' });
      var sq = svgEl('rect', { x: x + 0.5, y: y + 0.5, width: S - 1, height: S - 1 });
      g.appendChild(hit); g.appendChild(sq);
      svg.appendChild(g);
      return { g: g, sq: sq, inv: inv, cx: x + S / 2, cy: y + S / 2 };
    }

    var last;
    function paint() {
      cfg.price_tolerance_pct = parseFloat(range.value);
      readout.textContent = pct(cfg.price_tolerance_pct);
      range.setAttribute('aria-valuetext', pct(cfg.price_tolerance_pct) + ' price tolerance');
      var res = runQueue(queue, cfg);
      last = res;
      marks.forEach(function (m) {
        var o = res.rows[m.inv.n].o;
        m.g.setAttribute('class', 'lab-mark lab-mark--' + o);
        /* slipped marks turn into diamonds, so state never rests on colour */
        m.sq.setAttribute('transform', o === 'slip' ? 'rotate(45 ' + m.cx + ' ' + m.cy + ')' : '');
      });
      var lx = layout.x0 + (cfg.price_tolerance_pct / layout.bin) * layout.P - 1;
      line.setAttribute('x1', lx); line.setAttribute('x2', lx);
      lineLabel.textContent = 'YOUR LINE · ' + pct(cfg.price_tolerance_pct);
      /* flip the label to the left of the line when it would run off the edge */
      var flip = lx + 6 + lineLabel.getComputedTextLength() > layout.W;
      lineLabel.setAttribute('x', flip ? lx - 6 : lx + 6);
      lineLabel.setAttribute('text-anchor', flip ? 'end' : 'start');

      if (dims) {
        var y = dims.y, t = 6;
        dims.left.setAttribute('d', 'M' + dims.x0 + ' ' + y + ' H' + lx + ' M' + dims.x0 + ' ' + (y - t) + ' V' + (y + t));
        dims.right.setAttribute('d', 'M' + lx + ' ' + y + ' H' + dims.x1 + ' M' + lx + ' ' + (y - t) + ' V' + (y + t) + ' M' + dims.x1 + ' ' + (y - t) + ' V' + (y + t));
        fitLabel(dims.lText, (dims.x0 + lx) / 2, lx - dims.x0, (res.post + res.slip) + ' POST ON THEIR OWN', String(res.post + res.slip));
        fitLabel(dims.rText, (lx + dims.x1) / 2, dims.x1 - lx, (res.person + res.caught) + ' TO A PERSON', String(res.person + res.caught));
      }
      setStat(root, 'post', res.post + res.slip);
      setStat(root, 'person', res.person + res.caught);
      setStat(root, 'caught', res.caught);
      setStat(root, 'slip', res.slip);
      var dups = res.rows.filter(function (r) { return r.o === 'slip' && r.inv.kind === 'duplicate'; }).length;
      var touch = res.post + res.slip;
      var text = 'At ' + pct(cfg.price_tolerance_pct) + ', ' + touch + ' of 200 invoices post with no one touching them. ' +
        (res.person + res.caught) + ' go to a person, and ' + res.person + ' of those were fine. ' +
        res.slip + ' problems slip through, about ' + money(res.slipValue) + ' paid that should not have been.';
      if (dups && released) text += ' ' + dups + ' of them are duplicates with no variance at all. No tolerance can see those. That takes a rule, which is the next tool.';
      else if (dups) text += ' Drag the line, then let go. Which ones still get paid?';
      summary.textContent = text;
      svg.setAttribute('aria-label', 'Dot chart of 200 synthetic invoices by price variance. ' + text);
    }

    /* the long label if the span holds it, the bare number if not */
    function fitLabel(node, cx, span, long, short) {
      node.setAttribute('x', cx);
      node.textContent = long;
      if (node.getComputedTextLength() > span - 10) node.textContent = short;
    }

    function setStat(scope, key, n) {
      var el = q('[data-lab-stat="' + key + '"]', scope);
      if (!el) return;
      q('[data-num]', el).textContent = n;
      var sub = q('[data-sub]', el);
      if (sub && key === 'post') sub.textContent = Math.round(n / 2) + '% of the queue, nobody looked';
    }

    /* per-mark tooltip: hover on desktop, tap on touch */
    function showTip(e) {
      var g = e.target.closest ? e.target.closest('.lab-mark') : null;
      if (!g) { tip.hidden = true; return; }
      var row = last.rows[+g.getAttribute('data-i')];
      var inv = row.inv;
      tip.innerHTML = '';
      var h = document.createElement('strong');
      h.textContent = inv.id + ' · ' + inv.vendor;
      var a = document.createElement('span');
      a.textContent = money(inv.amount) + ' · ' + (inv.variance ? pct(inv.variance) + ' over po' : 'no variance');
      var b = document.createElement('span');
      b.textContent = LABEL[row.o];
      b.className = 'lab-tip__state lab-tip__state--' + row.o;
      var c = document.createElement('span');
      c.textContent = 'what it was: ' + inv.note;
      tip.appendChild(h); tip.appendChild(a); tip.appendChild(b); tip.appendChild(c);
      tip.hidden = false;
      var box = chartBox.getBoundingClientRect();
      var r = g.getBoundingClientRect();
      var x = r.left - box.left + r.width / 2;
      var tw = tip.offsetWidth;
      tip.style.left = Math.max(0, Math.min(box.width - tw, x - tw / 2)) + 'px';
      tip.style.top = (r.top - box.top - tip.offsetHeight - 10) + 'px';
    }
    chartBox.addEventListener('mousemove', showTip);
    chartBox.addEventListener('click', showTip);
    chartBox.addEventListener('mouseleave', function () { tip.hidden = true; });

    /* record only what the visitor chose, never the default on page load.
       "done" is set when they let go of the line, which earns the lesson */
    function record() {
      if (!window.UnwiredLab) return;
      var dups = last.rows.filter(function (r) { return r.o === 'slip' && r.inv.kind === 'duplicate'; }).length;
      window.UnwiredLab.save('tolerance', { pct: cfg.price_tolerance_pct, touch: last.post + last.slip,
        person: last.person + last.caught, slip: last.slip, dups: dups, money: Math.round(last.slipValue), done: released });
    }
    range.addEventListener('input', function () { paint(); record(); });
    range.addEventListener('change', function () { released = true; paint(); record(); });
    var w = 0;
    window.addEventListener('resize', function () {
      if (Math.abs(chartBox.clientWidth - w) < 40) return;
      w = chartBox.clientWidth; build();
    });
    w = chartBox.clientWidth;
    build();
  }

  /* -------------------------------------------------- 02 Handover test */
  var KEYS = {
    price_tolerance_pct: 'number',
    auto_post_max_amount: 'number',
    hold_duplicates: 'bool',
    new_vendor_review: 'bool',
    always_escalate_vendor: 'vendor'
  };

  /* the handover config. When the visitor drew a line on sheet 01, it
     arrives here as their own value, marked as theirs */
  function defaultText(pct, carried) {
    return [
      '# escalation rules · ap exceptions',
      '# your team owns this file. change a line and the queue reruns.',
      '',
      '# post on its own when the price is within this % of the po',
      carried ? '# from sheet 01: the line you drew' : null,
      'price_tolerance_pct: ' + String(pct),
      '',
      '# anything above this amount always goes to a person',
      'auto_post_max_amount: 25000',
      '',
      '# hold an invoice that matches an earlier one on vendor, amount and po',
      'hold_duplicates: yes',
      '',
      '# first invoices from a vendor we have not paid before',
      'new_vendor_review: yes',
      '',
      '# a vendor whose invoices always go to a person. one line per vendor',
      'always_escalate_vendor: none'
    ].filter(function (l) { return l !== null; }).join('\n');
  }

  function parseConfig(text) {
    var cfg = { always_escalate_vendor: [] };
    var lines = {};
    var vendorLines = {};
    var known = VENDORS.concat(NEW_VENDORS).map(function (v) { return v.toLowerCase(); });
    var src = text.split('\n');
    for (var i = 0; i < src.length; i++) {
      var raw = src[i].replace(/#.*$/, '').trim();
      if (!raw) continue;
      var m = /^([a-z_]+)\s*:\s*(.*)$/i.exec(raw);
      var at = 'Line ' + (i + 1) + ': ';
      if (!m) return { error: at + 'expected "name: value".' };
      var key = m[1].toLowerCase(), val = m[2].trim();
      var type = KEYS[key];
      if (!type) return { error: at + '"' + m[1] + '" is not a rule this agent knows. The rules are ' + Object.keys(KEYS).join(', ') + '.' };
      if (type === 'number') {
        var num = parseFloat(val.replace(/[$,%\s]/g, ''));
        if (!isFinite(num) || num < 0) return { error: at + m[1] + ' needs a number, 0 or more.' };
        if (key === 'price_tolerance_pct' && num > 100) return { error: at + 'a tolerance above 100% means nothing is ever checked.' };
        cfg[key] = num;
      } else if (type === 'bool') {
        var b = val.toLowerCase();
        if (['yes', 'true', 'on'].indexOf(b) !== -1) cfg[key] = true;
        else if (['no', 'false', 'off'].indexOf(b) !== -1) cfg[key] = false;
        else return { error: at + m[1] + ' needs yes or no.' };
      } else {
        var vs = val.toLowerCase();
        if (vs === 'none' || vs === '') { lines[key] = i + 1; continue; }
        var list = vs.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        for (var k = 0; k < list.length; k++) {
          if (known.indexOf(list[k]) === -1) {
            return { error: at + 'no vendor called "' + list[k] + '" in this queue. Try ' + VENDORS[0] + ' or ' + VENDORS[3] + '.' };
          }
          if (cfg.always_escalate_vendor.indexOf(list[k]) === -1) cfg.always_escalate_vendor.push(list[k]);
          /* one vendor per line is the advice, so credit each to its own line */
          if (!vendorLines[list[k]]) vendorLines[list[k]] = i + 1;
        }
      }
      lines[key] = i + 1;
    }
    for (var key2 in KEYS) {
      if (KEYS[key2] !== 'vendor' && cfg[key2] === undefined) return { error: 'Missing ' + key2 + '. Every rule needs a value, even if it is the default.' };
    }
    cfg.lines = lines;
    cfg.vendorLines = vendorLines;
    return { cfg: cfg };
  }

  function initHandover(queue) {
    var root = q('[data-lab-handover]');
    if (!root) return;
    var editor = q('[data-lab-config]', root);
    var status = q('[data-lab-status]', root);
    var logBox = q('[data-lab-log]', root);
    var find = q('[data-lab-find]', root);
    var filterBtns = qa('[data-lab-filter]', root);
    var resetBtn = q('[data-lab-reset]', root);
    var done = q('[data-lab-done]', root);
    var why = q('[data-lab-why]', root);
    var prior = window.UnwiredLab ? window.UnwiredLab.load().tolerance : null;
    var carried = !!(prior && isFinite(prior.pct));
    var startPct = carried ? prior.pct : DEFAULTS.price_tolerance_pct;
    function shipped() { return defaultText(startPct, carried); }
    var startCfg = {};
    for (var dk in DEFAULTS) startCfg[dk] = DEFAULTS[dk];
    startCfg.price_tolerance_pct = startPct;
    var base = runQueue(queue, startCfg);
    var cfg = parseConfig(shipped()).cfg;
    var res = runQueue(queue, cfg);
    var filter = 'person';
    var openId = null;
    var limit = 40;

    /* the third task names a real escalation from the shipped config: the
       first invoice the amount ceiling sent to a person */
    var target = base.rows.filter(function (r) { return r.d.rule === 'auto_post_max_amount'; })[0] ||
      base.rows.filter(function (r) { return r.d.to === 'person'; })[0];
    qa('[data-lab-target]', root).forEach(function (el) { el.textContent = target.inv.id; });
    var tasks = { tolerance: false, rule: false, find: false };

    editor.value = shipped();

    function apply() {
      var p = parseConfig(editor.value);
      if (p.error) {
        status.className = 'lab-status lab-status--bad';
        status.textContent = 'NOT APPLIED · ' + p.error + ' The agent keeps running on the last valid version.';
        editor.setAttribute('aria-invalid', 'true');
        return;
      }
      editor.removeAttribute('aria-invalid');
      cfg = p.cfg;
      res = runQueue(queue, cfg);
      status.className = 'lab-status lab-status--ok';
      status.textContent = 'APPLIED · the queue reran on your rules.';
      if (cfg.price_tolerance_pct !== startPct || cfg.auto_post_max_amount !== DEFAULTS.auto_post_max_amount) tick('tolerance');
      if (cfg.always_escalate_vendor.length) tick('rule');
      stats();
      render();
    }

    function delta(n, b) {
      var d = n - b;
      return d === 0 ? 'same as handover' : (d > 0 ? '+' : '') + d + ' vs handover';
    }

    function stats() {
      var map = { post: [res.post + res.slip, base.post + base.slip], person: [res.person + res.caught, base.person + base.caught], slip: [res.slip, base.slip] };
      Object.keys(map).forEach(function (k) {
        var el = q('[data-lab-hstat="' + k + '"]', root);
        if (!el) return;
        q('[data-num]', el).textContent = map[k][0];
        q('[data-sub]', el).textContent = delta(map[k][0], map[k][1]);
      });
      explain();
    }

    /* why the slips dropped: the same line with no rules, as on sheet 01,
       against the rules in the file now. Each held problem is credited to
       the rule that held it, by its line in the visitor's config */
    function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
    function explain() {
      if (!why) return;
      var lineOnly = runQueue(queue, { price_tolerance_pct: cfg.price_tolerance_pct, auto_post_max_amount: Infinity,
        hold_duplicates: false, new_vendor_review: false, always_escalate_vendor: [] });
      var held = {}, order = [];
      lineOnly.rows.forEach(function (r, i) {
        var now = res.rows[i];
        if (r.o !== 'slip' || now.o !== 'caught') return;
        var rule = now.d.rule;
        var at = rule === 'always_escalate_vendor' ? cfg.vendorLines[now.inv.vendor.toLowerCase()] : cfg.lines[rule];
        var key = rule + '@' + at;
        if (!held[key]) { held[key] = { rule: rule, line: at, n: 0, dups: true }; order.push(key); }
        held[key].n++;
        if (now.inv.kind !== 'duplicate') held[key].dups = false;
      });
      var p = pct(cfg.price_tolerance_pct);
      var mine = carried || cfg.price_tolerance_pct !== startPct ? 'your line' : 'the line';
      var text = 'With only a line, as on sheet 01, ' + (lineOnly.slip ? plural(lineOnly.slip, 'problem slips', 'problems slip') : 'nothing slips') +
        ' through at ' + p + '. With these rules, ' + (res.slip === 0 ? 'none do.' : res.slip === 1 ? '1 does.' : res.slip + ' do.');
      order.sort(function (a, b) { return (held[a].line || 0) - (held[b].line || 0); });
      var parts = order.map(function (k) {
        var h = held[k];
        return plural(h.n, h.dups ? 'duplicate' : 'problem', h.dups ? 'duplicates' : 'problems') + ' held by <code>' + h.rule + '</code>, line ' + h.line + ' of your config';
      });
      if (parts.length) text += ' ' + parts.join('; ') + '.';
      var left = res.rows.filter(function (r) { return r.o === 'slip'; });
      var d = left.filter(function (r) { return r.inv.kind === 'duplicate'; }).length, o = left.length - d;
      if (left.length === 1) {
        var inv = left[0].inv;
        text += ' Still slipping: ' + inv.id + (d ? ', a duplicate, because <code>hold_duplicates</code> is off.'
          : ', ' + pct(inv.variance) + ' over the PO, inside ' + mine + '.');
      } else if (left.length > 1) {
        var bits = [];
        if (d) bits.push(plural(d, 'duplicate', 'duplicates') + ', because <code>hold_duplicates</code> is off');
        if (o) bits.push(plural(o, 'overbill', 'overbills') + ' inside ' + mine);
        text += ' Still slipping: ' + bits.join(', and ') + '.';
      }
      /* the paragraph is a live region: rewrite it only when it changes */
      if (why.innerHTML !== text) why.innerHTML = text;
    }

    function mark(name) {
      var li = q('[data-lab-task="' + name + '"]', root);
      if (!li) return;
      li.classList.add('is-done');
      /* the visitor did it, so the mark is the pen, not a word */
      var st = q('[data-state]', li);
      st.innerHTML = '<svg class="pen-tick" viewBox="0 0 30 20" role="img" aria-label="Done"><path d="M3 11 L 10 17 L 27 3"/></svg>';
    }
    function tick(name) {
      if (tasks[name]) return;
      tasks[name] = true;
      var n = (tasks.tolerance ? 1 : 0) + (tasks.rule ? 1 : 0) + (tasks.find ? 1 : 0);
      if (window.UnwiredLab) {
        /* a pass already earned in this tab stays earned */
        var had = window.UnwiredLab.load().handover;
        window.UnwiredLab.save('handover', { done: Math.max(n, (had && had.done) || 0) });
      }
      mark(name);
      if (tasks.tolerance && tasks.rule && tasks.find) done.hidden = false;
    }
    /* back after passing: show the pass, without saving anything */
    var passed = window.UnwiredLab ? window.UnwiredLab.load().handover : null;
    if (passed && passed.done === 3) {
      ['tolerance', 'rule', 'find'].forEach(function (k) { tasks[k] = true; mark(k); });
      done.hidden = false;
    }

    function render() {
      var term = find.value.trim().toLowerCase();
      var rows = res.rows.filter(function (r) {
        if (term) return (r.inv.id + ' ' + r.inv.vendor).toLowerCase().indexOf(term) !== -1;
        if (filter === 'all') return true;
        if (filter === 'person') return r.d.to === 'person';
        return r.o === 'slip';
      });
      logBox.innerHTML = '';
      if (!rows.length) {
        var none = document.createElement('p');
        none.className = 'lab-log__empty';
        none.textContent = term ? 'No invoice matches "' + find.value.trim() + '".' : 'Nothing in this view.';
        logBox.appendChild(none);
        return;
      }
      rows.slice(0, term ? 200 : limit).forEach(function (r) { logBox.appendChild(row(r)); });
      if (!term && rows.length > limit) {
        var more = document.createElement('button');
        more.type = 'button';
        more.className = 'lab-more';
        more.textContent = 'Show all ' + rows.length;
        more.addEventListener('click', function () { limit = 200; render(); });
        logBox.appendChild(more);
      }
    }

    function row(r) {
      var inv = r.inv, d = r.d;
      var wrap = document.createElement('div');
      wrap.className = 'lab-row lab-row--' + r.o + (openId === inv.id ? ' is-open' : '');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lab-row__head';
      btn.setAttribute('aria-expanded', openId === inv.id ? 'true' : 'false');
      [['lab-row__id', inv.id], ['lab-row__vendor', inv.vendor], ['lab-row__amt', money(inv.amount)],
       ['lab-row__to', d.to === 'post' ? (r.o === 'slip' ? 'POSTED · WRONG' : 'POSTED') : 'TO A PERSON']]
        .forEach(function (c) { var s = document.createElement('span'); s.className = c[0]; s.textContent = c[1]; btn.appendChild(s); });
      wrap.appendChild(btn);
      if (openId === inv.id) {
        var body = document.createElement('div');
        body.className = 'lab-row__body';
        var lines = [
          ['read', inv.id + ' · ' + inv.vendor + ' · ' + money(inv.amount)],
          ['read', inv.po + ' · goods receipt GR-' + (2200 + inv.n)],
          ['check', inv.variance ? 'price ' + pct(inv.variance) + ' over po' : 'price and quantity match the po'],
          [d.to === 'post' ? 'post' : 'hand', d.why],
          ['rule', d.rule ? d.rule + (cfg.lines[d.rule] ? ' · line ' + cfg.lines[d.rule] + ' of your config' : '') : 'no rule needed, everything agreed'],
          ['truth', 'what it was: ' + inv.note]
        ];
        lines.forEach(function (l) {
          var p = document.createElement('div');
          p.className = 'lab-row__line' + (l[0] === 'truth' ? ' lab-row__line--truth' : '');
          var tag = document.createElement('span'); tag.textContent = l[0];
          var txt = document.createElement('span'); txt.textContent = l[1];
          p.appendChild(tag); p.appendChild(txt);
          body.appendChild(p);
        });
        wrap.appendChild(body);
      }
      btn.addEventListener('click', function () {
        openId = openId === inv.id ? null : inv.id;
        if (openId === target.inv.id) tick('find');
        render();
        var again = q('.lab-row.is-open .lab-row__head', logBox);
        if (again) again.focus();
      });
      return wrap;
    }

    var timer;
    editor.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(apply, 250);
    });
    find.addEventListener('input', function () { limit = 40; render(); });
    filterBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        filter = b.getAttribute('data-lab-filter');
        filterBtns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        limit = 40;
        render();
      });
    });
    resetBtn.addEventListener('click', function () { editor.value = shipped(); apply(); });

    apply();
    status.textContent = carried ? 'APPLIED · your line from sheet 01, with the handover rules. Change any line.'
      : 'APPLIED · the shipped config. Change any line.';
  }

  function start() {
    var queue = buildQueue();
    try { initTolerance(queue); } catch (e) { if (window.console) console.error('[unwired] lab tolerance failed', e); }
    try { initHandover(queue); } catch (e) { if (window.console) console.error('[unwired] lab handover failed', e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
