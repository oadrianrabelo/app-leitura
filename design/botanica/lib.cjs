// Pequena biblioteca de desenho botânico: traço de pena (que afina nas pontas),
// folhas com nervuras e hachuras, pétalas orgânicas. Tudo em currentColor.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const setSeed = (s) => (seed = s);
const jit = (a) => (rnd() - 0.5) * 2 * a;

const f = (n) => Math.round(n * 10) / 10;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const perp = (a) => [-a[1], a[0]];
const rot = (p, ang, o = [0, 0]) => { const c = Math.cos(ang), s = Math.sin(ang); const d = sub(p, o); return [o[0] + d[0] * c - d[1] * s, o[1] + d[0] * s + d[1] * c]; };

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
function sampleCubic(c, n = 40) {
  return Array.from({ length: n + 1 }, (_, i) => cubic(c[0], c[1], c[2], c[3], i / n));
}
/** Pontos → caminho suave (Catmull-Rom convertido em Bézier). */
function smooth(pts, closed = false) {
  if (pts.length < 2) return "";
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${f(P[1][0])} ${f(P[1][1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const c1 = add(p1, mul(sub(p2, p0), 1 / 6));
    const c2 = sub(p2, mul(sub(p3, p1), 1 / 6));
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + " Z" : d;
}
/** Curva suave passando por todos os pontos (Catmull-Rom), amostrada em n pontos. */
function spline(pts, n = 60) {
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const out = [];
  const segs = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const g = (i / n) * segs;
    const k = Math.min(segs - 1, Math.floor(g));
    const t = g - k;
    const p0 = P[k], p1 = P[k + 1], p2 = P[k + 2], p3 = P[k + 3];
    const t2 = t * t, t3 = t2 * t;
    out.push([0, 1].map((j) =>
      0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3),
    ));
  }
  return out;
}

/** Traço de pena: fita preenchida cuja largura segue `w(t)` ao longo da linha central. */
function inkStroke(pts, w) {
  const L = [], R = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const n = perp(norm(sub(b, a)));
    const half = w(i / (pts.length - 1)) / 2;
    L.push(add(pts[i], mul(n, half)));
    R.push(sub(pts[i], mul(n, half)));
  }
  return smooth([...L, ...R.reverse()], true);
}
const taper = (max, min = 0.15, bias = 0.35) => (t) => {
  const k = t < bias ? t / bias : (1 - t) / (1 - bias);
  return min + (max - min) * Math.pow(Math.max(0, Math.min(1, k)), 0.6);
};
const pathEl = (d, attrs = "") => `<path d="${d}" ${attrs}/>`;

module.exports = { spline, rnd, setSeed, jit, f, add, sub, mul, len, norm, perp, rot, cubic, sampleCubic, smooth, inkStroke, taper, pathEl };
