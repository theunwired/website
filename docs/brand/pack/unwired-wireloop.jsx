/* The Unwired — the resolved wire field, as a seamless loop.
   For use behind any slide. No mark, no tagline: just the settled field
   breathing, with current running and process nodes lighting as data passes.

   Every motion here is periodic over LOOP seconds so the last frame equals
   the first: the drift sine completes exactly one cycle, the dash offset
   advances a whole multiple of both dash periods (LCM of 26 and 30 = 390),
   and each blip completes exactly three passes. */
(function () {
  const { CompositionStage, useComposition, animate, Easing, clamp } = window;

  const W = 1920, H = 1080;
  const LOOP = 15;
  const OMEGA = (2 * Math.PI) / LOOP;   /* one drift cycle per loop */
  const DASH = 26;                       /* 26 px/s -> 390px over 15s */
  const BLIP = 3 / LOOP;                 /* three passes per loop */

  const N = 10, GREEN = 4;
  const S = 9;
  const XS = [];
  for (let s = 0; s < S; s++) XS.push(-80 + (s / (S - 1)) * (W + 160));
  const LANES = [];
  for (let i = 0; i < N; i++) LANES.push(H * 0.06 + ((i + 0.5) / N) * H * 0.88);

  function smooth(pts) {
    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)},` +
           `${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)},` +
           `${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }

  function wirePoints(i, T) {
    const pts = [];
    for (let s = 0; s < S; s++) {
      /* two harmonics, both whole cycles per loop, so the wave never jumps */
      const y = LANES[i]
        + Math.sin(XS[s] * 0.0028 + i * 0.83 + T * OMEGA) * (H * 0.030)
        + Math.sin(XS[s] * 0.0016 - i * 0.51 + T * OMEGA * 2) * (H * 0.012);
      pts.push({ x: XS[s], y });
    }
    return pts;
  }

  function along(pts, u) {
    let total = 0;
    const seg = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const L = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      seg.push(L); total += L;
    }
    let want = clamp(u, 0, 1) * total;
    for (let i = 0; i < seg.length; i++) {
      if (want <= seg[i] || i === seg.length - 1) {
        const f = seg[i] ? want / seg[i] : 0;
        return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * f, y: pts[i].y + (pts[i + 1].y - pts[i].y) * f };
      }
      want -= seg[i];
    }
    return pts[pts.length - 1];
  }

  const NODES = [
    { w: 1, s: 2, d: 0 }, { w: 1, s: 6, d: 0 }, { w: 2, s: 4, d: 1 },
    { w: 4, s: 3, d: 0 }, { w: 4, s: 6, d: 1 }, { w: 5, s: 2, d: 1 },
    { w: 7, s: 3, d: 0 }, { w: 7, s: 7, d: 0 }, { w: 8, s: 5, d: 0 }
  ];
  const LINKS = [[1, 2, 4], [4, 5, 2], [7, 8, 5], [2, 4, 6]];
  const BLIPS = 4;

  function Piece({ intensity, accent, showFlow }) {
    const { T } = useComposition();
    const k = intensity == null ? 1 : intensity;
    const ACCENT = accent || '#2E8B6E';
    const flow = showFlow === false ? 0 : 1;

    const all = [];
    for (let i = 0; i < N; i++) all.push(wirePoints(i, T));

    const blipPos = [];
    for (let b = 0; b < BLIPS; b++) {
      const pts = all[(b * 3 + 2) % N];
      const u = ((T * BLIP) + b / BLIPS) % 1;
      blipPos.push({ p: along(pts, u), fade: Math.sin(u * Math.PI) });
    }

    const wires = all.map((pts, i) => {
      const green = i === GREEN;
      return React.createElement('path', {
        key: 'w' + i,
        d: smooth(pts),
        fill: 'none',
        stroke: green ? '#1E6B57' : '#22251E',
        strokeWidth: green ? 2.6 : 1.9,
        strokeDasharray: green ? '16 14' : '11 15',
        strokeDashoffset: -(T * DASH) % 390,
        strokeLinecap: 'round',
        opacity: 0.72 * k
      });
    });

    const links = LINKS.map((L, i) => {
      const a = all[L[0]][L[2]], b = all[L[1]][L[2]];
      return React.createElement('path', {
        key: 'l' + i,
        d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${(a.x + 40).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
        fill: 'none', stroke: '#233029', strokeWidth: 1.6, strokeDasharray: '5 8',
        opacity: 0.6 * k * flow
      });
    });

    const nodes = NODES.map((n, i) => {
      const p = all[n.w][n.s];
      const size = n.d ? 13 : 15;
      let hot = 0;
      for (let b = 0; b < BLIPS; b++) {
        const dd = Math.hypot(blipPos[b].p.x - p.x, blipPos[b].p.y - p.y);
        if (dd < 60) hot = Math.max(hot, 1 - dd / 60);
      }
      return React.createElement('rect', {
        key: 'n' + i,
        x: p.x - size / 2, y: p.y - size / 2, width: size, height: size,
        fill: '#0B0C0B',
        stroke: hot > 0.35 ? '#7FE8C2' : (n.d ? '#2F6B58' : '#3A3D35'),
        strokeWidth: 1.8,
        transform: n.d ? `rotate(45 ${p.x.toFixed(1)} ${p.y.toFixed(1)})` : undefined,
        opacity: (0.5 + 0.5 * hot) * k * flow
      });
    });

    const blips = [];
    blipPos.forEach((b, i) => {
      blips.push(React.createElement('circle', { key: 'bh' + i, cx: b.p.x, cy: b.p.y, r: 15, fill: ACCENT, opacity: 0.2 * b.fade * k }));
      blips.push(React.createElement('circle', { key: 'bd' + i, cx: b.p.x, cy: b.p.y, r: 4.6, fill: '#7FE8C2', opacity: 0.92 * b.fade * k }));
    });

    return React.createElement('div', { style: { position: 'absolute', inset: 0, background: '#0B0C0B' } },
      React.createElement('svg', {
        width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: { position: 'absolute', inset: 0 }
      }, wires, links, nodes, blips)
    );
  }

  function WireLoopFilm() {
    const { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakSlider, TweakColor } = window;
    const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
    return React.createElement(React.Fragment, null,
      React.createElement(CompositionStage, {
        width: W, height: H, bg: '#0B0C0B',
        scenes: window.OM_SCENES, playback: window.OM_PLAYBACK
      }, React.createElement(Piece, { intensity: t.intensity, accent: t.accent, showFlow: t.showFlow })),
      React.createElement(TweaksPanel, null,
        React.createElement(TweakSection, { label: 'Timeline' }),
        React.createElement(TweakToggle, {
          label: 'Motion editor', value: t.motionEditor,
          onChange: (v) => setTweak('motionEditor', v)
        }),
        React.createElement(TweakSection, { label: 'Field' }),
        React.createElement(TweakSlider, {
          label: 'Intensity', value: t.intensity, min: 0.2, max: 1.4, step: 0.1,
          onChange: (v) => setTweak('intensity', v)
        }),
        React.createElement(TweakToggle, {
          label: 'Process nodes', value: t.showFlow,
          onChange: (v) => setTweak('showFlow', v)
        }),
        React.createElement(TweakColor, {
          label: 'Signal', value: t.accent,
          options: ['#2E8B6E', '#4FBF9B', '#7FE8C2', '#0F5C4A'],
          onChange: (v) => setTweak('accent', v)
        })
      )
    );
  }

  window.WireLoopFilm = WireLoopFilm;
})();
