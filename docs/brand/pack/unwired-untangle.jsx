/* The Unwired — the untangle, as a film.
   One element tree rendered purely from the authored clock T, so every frame
   is deterministic and the video export is pixel-exact. Same geometry as the
   site's wire field: ten wires, nine crossing stations, curves only. */
(function () {
  const { CompositionStage, useComposition, animate, interpolate, Easing, clamp } = window;

  const W = 1920, H = 1080;
  const N = 10, GREEN = 4;
  const STEPS = [3, 7, 9, 3, 1, 7, 9, 3, 7];
  const OFFS  = [0, 4, 2, 7, 5, 1, 8, 3, 6];
  const S = STEPS.length;

  const XS = [];
  for (let s = 0; s < S; s++) XS.push(-80 + (s / (S - 1)) * (W + 160));
  const LANES = [];
  for (let i = 0; i < N; i++) LANES.push(H * 0.06 + ((i + 0.5) / N) * H * 0.88);
  const PERM = [];
  for (let s = 0; s < S; s++) {
    const row = [];
    for (let i = 0; i < N; i++) row.push(LANES[(i * STEPS[s] + OFFS[s]) % N]);
    PERM.push(row);
  }

  /* the three motion helpers — nothing eases outside these */
  const MOTION = {
    comb:  (a, b) => animate({ from: 1, to: 0, start: a, end: b, ease: Easing.easeInOutCubic }),
    enter: (a, b) => animate({ from: 0, to: 1, start: a, end: b, ease: Easing.easeOutCubic }),
    settle:(a, b) => animate({ from: 0, to: 1, start: a, end: b, ease: Easing.easeInOutQuad })
  };

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

  /* every wire's station points at tangle t — the one geometry function */
  function wirePoints(i, t, T) {
    const bus = 4 * t * (1 - t) * 0.82;
    const mid = (S - 1) / 2;
    const pts = [];
    for (let s = 0; s < S; s++) {
      const calm = LANES[i] + Math.sin(XS[s] * 0.0028 + i * 0.83 + T * 0.42) * (H * 0.026);
      let y = calm + (PERM[s][i] - calm) * t;
      if (bus > 0) {
        const near = 1 - Math.min(1, Math.abs(s - mid) / 2.6);
        y += (H * 0.5 - y) * bus * near * 0.86;
      }
      pts.push({ x: XS[s], y });
    }
    return pts;
  }

  /* a point at fraction u along a wire, measured on the station polyline */
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

  /* ---------- the field ---------- */
  function Field({ T, t, reveal }) {
    const all = [];
    for (let i = 0; i < N; i++) all.push(wirePoints(i, t, T));

    const wires = all.map((pts, i) => {
      const green = i === GREEN;
      return React.createElement('path', {
        key: 'w' + i,
        d: smooth(pts),
        fill: 'none',
        stroke: green ? (t > 0.5 ? '#2E8B6E' : '#1E6B57') : (t > 0.5 ? '#2C2F27' : '#22251E'),
        strokeWidth: green ? 2.6 : 1.9,
        strokeDasharray: green ? '16 14' : '11 15',
        strokeDashoffset: -(T * 46) % 3000,
        strokeLinecap: 'round',
        opacity: 0.62 + 0.3 * t
      });
    });

    const links = LINKS.map((L, k) => {
      const a = all[L[0]][L[2]], b = all[L[1]][L[2]];
      return React.createElement('path', {
        key: 'l' + k,
        d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${(a.x + 40).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
        fill: 'none', stroke: '#233029', strokeWidth: 1.6, strokeDasharray: '5 8',
        opacity: reveal * 0.7
      });
    });

    /* four blips riding the wires */
    const blips = [];
    for (let b = 0; b < 4; b++) {
      const pts = all[(b * 3 + 2) % N];
      const u = ((T * 0.19) + b / 4) % 1;
      const p = along(pts, u);
      const fade = Math.sin(u * Math.PI);
      blips.push(React.createElement('circle', { key: 'bh' + b, cx: p.x, cy: p.y, r: 15, fill: '#2E8B6E', opacity: 0.2 * fade }));
      blips.push(React.createElement('circle', { key: 'bd' + b, cx: p.x, cy: p.y, r: 4.6, fill: '#7FE8C2', opacity: 0.92 * fade }));
    }

    const nodes = NODES.map((n, k) => {
      const p = all[n.w][n.s];
      const size = n.d ? 13 : 15;
      let hot = 0;
      for (let b = 0; b < 4; b++) {
        const pts = all[(b * 3 + 2) % N];
        const bp = along(pts, ((T * 0.19) + b / 4) % 1);
        const dd = Math.hypot(bp.x - p.x, bp.y - p.y);
        if (dd < 60) hot = Math.max(hot, 1 - dd / 60);
      }
      return React.createElement('rect', {
        key: 'n' + k,
        x: p.x - size / 2, y: p.y - size / 2, width: size, height: size,
        fill: '#0B0C0B',
        stroke: hot > 0.35 ? '#7FE8C2' : (n.d ? '#2F6B58' : '#3A3D35'),
        strokeWidth: 1.8,
        transform: n.d ? `rotate(45 ${p.x.toFixed(1)} ${p.y.toFixed(1)})` : undefined,
        opacity: reveal * (0.5 + 0.5 * hot)
      });
    });

    return React.createElement('svg', {
      width: W, height: H, viewBox: `0 0 ${W} ${H}`,
      style: { position: 'absolute', inset: 0 }
    }, wires, links, nodes, blips);
  }

  /* ---------- the mark ---------- */
  function Mark({ u, conv, scale }) {
    const r = (n) => Math.round(n * 100) / 100;
    const wp = (sign) => {
      const tt = 1 - u, rest = sign > 0 ? 26 : 40;
      return `M2 ${r(sign > 0 ? rest - 6 * tt : rest + 4 * tt)} H30 L66 ${r(sign > 0 ? rest + 18 * tt : rest - 20 * tt)} H94`;
    };
    const col = conv > 0.5 ? '#F2F1ED' : '#7C8177';
    const FS = 150;
    return React.createElement('div', {
      style: {
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${scale})`, transformOrigin: '50% 50%'
      }
    }, React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', fontFamily: "'Instrument Sans', Helvetica, Arial, sans-serif",
        fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, fontSize: FS + 'px', color: col
      }
    },
      React.createElement('span', {
        style: { display: 'flex', flexDirection: 'column', gap: '0.105em', overflow: 'hidden', flex: '0 0 auto', marginRight: (0.17 * conv) + 'em' }
      },
        React.createElement('span', { style: { height: '0.105em', background: '#F2F1ED', width: (0.52 * conv) + 'em', display: 'block' } }),
        React.createElement('span', { style: { height: '0.105em', background: '#0F5C4A', width: (0.30 * conv) + 'em', display: 'block' } })
      ),
      React.createElement('span', { style: { color: col } }, 'theun'),
      React.createElement('span', {
        style: {
          position: 'relative', flex: '0 0 auto', overflow: 'hidden',
          width: (1.9 * (1 - conv)) + 'em',
          marginLeft: (0.06 * (1 - conv)) + 'em',
          marginRight: (0.06 * (1 - conv)) + 'em',
          opacity: 1 - conv
        }
      }, React.createElement('svg', { viewBox: '0 0 96 64', style: { display: 'block', width: '1.9em', height: '1.27em' } },
        React.createElement('path', { d: wp(1), fill: 'none', stroke: '#F2F1ED', strokeWidth: 5 }),
        React.createElement('path', { d: wp(-1), fill: 'none', stroke: '#2E8B6E', strokeWidth: 5 })
      )),
      React.createElement('span', { style: { color: col } }, 'wired')
    ));
  }

  /* ---------- the piece ---------- */
  function Piece({ accent, tagline, showMeta }) {
    const { T, CUES } = useComposition();
    const ACCENT = accent || '#4FBF9B';
    const TAG = tagline || 'We build it. You own it.';

    /* the field and the mark share one clock: this is the whole idea */
    const t = MOTION.comb(CUES.Untangle, CUES.Converge + 1.2)(T);
    const conv = MOTION.settle(CUES.Converge + 0.3, CUES.Resolve)(T);
    const reveal = MOTION.enter(CUES.Resolve, CUES.Resolve + 1.4)(T);

    const markScale = interpolate(conv, [0, 1], [1.16, 1], Easing.easeOutCubic);
    const markLift = interpolate(reveal, [0, 1], [0, -110], Easing.easeInOutCubic);

    const metaIn = MOTION.enter(0.3, 1.4)(T);
    const tagIn = MOTION.enter(CUES.Resolve + 0.5, CUES.Resolve + 1.6)(T);

    const phase = T < CUES.Untangle ? 'TANGLED'
      : T < CUES.Converge ? 'UNTANGLING'
      : T < CUES.Resolve ? 'CONVERGING' : 'RESOLVED';

    const MONO = { fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.18em', fontSize: 26 };

    return React.createElement('div', { style: { position: 'absolute', inset: 0, background: '#0B0C0B', overflow: 'hidden' } },
      React.createElement(Field, { T, t, reveal }),

      React.createElement('div', { style: { position: 'absolute', inset: 0, transform: `translateY(${markLift}px)` } },
        React.createElement(Mark, { u: 1 - t, conv, scale: markScale })
      ),

      /* tagline lands once the mark has settled */
      React.createElement('div', {
        style: {
          position: 'absolute', left: 0, right: 0, top: '58%', textAlign: 'center',
          fontFamily: "'Instrument Sans', Helvetica, Arial, sans-serif",
          opacity: tagIn, transform: `translateY(${interpolate(tagIn, [0, 1], [18, 0], Easing.easeOutCubic)}px)`
        }
      },
        React.createElement('div', { style: { fontSize: 62, fontWeight: 700, letterSpacing: '-0.035em', color: '#F2F1ED' } },
          TAG.split('. ').length > 1
            ? [TAG.split('. ')[0] + '. ', React.createElement('span', { key: 'a', style: { color: ACCENT } }, TAG.split('. ').slice(1).join('. '))]
            : TAG
        )
      ),

      /* corner metadata, the deck's own frame */
      React.createElement('div', { style: { position: 'absolute', inset: 0, opacity: showMeta === false ? 0 : metaIn, pointerEvents: 'none' } },
        React.createElement('span', { style: { ...MONO, position: 'absolute', left: 96, top: 84, color: '#8A8F84' } }, 'AI AUTOMATION STUDIO'),
        React.createElement('span', { style: { ...MONO, position: 'absolute', right: 96, top: 84, color: ACCENT } }, phase),
        React.createElement('span', { style: { ...MONO, position: 'absolute', left: 96, bottom: 84, color: '#8A8F84' } }, 'THE UNWIRED'),
        React.createElement('span', { style: { ...MONO, position: 'absolute', right: 96, bottom: 84, color: '#8A8F84' } }, 'theunwired.in')
      )
    );
  }

  function UntangleFilm() {
    const { useTweaks, TweaksPanel, TweakSection, TweakToggle, TweakColor, TweakText, TweakRadio } = window;
    const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
    return React.createElement(React.Fragment, null,
      React.createElement(CompositionStage, {
        width: W, height: H, bg: '#0B0C0B',
        scenes: window.OM_SCENES, playback: window.OM_PLAYBACK
      }, React.createElement(Piece, { accent: t.accent, tagline: t.tagline, showMeta: t.showMeta })),
      React.createElement(TweaksPanel, null,
        React.createElement(TweakSection, { label: 'Timeline' }),
        React.createElement(TweakToggle, {
          label: 'Motion editor', value: t.motionEditor,
          onChange: (v) => setTweak('motionEditor', v)
        }),
        React.createElement(TweakSection, { label: 'Brand' }),
        React.createElement(TweakColor, {
          label: 'Accent', value: t.accent,
          options: ['#4FBF9B', '#2E8B6E', '#7FE8C2', '#8FB8A8'],
          onChange: (v) => setTweak('accent', v)
        }),
        React.createElement(TweakText, {
          label: 'Closing line', value: t.tagline,
          onChange: (v) => setTweak('tagline', v)
        }),
        React.createElement(TweakSection, { label: 'Frame' }),
        React.createElement(TweakToggle, {
          label: 'Corner metadata', value: t.showMeta,
          onChange: (v) => setTweak('showMeta', v)
        })
      )
    );
  }

  window.UntangleFilm = UntangleFilm;
})();
