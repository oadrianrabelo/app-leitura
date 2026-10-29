const L = require("./lib.cjs");
const { add, sub, mul, norm, perp, rot, sampleCubic, smooth, inkStroke, taper, pathEl, jit, f } = L;

let clipSeq = 0;
const ink = (d) => pathEl(d, 'fill="currentColor"');

/**
 * Folha longa com nervura central, nervuras laterais e hachura num dos lados
 * (a metade "na sombra"), como gravura.
 */
function leaf({ base, angle, length, width, bend = 0.15, twist = 0.6, fold = 1, shade = 0.35, veins = 7 }) {
  const dir = [Math.sin(angle), -Math.cos(angle)];
  const side = perp(dir);
  const tip = add(add(base, mul(dir, length)), mul(side, -length * bend * twist * 0.6));
  const c1 = add(add(base, mul(dir, length * 0.35)), mul(side, length * bend));
  const c2 = add(add(base, mul(dir, length * 0.78)), mul(side, length * bend * (1 - twist)));
  const mid = sampleCubic([base, c1, c2, tip], 26);
  const profile = (t) => width * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.85)), 0.75) * (0.55 + 0.45 * (1 - t));
  const left = [], right = [];
  mid.forEach((p, i) => {
    const t = i / (mid.length - 1);
    const a = mid[Math.max(0, i - 1)], b = mid[Math.min(mid.length - 1, i + 1)];
    const n = perp(norm(sub(b, a)));
    const wob = 1 + Math.sin(t * 11 + width) * 0.05;
    left.push(add(p, mul(n, (profile(t) / 2) * wob)));
    right.push(sub(p, mul(n, (profile(t) / 2) * wob * (0.9 + 0.1 * fold))));
  });
  const outline = smooth([...left, ...right.slice().reverse()], true);
  const id = `c${++clipSeq}`;
  let s = `<clipPath id="${id}"><path d="${outline}"/></clipPath>`;
  s += pathEl(outline, 'fill="currentColor" fill-opacity="0.2"');
  // contorno em traço de pena: mais grosso no lado de baixo
  s += ink(inkStroke(left, taper(1.5, 0.2, 0.45)));
  s += ink(inkStroke(right, taper(1.1, 0.2, 0.45)));
  // nervura central
  s += ink(inkStroke(mid.slice(0, -2), (t) => 1.6 * (1 - t) + 0.2));
  // nervuras laterais curvas, subindo em direção à ponta
  for (let k = 1; k <= veins; k++) {
    const t = 0.12 + (k / (veins + 1)) * 0.78;
    const i = Math.round(t * (mid.length - 1));
    const p = mid[i];
    const n = perp(norm(sub(mid[Math.min(i + 1, mid.length - 1)], mid[Math.max(i - 1, 0)])));
    const fwd = norm(sub(mid[Math.min(i + 2, mid.length - 1)], p));
    const w = profile(t) / 2;
    for (const sgn of [1, -1]) {
      const end = add(add(p, mul(n, sgn * w * 0.82)), mul(fwd, w * 0.9));
      const ctrl = add(add(p, mul(n, sgn * w * 0.45)), mul(fwd, w * 0.15));
      const pts = sampleCubic([p, ctrl, ctrl, end], 5);
      s += ink(inkStroke(pts, (tt) => 0.7 * (1 - tt) + 0.1));
    }
  }
  // hachura de sombra: linhas finas paralelas no lado direito, recortadas pela folha
  let hatch = "";
  for (let i = 2; i < mid.length - 3; i += 1) {
    const t = i / (mid.length - 1);
    const p = mid[i];
    const n = perp(norm(sub(mid[i + 1], mid[i - 1])));
    const w = profile(t) / 2;
    const a = sub(p, mul(n, w * 0.15));
    const b = add(sub(p, mul(n, w * 1.1)), mul(norm(sub(mid[i + 2], p)), w * 0.5));
    hatch += `M${f(a[0])} ${f(a[1])} L${f(b[0])} ${f(b[1])} `;
  }
  s += `<path d="${hatch}" stroke="currentColor" stroke-width="0.45" stroke-opacity="${shade}" fill="none" clip-path="url(#${id})"/>`;
  return s;
}

/** Pétala orgânica apontando para cima: base estreita, corpo largo, borda levemente ondulada. */
function petalOutline(len, wid, asym = 0, ruffle = 0) {
  const N = 22;
  const left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    let w = (wid / 2) * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.8);
    const shift = asym * wid * 0.22 * u * u;
    const y = -u * len;
    left.push([-w * (1 + ruffle * Math.sin(u * 23 + 1)) + shift, y]);
    right.push([w * (1 + ruffle * Math.sin(u * 19 + 2)) + shift, y]);
  }
  return [...left, ...right.reverse().slice(1, -1)];
}

/**
 * Flor de orquídea (phalaenopsis) em traço de pena com hachuras radiais.
 * `o` é o centro; `a` gira a flor; `s` escala.
 */
function orchid({ o, a = 0, s = 1, lean = 0 }) {
  const T = (p) => add(o, mul(rot(p, a), s));
  let out = "";
  const part = (pts, hatchCount, shade, lw = 1.1) => {
    const P = pts.map(T);
    const d = smooth(P, true);
    const id = `c${++clipSeq}`;
    out += `<clipPath id="${id}"><path d="${d}"/></clipPath>`;
    out += pathEl(d, 'fill="currentColor" fill-opacity="0.22"');
    out += ink(inkStroke([...P, P[0]], taper(lw * s, 0.25 * s, 0.5)));
    // hachuras radiais a partir do centro da flor, só no terço interno
    let h = "";
    for (let i = 0; i < hatchCount; i++) {
      const k = (i + 0.5) / hatchCount;
      const edge = P[Math.round(k * (P.length - 1))];
      const from = add(o, mul(sub(edge, o), 0.05));
      const to = add(o, mul(sub(edge, o), 0.42 + L.rnd() * 0.25));
      h += `M${f(from[0])} ${f(from[1])} L${f(to[0])} ${f(to[1])} `;
    }
    out += `<path d="${h}" stroke="currentColor" stroke-width="${f(0.45 * s)}" stroke-opacity="${shade}" fill="none" clip-path="url(#${id})"/>`;
  };
  const place = (pts, ang, dx = 0, dy = 0) => pts.map((p) => rot(add(p, [dx, dy]), ang));
  // sépalas (em cima e as duas de baixo), mais estreitas
  part(place(petalOutline(34, 16, 0.2, 0.01), 0 + lean), 14, 0.45);
  part(place(petalOutline(31, 15, -0.3, 0.01), 2.55 + lean), 12, 0.5);
  part(place(petalOutline(31, 15, 0.3, 0.01), -2.55 + lean), 12, 0.5);
  // pétalas largas laterais, com borda ondulada
  part(place(petalOutline(37, 38, 0.3, 0.03), 1.32 + lean), 20, 0.4, 1.25);
  part(place(petalOutline(37, 38, -0.3, 0.03), -1.32 + lean), 20, 0.4, 1.25);
  // labelo: babado na frente, com duas "antenas"
  const lip = place(petalOutline(17, 15, 0, 0.06), Math.PI + lean, 0, 4).map(T);
  out += pathEl(smooth(lip, true), 'fill="currentColor" fill-opacity="0.45"');
  out += ink(inkStroke([...lip, lip[0]], taper(1.1 * s, 0.3 * s, 0.5)));
  for (const sgn of [1, -1]) {
    const pts = sampleCubic([T([0, 14]), T([sgn * 4, 20]), T([sgn * 7, 22]), T([sgn * 5, 26])], 10);
    out += ink(inkStroke(pts, (t) => (0.7 - 0.5 * t) * s));
  }
  // coluna no centro
  const col = [T([-3.5, -1]), T([0, -6]), T([3.5, -1]), T([0, 3])];
  out += pathEl(smooth(col, true), 'fill="currentColor" fill-opacity="0.35"');
  out += pathEl(smooth(col, true), `fill="none" stroke="currentColor" stroke-width="${f(0.7 * s)}"`);
  return out;
}

/** Botão de flor: gota com uma linha de dobra. */
function bud({ o, a = 0, s = 1 }) {
  const T = (p) => add(o, mul(rot(p, a), s));
  const pts = [T([0, 0]), T([4.5, -4]), T([4, -10]), T([0, -14]), T([-4, -10]), T([-4.5, -4])];
  let out = pathEl(smooth(pts, true), 'fill="currentColor" fill-opacity="0.3"');
  out += ink(inkStroke([...pts, pts[0]], taper(0.9 * s, 0.2 * s, 0.5)));
  out += ink(inkStroke(sampleCubic([T([0, -1]), T([1.5, -5]), T([1.5, -9]), T([0, -12.5])], 10), (t) => 0.5 * s * (1 - t) + 0.1));
  return out;
}

/** Haste: traço de pena com nós (as marcas onde nascem as flores). Aceita cúbica (4 pontos) ou vários pontos. */
function stem(c, w = 2.2, nodes = []) {
  const pts = c.length === 4 ? sampleCubic(c, 60) : L.spline(c, 60);
  let out = ink(inkStroke(pts, (t) => w * (1 - 0.55 * t) + 0.3));
  for (const t of nodes) {
    const i = Math.round(t * 60);
    const p = pts[i];
    const n = perp(norm(sub(pts[Math.min(i + 1, 60)], pts[Math.max(i - 1, 0)])));
    out += ink(inkStroke([add(p, mul(n, -2.4)), add(p, mul(n, 2.4))], () => 0.7));
  }
  return { out, pts };
}

/** Gavinha: espiral que se enrola cada vez mais apertada. */
function tendril({ o, a = 0, s = 1, turns = 1.6, dir = 1 }) {
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const ang = a + dir * t * turns * Math.PI * 2;
    const r = 16 * s * Math.pow(1 - t, 1.3) + 1.5 * s;
    const travel = mul([Math.cos(a - (dir * Math.PI) / 2), Math.sin(a - (dir * Math.PI) / 2)], 18 * s * t);
    pts.push(add(add(o, travel), [Math.cos(ang) * r - Math.cos(a) * 16 * s, Math.sin(ang) * r - Math.sin(a) * 16 * s]));
  }
  return ink(inkStroke(pts, (t) => 0.9 * s * (1 - t) + 0.15));
}

/** Florzinha de cinco pétalas (para as guirlandas). */
function blossom({ o, s = 1, a = 0 }) {
  let out = "";
  for (let k = 0; k < 5; k++) {
    const ang = a + (k * 2 * Math.PI) / 5 + jit(0.12);
    const pts = petalOutline(7.5, 7, jit(0.2), 0.02).map((p) => add(o, mul(rot(p, ang), s)));
    out += pathEl(smooth(pts, true), 'fill="currentColor" fill-opacity="0.32"');
    out += ink(inkStroke([...pts, pts[0]], taper(0.75 * s, 0.2 * s, 0.5)));
  }
  out += `<circle cx="${f(o[0])}" cy="${f(o[1])}" r="${f(1.6 * s)}" fill="currentColor"/>`;
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * Math.PI * 2;
    out += `<circle cx="${f(o[0] + Math.cos(ang) * 2.8 * s)}" cy="${f(o[1] + Math.sin(ang) * 2.8 * s)}" r="${f(0.55 * s)}" fill="currentColor"/>`;
  }
  return out;
}

/**
 * Borboleta pousada de frente, asas abertas: contorno de pena, nervuras que
 * saem do corpo, pintinhas perto da borda e antenas enroladas.
 */
function butterfly({ o, a = 0, s = 1, open = 1 }) {
  const T = (p) => add(o, mul(rot(p, a), s));
  let out = "";
  const wing = (pts, veins, spots) => {
    const P = pts.map(T);
    const d = smooth(P, true);
    out += pathEl(d, 'fill="currentColor" fill-opacity="0.3"');
    out += ink(inkStroke([...P, P[0]], taper(0.95 * s, 0.25 * s, 0.5)));
    for (let i = 0; i < veins; i++) {
      const k = (i + 0.6) / (veins + 0.2);
      const edge = P[Math.round(k * (P.length - 1))];
      const from = add(o, mul(sub(edge, o), 0.12));
      const to = add(o, mul(sub(edge, o), 0.86));
      const mid = add(add(from, mul(sub(to, from), 0.5)), mul(perp(norm(sub(to, from))), 1.2 * s));
      out += ink(inkStroke(sampleCubic([from, mid, mid, to], 8), (t) => 0.5 * s * (1 - t) + 0.12));
    }
    for (const k of spots) {
      const edge = P[Math.round(k * (P.length - 1))];
      const c = add(o, mul(sub(edge, o), 0.78));
      out += `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(1.3 * s)}" fill="currentColor" fill-opacity="0.7"/>`;
    }
  };
  for (const sgn of [1, -1]) {
    const fore = petalOutline(26, 22, 0.5 * sgn, 0.015).map((p) => rot(p, sgn * (0.95 + 0.25 * (1 - open))));
    const hind = petalOutline(18, 19, -0.3 * sgn, 0.03).map((p) => rot(add(p, [0, 2]), sgn * (2.25 - 0.1 * (1 - open))));
    wing(fore, 5, [0.3, 0.5, 0.7]);
    wing(hind, 4, [0.45]);
  }
  // corpo e antenas
  const body = [T([0, -9]), T([1.6, -4]), T([1.4, 6]), T([0, 13]), T([-1.4, 6]), T([-1.6, -4])];
  out += pathEl(smooth(body, true), 'fill="currentColor"');
  for (const sgn of [1, -1]) {
    const pts = sampleCubic([T([0, -9]), T([sgn * 3, -16]), T([sgn * 6, -21]), T([sgn * 9, -22])], 10);
    out += ink(inkStroke(pts, () => 0.45 * s));
    const tip = pts[pts.length - 1];
    out += `<circle cx="${f(tip[0])}" cy="${f(tip[1])}" r="${f(0.9 * s)}" fill="currentColor"/>`;
  }
  return out;
}

/**
 * Cacho de glicínia pendurado: um eixo que cai em curva e florzinhas em
 * pares, diminuindo até virar botão na ponta.
 */
function wisteria({ o, length = 40, s = 1, sway = 0.2 }) {
  let out = "";
  const tip = add(o, [length * sway, length]);
  const axis = sampleCubic([o, add(o, [length * sway * 0.2, length * 0.35]), add(o, [length * sway * 0.9, length * 0.7]), tip], 30);
  out += ink(inkStroke(axis, (t) => 0.7 * s * (1 - t) + 0.15));
  const n = Math.round(length / 4.2);
  for (let i = 0; i < n; i++) {
    const t = 0.06 + (i / n) * 0.9;
    const p = axis[Math.round(t * 30)];
    const k = 1 - t * 0.62;
    for (const sgn of [1, -1]) {
      if (t > 0.82 && sgn < 0) continue;
      const c = add(p, [sgn * (4.6 * k * s + jit(0.6)), jit(0.8)]);
      const ang = sgn * (1.9 + jit(0.3)) + Math.PI;
      const pts = petalOutline(6.2 * k, 6.4 * k, jit(0.3), 0.04).map((q) => add(c, mul(rot(q, ang), s)));
      out += pathEl(smooth(pts, true), 'fill="currentColor" fill-opacity="0.4"');
      out += ink(inkStroke([...pts, pts[0]], taper(0.6 * s, 0.18 * s, 0.5)));
    }
  }
  return out;
}

/** Pétala solta, caindo (para espalhar pelas ilustrações). */
function fallingPetal({ o, a = 0, s = 1 }) {
  const pts = petalOutline(7, 5.5, 0.4, 0.03).map((p) => add(o, mul(rot(p, a), s)));
  let out = pathEl(smooth(pts, true), 'fill="currentColor" fill-opacity="0.45"');
  out += ink(inkStroke([...pts, pts[0]], taper(0.6 * s, 0.15 * s, 0.5)));
  return out;
}

module.exports = { leaf, orchid, bud, stem, blossom, tendril, butterfly, wisteria, fallingPetal };
