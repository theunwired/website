/* The Unwired — deck wire field.
   Self-contained loops for slides: no scroll, no page state. Two roles:

   [data-deck-wire]  a looping wire field behind a slide, tangled -> resolved
   [data-deck-mark]  the logo lockup, untangling in sync with its field
   [data-deck-frame] a wire field frozen at a fixed t (for the frame-by-frame
                     slide, and so print/PPTX export gets a readable still)

   Sizes to its container, so it works at any slide scale. */
(function () {
  if (window.__unwiredDeckWires) return;
  window.__unwiredDeckWires = 1;
  var NS = 'http://www.w3.org/2000/svg';
  var N = 10;
  var STEPS = [3, 7, 9, 3, 1, 7, 9, 3, 7];
  var OFFS = [0, 4, 2, 7, 5, 1, 8, 3, 6];
  var S = STEPS.length;
  var GREEN = 4;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* host-settable options (see the deck's Tweaks panel) */
  var opts = window.UnwiredDeckOpts = { intensity: 1 };

  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function clamp(x) { return Math.max(0, Math.min(1, x)); }
  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function smooth(pts) {
    var d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ' C' + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + ' ' + (p1.y + (p2.y - p0.y) / 6).toFixed(1) +
           ',' + (p2.x - (p3.x - p1.x) / 6).toFixed(1) + ' ' + (p2.y - (p3.y - p1.y) / 6).toFixed(1) +
           ',' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d;
  }

  function field(host, cfg) {
    var W = host.clientWidth || 1200;
    var H = host.clientHeight || 600;
    if (W < 40 || H < 40) return null;
    while (host.firstChild) host.removeChild(host.firstChild);

    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' });
    svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;display:block');
    svg.setAttribute('aria-hidden', 'true');
    host.appendChild(svg);

    var XS = [], lanes = [], perm = [];
    for (var s = 0; s < S; s++) XS.push(-40 + (s / (S - 1)) * (W + 80));
    for (var i = 0; i < N; i++) lanes.push(H * 0.07 + ((i + 0.5) / N) * H * 0.86);
    for (var s2 = 0; s2 < S; s2++) {
      var row = [];
      for (var j = 0; j < N; j++) row.push(lanes[(j * STEPS[s2] + OFFS[s2]) % N]);
      perm.push(row);
    }

    var scale = Math.max(1, W / 1200);
    var wires = [];
    for (var w = 0; w < N; w++) {
      var green = w === GREEN;
      var p = el('path', {
        fill: 'none',
        stroke: green ? '#17493C' : '#1E211B',
        'stroke-width': (green ? 1.7 : 1.25) * scale,
        'stroke-dasharray': (green ? '10 9' : '7 10'),
        'stroke-linecap': 'round'
      });
      svg.appendChild(p);
      wires.push({ node: p, i: w, green: green, phase: w * 0.83 });
    }

    var links = [], nodes = [], blips = [];
    if (cfg.flow !== false) {
      [[1, 2, 4], [4, 5, 2], [7, 8, 5], [2, 4, 6]].forEach(function (L) {
        var p2 = el('path', { fill: 'none', stroke: '#232B26', 'stroke-width': scale, 'stroke-dasharray': '3 5', opacity: 0 });
        svg.appendChild(p2);
        links.push({ node: p2, a: L[0], b: L[1], s: L[2] });
      });
      [{ w: 1, s: 2, d: 0 }, { w: 1, s: 6, d: 0 }, { w: 2, s: 4, d: 1 },
       { w: 4, s: 3, d: 0 }, { w: 4, s: 6, d: 1 }, { w: 5, s: 2, d: 1 },
       { w: 7, s: 3, d: 0 }, { w: 7, s: 7, d: 0 }, { w: 8, s: 5, d: 0 }
      ].forEach(function (n) {
        var sz = (n.d ? 7 : 8) * scale;
        var box = el('rect', {
          width: sz, height: sz, fill: '#0B0C0B',
          stroke: n.d ? '#2A5F4E' : '#32352E', 'stroke-width': scale, opacity: 0
        });
        svg.appendChild(box);
        nodes.push({ node: box, w: n.w, s: n.s, dec: !!n.d, size: sz });
      });
      for (var b = 0; b < 4; b++) {
        var halo = el('circle', { r: 8 * scale, fill: '#2E8B6E', opacity: 0 });
        var head = el('circle', { r: 2.5 * scale, fill: '#7FE8C2', opacity: 0 });
        svg.appendChild(halo); svg.appendChild(head);
        blips.push({ halo: halo, head: head, wire: (b * 3 + 2) % N, phase: b / 4 });
      }
    }

    function draw(t, ms) {
      var bus = 4 * t * (1 - t) * 0.82;
      var mid = (S - 1) / 2;
      var flow = -(ms * 0.03) % 2000;

      for (var wi = 0; wi < wires.length; wi++) {
        var wr = wires[wi], pts = [];
        for (var st = 0; st < S; st++) {
          var calm = lanes[wr.i] + Math.sin(XS[st] * 0.0042 + wr.phase + ms * 0.00035) * (H * 0.028);
          var y = calm + (perm[st][wr.i] - calm) * t;
          if (bus > 0) {
            var near = 1 - Math.min(1, Math.abs(st - mid) / 2.6);
            y += (H * 0.5 - y) * bus * near * 0.86;
          }
          pts.push({ x: XS[st], y: y });
        }
        wr.pts = pts;
        wr.node.setAttribute('d', smooth(pts));
        wr.node.setAttribute('stroke-dashoffset', (flow * (wr.green ? 1.7 : 1)).toFixed(1));
        wr.node.setAttribute('stroke', wr.green ? (t > 0.5 ? '#26775F' : '#17493C') : (t > 0.5 ? '#26291F' : '#1E211B'));
        wr.node.setAttribute('opacity', ((0.5 + 0.35 * t) * opts.intensity).toFixed(2));
      }

      for (var bi = 0; bi < blips.length; bi++) {
        var bl = blips[bi], bw = wires[bl.wire], len = 0;
        try { len = bw.node.getTotalLength(); } catch (e) { continue; }
        if (!len) continue;
        var u = (ms * 0.00016 + bl.phase) % 1;
        var pt = bw.node.getPointAtLength(u * len);
        var fade = Math.sin(u * Math.PI);
        bl.x = pt.x; bl.y = pt.y;
        bl.head.setAttribute('cx', pt.x); bl.head.setAttribute('cy', pt.y);
        bl.halo.setAttribute('cx', pt.x); bl.halo.setAttribute('cy', pt.y);
        bl.head.setAttribute('opacity', (0.85 * fade * opts.intensity).toFixed(2));
        bl.halo.setAttribute('opacity', (0.18 * fade * opts.intensity).toFixed(2));
      }

      var showing = Math.max(0, 1 - t * 2.4);
      for (var ni = 0; ni < nodes.length; ni++) {
        var nd = nodes[ni], np = wires[nd.w].pts[nd.s];
        nd.node.setAttribute('x', (np.x - nd.size / 2).toFixed(1));
        nd.node.setAttribute('y', (np.y - nd.size / 2).toFixed(1));
        nd.node.setAttribute('transform', nd.dec ? 'rotate(45 ' + np.x.toFixed(1) + ' ' + np.y.toFixed(1) + ')' : '');
        var hot = 0;
        for (var k = 0; k < blips.length; k++) {
          if (blips[k].x == null) continue;
          var dd = Math.hypot(blips[k].x - np.x, blips[k].y - np.y);
          if (dd < 34 * scale) hot = Math.max(hot, 1 - dd / (34 * scale));
        }
        nd.node.setAttribute('stroke', hot > 0.35 ? '#7FE8C2' : (nd.dec ? '#2A5F4E' : '#32352E'));
        nd.node.setAttribute('opacity', (showing * (0.5 + 0.5 * hot) * opts.intensity).toFixed(2));
      }
      for (var li = 0; li < links.length; li++) {
        var L = links[li], a = wires[L.a].pts[L.s], bb = wires[L.b].pts[L.s];
        L.node.setAttribute('d', 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
          ' Q' + (a.x + 26 * scale).toFixed(1) + ' ' + ((a.y + bb.y) / 2).toFixed(1) +
          ' ' + bb.x.toFixed(1) + ' ' + bb.y.toFixed(1));
        L.node.setAttribute('opacity', (showing * 0.65 * opts.intensity).toFixed(2));
      }
    }

    return draw;
  }

  /* the logo lockup, driven by the same clock as its field */
  function markRig(host) {
    host.innerHTML =
      '<div style="display:flex;align-items:center;font-weight:700;letter-spacing:-0.04em;line-height:1;font-size:' +
      (host.getAttribute('data-size') || '96') + 'px">' +
      '<span data-lead style="display:flex;flex-direction:column;gap:0.11em;overflow:hidden;flex:0 0 auto">' +
      '<span data-lead-a style="height:0.11em;background:#F2F1ED;width:0;display:block"></span>' +
      '<span data-lead-b style="height:0.11em;background:#0F5C4A;width:0;display:block"></span></span>' +
      '<span data-w1 style="color:#7C8177">theun</span>' +
      '<span data-mid style="position:relative;flex:0 0 auto;overflow:hidden;margin:0 0.06em">' +
      '<svg viewBox="0 0 96 64" style="display:block;width:1.9em;height:1.27em">' +
      '<path data-ma fill="none" stroke="#F2F1ED" stroke-width="5"></path>' +
      '<path data-mb fill="none" stroke="#2E8B6E" stroke-width="5"></path></svg></span>' +
      '<span data-w2 style="color:#7C8177">wired</span></div>';
    var L = {
      lead: host.querySelector('[data-lead]'), a: host.querySelector('[data-lead-a]'),
      b: host.querySelector('[data-lead-b]'), mid: host.querySelector('[data-mid]'),
      w1: host.querySelector('[data-w1]'), w2: host.querySelector('[data-w2]'),
      ma: host.querySelector('[data-ma]'), mb: host.querySelector('[data-mb]')
    };
    return function (t) {
      var u = 1 - t;
      var conv = clamp((u - 0.4) / 0.45);
      var r = function (n) { return Math.round(n * 100) / 100; };
      var wp = function (uu, sign) {
        var tt = 1 - uu, rest = sign > 0 ? 26 : 40;
        return 'M2 ' + r(sign > 0 ? rest - 6 * tt : rest + 4 * tt) + ' H30 L66 ' +
               r(sign > 0 ? rest + 18 * tt : rest - 20 * tt) + ' H94';
      };
      L.ma.setAttribute('d', wp(u, 1));
      L.mb.setAttribute('d', wp(u, -1));
      L.a.style.width = (0.52 * conv) + 'em';
      L.b.style.width = (0.30 * conv) + 'em';
      L.lead.style.marginRight = (0.17 * conv) + 'em';
      L.mid.style.width = (1.9 * (1 - conv)) + 'em';
      L.mid.style.opacity = 1 - conv;
      /* the margins must close with the width or it settles as "theun wired" */
      L.mid.style.marginLeft = (0.06 * (1 - conv)) + 'em';
      L.mid.style.marginRight = (0.06 * (1 - conv)) + 'em';
      var col = conv > 0.5 ? '#F2F1ED' : '#7C8177';
      L.w1.style.color = col; L.w2.style.color = col;
    };
  }

  var rigs = [];

  function mountAll() {
    /* looping fields */
    Array.prototype.forEach.call(document.querySelectorAll('[data-deck-wire]'), function (host) {
      if (host.__rig) return;
      var draw = field(host, { flow: true });
      if (!draw) return;
      host.__rig = 1;
      var markHost = document.querySelector('[data-deck-mark="' + (host.getAttribute('data-deck-wire') || '') + '"]');
      var setMark = markHost && !markHost.__rig ? (markHost.__rig = 1, markRig(markHost)) : null;
      var phase = host.querySelector ? null : null;
      var label = document.querySelector('[data-deck-phase="' + (host.getAttribute('data-deck-wire') || '') + '"]');
      rigs.push({ host: host, draw: draw, setMark: setMark, label: label, loop: true });
    });

    /* frozen frames */
    Array.prototype.forEach.call(document.querySelectorAll('[data-deck-frame]'), function (host) {
      if (host.__rig) return;
      var draw = field(host, { flow: true });
      if (!draw) return;
      host.__rig = 1;
      var t = parseFloat(host.getAttribute('data-deck-frame'));
      var markHost = host.parentNode.querySelector('[data-frame-mark]');
      var setMark = markHost ? markRig(markHost) : null;
      draw(t, 2400);
      if (setMark) setMark(t);
      rigs.push({ host: host, draw: draw, setMark: setMark, fixed: t });
    });
  }

  var frozenAt = null;

  /* Export freeze. A PPTX/PDF capture measures text and rasters in separate
     passes; if the clock is still running between them the two passes disagree
     and text lands twice, offset. Freezing pins one frame for every rig. */
  window.UnwiredDeckFreeze = function (t) {
    frozenAt = typeof t === 'number' ? t : 0;
    for (var i = 0; i < rigs.length; i++) {
      var r = rigs[i];
      r.draw(r.fixed != null ? r.fixed : frozenAt, 4200);
      if (r.setMark) r.setMark(r.fixed != null ? r.fixed : frozenAt);
      if (r.label) r.label.textContent = frozenAt > 0.5 ? 'TANGLED' : 'RESOLVED';
    }
    return rigs.length;
  };
  window.UnwiredDeckUnfreeze = function () { frozenAt = null; };
  window.UnwiredDeckRedraw = function () {
    if (frozenAt !== null) window.UnwiredDeckFreeze(frozenAt);
    return rigs.length;
  };

  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden || frozenAt !== null) return;
    /* 11s: knotted hold, resolve, resolved hold, re-tangle */
    var cyc = now % 11000, t, label;
    if (cyc < 1600) { t = 1; label = 'TANGLED'; }
    else if (cyc < 4600) { t = 1 - ease((cyc - 1600) / 3000); label = 'UNTANGLING'; }
    else if (cyc < 9400) { t = 0; label = 'RESOLVED'; }
    else { t = ease((cyc - 9400) / 1600); label = 'RE-TANGLING'; }

    for (var i = 0; i < rigs.length; i++) {
      var r = rigs[i];
      /* deck-stage shows one slide at a time. Drawing every field every frame
         would cost nine wire sets and their getTotalLength calls, so skip any
         host that is not actually on screen. */
      if (r.host) {
        var rc = r.host.getBoundingClientRect();
        if (rc.width < 20 || rc.right < -40 || rc.left > window.innerWidth + 40 ||
            rc.bottom < -40 || rc.top > window.innerHeight + 40) continue;
      }
      if (r.fixed != null) { r.draw(r.fixed, now); continue; }
      r.draw(t, now);
      if (r.setMark) r.setMark(t);
      if (r.label) r.label.textContent = label;
    }
  }

  function start() {
    mountAll();
    if (!reduce) requestAnimationFrame(tick);
    else for (var i = 0; i < rigs.length; i++) { rigs[i].draw(rigs[i].fixed != null ? rigs[i].fixed : 0, 2400); if (rigs[i].setMark) rigs[i].setMark(0); }
  }

  /* The x-import -> deck-stage mount (fetch, customElements define, slotting
     28 sections) can finish after any fixed timeout, so fixed retries lose the
     race and every field renders blank. Watch the tree instead, same pattern
     as responsive.js. */
  var mt;
  function schedule() { clearTimeout(mt); mt = setTimeout(mountAll, 80); }
  function boot() {
    start();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(mountAll, 2500); /* backstop only */
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      rigs.length = 0;
      Array.prototype.forEach.call(document.querySelectorAll('[data-deck-wire],[data-deck-frame]'), function (h) { h.__rig = 0; });
      Array.prototype.forEach.call(document.querySelectorAll('[data-deck-mark],[data-frame-mark]'), function (h) { h.__rig = 0; });
      mountAll();
    }, 200);
  });
})();
