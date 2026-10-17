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
    /* the bet on this sheet: the widest line that still catches every
       overbill. The nearest overbill decides it, and the widest safe line is
       the last slider step below it */
    var overs = queue.filter(function (inv) { return inv.kind === 'overbill'; }).sort(function (a, b) { return a.variance - b.variance; });
    var nearest = overs[0];
    var safe = Math.floor((nearest.variance - 1e-9) / 0.5) * 0.5;
    var near = null;

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
      var nearTop = top;
      counts.forEach(function (col, b) {
        if (!col) return;
        col.sort(function (a, c) { return a.variance - c.variance; });
        col.forEach(function (inv, k) { marks.push(mark(inv, x0 + b * P, base - (k + 1) * P, S)); });
        if (col.indexOf(nearest) !== -1) nearTop = base - col.length * P;
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

      /* the reveal: a dimension from the line to the nearest overbill,
         drawn only once the visitor has let go */
      var nm = marks.filter(function (m) { return m.inv === nearest; })[0];
      near = { g: svgEl('g', { 'class': 'lab-near' }), cx: nm ? nm.cx : x0, y: Math.max(top + 14, nearTop - 10), narrow: narrow };
      near.path = svgEl('path', { 'class': 'lab-dim' });
      near.text = svgEl('text', { 'class': 'lab-dim__label' });
      near.g.appendChild(near.path); near.g.appendChild(near.text);
      svg.appendChild(near.g);
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
      if (near) {
        near.g.style.display = released ? '' : 'none';
        var ny = near.y, nx = near.cx, tt = 5;
        near.path.setAttribute('d', 'M' + lx + ' ' + ny + ' H' + nx + ' M' + lx + ' ' + (ny - tt) + ' V' + (ny + tt) + ' M' + nx + ' ' + (ny - tt) + ' V' + (ny + tt));
        var caught = cfg.price_tolerance_pct < nearest.variance;
        var gap = Math.abs(nearest.variance - cfg.price_tolerance_pct).toFixed(1);
        near.text.textContent = near.narrow ? nearest.id + ' · ' + gap + (caught ? ' PTS CLEAR' : ' PTS INSIDE')
          : nearest.id + ' · ' + pct(nearest.variance) + ' OVER · ' + (caught ? 'CAUGHT, ' + gap + ' PTS CLEAR' : 'PAID, ' + gap + ' PTS INSIDE THE LINE');
        near.text.setAttribute('class', 'lab-dim__label' + (caught ? '' : ' lab-dim__label--wrong'));
        near.text.setAttribute('y', ny - 7);
        /* sit the label over the span, kept inside the drawing */
        var lw = near.text.getComputedTextLength();
        var lo = Math.min(lx, nx), hi = Math.max(lx, nx);
        var tx2 = Math.max(4, Math.min(layout.W - 4 - lw, (lo + hi) / 2 - lw / 2));
        near.text.setAttribute('x', tx2);
      }
      setStat(root, 'post', res.post + res.slip);
      setStat(root, 'person', res.person + res.caught);
      setStat(root, 'caught', res.caught);
      setStat(root, 'slip', res.slip);
      var dups = res.rows.filter(function (r) { return r.o === 'slip' && r.inv.kind === 'duplicate'; }).length;
      var touch = res.post + res.slip;
      var overPaid = res.rows.filter(function (r) { return r.o === 'slip' && r.inv.kind === 'overbill'; }).length;
      var verdict = '';
      if (released) {
        var at = pct(cfg.price_tolerance_pct);
        if (!overPaid) {
          verdict = 'Every overbill caught at ' + at + '. ' + (cfg.price_tolerance_pct < safe
            ? 'There was room: the nearest, ' + nearest.id + ', is ' + pct(nearest.variance) + ' over the PO, so a ' + pct(safe) + ' line catches them all too. '
            : 'That is the widest line that does it here. One step wider and ' + nearest.id + ', ' + pct(nearest.variance) + ' over the PO, gets paid. ');
        } else {
          verdict = nearest.id + ' got paid: ' + pct(nearest.variance) + ' over the PO, inside your ' + at + ' line. ' +
            (overPaid > 1 ? (overPaid - 1) + ' more overbilled ' + (overPaid === 2 ? 'invoice was' : 'invoices were') + ' paid too. ' : '') +
            'The widest line that catches every overbill here is ' + pct(safe) + '. ';
        }
      }
      var text = verdict + 'At ' + pct(cfg.price_tolerance_pct) + ', ' + touch + ' of 200 invoices post with no one touching them. ' +
        (res.person + res.caught) + ' go to a person, and ' + res.person + ' of those were fine. ' +
        res.slip + ' problems slip through, about ' + money(res.slipValue) + ' paid that should not have been.';
      if (dups && released) text += ' ' + dups + ' of them are duplicates with no variance at all. No tolerance can see those. That takes a rule, which is the next tool.';
      else if (dups) text += ' Find the widest line that still catches every overbill, then let go.';
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
      var over = last.rows.filter(function (r) { return r.o === 'slip' && r.inv.kind === 'overbill'; }).length;
      window.UnwiredLab.save('tolerance', { pct: cfg.price_tolerance_pct, touch: last.post + last.slip,
        person: last.person + last.caught, slip: last.slip, dups: dups, money: Math.round(last.slipValue), done: released,
        over: over, overAll: overs.length, fine: last.person, nearId: nearest.id, nearVar: nearest.variance, safe: safe });
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
    /* the config line behind a decision: a vendor rule is on its vendor's line */
    function ruleLine(rule, inv) {
      return rule === 'always_escalate_vendor' ? cfg.vendorLines[inv.vendor.toLowerCase()] : cfg.lines[rule];
    }
    function explain() {
      if (!why) return;
      var lineOnly = runQueue(queue, { price_tolerance_pct: cfg.price_tolerance_pct, auto_post_max_amount: Infinity,
        hold_duplicates: false, new_vendor_review: false, always_escalate_vendor: [] });
      var held = {}, order = [];
      lineOnly.rows.forEach(function (r, i) {
        var now = res.rows[i];
        if (r.o !== 'slip' || now.o !== 'caught') return;
        var rule = now.d.rule;
        var at = ruleLine(rule, now.inv);
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
        window.UnwiredLab.save('handover', { done: n, tasks: { tolerance: tasks.tolerance, rule: tasks.rule, find: tasks.find } });
      }
      mark(name);
      if (tasks.tolerance && tasks.rule && tasks.find) done.hidden = false;
    }
    /* back for another go: tasks already done in this tab stay done. Shown
       again on load without saving anything */
    var had = window.UnwiredLab ? window.UnwiredLab.load().handover : null;
    if (had) {
      var was = had.tasks || (had.done === 3 ? { tolerance: true, rule: true, find: true } : {});
      ['tolerance', 'rule', 'find'].forEach(function (k) { if (was[k]) { tasks[k] = true; mark(k); } });
      if (tasks.tolerance && tasks.rule && tasks.find) done.hidden = false;
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
          ['rule', d.rule ? d.rule + (ruleLine(d.rule, inv) ? ' · line ' + ruleLine(d.rule, inv) + ' of your config' : '') : 'no rule needed, everything agreed'],
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

  /* ------------------------------------------------ 00 The hub: the bet */
  /* One call on one invoice, a duplicate, then the line over all 200 with
     the duplicate rule written as one word the visitor can strike. Every
     number is the engine's; nothing on this sheet is typed in. */
  function initHub(queue) {
    var bet = q('[data-lab-bet]');
    var root = q('[data-lab-hub]');
    if (!bet && !root) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function load() { return window.UnwiredLab ? (window.UnwiredLab.load().hub || {}) : {}; }
    function store(patch) {
      if (!window.UnwiredLab) return;
      var d = load();
      for (var k in patch) d[k] = patch[k];
      window.UnwiredLab.save('hub', d);
    }
    var dups = queue.filter(function (inv) { return inv.dupOf; });
    /* the invoice on the desk: the largest duplicate whose original was
       posted right before it, so the twin is one invoice earlier */
    var pick = dups.filter(function (inv) { return inv.dupOf.n === inv.n - 1; })
      .sort(function (a, b) { return b.amount - a.amount; })[0] || dups[0];
    var none = { price_tolerance_pct: 5, auto_post_max_amount: Infinity, hold_duplicates: false, new_vendor_review: false, always_escalate_vendor: [] };
    function slipAt(p, rule) { none.price_tolerance_pct = p; none.hold_duplicates = rule; var r = runQueue(queue, none); none.hold_duplicates = false; return r; }
    var whole = Math.round(slipAt(15, false).slipValue - slipAt(0, false).slipValue);

    if (bet && pick) {
      var cents = function (v) { return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
      var F = { id: pick.id, twin: pick.dupOf.id, vendor: pick.vendor, amount: cents(pick.amount), po: pick.po, more: String(dups.length - 1) };
      qa('[data-bet-f]', bet).forEach(function (n) { var v = F[n.getAttribute('data-bet-f')]; if (v) n.textContent = v; });
      var calls = qa('[data-bet-call]', bet);
      var twin = q('[data-bet-twin]', bet), ghost = q('[data-bet-ghost]', bet);
      var dim = q('[data-bet-dim]', bet), desk = q('[data-bet-desk]', bet);
      var reveal = q('[data-bet-reveal]', bet);

      var drawDim = function () {
        if (dim.hidden || !dim.clientWidth) return;
        var papers = qa('.paper-inv', desk);
        var dr = desk.getBoundingClientRect(), a = papers[0].getBoundingClientRect(), b = papers[1].getBoundingClientRect();
        var w = dim.clientWidth;
        var x1 = a.left - dr.left + a.width / 2, x2 = b.left - dr.left + b.width / 2;
        dim.innerHTML = '';
        var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' 34' });
        svg.appendChild(svgEl('path', { d: 'M' + x1 + ' 2 V22 M' + x1 + ' 12 H' + x2 + ' M' + x2 + ' 2 V22' }));
        var t = svgEl('text', { x: (x1 + x2) / 2, y: 16, 'text-anchor': 'middle' });
        t.textContent = 'SAME VENDOR · SAME AMOUNT · SAME PO';
        svg.appendChild(t);
        dim.appendChild(svg);
        var tw = t.getComputedTextLength() + 16;
        svg.insertBefore(svgEl('rect', { x: (x1 + x2) / 2 - tw / 2, y: 4, width: tw, height: 16 }), t);
      };
      var show = function (call, fresh) {
        calls.forEach(function (b) {
          var on = b.getAttribute('data-bet-call') === call;
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.disabled = true;
          if (on && !q('.pen-tick', b)) b.insertAdjacentHTML('beforeend', '<svg class="pen-tick" viewBox="0 0 30 20" aria-hidden="true"><path d="M3 11 L 10 17 L 27 3"/></svg>');
        });
        ghost.hidden = true;
        twin.hidden = false;
        if (fresh && !reduce) requestAnimationFrame(function () { requestAnimationFrame(function () { twin.classList.add('is-in'); }); });
        else twin.classList.add('is-in');
        dim.hidden = false;
        drawDim();
        q('[data-bet-head]', reveal).textContent = call === 'post' ? 'You paid ' + pick.vendor + ' twice.' : 'Good call. What would your person check?';
        q('[data-bet-body]', reveal).textContent = call === 'post'
          ? pick.dupOf.id + ' was posted one invoice earlier. Your call was reasonable: everything on this sheet checks out.'
          : 'Nothing on this sheet is wrong. The problem is ' + pick.dupOf.id + ', posted one invoice earlier. A person only sees it if they look back.';
        reveal.hidden = false;
      };
      calls.forEach(function (b) {
        b.addEventListener('click', function () {
          var call = b.getAttribute('data-bet-call');
          show(call, true);
          store({ call: call });
        });
      });
      var had = load();
      if (had.call) show(had.call, false);
      window.addEventListener('resize', drawDim);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawDim);
    }

    if (!root) return;
    var chart = q('[data-hub-chart]', root);
    var range = q('[data-hub-range]', root);
    var readout = q('[data-hub-readout]', root);
    var word = q('[data-hub-word]', root);
    var yes = q('[data-hub-yes]', root);
    var hint = q('[data-hub-hint]', root);
    var wordDim = q('[data-hub-worddim]', root);
    var prev = load();
    var state = { pct: isFinite(prev.pct) ? prev.pct : 5, moved: !!prev.moved, struck: !!prev.struck };
    range.value = state.pct;
    var cfg = { price_tolerance_pct: state.pct, auto_post_max_amount: Infinity, hold_duplicates: state.struck,
      new_vendor_review: false, always_escalate_vendor: [] };
    var zero = queue.filter(function (inv) { return !inv.variance; });
    var rest = queue.filter(function (inv) { return inv.variance; }).sort(function (a, b) { return a.variance - b.variance; });
    var marks = [], L = null, lineG, tagRect, tagText, wholeG;

    function build() {
      var W = Math.max(300, chart.clientWidth || 900);
      var narrow = W < 620;
      var bin = narrow ? 1 : 0.5, bins = Math.ceil(23 / bin);
      var counts = [];
      rest.forEach(function (inv) { var b = Math.min(bins - 1, Math.floor(inv.variance / bin)); (counts[b] = counts[b] || []).push(inv); });
      var tall = counts.reduce(function (m, c) { return Math.max(m, c ? c.length : 0); }, 0);
      var zc = narrow ? 8 : 16, rows = Math.max(Math.ceil(zero.length / zc), tall);
      var gapCols = narrow ? 2 : 3;
      var P = Math.floor((W - 2) / (zc + gapCols + bins) * 10) / 10, S = Math.max(2, P - (narrow ? 1.6 : 2.4));
      var top = 30, base = top + rows * P, H = base + 64, x0 = (zc + gapCols) * P;
      L = { W: W, P: P, bin: bin, x0: x0, base: base, top: top, narrow: narrow };
      chart.innerHTML = '';
      var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img',
        'aria-label': 'All 200 made-up invoices. Exact matches to the PO on the left, the rest by how far over the PO they are, with the line across them.' });
      chart.appendChild(svg);
      marks = [];
      function mark(inv, x, y) {
        var r = svgEl('rect', { x: x, y: y, width: S, height: S });
        svg.appendChild(r);
        marks.push({ inv: inv, r: r, cx: x + S / 2, cy: y + S / 2 });
      }
      zero.forEach(function (inv, k) { mark(inv, (k % zc) * P, base - (Math.floor(k / zc) + 1) * P); });
      counts.forEach(function (col, b) { if (col) col.forEach(function (inv, k) { mark(inv, x0 + b * P, base - (k + 1) * P); }); });
      svg.appendChild(svgEl('line', { 'class': 'hub-axis', x1: 0, x2: zc * P - (P - S), y1: base + 6, y2: base + 6 }));
      svg.appendChild(svgEl('line', { 'class': 'hub-axis', x1: x0, x2: x0 + bins * P, y1: base + 6, y2: base + 6 }));
      var g0 = svgEl('text', { 'class': 'hub-tick', x: 0, y: base + 22 });
      g0.textContent = (narrow ? 'EXACT · ' : 'EXACT MATCH TO PO · ') + zero.length;
      svg.appendChild(g0);
      var step = narrow ? 5 : 2.5;
      for (var v = 0; v <= 22.5; v += step) {
        var tx = x0 + v / bin * P;
        svg.appendChild(svgEl('line', { 'class': 'hub-axis', x1: tx, x2: tx, y1: base + 6, y2: base + 10 }));
        var t = svgEl('text', { 'class': 'hub-tick', x: tx, y: base + 22, 'text-anchor': v ? 'middle' : 'start' });
        t.textContent = (v % 1 ? v.toFixed(1) : v) + '%';
        svg.appendChild(t);
      }
      /* the whole slider, measured across what it measures: 0% to 15% */
      wholeG = svgEl('g', { 'class': 'hub-dim' + (state.moved ? ' is-on' : '') });
      svg.appendChild(wholeG);
      var d1 = x0, d2 = x0 + 15 / bin * P, dy = base + 44;
      wholeG.appendChild(svgEl('path', { d: 'M' + d1 + ' ' + (dy - 7) + ' V' + (dy + 7) + ' M' + d1 + ' ' + dy + ' H' + d2 + ' M' + d2 + ' ' + (dy - 7) + ' V' + (dy + 7) }));
      var wt = svgEl('text', { x: (d1 + d2) / 2, y: dy + 4, 'text-anchor': 'middle' });
      wt.textContent = (narrow ? 'WHOLE SLIDER · ' : 'THE WHOLE SLIDER, 0% TO 15% · ') + money(whole);
      wholeG.appendChild(wt);
      var ww = wt.getComputedTextLength() + 16;
      wholeG.insertBefore(svgEl('rect', { x: (d1 + d2) / 2 - ww / 2, y: dy - 8, width: ww, height: 16 }), wt);
      /* the line */
      lineG = svgEl('g', {});
      svg.appendChild(lineG);
      lineG.appendChild(svgEl('rect', { 'class': 'hub-line-hit', x: -14, y: top - 26, width: 28, height: base - top + 40 }));
      lineG.appendChild(svgEl('line', { 'class': 'hub-line', x1: 0, x2: 0, y1: top - 8, y2: base + 10 }));
      var tag = svgEl('g', { 'class': 'hub-tag' });
      lineG.appendChild(tag);
      tagRect = svgEl('rect', { x: 0, y: top - 30, width: 10, height: 20 });
      tagText = svgEl('text', { x: 7, y: top - 16 });
      tag.appendChild(tagRect); tag.appendChild(tagText);
      paint();
    }

    function paint() {
      cfg.price_tolerance_pct = state.pct;
      cfg.hold_duplicates = state.struck;
      var res = runQueue(queue, cfg);
      marks.forEach(function (m) {
        var o = res.rows[m.inv.n].o;
        m.r.setAttribute('class', 'hub-m--' + o);
        /* paid problems are diamonds, so state never rests on colour alone */
        m.r.setAttribute('transform', o === 'slip' ? 'rotate(45 ' + m.cx + ' ' + m.cy + ')' : '');
      });
      var x = L.x0 + state.pct / L.bin * L.P;
      lineG.setAttribute('transform', 'translate(' + x + ' 0)');
      tagText.textContent = (state.moved ? 'YOUR LINE · ' : 'THE LINE · ') + pct(state.pct);
      var w = tagText.getComputedTextLength() + 14;
      var flip = x + w > L.W;
      tagRect.setAttribute('x', flip ? -w : 0); tagRect.setAttribute('width', w);
      tagText.setAttribute('x', flip ? -w + 7 : 7);
      if (state.moved) wholeG.classList.add('is-on');
      readout.textContent = pct(state.pct);
      range.value = state.pct;
      var stats = { person: res.person + res.caught, post: res.post + res.slip, slip: res.slip, money: money(res.slipValue) };
      qa('[data-hub-stat]', root).forEach(function (n) { n.textContent = stats[n.getAttribute('data-hub-stat')]; });
      q('[data-hub-pct]', root).textContent = String(state.pct);
      range.setAttribute('aria-valuetext', pct(state.pct) + '. ' + stats.person + ' to a person, ' + res.slip + ' problems paid, ' + stats.money + ' paid wrong.');
      bars();
    }

    /* money paid wrong with and without the rule, on one scale */
    var MAX = slipAt(15, false).slipValue;
    function bars() {
      var a = slipAt(state.pct, false).slipValue, b = slipAt(state.pct, true).slipValue;
      var track = q('[data-hub-bar="a"]', root).parentNode.clientWidth || 300;
      var use = track * 0.62, wa = a / MAX * use, wb = state.struck ? b / MAX * use : 0;
      q('[data-hub-bar="a"]', root).style.width = wa + 'px';
      q('[data-hub-val="a"]', root).style.left = (wa + 8) + 'px';
      q('[data-hub-val="a"]', root).textContent = money(a);
      q('[data-hub-bar="b"]', root).style.width = wb + 'px';
      q('[data-hub-val="b"]', root).style.left = (wb + 8) + 'px';
      q('[data-hub-val="b"]', root).textContent = state.struck ? money(b) : 'strike the word to see';
      wordDim.innerHTML = '';
      if (!state.struck) return;
      var svg = svgEl('svg', { viewBox: '0 0 ' + track + ' 30' });
      svg.appendChild(svgEl('path', { d: 'M' + wb + ' 2 V14 M' + wb + ' 8 H' + wa + ' M' + wa + ' 2 V14' }));
      var t = svgEl('text', { y: 27 });
      t.textContent = 'ONE WORD · ' + money(a - b);
      var tx = (wa + wb) / 2;
      t.setAttribute('x', tx);
      t.setAttribute('text-anchor', tx < 70 ? 'start' : 'middle');
      svg.appendChild(t);
      wordDim.appendChild(svg);
    }

    function record() {
      store({ pct: state.pct, moved: state.moved, struck: state.struck, whole: whole,
        word: Math.round(slipAt(state.pct, false).slipValue - slipAt(state.pct, true).slipValue) });
    }
    function setPct(v) {
      v = Math.max(0, Math.min(15, Math.round(v * 2) / 2));
      state.moved = true;
      if (v !== state.pct) { state.pct = v; }
      paint();
    }
    range.addEventListener('input', function () { setPct(parseFloat(range.value)); });
    range.addEventListener('change', record);

    /* drag the line itself: sideways moves it, up and down still scrolls */
    var drag = null;
    function at(clientX) {
      var r = chart.getBoundingClientRect();
      return ((clientX - r.left) * (L.W / r.width) - L.x0) / L.P * L.bin;
    }
    chart.addEventListener('pointerdown', function (e) {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, live: e.pointerType === 'mouse' };
      if (drag.live) { chart.setPointerCapture(e.pointerId); setPct(at(e.clientX)); }
    });
    chart.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      if (!drag.live) {
        var dx = Math.abs(e.clientX - drag.x), dy = Math.abs(e.clientY - drag.y);
        if (dx > 6 && dx > dy) { drag.live = true; try { chart.setPointerCapture(e.pointerId); } catch (err) { /* already released */ } }
        else if (dy > 6) { drag = null; return; }
        else return;
      }
      setPct(at(e.clientX));
    });
    chart.addEventListener('pointerup', function (e) {
      if (!drag) return;
      if (!drag.live) setPct(at(e.clientX));
      drag = null;
      record();
    });
    chart.addEventListener('pointercancel', function () { if (drag && drag.live) record(); drag = null; });

    function strike(fresh) {
      state.struck = true;
      word.classList.add('is-struck');
      if (!fresh) word.querySelector('path').style.animation = 'none';
      word.disabled = true;
      word.setAttribute('aria-label', 'no, struck out');
      yes.hidden = false;
      hint.textContent = 'hold_duplicates: yes. Same line, same tolerance.';
    }
    word.addEventListener('click', function () {
      if (state.struck) return;
      strike(true);
      paint();
      record();
    });
    if (state.struck) strike(false);

    var lastW = 0;
    window.addEventListener('resize', function () {
      if (Math.abs(chart.clientWidth - lastW) < 30) { bars(); return; }
      lastW = chart.clientWidth; build();
    });
    lastW = chart.clientWidth;
    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  }

  function start() {
    var queue = buildQueue();
    try { initTolerance(queue); } catch (e) { if (window.console) console.error('[unwired] lab tolerance failed', e); }
    try { initHandover(queue); } catch (e) { if (window.console) console.error('[unwired] lab handover failed', e); }
    try { initHub(queue); } catch (e) { if (window.console) console.error('[unwired] lab hub failed', e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
