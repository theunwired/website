/* The Unwired — the wire field.
   Ten flowing wires behind every page. Knotted at the top, gathered through
   the middle, resolved into a working process flow by the foot of the page:
   square steps, diamond decision points, data blips moving between them.
   Every page runs its own arc. All curves, no corners, one green wire.
   Content panels are opaque, so nothing ever runs behind body copy. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = 10;
  /* a second script load must reuse the same api object, or the running
     loop ends up reading a different override than the page is setting */
  var api = window.UnwiredWires || { override: null };
  window.UnwiredWires = api;
  if (window.__unwiredWires) return;
  window.__unwiredWires = 1;

  function el(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function clamp(x) { return Math.max(0, Math.min(1, x)); }

  function mount(host) {
    /* the host is a plain div so React never owns these children */
    while (host.firstChild) host.removeChild(host.firstChild);
    var svg = el('svg', { viewBox: '0 0 1200 800', preserveAspectRatio: 'none' });
    svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;display:block');
    host.appendChild(svg);
    var W = 1200, H = 800, XS = [], lanes = [], perm = [];
    var wires = [], blips = [], nodes = [], links = [];

    var steps = [3, 7, 9, 3, 1, 7, 9, 3, 7];
    var offs = [0, 4, 2, 7, 5, 1, 8, 3, 6];
    var S = steps.length;
    var GREEN = 4;

    for (var i = 0; i < N; i++) {
      var green = i === GREEN;
      var p = el('path', {
        fill: 'none',
        stroke: green ? '#17493C' : '#1E211B',
        'stroke-width': green ? 1.7 : 1.25,
        'stroke-dasharray': green ? '10 9' : '7 10',
        'stroke-linecap': 'round'
      });
      svg.appendChild(p);
      wires.push({ node: p, i: i, green: green, phase: i * 0.83 });
    }

    [[1, 2, 4], [4, 5, 2], [7, 8, 5], [2, 4, 6]].forEach(function (L) {
      var p = el('path', { fill: 'none', stroke: '#232B26', 'stroke-width': 1, 'stroke-dasharray': '3 5', opacity: 0 });
      svg.appendChild(p);
      links.push({ node: p, a: L[0], b: L[1], s: L[2] });
    });

    [{ w: 1, s: 2, d: 0 }, { w: 1, s: 6, d: 0 }, { w: 2, s: 4, d: 1 },
     { w: 4, s: 3, d: 0 }, { w: 4, s: 6, d: 1 }, { w: 5, s: 2, d: 1 },
     { w: 7, s: 3, d: 0 }, { w: 7, s: 7, d: 0 }, { w: 8, s: 5, d: 0 }
    ].forEach(function (n) {
      var box = el('rect', {
        width: n.d ? 7 : 8, height: n.d ? 7 : 8, fill: '#0B0C0B',
        stroke: n.d ? '#2A5F4E' : '#32352E', 'stroke-width': 1, opacity: 0
      });
      svg.appendChild(box);
      nodes.push({ node: box, w: n.w, s: n.s, dec: !!n.d, size: n.d ? 7 : 8 });
    });

    for (var b = 0; b < 4; b++) {
      var halo = el('circle', { r: 8, fill: '#2E8B6E', opacity: 0 });
      var head = el('circle', { r: 2.5, fill: '#7FE8C2', opacity: 0 });
      svg.appendChild(halo); svg.appendChild(head);
      blips.push({ halo: halo, head: head, wire: (b * 3 + 2) % N, phase: b / 4 });
    }

    function size() {
      W = window.innerWidth;
      H = window.innerHeight;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      XS = [];
      for (var s = 0; s < S; s++) XS.push(-60 + (s / (S - 1)) * (W + 120));
      lanes = [];
      for (var i = 0; i < N; i++) lanes.push(H * 0.07 + ((i + 0.5) / N) * H * 0.86);
      perm = [];
      for (var s2 = 0; s2 < S; s2++) {
        var row = [];
        for (var j = 0; j < N; j++) row.push(lanes[(j * steps[s2] + offs[s2]) % N]);
        perm.push(row);
      }
    }

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

    function progress() {
      var doc = document.documentElement.scrollHeight - window.innerHeight;
      if (doc <= 0) return 0;
      return clamp((window.scrollY || window.pageYOffset) / doc);
    }

    function draw(ms) {
      var t = api.override != null ? clamp(api.override) : 1 - progress();
      /* the gather: wires pull toward one line mid-resolve, then release */
      var bus = 4 * t * (1 - t) * 0.82;
      var mid = (S - 1) / 2;
      var flow = -(ms * 0.03) % 2000;

      for (var wi = 0; wi < wires.length; wi++) {
        var w = wires[wi];
        var pts = [];
        for (var s = 0; s < S; s++) {
          var calm = lanes[w.i] + Math.sin(XS[s] * 0.0042 + w.phase + ms * 0.00035) * (H * 0.028);
          var y = calm + (perm[s][w.i] - calm) * t;
          if (bus > 0) {
            var near = 1 - Math.min(1, Math.abs(s - mid) / 2.6);
            y += (H * 0.5 - y) * bus * near * 0.86;
          }
          pts.push({ x: XS[s], y: y });
        }
        w.pts = pts;
        w.node.setAttribute('d', smooth(pts));
        w.node.setAttribute('stroke-dashoffset', (flow * (w.green ? 1.7 : 1)).toFixed(1));
        w.node.setAttribute('stroke', w.green ? (t > 0.5 ? '#26775F' : '#17493C') : (t > 0.5 ? '#26291F' : '#1E211B'));
        w.node.setAttribute('opacity', (0.5 + 0.35 * t).toFixed(2));
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
        bl.head.setAttribute('opacity', (0.85 * fade).toFixed(2));
        bl.halo.setAttribute('opacity', (0.18 * fade).toFixed(2));
      }

      /* the process flow only exists once the wires have resolved */
      var showing = Math.max(0, 1 - t * 2.4);
      for (var ni = 0; ni < nodes.length; ni++) {
        var n = nodes[ni], p = wires[n.w].pts[n.s];
        n.node.setAttribute('x', (p.x - n.size / 2).toFixed(1));
        n.node.setAttribute('y', (p.y - n.size / 2).toFixed(1));
        n.node.setAttribute('transform', n.dec ? 'rotate(45 ' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')' : '');
        var hot = 0;
        for (var k = 0; k < blips.length; k++) {
          if (blips[k].x == null) continue;
          var d2 = Math.hypot(blips[k].x - p.x, blips[k].y - p.y);
          if (d2 < 34) hot = Math.max(hot, 1 - d2 / 34);
        }
        n.node.setAttribute('stroke', hot > 0.35 ? '#7FE8C2' : (n.dec ? '#2A5F4E' : '#32352E'));
        n.node.setAttribute('opacity', (showing * (0.5 + 0.5 * hot)).toFixed(2));
      }
      for (var li = 0; li < links.length; li++) {
        var L = links[li], a = wires[L.a].pts[L.s], bb = wires[L.b].pts[L.s];
        L.node.setAttribute('d', 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
          ' Q' + (a.x + 26).toFixed(1) + ' ' + ((a.y + bb.y) / 2).toFixed(1) +
          ' ' + bb.x.toFixed(1) + ' ' + bb.y.toFixed(1));
        L.node.setAttribute('opacity', (showing * 0.65).toFixed(2));
      }
    }

    var t0 = performance.now();
    size();
    /* one frame at mount, and one on every resize, so a page loaded into a
       background tab is never blank: rAF is suspended while hidden, so the
       loop alone would leave the field undrawn until the tab is focused */
    draw(0);
    window.addEventListener('resize', function () {
      size();
      draw(performance.now() - t0);
    });
    if (reduce) return;
    (function loop(now) {
      if (!document.hidden) draw(now - t0);
      requestAnimationFrame(loop);
    })(t0);
  }

  function prefetch() {
    var seen = {};
    document.addEventListener('mouseover', function (e) {
      var a = e.target.closest ? e.target.closest('[data-wipe-link]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || seen[href]) return;
      seen[href] = 1;
      var l = document.createElement('link');
      l.rel = 'prefetch'; l.href = href;
      document.head.appendChild(l);
    }, { passive: true });
  }

  function start() {
    /* the field owns its own container appended to <body>, so React never
       sees it and cannot clobber the injected SVG on re-render */
    if (!document.getElementById('unwired-wirefield')) {
      var host = document.createElement('div');
      host.id = 'unwired-wirefield';
      /* the field is decoration: keep it out of the accessibility tree */
      host.setAttribute('aria-hidden', 'true');
      host.setAttribute('role', 'presentation');
      host.setAttribute('style', 'position:fixed;inset:0;z-index:-1;pointer-events:none');
      document.body.appendChild(host);
      mount(host);
    }
    prefetch();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  setTimeout(start, 400);
})();
