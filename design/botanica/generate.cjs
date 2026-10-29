// Gera as ilustrações botânicas em src/assets/botanica (SVG monocromático, currentColor).
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const S = require("./shapes.cjs");
const OUT = path.resolve(__dirname, "../../src/assets/botanica");

const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="currentColor">${body}</svg>`;

// 1. Haste de orquídea em S, para o fundo das telas
function orchidBranch() {
  L.setSeed(11);
  let b = "";
  b += S.leaf({ base: [96, 396], angle: -1.3, length: 128, width: 48, bend: -0.22, twist: 0.8, shade: 0.4 });
  b += S.leaf({ base: [100, 396], angle: 1.1, length: 150, width: 52, bend: 0.2, twist: 0.9, shade: 0.35 });
  b += S.leaf({ base: [98, 398], angle: -0.3, length: 100, width: 40, bend: -0.28, twist: 0.7, shade: 0.45 });
  const st = S.stem([[98, 382], [70, 320], [96, 250], [74, 190], [120, 120], [200, 80], [262, 86]], 2.6, [0.3, 0.5, 0.68]);
  b += st.out;
  const at = (t) => st.pts[Math.round(t * 60)];
  b += S.tendril({ o: at(0.22), a: 2.6, s: 0.9, turns: 1.5, dir: -1 });
  b += S.stem([at(0.82), L.add(at(0.82), [10, -24]), L.add(at(0.82), [30, -38]), L.add(at(0.82), [50, -36])], 1.2).out;
  b += S.orchid({ o: L.add(at(0.4), [-12, 4]), a: -0.45, s: 1.05 });
  b += S.orchid({ o: L.add(at(0.6), [8, -6]), a: 0.05, s: 0.98 });
  b += S.orchid({ o: L.add(at(0.78), [12, 8]), a: 0.55, s: 0.85 });
  b += S.bud({ o: L.add(at(0.82), [50, -36]), a: 1.7, s: 1 });
  b += S.bud({ o: L.add(at(0.93), [4, -4]), a: 1.2, s: 0.9 });
  b += S.bud({ o: at(1), a: 1.5, s: 0.75 });
  return svg("0 40 300 380", b);
}

// 2. Guirlanda ondulada com folhinhas, florzinhas e gavinhas, para a estante
function garland(seed, width = 360) {
  L.setSeed(seed);
  let b = "";
  const wave = [];
  for (let i = 0; i <= 6; i++) wave.push([(i / 6) * width, 18 + Math.sin(i * 1.3 + seed) * 12]);
  const st = S.stem(wave, 1.5);
  b += st.out;
  for (let k = 1; k < 16; k++) {
    const t = k / 16 + L.jit(0.012);
    const p = st.pts[Math.round(t * 60)];
    const up = k % 2 === 0;
    b += S.leaf({ base: p, angle: (up ? -0.75 : 2.35) + L.jit(0.4), length: 25 + L.jit(5), width: 11 + L.jit(2), bend: up ? 0.24 : -0.24, twist: 0.8, veins: 3, shade: 0.4 });
    if (k % 3 === 1) b += S.blossom({ o: L.add(p, [L.jit(5), up ? 15 : -11]), s: 0.85 + L.jit(0.15), a: L.rnd() * 6 });
  }
  for (const [t, dir] of [[0.12, 1], [0.48, -1], [0.82, 1]]) b += S.tendril({ o: st.pts[Math.round(t * 60)], a: dir > 0 ? 1.2 : 1.9, s: 0.55, turns: 1.4, dir });
  for (const t of [0.3, 0.66, 0.94]) {
    const p = st.pts[Math.round(t * 60)];
    const drop = S.stem([p, L.add(p, [5, 12]), L.add(p, [-3, 24]), L.add(p, [2, 36])], 0.8);
    b += drop.out;
    b += S.blossom({ o: L.add(p, [2, 38]), s: 0.75, a: L.rnd() * 6 });
    b += S.leaf({ base: L.add(p, [1, 16]), angle: 2.0, length: 15, width: 7, veins: 2, shade: 0.3 });
  }
  return svg(`-10 -30 ${width + 20} 100`, b);
}

// 3. Raminho de canto, em S, com uma orquídea pequena e uma gavinha
function cornerSprig() {
  L.setSeed(5);
  let b = "";
  const st = S.stem([[8, 150], [50, 132], [70, 100], [112, 82], [140, 44], [176, 22]], 1.6);
  b += st.out;
  [0.16, 0.32, 0.48, 0.62].forEach((t, i) => {
    const p = st.pts[Math.round(t * 60)];
    b += S.leaf({ base: p, angle: (i % 2 ? -0.25 : 1.75) + L.jit(0.2), length: 40 - i * 4, width: 16 - i, bend: i % 2 ? 0.25 : -0.25, twist: 0.8, veins: 4 });
  });
  b += S.tendril({ o: st.pts[22], a: 2.2, s: 0.6, turns: 1.4, dir: -1 });
  b += S.orchid({ o: L.add(st.pts[50], [6, 6]), a: 0.5, s: 0.72 });
  b += S.bud({ o: st.pts[60], a: 0.9, s: 0.8 });
  return svg("0 -10 190 170", b);
}

// 4. Flor solta
function bloom() {
  L.setSeed(3);
  return svg("-48 -48 96 96", S.orchid({ o: [0, 4], a: 0, s: 1.15 }));
}

fs.mkdirSync(OUT, { recursive: true });
const files = {
  "orquidea-haste.svg": orchidBranch(),
  "guirlanda-1.svg": garland(21),
  "guirlanda-2.svg": garland(42),
  "raminho.svg": cornerSprig(),
  "orquidea.svg": bloom(),
};
for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), content);
console.log(Object.entries(files).map(([n, c]) => `${n} ${(c.length / 1024).toFixed(1)}KB`).join("\n"));

require("child_process").execSync(`node ${path.join(__dirname, "rasterize.cjs")}`, { stdio: "inherit" });
