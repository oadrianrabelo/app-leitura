// Composições em aquarela. Cada função recebe o contexto e pinta.
(function () {
  const A = window.Aquarela;
  const { rnd, gauss, wash, stroke, spline, mix, lerp } = A;

  const LEAF = [[150, 178, 108], [104, 140, 92], [176, 190, 120]];
  const STEM = [112, 92, 66];

  function leafPoly(x, y, ang, len, wid) {
    const pts = [];
    const N = 20;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const w = Math.sin(Math.PI * Math.pow(t, 0.8)) * wid / 2;
      pts.push([t * len, -w]);
    }
    for (let i = N - 1; i > 0; i--) {
      const t = i / N;
      const w = Math.sin(Math.PI * Math.pow(t, 0.8)) * wid / 2;
      pts.push([t * len, w * (0.85 + rnd() * 0.2)]);
    }
    const c = Math.cos(ang), s = Math.sin(ang);
    return pts.map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
  }

  function leaf(g, x, y, ang, len, wid, tone = 0) {
    const base = mix(mix(LEAF[2], LEAF[0], rnd()), LEAF[1], tone * 0.6 + rnd() * 0.2);
    wash(g, leafPoly(x, y, ang, len, wid), base, { layers: 30, alpha: 0.045, spread: 0.07, edge: 1.6 });
    // metade na sombra, um pouco mais escura
    const half = leafPoly(x, y, ang, len * 0.92, wid).slice(0, 20);
    half.push([x + Math.cos(ang) * len * 0.9, y + Math.sin(ang) * len * 0.9]);
    wash(g, half, LEAF[1], { layers: 10, alpha: 0.035, spread: 0.06, edge: 0.3 });
    // nervura
    const vein = [];
    for (let i = 0; i <= 10; i++) vein.push([x + Math.cos(ang) * len * i / 11, y + Math.sin(ang) * len * i / 11]);
    stroke(g, vein, (t) => 1.2 * (1 - t) + 0.3, LEAF[1], { layers: 5, alpha: 0.07 });
  }

  /** Folha composta da glicínia: um eixo com pares de folíolos, caindo em curva */
  function compoundLeaf(g, x, y, ang, len, size = 1) {
    const pts = [];
    const droop = 0.5 + rnd() * 0.3;
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const a = ang + droop * t * t * Math.sign(Math.cos(ang) || 1);
      const prev = pts[i - 1] ?? [x, y];
      pts.push(i === 0 ? [x, y] : [prev[0] + Math.cos(a) * len / 12, prev[1] + Math.sin(a) * len / 12]);
    }
    stroke(g, pts, (t) => 2.4 * size * (1 - t) + 0.6, mix(STEM, LEAF[1], 0.5), { layers: 8, alpha: 0.09 });
    const pairs = 5;
    for (let k = 1; k <= pairs; k++) {
      const i = Math.round((k / (pairs + 0.6)) * 12);
      const p = pts[i], q = pts[Math.min(12, i + 1)];
      const dir = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const l = (34 + rnd() * 8) * size * (1 - k * 0.04);
      leaf(g, p[0], p[1], dir - 0.9 - rnd() * 0.2, l, l * 0.42, 0.2);
      leaf(g, p[0], p[1], dir + 0.9 + rnd() * 0.2, l, l * 0.42, 0.6);
    }
    const tip = pts[12], pre = pts[11];
    leaf(g, tip[0], tip[1], Math.atan2(tip[1] - pre[1], tip[0] - pre[0]), 40 * size, 17 * size, 0.4);
  }

  function blob(cx, cy, r, ang = 0, squash = 0.8) {
    const pts = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr = r * (0.85 + rnd() * 0.3);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr * squash;
      pts.push([cx + px * Math.cos(ang) - py * Math.sin(ang), cy + px * Math.sin(ang) + py * Math.cos(ang)]);
    }
    return pts;
  }

  /** Cacho de glicínia: florzinhas em espiral ao redor do eixo, do claro (topo) ao escuro (ponta) */
  function wisteria(g, x, y, len, palette, sway = 0.15, size = 1) {
    const [top, mid, tip] = palette;
    const axis = spline([[x, y], [x + len * sway * 0.4, y + len * 0.3], [x + len * sway * 1.1, y + len * 0.65], [x + len * sway * 0.75 + len * 0.02 * gauss(), y + len]], 80);
    stroke(g, axis.slice(0, 30), (t) => (1.8 * (1 - t) + 0.4) * size, mix(STEM, [120, 110, 90], 0.3), { layers: 5, alpha: 0.08 });
    // véu do cacho inteiro, para os pontinhos virarem um corpo só
    const scale = (len / 220) ** 0.4 * size;
    const cone = [];
    const cw = (t) => 24 * scale * Math.pow(1 - t, 0.75) * Math.min(1, t * 6 + 0.35);
    for (let i = 0; i <= 16; i++) { const t = i / 16; const p = axis[Math.round(t * 76)]; cone.push([p[0] - cw(t) * (0.8 + rnd() * 0.4), p[1]]); }
    for (let i = 16; i >= 0; i--) { const t = i / 16; const p = axis[Math.round(t * 76)]; cone.push([p[0] + cw(t) * (0.8 + rnd() * 0.4), p[1]]); }
    wash(g, cone, mix(top, mid, 0.4), { layers: 14, alpha: 0.022, spread: 0.14, edge: 0 });
    const n = Math.round(len / (3.2 * Math.sqrt(size)));
    const florets = [];
    for (let i = 0; i < n; i++) {
      const t = Math.pow(i / n, 0.95);
      const p = axis[Math.min(80, Math.round(t * 80))];
      const width = 22 * scale * Math.pow(1 - t, 0.8) * Math.min(1, t * 5 + 0.45) * (0.55 + rnd() * 0.5) + 2;
      const a = i * 2.4;
      const side = Math.sin(a);
      const depth = Math.cos(a);
      const r = lerp(10, 3.6, t) * (0.85 + rnd() * 0.3) * (len / 220) ** 0.35 * size;
      const color = t < 0.5 ? mix(top, mid, t * 2) : mix(mid, tip, (t - 0.5) * 2);
      florets.push({ x: p[0] + side * width + gauss() * 1.5, y: p[1] + gauss() * 2, r, color: mix(color, [255, 255, 255], depth > 0.5 ? 0.18 : 0), depth, t });
    }
    // de trás para a frente
    florets.sort((a, b) => a.depth - b.depth);
    for (const f of florets) {
      const ang = -0.6 + rnd() * 1.2;
      wash(g, blob(f.x, f.y, f.r, ang, 0.75), f.color, { layers: 9, alpha: 0.085, spread: 0.1, edge: 1.4 });
      // pétala de cima (estandarte), mais clara, com o miolo de pigmento
      if (f.t < 0.8) wash(g, blob(f.x + f.r * 0.25, f.y - f.r * 0.45, f.r * 0.65, ang, 0.7), mix(f.color, [255, 250, 255], 0.35), { layers: 6, alpha: 0.1, spread: 0.06, edge: 0.6 });
      if (f.t < 0.7 && rnd() < 0.5) wash(g, blob(f.x - f.r * 0.1, f.y + f.r * 0.1, f.r * 0.22), [230, 205, 120], { layers: 4, alpha: 0.12, spread: 0.05, edge: 0 });
    }
  }

  // cada paleta: cor principal e uma variação, para os cachos não ficarem iguais
  const PALETTES = {
    lilas: [[[214, 200, 240], [168, 140, 220], [110, 78, 170]], [[222, 206, 238], [186, 150, 214], [124, 82, 160]]],
    azul: [[[204, 218, 244], [134, 164, 224], [70, 98, 172]], [[216, 214, 244], [160, 160, 226], [96, 90, 176]]],
    rosa: [[[246, 214, 226], [226, 150, 182], [170, 80, 124]], [[240, 210, 236], [210, 152, 206], [150, 84, 150]]],
    coral: [[[248, 222, 204], [232, 160, 128], [184, 92, 66]], [[246, 216, 214], [222, 150, 150], [170, 84, 92]]],
  };

  /** Galho principal: dois ramos que se enroscam, com espessura irregular e gavinhas */
  function branch(g, pts, w) {
    const path = spline(pts, 120);
    const bumps = Array.from({ length: 9 }, () => 0.75 + rnd() * 0.5);
    const thick = (t) => w * (1 - t * 0.5) * bumps[Math.floor(t * 8)] + 1;
    stroke(g, path, thick, STEM, { layers: 14, alpha: 0.075 });
    stroke(g, path.map(([x, y]) => [x, y - w * 0.2]), (t) => thick(t) * 0.35, [168, 150, 112], { layers: 6, alpha: 0.05 });
    // ramo fino enroscado
    const twin = path.map(([x, y], i) => [x, y + Math.sin(i / 7) * w * 0.9]);
    stroke(g, twin, (t) => w * 0.32 * (1 - t * 0.5) + 0.6, mix(STEM, LEAF[1], 0.35), { layers: 8, alpha: 0.07 });
    return path;
  }

  /** Guirlanda de glicínia para pendurar sob a prateleira */
  function garland(g, W, H, opts = {}) {
    const { seed = 3, palette = "lilas", flip = false } = opts;
    A.setSeed(seed);
    if (flip) { g.translate(W, 0); g.scale(-1, 1); }
    const path = branch(g, [[-20, 70], [W * 0.18, 96], [W * 0.38, 64], [W * 0.6, 100], [W * 0.8, 74], [W * 0.96, 92]], 9);
    const at = (t) => path[Math.round(t * 120)];
    // folhas atrás dos cachos
    [[0.08, -2.6], [0.22, 0.5], [0.33, -0.3], [0.47, 2.7], [0.58, 0.9], [0.7, -0.4], [0.83, 2.4], [0.93, 0.6]].forEach(([t, a]) => {
      const p = at(t);
      compoundLeaf(g, p[0], p[1], a + gauss() * 0.15, 150 + rnd() * 60, 0.95 + rnd() * 0.2);
    });
    const [pal, alt] = PALETTES[palette];
    [[0.12, 230], [0.27, 360], [0.4, 260], [0.53, 420], [0.66, 300], [0.78, 380], [0.9, 250]].forEach(([t, len], i) => {
      const p = at(t);
      wisteria(g, p[0] + gauss() * 6, p[1] + 6, Math.min(len, H - p[1] - 30), i % 3 === 1 ? alt : pal, (rnd() - 0.4) * 0.3);
    });
    // algumas folhas na frente
    [[0.18, 1.2], [0.62, 1.9], [0.86, 1.1]].forEach(([t, a]) => {
      const p = at(t);
      compoundLeaf(g, p[0], p[1], a, 120 + rnd() * 30, 0.85);
    });
  }

  /** Canto de cima, à direita: o galho entra pela borda e os cachos caem */
  function corner(g, W, H, opts = {}) {
    const { seed = 7, palette = "lilas" } = opts;
    A.setSeed(seed);
    const path = branch(g, [[W + 20, 30], [W * 0.78, 52], [W * 0.5, 40], [W * 0.26, 70], [W * 0.08, 58]], 8);
    const at = (t) => path[Math.round(t * 120)];
    [[0.12, 2.2], [0.3, 0.6], [0.45, 2.6], [0.62, 0.3], [0.8, 2.9], [0.96, 1.4]].forEach(([t, a]) => {
      const p = at(t);
      compoundLeaf(g, p[0], p[1], a + gauss() * 0.15, 120 + rnd() * 50, 0.9);
    });
    const [pal, alt] = PALETTES[palette];
    // os cachos longos ficam junto da borda; para o lado do texto, só folhas e cachos curtinhos
    [[0.06, H * 0.82], [0.17, H * 0.6], [0.29, H * 0.72], [0.45, H * 0.26], [0.62, H * 0.18]].forEach(([t, len], i) => {
      const p = at(t);
      wisteria(g, p[0], p[1] + 6, Math.min(len, H - p[1] - 20), i % 2 ? alt : pal, (rnd() - 0.5) * 0.25);
    });
    [[0.28, 1.6], [0.66, 1.3]].forEach(([t, a]) => {
      const p = at(t);
      compoundLeaf(g, p[0], p[1], a, 110, 0.8);
    });
  }

  /** Raminho solto: um cacho com folhas, para cantos pequenos e telas de celebração */
  function sprig(g, W, H, opts = {}) {
    const { seed = 5, palette = "lilas" } = opts;
    A.setSeed(seed);
    const path = branch(g, [[W * 0.15, H * 0.12], [W * 0.45, H * 0.08], [W * 0.8, H * 0.16]], 6);
    const at = (t) => path[Math.round(t * 120)];
    compoundLeaf(g, at(0.1)[0], at(0.1)[1], 2.4, 130, 0.85);
    compoundLeaf(g, at(0.85)[0], at(0.85)[1], 0.5, 140, 0.9);
    const [pal, alt] = PALETTES[palette];
    wisteria(g, at(0.3)[0], at(0.3)[1] + 6, H * 0.72, pal, -0.08);
    wisteria(g, at(0.66)[0], at(0.66)[1] + 6, H * 0.55, alt, 0.08);
    compoundLeaf(g, at(0.5)[0], at(0.5)[1], 1.2, 100, 0.75);
  }

  // ——— Composições maiores e variadas ———

  /** Trepadeira ao longo de um caminho: galho, folhas dos dois lados e cachos onde pedir */
  function vine(g, pts, o) {
    const { w = 8, leaves = 10, leafLen = 150, leafSize = 1, racemes = [], palette = "lilas", size = 1, front = 3 } = o;
    const path = branch(g, pts, w);
    const at = (t) => path[Math.min(120, Math.max(0, Math.round(t * 120)))];
    const dirAt = (t) => { const a = at(t - 0.01), b = at(t + 0.01); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    for (let k = 0; k < leaves; k++) {
      const t = (k + 0.5) / leaves + gauss() * 0.02;
      const p = at(t);
      const side = k % 2 ? 1 : -1;
      compoundLeaf(g, p[0], p[1], dirAt(t) + side * (0.7 + rnd() * 0.6), leafLen * (0.75 + rnd() * 0.5), leafSize * (0.85 + rnd() * 0.3));
    }
    const [pal, alt] = PALETTES[palette];
    racemes.forEach(([t, len, sway = (rnd() - 0.5) * 0.25], i) => {
      const p = at(t);
      wisteria(g, p[0] + gauss() * 4, p[1] + 4 * size, len, i % 3 === 1 ? alt : pal, sway, size * (0.85 + rnd() * 0.3));
    });
    for (let k = 0; k < front; k++) {
      const t = rnd();
      const p = at(t);
      compoundLeaf(g, p[0], p[1], dirAt(t) + (rnd() < 0.5 ? 1 : -1) * (1 + rnd() * 0.5), leafLen * 0.7, leafSize * 0.8);
    }
    return { path, at };
  }

  /** Guirlanda da prateleira, em vários desenhos conforme a semente */
  function shelfGarland(g, W, H, opts = {}) {
    const { seed = 1, palette = "lilas", flip = false } = opts;
    A.setSeed(seed * 7919);
    if (flip) { g.translate(W, 0); g.scale(-1, 1); }
    const kind = seed % 3;
    const S = 1.55;
    if (kind === 0) {
      // ramo reto com cachos de comprimentos bem diferentes
      vine(g, [[-20, 46], [W * 0.3, 60], [W * 0.62, 42], [W + 20, 58]], {
        w: 7, leaves: 9, leafLen: 120, leafSize: 1.1, palette, size: S,
        racemes: [[0.1, H * 0.38], [0.3, H * 0.78], [0.52, H * 0.5], [0.72, H * 0.9], [0.9, H * 0.42]],
      });
    } else if (kind === 1) {
      // ramo que pende em barriga, com cachos no ponto mais baixo e uma ponta caindo
      vine(g, [[-20, 34], [W * 0.25, 90], [W * 0.5, 120], [W * 0.75, 70], [W + 20, 30]], {
        w: 7, leaves: 10, leafLen: 120, leafSize: 1.1, palette, size: S,
        racemes: [[0.35, H * 0.62], [0.5, H * 0.72], [0.62, H * 0.5], [0.88, H * 0.34]],
      });
      vine(g, [[W * 0.05, 50], [W * 0.08, H * 0.4], [W * 0.03, H * 0.75]], { w: 3, leaves: 5, leafLen: 100, palette, size: S, racemes: [], front: 1 });
    } else {
      // folhagem farta de um lado, com dois cachos grandes do outro
      vine(g, [[-20, 50], [W * 0.4, 66], [W + 20, 44]], {
        w: 7, leaves: 12, leafLen: 140, leafSize: 1.15, palette, size: S,
        racemes: [[0.7, H * 0.85], [0.82, H * 0.6], [0.2, H * 0.4]],
      });
      vine(g, [[W * 0.55, 60], [W * 0.5, H * 0.35], [W * 0.56, H * 0.62]], { w: 3, leaves: 4, leafLen: 90, palette, size: S, racemes: [], front: 0 });
    }
  }

  /** Trepadeira subindo pela lateral da estante, com um cacho caindo do alto */
  function climb(g, W, H, opts = {}) {
    const { seed = 2, palette = "lilas", flip = false } = opts;
    A.setSeed(seed * 104729);
    if (flip) { g.translate(W, 0); g.scale(-1, 1); }
    const v = vine(g, [[W * 0.4, H + 10], [W * 0.62, H * 0.75], [W * 0.3, H * 0.5], [W * 0.6, H * 0.25], [W * 0.42, H * 0.06]], {
      w: 6, leaves: 12, leafLen: 120, leafSize: 1.05, palette, size: 1.5, racemes: [], front: 2,
    });
    const [pal, alt] = PALETTES[palette];
    const p = v.at(0.8), q = v.at(0.92);
    wisteria(g, p[0], p[1], H * 0.32, pal, 0.1, 1.5);
    wisteria(g, q[0], q[1], H * 0.22, alt, -0.1, 1.35);
  }

  /** Canto de cima, à direita: a trepadeira sobe pela borda, atravessa o canto e segue pelo topo */
  function cornerBig(g, W, H, opts = {}) {
    const { seed = 7, palette = "lilas" } = opts;
    A.setSeed(seed);
    const S = 1.6;
    // ramo principal: sobe pela direita, faz a curva no canto e corre pelo topo
    vine(g, [[W - 70, H + 20], [W - 120, H * 0.78], [W - 60, H * 0.55], [W - 130, H * 0.32], [W - 90, H * 0.12], [W * 0.72, 60], [W * 0.42, 90], [W * 0.1, 50]], {
      w: 10, leaves: 22, leafLen: 160, leafSize: 1.2, palette, size: S,
      racemes: [[0.62, H * 0.42], [0.7, H * 0.3], [0.78, H * 0.22], [0.88, H * 0.12], [0.96, H * 0.08], [0.3, H * 0.18], [0.45, H * 0.2]],
    });
    // ramo fino atravessando o canto na diagonal
    vine(g, [[W * 0.5, -30], [W * 0.68, H * 0.1], [W * 0.86, H * 0.2], [W + 30, H * 0.3]], {
      w: 4, leaves: 9, leafLen: 120, leafSize: 1, palette, size: S,
      racemes: [[0.3, H * 0.3], [0.62, H * 0.22]],
    });
  }

  window.Arte = { shelfGarland, climb, cornerBig, garland, corner, sprig, wisteria, compoundLeaf, leaf, branch, PALETTES };
})();
