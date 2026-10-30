// Pintura em aquarela no canvas (técnica de camadas de polígonos deformados,
// como a de Tyler Hobbs): cada mancha é dezenas de véus quase transparentes,
// com borda irregular, acúmulo de pigmento na borda e granulação do papel.
(function () {
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const lerp = (a, b, t) => a + (b - a) * t;

  function deform(poly, depth, variance) {
    let p = poly.map((q) => [...q]);
    for (let d = 0; d < depth; d++) {
      const out = [];
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const w = a[2] ?? 1;
        out.push(a);
        const m = [(a[0] + b[0]) / 2 + gauss() * len * variance * w, (a[1] + b[1]) / 2 + gauss() * len * variance * w, w * (0.85 + rnd() * 0.3)];
        out.push(m);
      }
      p = out;
      variance *= 0.82;
    }
    return p;
  }

  function fillPoly(g, p) {
    g.beginPath();
    g.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]);
    g.closePath();
    g.fill();
  }

  /** Mancha de aquarela: `poly` é o contorno base; `color` em rgb; `opts.layers` véus */
  function wash(g, poly, color, opts = {}) {
    const { layers = 36, alpha = 0.045, spread = 0.09, edge = 0.5, wet = 1 } = opts;
    const base = deform(poly.map((q) => [q[0], q[1], 0.6 + rnd() * 0.8]), 2, spread * wet);
    g.save();
    g.globalCompositeOperation = "multiply";
    for (let i = 0; i < layers; i++) {
      const p = deform(base, 4, spread * 0.7 * wet);
      g.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
      fillPoly(g, p);
      if (edge && i % 3 === 0) {
        g.strokeStyle = `rgba(${color[0] * 0.8 | 0},${color[1] * 0.8 | 0},${color[2] * 0.8 | 0},${alpha * edge})`;
        g.lineWidth = 0.8 + rnd();
        g.stroke();
      }
    }
    g.restore();
  }

  /** Pincelada: traço com largura variável, pintado como véus */
  function stroke(g, pts, width, color, opts = {}) {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      const t = i / (pts.length - 1);
      const w = (typeof width === "function" ? width(t) : width) / 2;
      L.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
      R.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
    }
    wash(g, [...L, ...R.reverse()], color, { layers: 18, alpha: 0.08, spread: 0.02, edge: 0.8, ...opts });
  }

  function spline(pts, n = 60) {
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    const out = [];
    const segs = pts.length - 1;
    for (let i = 0; i <= n; i++) {
      const gg = (i / n) * segs;
      const k = Math.min(segs - 1, Math.floor(gg));
      const t = gg - k, t2 = t * t, t3 = t2 * t;
      const p0 = P[k], p1 = P[k + 1], p2 = P[k + 2], p3 = P[k + 3];
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
    return out;
  }

  /** Granulação do papel: tira um pouco de tinta em pontinhos, como pigmento assentando */
  function granulate(g, w, h, amount = 0.18) {
    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const n = rnd();
      d[i + 3] = d[i + 3] * (1 - amount + n * amount * 1.2);
    }
    g.putImageData(img, 0, 0);
  }

  const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));

  window.Aquarela = { setSeed: (s) => (seed = s), rnd, gauss, deform, wash, stroke, spline, granulate, mix, lerp };
})();
