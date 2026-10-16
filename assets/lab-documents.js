/* The Unwired — Lab stage 03, the worst-document bench.
   Six made-up documents, drawn here as SVG. For each one the visitor first
   ticks the fields they would check, then reveals what the agent read, its
   confidence per field, and what was actually wrong. A review threshold
   decides which fields the agent sends to a person.

   Confidence scores and extractions are illustrative, written by hand to
   show the failure modes. They are not output from a real run, and the page
   says so. Nothing is uploaded or sent anywhere. */
(function () {
  'use strict';

  function q(s, r) { return (r || document).querySelector(s); }
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  /* --------------------------------------------------------- the paper */
  /* Documents are paper, so they stay light in both themes. Mono for the
     body keeps character widths predictable, which is what lets a field's
     highlight box sit exactly on its value. */
  var INK = '#1B1C1A', FAINT = '#6B6F63', RULE = '#C9CBC1', PAPER = '#F7F6F1';
  var CW = 0.6; /* IBM Plex Mono advance width, as a share of font size */
  var H = 400;  /* paper height; every document fits above 380 */

  function T(x, y, v, o) { o = o || {}; return { t: 'text', x: x, y: y, v: v, s: o.s || 10, b: o.b, sans: o.sans, a: o.a, f: o.f }; }
  function L(x1, y1, x2, y2) { return { t: 'line', x1: x1, y1: y1, x2: x2, y2: y2 }; }
  /* a field's box, from where its value is printed */
  function at(x, y, v, s) { s = s || 10; return [x - 3, y - s + 1, v.length * CW * s + 6, s + 5]; }

  function invoiceHead(vendor, addr, meta) {
    var out = [
      T(28, 52, vendor, { s: 17, b: 1, sans: 1 }),
      T(28, 68, addr, { s: 8, f: FAINT }),
      T(392, 52, 'INVOICE', { s: 13, b: 1, a: 'end' }),
      L(28, 82, 392, 82),
      T(250, 104, 'BILL TO', { s: 7.5, f: FAINT }),
      T(250, 118, 'Demo Co. Ltd', { s: 9 }),
      T(250, 131, 'Accounts payable', { s: 9 })
    ];
    meta.forEach(function (m, i) {
      out.push(T(28, 104 + i * 16, m[0], { s: 7.5, f: FAINT }));
      out.push(T(110, 104 + i * 16, m[1], { s: 10 }));
    });
    return out;
  }
  function table(rows, y0) {
    var out = [L(28, y0, 392, y0),
      T(28, y0 + 14, 'DESCRIPTION', { s: 7.5, f: FAINT }), T(232, y0 + 14, 'QTY', { s: 7.5, f: FAINT }),
      T(272, y0 + 14, 'UNIT', { s: 7.5, f: FAINT }), T(392, y0 + 14, 'AMOUNT', { s: 7.5, f: FAINT, a: 'end' }),
      L(28, y0 + 22, 392, y0 + 22)];
    rows.forEach(function (r, i) {
      var y = y0 + 40 + i * 20;
      out.push(T(28, y, r[0], { s: 9 }), T(232, y, r[1], { s: 9 }), T(272, y, r[2], { s: 9 }), T(392, y, r[3], { s: 9, a: 'end' }));
    });
    return out;
  }

  /* handwriting, drawn as strokes: two typefaces only, and no italics */
  var DIGITS = {
    '2': 'M0 4 C2 -1 9 -1 9 4 C9 8 0 12 0 15 L10 15',
    '6': 'M8 1 C3 0 0 6 0 10 C0 14 3 16 5 16 C8 16 9 13 9 11 C9 8 6 7 4 8 C2 9 1 11 1 12',
    '0': 'M5 0 C1 0 0 6 0 8 C0 12 2 16 5 16 C8 16 10 12 10 8 C10 4 8 0 5 0'
  };
  function hand(x, y, digits) {
    return { t: 'hand', d: digits.split('').map(function (c, i) {
      return DIGITS[c].replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, function (m, a, _, b) {
        return (x + i * 13 + (+a) * 0.9).toFixed(1) + ' ' + (y + (+b) * 0.95 + (i % 2 ? 1 : -1)).toFixed(1);
      });
    }).join(' ') };
  }

  /* -------------------------------------------------------- the six docs */
  var DOCS = [
    {
      key: 'clean', name: 'The clean one', tag: 'CONTROL',
      lesson: 'Everything is crisp, so everything clears the threshold. Every tool looks this good on a clean PDF, which is why a clean PDF tells you nothing about a pilot.',
      draw: function () {
        return invoiceHead('Northgate Fasteners', '14 Mill Road · Leeds', [['INVOICE NO', 'NF-20417'], ['DATE', '2026-09-14'], ['PO', 'PO 88214']])
          .concat(table([['M8 hex bolts, zinc', '1,200', '0.85', '1,020.00'], ['M8 nuts, nylon insert', '1,200', '0.42', '504.00'], ['Washers, form A', '2,400', '0.11', '264.00'], ['Freight', '1', '2,424.00', '2,424.00']], 160))
          .concat([L(232, 300, 392, 300), T(232, 318, 'TOTAL DUE', { s: 8, f: FAINT }), T(392, 318, '4,212.00', { s: 11, b: 1, a: 'end' }),
            T(232, 334, 'TAX CODE', { s: 7.5, f: FAINT }), T(392, 334, 'VAT-STD', { s: 9, a: 'end' }),
            T(28, 372, 'Payment terms 30 days. Thank you for your order.', { s: 7.5, f: FAINT })]);
      },
      fields: [
        { label: 'Invoice number', value: 'NF-20417', conf: 99, box: at(110, 104, 'NF-20417') },
        { label: 'Invoice date', value: '2026-09-14', conf: 99, box: at(110, 120, '2026-09-14') },
        { label: 'PO number', value: 'PO 88214', conf: 98, box: at(110, 136, 'PO 88214') },
        { label: 'Total due', value: '4,212.00', conf: 99, box: [327, 306, 68, 16] },
        { label: 'Tax code', value: 'VAT-STD', conf: 97, box: [347, 325, 48, 14] }
      ]
    },
    {
      key: 'fax', name: 'The faxed copy', tag: 'FAX', fax: true,
      lesson: 'The agent was unsure about three fields and sent them to a person. One was really wrong, two were fine. That is the price of a threshold: some checks are wasted, and that is cheaper than a wrong date on a payment run.',
      draw: function () {
        return invoiceHead('Kestrel Freight', 'Unit 4, Harbour Park · Felixstowe', [['INVOICE NO', 'KF-11873'], ['DATE', '2026-09-18'], ['PO', 'PO 88437']])
          .concat(table([['Container haulage, 40ft', '1', '1,980.00', '1,980.00'], ['Port handling', '1', '312.50', '312.50'], ['Fuel surcharge 6.2%', '1', '124.00', '124.00']], 160))
          .concat([L(232, 282, 392, 282), T(232, 300, 'TOTAL DUE', { s: 8, f: FAINT }), T(392, 300, '2,416.50', { s: 11, b: 1, a: 'end' }),
            { t: 'smudge', cx: 167, cy: 116, rx: 9, ry: 7 },
            T(28, 372, 'FAX 01394 552 018    P. 1/1', { s: 7.5, f: FAINT })]);
      },
      fields: [
        { label: 'Vendor', value: 'Kestrel Freight', conf: 97, box: [25, 37, 150, 20] },
        { label: 'Invoice number', value: 'KF-11873', conf: 93, box: at(110, 104, 'KF-11873') },
        { label: 'Invoice date', value: '2026-09-13', conf: 61, wrong: true, why: 'The fax smudged the 8. It is the 18th, not the 13th.', box: at(110, 120, '2026-09-18') },
        { label: 'PO number', value: 'PO 88437', conf: 88, box: at(110, 136, 'PO 88437') },
        { label: 'Total due', value: '2,416.50', conf: 74, box: [327, 288, 68, 16] }
      ]
    },
    {
      key: 'hand', name: 'The handwritten correction', tag: 'PEN',
      lesson: 'The model read the printed 240 and the printed line total, both confidently enough to sound sure, neither high enough to clear the line. The correction lives in ink, and only a person, or a rule that spots crossed-out print, takes it seriously.',
      draw: function () {
        return invoiceHead('Sable Packaging', '2 Quay Street · Hull', [['INVOICE NO', 'SP-5530'], ['DATE', '2026-09-22'], ['PO', 'PO 88511']])
          .concat(table([['Double-wall cartons, 600mm', '240', '7.80', '1,872.00'], ['Pallet wrap, 23 micron', '12', '18.40', '220.80'], ['Edge protectors', '400', '0.31', '124.00']], 160))
          .concat([L(229, 197, 252, 193), hand(228, 172, '260'),
            T(270, 184, 'per J.M. on delivery', { s: 7, f: FAINT }),
            L(232, 262, 392, 262), T(232, 280, 'TOTAL DUE', { s: 8, f: FAINT }), T(392, 280, '2,216.80', { s: 11, b: 1, a: 'end' })]);
      },
      fields: [
        { label: 'Invoice number', value: 'SP-5530', conf: 98, box: at(110, 104, 'SP-5530') },
        { label: 'Line 1 quantity', value: '240', conf: 58, wrong: true, why: '240 is crossed out. The delivery note says 260, in pen above it.', box: [222, 168, 46, 34] },
        { label: 'Line 1 amount', value: '1,872.00', conf: 83, wrong: true, why: 'Printed before the correction. At 260 cartons it is 2,028.00.', box: at(349, 200, '1,872.00', 9) },
        { label: 'Total due', value: '2,216.80', conf: 91, wrong: true, why: 'Also printed before the correction. It should be 2,372.80. Confident and wrong, so only a rule that adds up the lines would catch it.', box: [327, 268, 68, 16] }
      ]
    },
    {
      key: 'footnote', name: 'The total in the footnote', tag: 'FOOTNOTE',
      lesson: 'This is the dangerous one. The agent read the table total with 95% confidence, and it was the wrong number to pay. No threshold catches a confident mistake. A cross-check does: amount due should equal the total less any credit note named on the page.',
      draw: function () {
        return invoiceHead('Redfern Chemicals', 'Dock Lane · Runcorn', [['INVOICE NO', 'RC-90214'], ['DATE', '2026-09-25'], ['PO', 'PO 88602']])
          .concat(table([['Sodium hypochlorite 14%', '30', '186.00', '5,580.00'], ['IBC container hire', '6', '420.00', '2,520.00'], ['Hazardous goods delivery', '1', '4,500.00', '4,500.00']], 160))
          .concat([L(232, 262, 392, 262), T(232, 280, 'TOTAL *', { s: 8, f: FAINT }), T(392, 280, '12,600.00', { s: 11, b: 1, a: 'end' }),
            T(28, 352, '* Amount due after credit note CN-118 (returned IBC) is applied:', { s: 7, f: FAINT }),
            T(28, 364, '  11,940.00. Please pay the reduced amount.', { s: 7, f: FAINT })]);
      },
      fields: [
        { label: 'Invoice number', value: 'RC-90214', conf: 98, box: at(110, 104, 'RC-90214') },
        { label: 'PO number', value: 'PO 88602', conf: 97, box: at(110, 136, 'PO 88602') },
        { label: 'Amount due', value: '12,600.00', conf: 95, wrong: true, why: 'The footnote says 11,940.00 after credit note CN-118. Paying 12,600.00 overpays by 660.00.', box: [319, 268, 76, 16] },
        { label: 'Credit note', value: 'none', conf: 72, wrong: true, why: 'CN-118 is named in the footnote. The model read it as small print and skipped it.', box: [25, 344, 330, 24] }
      ]
    },
    {
      key: 'fx', name: 'Two currencies', tag: 'FX',
      lesson: 'Lines in euros, payable in dollars. The agent was right about the amount and the rate, and unsure about the currency, which is exactly where it should be unsure.',
      draw: function () {
        return invoiceHead('Meridian Cold Chain', 'Industrieweg 18 · Rotterdam', [['INVOICE NO', 'MCC-7781'], ['DATE', '2026-09-29'], ['PO', 'PO 88655']])
          .concat(table([['Reefer storage, Sept', '1', 'EUR 8,400', 'EUR 8,400.00'], ['Blast freezing', '20', 'EUR 131', 'EUR 2,620.00']], 160))
          .concat([L(232, 242, 392, 242), T(232, 260, 'TOTAL', { s: 8, f: FAINT }), T(392, 260, 'EUR 11,020.00', { s: 10, a: 'end' }),
            T(232, 280, 'FX 1.0981', { s: 8, f: FAINT }),
            T(232, 302, 'PAYABLE', { s: 8, f: FAINT }), T(392, 302, 'USD 12,101.06', { s: 11, b: 1, a: 'end' }),
            T(28, 372, 'Settlement in USD per contract MCC-2024-11.', { s: 7.5, f: FAINT })]);
      },
      fields: [
        { label: 'Invoice number', value: 'MCC-7781', conf: 98, box: at(110, 104, 'MCC-7781') },
        { label: 'Currency', value: 'EUR', conf: 79, wrong: true, why: 'The lines are in euros, but the invoice is payable in dollars under the contract.', box: [310, 248, 30, 16] },
        { label: 'Amount payable', value: '12,101.06', conf: 92, box: [305, 290, 90, 16] },
        { label: 'FX rate', value: '1.0981', conf: 90, box: at(246.4, 280, '1.0981', 8) }
      ]
    },
    {
      key: 'id', name: 'The smudged ID', tag: 'KYC',
      lesson: 'Identity work never posts on its own. Here the agent still did the useful part: it read what it could, and pointed a person at the two characters it could not be sure of.',
      draw: function () {
        return [
          { t: 'rect', x: 30, y: 40, w: 360, h: 226 },
          T(46, 64, 'SPECIMEN · IDENTITY CARD', { s: 9, b: 1 }),
          T(374, 64, 'UTO', { s: 9, b: 1, a: 'end' }),
          { t: 'hatch', x: 46, y: 80, w: 90, h: 112 },
          T(91, 140, 'PHOTO', { s: 7.5, f: FAINT, a: 'middle' }),
          T(156, 90, 'SURNAME', { s: 7, f: FAINT }), T(156, 104, 'ERIKSSON', { s: 10 }),
          T(156, 124, 'GIVEN NAMES', { s: 7, f: FAINT }), T(156, 138, 'ANNA MARIA', { s: 10 }),
          T(156, 158, 'DATE OF BIRTH', { s: 7, f: FAINT }), T(156, 172, '08 MAR 1987', { s: 10 }),
          T(280, 158, 'NATIONALITY', { s: 7, f: FAINT }), T(280, 172, 'UTO', { s: 10 }),
          T(156, 192, 'DOCUMENT NO', { s: 7, f: FAINT }), T(156, 206, 'P4071922', { s: 10 }),
          T(280, 192, 'EXPIRY', { s: 7, f: FAINT }), T(280, 206, '30 NOV 2031', { s: 10 }),
          T(46, 240, 'IDUTOP4071922<<<<<<<<<<<<<<<', { s: 8, f: FAINT }),
          T(46, 254, '8703082F3111306UTO<<<<<<<<<<<', { s: 8, f: FAINT }),
          { t: 'smudge', cx: 165, cy: 168, rx: 8, ry: 7 },
          T(30, 300, 'Specimen document. UTO is the code reserved for specimens.', { s: 7.5, f: FAINT })
        ];
      },
      fields: [
        { label: 'Full name', value: 'ANNA MARIA ERIKSSON', conf: 98, box: [153, 92, 102, 50] },
        { label: 'Date of birth', value: '06 MAR 1987', conf: 57, wrong: true, why: 'The smudge turned 08 into 06. The machine-readable line underneath says 870308.', box: at(156, 172, '08 MAR 1987') },
        { label: 'Document number', value: 'P4071922', conf: 69, why: 'Read correctly. The model could not tell a zero from a letter O, and said so.', box: at(156, 206, 'P4071922') },
        { label: 'Expiry', value: '30 NOV 2031', conf: 95, box: at(280, 206, '30 NOV 2031') }
      ]
    }
  ];

  /* --------------------------------------------------------- rendering */
  function drawDoc(doc) {
    var svg = el('svg', { viewBox: '0 0 420 ' + H, 'class': 'bench-doc__svg', role: 'img',
      'aria-label': doc.name + '. A made-up document; its fields are listed beside it.' });
    var defs = el('defs');
    var blur = el('filter', { id: 'bench-blur-' + doc.key, x: '-50%', y: '-50%', width: '200%', height: '200%' });
    blur.appendChild(el('feGaussianBlur', { stdDeviation: '2.2' }));
    defs.appendChild(blur);
    var hatch = el('pattern', { id: 'bench-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    hatch.appendChild(el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: RULE, 'stroke-width': 1 }));
    defs.appendChild(hatch);
    svg.appendChild(defs);
    svg.appendChild(el('rect', { x: 0, y: 0, width: 420, height: H, fill: PAPER }));

    var g = el('g', doc.fax ? { transform: 'rotate(-1.4 210 ' + H / 2 + ')' } : {});
    svg.appendChild(g);
    doc.draw().forEach(function (p) {
      if (p.t === 'text') {
        var t = el('text', { x: p.x, y: p.y, 'font-size': p.s, fill: doc.fax && !p.f ? '#3A3B38' : (p.f || INK),
          'font-family': p.sans ? "'Instrument Sans', sans-serif" : "'IBM Plex Mono', monospace",
          'font-weight': p.b ? 700 : 400, 'text-anchor': p.a || 'start' }, p.v);
        g.appendChild(t);
      } else if (p.t === 'line') {
        g.appendChild(el('line', { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, stroke: p.y1 === p.y2 ? RULE : INK, 'stroke-width': p.y1 === p.y2 ? 1 : 1.4 }));
      } else if (p.t === 'rect') {
        g.appendChild(el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, fill: 'none', stroke: RULE }));
      } else if (p.t === 'hatch') {
        g.appendChild(el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, fill: 'url(#bench-hatch)', stroke: RULE }));
      } else if (p.t === 'hand') {
        g.appendChild(el('path', { d: p.d, fill: 'none', stroke: INK, 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      } else if (p.t === 'smudge') {
        g.appendChild(el('ellipse', { cx: p.cx, cy: p.cy, rx: p.rx, ry: p.ry, fill: '#55574F', opacity: 0.55, filter: 'url(#bench-blur-' + doc.key + ')' }));
      }
    });
    if (doc.fax) {
      /* fax speckle and scan streaks, seeded so they never shimmer */
      var r = 7;
      var rand = function () { r = (r * 16807) % 2147483647; return r / 2147483647; };
      for (var i = 0; i < 140; i++) g.appendChild(el('rect', { x: rand() * 420, y: rand() * H, width: 1.2, height: 1.2, fill: '#3A3B38', opacity: 0.35 + rand() * 0.4 }));
      [148, 151, 362].forEach(function (y) { g.appendChild(el('line', { x1: 0, y1: y, x2: 420, y2: y, stroke: '#8E9187', 'stroke-width': 0.6, opacity: 0.6 })); });
    }
    /* one highlight box per field, shown on hover or when it matters */
    var boxes = [];
    doc.fields.forEach(function (f, i) {
      var b = el('rect', { x: f.box[0], y: f.box[1], width: f.box[2], height: f.box[3], 'class': 'bench-box', 'data-f': i });
      g.appendChild(b);
      boxes.push(b);
    });
    return { svg: svg, boxes: boxes };
  }

  /* ------------------------------------------------------------- state */
  function init() {
    var root = q('[data-bench]');
    if (!root) return;
    var picker = q('[data-bench-picker]', root);
    var docBox = q('[data-bench-doc]', root);
    var fieldsBox = q('[data-bench-fields]', root);
    var titleEl = q('[data-bench-title]', root);
    var stepEl = q('[data-bench-step]', root);
    var revealBtn = q('[data-bench-reveal]', root);
    var nextBtn = q('[data-bench-next]', root);
    var lessonEl = q('[data-bench-lesson]', root);
    var range = q('[data-bench-range]', root);
    var readout = q('[data-bench-readout]', root);
    var scoreEl = q('[data-bench-score]', root);

    var state = DOCS.map(function () { return { picks: {}, revealed: false }; });
    var cur = 0;
    var drawn = null;

    function threshold() { return parseInt(range.value, 10); }
    function flagged(f) { return f.conf < threshold(); }

    function buildPicker() {
      picker.innerHTML = '';
      DOCS.forEach(function (d, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'bench-pick';
        b.setAttribute('aria-pressed', i === cur ? 'true' : 'false');
        var n = document.createElement('span'); n.className = 'bench-pick__num'; n.textContent = String(i + 1).padStart(2, '0');
        var t = document.createElement('span'); t.className = 'bench-pick__name'; t.textContent = d.name;
        var s = document.createElement('span'); s.className = 'bench-pick__state';
        s.textContent = state[i].revealed ? 'DONE' : d.tag;
        b.appendChild(n); b.appendChild(t); b.appendChild(s);
        if (state[i].revealed) b.classList.add('is-done');
        b.addEventListener('click', function () { show(i); });
        picker.appendChild(b);
      });
    }

    function show(i) {
      cur = i;
      var doc = DOCS[i];
      docBox.innerHTML = '';
      drawn = drawDoc(doc);
      var scroller = document.createElement('div');
      scroller.className = 'bench-doc__scroll';
      scroller.appendChild(drawn.svg);
      docBox.appendChild(scroller);
      /* on a phone the paper is small; zoom scrolls inside the box, never the page */
      var zoom = document.createElement('button');
      zoom.type = 'button';
      zoom.className = 'bench-zoom';
      zoom.setAttribute('aria-pressed', docBox.classList.contains('is-zoomed') ? 'true' : 'false');
      zoom.textContent = docBox.classList.contains('is-zoomed') ? 'Fit the document' : 'Zoom the document';
      zoom.addEventListener('click', function () {
        var on = docBox.classList.toggle('is-zoomed');
        zoom.setAttribute('aria-pressed', on ? 'true' : 'false');
        zoom.textContent = on ? 'Fit the document' : 'Zoom the document';
      });
      docBox.appendChild(zoom);
      titleEl.textContent = String(i + 1).padStart(2, '0') + ' · ' + doc.name;
      buildPicker();
      renderFields();
    }

    function renderFields() {
      var doc = DOCS[cur], st = state[cur];
      fieldsBox.innerHTML = '';
      stepEl.textContent = st.revealed ? 'What the agent saw, and what was really there.' :
        'Step one: tick the fields you would check before this posts.';
      doc.fields.forEach(function (f, i) {
        var row = document.createElement('div');
        row.className = 'bench-field';
        var flag = flagged(f);
        if (st.revealed) row.className += ' is-revealed' + (f.wrong ? ' is-wrong' : '') + (flag ? ' is-flagged' : '');

        var check = document.createElement('label');
        check.className = 'bench-field__check';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!st.picks[i];
        cb.disabled = st.revealed;
        /* the visitor's pick is their own mark, so it is drawn in pen */
        var box = document.createElement('span');
        box.className = 'bench-field__box';
        box.setAttribute('aria-hidden', 'true');
        function tick() {
          box.innerHTML = cb.checked ? '<svg viewBox="0 0 24 22"><path class="pen-draw" d="M3 12 L 9 18 L 22 2"/></svg>' : '';
        }
        cb.addEventListener('change', function () { st.picks[i] = cb.checked; tick(); });
        tick();
        var lab = document.createElement('span');
        lab.className = 'bench-field__label';
        lab.textContent = f.label;
        check.appendChild(cb); check.appendChild(box); check.appendChild(lab);

        var val = document.createElement('span');
        val.className = 'bench-field__value';
        val.textContent = f.value;
        row.appendChild(check); row.appendChild(val);

        if (st.revealed) {
          var conf = document.createElement('div');
          conf.className = 'bench-conf';
          var track = document.createElement('span'); track.className = 'bench-conf__track';
          var fill = document.createElement('span'); fill.className = 'bench-conf__fill'; fill.style.width = f.conf + '%';
          var tick = document.createElement('span'); tick.className = 'bench-conf__line'; tick.style.left = threshold() + '%';
          track.appendChild(fill); track.appendChild(tick);
          var num = document.createElement('span'); num.className = 'bench-conf__num'; num.textContent = f.conf + '%';
          conf.appendChild(track); conf.appendChild(num);
          row.appendChild(conf);

          var verdict = document.createElement('p');
          verdict.className = 'bench-field__verdict';
          var agent = flag ? 'Agent: sent to a person.' : 'Agent: straight through.';
          var you = st.picks[i] ? ' You: checked.' : ' You: not checked.';
          var truth = f.wrong ? ' Actually wrong. ' + f.why : (f.why ? ' Correct. ' + f.why : ' Correct.');
          verdict.textContent = agent + you + truth;
          row.appendChild(verdict);
        }

        row.addEventListener('mouseenter', function () { hi(i, true); });
        row.addEventListener('mouseleave', function () { hi(i, false); });
        row.addEventListener('focusin', function () { hi(i, true); });
        row.addEventListener('focusout', function () { hi(i, false); });
        fieldsBox.appendChild(row);
      });
      paintBoxes();
      revealBtn.hidden = st.revealed;
      nextBtn.hidden = !st.revealed;
      nextBtn.textContent = cur < DOCS.length - 1 ? 'Next document' : 'See your run';
      lessonEl.hidden = !st.revealed;
      lessonEl.textContent = st.revealed ? docSummary(cur) + ' ' + DOCS[cur].lesson : '';
      score();
    }

    function docSummary(i) {
      var doc = DOCS[i], st = state[i];
      var wrong = doc.fields.filter(function (f) { return f.wrong; }).length;
      if (!wrong) return 'Nothing on this one was wrong.';
      var you = doc.fields.filter(function (f, k) { return f.wrong && st.picks[k]; }).length;
      var agent = doc.fields.filter(function (f) { return f.wrong && flagged(f); }).length;
      return wrong + (wrong === 1 ? ' field was' : ' fields were') + ' wrong. You would have caught ' + you + ', the agent at ' + threshold() + '% caught ' + agent + '.';
    }

    function paintBoxes() {
      if (!drawn) return;
      var doc = DOCS[cur], st = state[cur];
      drawn.boxes.forEach(function (b, i) {
        var f = doc.fields[i];
        var cls = 'bench-box';
        if (st.revealed && f.wrong) cls += ' bench-box--wrong';
        else if (st.revealed && flagged(f)) cls += ' bench-box--flag';
        b.setAttribute('class', cls);
      });
    }
    function hi(i, on) {
      if (!drawn) return;
      drawn.boxes[i].classList.toggle('is-hot', on);
    }

    function score() {
      var docs = 0, wrong = 0, you = 0, agent = 0, youExtra = 0, agentExtra = 0, trapConf = 0;
      DOCS.forEach(function (d, i) {
        if (!state[i].revealed) return;
        docs++;
        d.fields.forEach(function (f, k) {
          var picked = !!state[i].picks[k], flag = flagged(f);
          /* a confident mistake: wrong, read at 90% or more, and sure enough to
             go straight through. Meeting one earns this stage its lesson */
          if (f.wrong && !flag && f.conf >= 90) trapConf = Math.max(trapConf, f.conf);
          if (f.wrong) { wrong++; if (picked) you++; if (flag) agent++; }
          else { if (picked) youExtra++; if (flag) agentExtra++; }
        });
      });
      if (!docs) { scoreEl.textContent = 'Reveal a document to start the score.'; return; }
      scoreEl.textContent = docs + ' of 6 documents. Of ' + wrong + ' wrong ' + (wrong === 1 ? 'field' : 'fields') + ', you caught ' + you +
        ' and the agent caught ' + agent + '. You checked ' + youExtra + ' that were fine, the agent sent ' + agentExtra + ' that were fine.';
      if (window.UnwiredLab) {
        var prev = window.UnwiredLab.load().documents;
        /* once met, a confident mistake stays met, whatever the threshold does next */
        trapConf = Math.max(trapConf, (prev && prev.trapConf) || 0);
        if (prev && prev.docs > docs) {
          /* back for another look: this visit has seen less than the last one,
             so keep the fuller run rather than shrink it */
          prev.trapConf = trapConf;
          window.UnwiredLab.save('documents', prev);
        } else {
          window.UnwiredLab.save('documents', { docs: docs, wrong: wrong, youCaught: you, agentCaught: agent, threshold: threshold(), trapConf: trapConf });
        }
      }
    }

    revealBtn.addEventListener('click', function () {
      state[cur].revealed = true;
      buildPicker();
      renderFields();
      var first = q('.bench-field', fieldsBox);
      if (first) first.scrollIntoView({ block: 'nearest' });
    });
    nextBtn.addEventListener('click', function () {
      if (cur < DOCS.length - 1) {
        show(cur + 1);
        /* stacked on a phone, the next document is a screen above the button:
           bring the paper itself into view */
        if (window.matchMedia('(max-width: 860px)').matches) {
          var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          docBox.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }
        return;
      }
      var run = document.getElementById('your-run');
      if (run) run.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    range.addEventListener('input', function () {
      readout.textContent = threshold() + '%';
      range.setAttribute('aria-valuetext', threshold() + '% review threshold');
      renderFields();
    });

    readout.textContent = threshold() + '%';
    show(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
