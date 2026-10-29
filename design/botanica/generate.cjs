// Gera as ilustrações botânicas em src/assets/botanica.
// Cada ilustração sai em camadas (folhas, flores, florzinhas, detalhes): no app,
// cada camada é uma máscara pintada com uma cor do tema, como gravura colorida à mão.
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const S = require("./shapes.cjs");
const OUT = path.resolve(__dirname, "../../src/assets/botanica");

const LAYERS = ["folhas", "flores", "florzinhas", "detalhes"];
const svg = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="currentColor">${body}</svg>`;
const art = (vb) => ({ vb, folhas: "", flores: "", florzinhas: "", detalhes: "" });

// 1. Haste de orquídea em S, para o fundo das telas
function orchidBranch() {
  L.setSeed(11);
  const b = art("0 40 300 380");
  b.folhas += S.leaf({ base: [96, 396], angle: -1.3, length: 128, width: 48, bend: -0.22, twist: 0.8, shade: 0.4 });
  b.folhas += S.leaf({ base: [100, 396], angle: 1.1, length: 150, width: 52, bend: 0.2, twist: 0.9, shade: 0.35 });
  b.folhas += S.leaf({ base: [98, 398], angle: -0.3, length: 100, width: 40, bend: -0.28, twist: 0.7, shade: 0.45 });
  const st = S.stem([[98, 382], [70, 320], [96, 250], [74, 190], [120, 120], [200, 80], [262, 86]], 2.6, [0.3, 0.5, 0.68]);
  b.folhas += st.out;
  const at = (t) => st.pts[Math.round(t * 60)];
  b.folhas += S.tendril({ o: at(0.22), a: 2.6, s: 0.9, turns: 1.5, dir: -1 });
  b.folhas += S.stem([at(0.82), L.add(at(0.82), [10, -24]), L.add(at(0.82), [30, -38]), L.add(at(0.82), [50, -36])], 1.2).out;
  b.flores += S.orchid({ o: L.add(at(0.4), [-12, 4]), a: -0.45, s: 1.05 });
  b.flores += S.orchid({ o: L.add(at(0.6), [8, -6]), a: 0.05, s: 0.98 });
  b.flores += S.orchid({ o: L.add(at(0.78), [12, 8]), a: 0.55, s: 0.85 });
  b.florzinhas += S.bud({ o: L.add(at(0.82), [50, -36]), a: 1.7, s: 1 });
  b.florzinhas += S.bud({ o: L.add(at(0.93), [4, -4]), a: 1.2, s: 0.9 });
  b.florzinhas += S.bud({ o: at(1), a: 1.5, s: 0.75 });
  b.detalhes += S.butterfly({ o: [236, 168], a: 0.35, s: 0.95 });
  b.detalhes += S.butterfly({ o: [182, 268], a: -0.5, s: 0.55, open: 0.7 });
  b.detalhes += S.fallingPetal({ o: [40, 150], a: 2.2, s: 1 });
  b.detalhes += S.fallingPetal({ o: [150, 330], a: -0.9, s: 0.85 });
  b.detalhes += S.fallingPetal({ o: [24, 250], a: 0.6, s: 0.7 });
  return b;
}

// 2. Guirlanda ondulada com folhinhas, florzinhas e cachos de glicínia, para a estante
function garland(seed, width = 360, withButterfly = false) {
  L.setSeed(seed);
  const b = art(`-10 -30 ${width + 20} 110`);
  const wave = [];
  for (let i = 0; i <= 6; i++) wave.push([(i / 6) * width, 18 + Math.sin(i * 1.3 + seed) * 12]);
  const st = S.stem(wave, 1.5);
  b.folhas += st.out;
  for (let k = 1; k < 16; k++) {
    const t = k / 16 + L.jit(0.012);
    const p = st.pts[Math.round(t * 60)];
    const up = k % 2 === 0;
    b.folhas += S.leaf({ base: p, angle: (up ? -0.75 : 2.35) + L.jit(0.4), length: 25 + L.jit(5), width: 11 + L.jit(2), bend: up ? 0.24 : -0.24, twist: 0.8, veins: 3, shade: 0.4 });
    if (k % 3 === 1) b.florzinhas += S.blossom({ o: L.add(p, [L.jit(5), up ? 15 : -11]), s: 0.85 + L.jit(0.15), a: L.rnd() * 6 });
  }
  for (const [t, dir] of [[0.12, 1], [0.48, -1], [0.82, 1]]) b.folhas += S.tendril({ o: st.pts[Math.round(t * 60)], a: dir > 0 ? 1.2 : 1.9, s: 0.55, turns: 1.4, dir });
  // Cachos pendurados, de comprimentos diferentes
  [[0.3, 44], [0.56, 30], [0.94, 50], [0.08, 26]].forEach(([t, len], i) => {
    const p = st.pts[Math.round(t * 60)];
    b.flores += S.wisteria({ o: L.add(p, [0, 3]), length: len, s: 0.95, sway: i % 2 ? -0.18 : 0.22 });
    b.folhas += S.leaf({ base: L.add(p, [1, 4]), angle: i % 2 ? 2.4 : 1.9, length: 16, width: 7, veins: 2, shade: 0.3 });
  });
  if (withButterfly) b.detalhes += S.butterfly({ o: [width * 0.72, -6], a: 0.3, s: 0.6 });
  b.detalhes += S.fallingPetal({ o: [width * 0.4, 66], a: 1.1, s: 0.8 });
  b.detalhes += S.fallingPetal({ o: [width * 0.86, 74], a: -0.6, s: 0.7 });
  return b;
}

// 3. Raminho de canto, em S, com uma orquídea pequena, gavinha e borboleta
function cornerSprig() {
  L.setSeed(5);
  const b = art("0 -10 190 170");
  const st = S.stem([[8, 150], [50, 132], [70, 100], [112, 82], [140, 44], [176, 22]], 1.6);
  b.folhas += st.out;
  [0.16, 0.32, 0.48, 0.62].forEach((t, i) => {
    const p = st.pts[Math.round(t * 60)];
    b.folhas += S.leaf({ base: p, angle: (i % 2 ? -0.25 : 1.75) + L.jit(0.2), length: 40 - i * 4, width: 16 - i, bend: i % 2 ? 0.25 : -0.25, twist: 0.8, veins: 4 });
  });
  b.folhas += S.tendril({ o: st.pts[22], a: 2.2, s: 0.6, turns: 1.4, dir: -1 });
  b.flores += S.orchid({ o: L.add(st.pts[50], [6, 6]), a: 0.5, s: 0.72 });
  b.florzinhas += S.bud({ o: st.pts[60], a: 0.9, s: 0.8 });
  b.florzinhas += S.blossom({ o: L.add(st.pts[30], [-14, 18]), s: 0.9, a: 0.4 });
  b.detalhes += S.butterfly({ o: [58, 52], a: -0.3, s: 0.62 });
  return b;
}

// 4. Flor solta
function bloom() {
  L.setSeed(3);
  const b = art("-48 -48 96 96");
  b.flores += S.orchid({ o: [0, 4], a: 0, s: 1.15 });
  return b;
}

// 5. Borboleta sozinha
function soloButterfly() {
  L.setSeed(8);
  const b = art("-34 -30 68 56");
  b.detalhes += S.butterfly({ o: [0, 0], a: 0, s: 1.2 });
  return b;
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".png")) fs.unlinkSync(path.join(OUT, f));
const arts = {
  "orquidea-haste": orchidBranch(),
  "guirlanda-1": garland(21),
  "guirlanda-2": garland(42, 360, true),
  raminho: cornerSprig(),
  orquidea: bloom(),
  borboleta: soloButterfly(),
};
const manifest = {};
for (const [name, a] of Object.entries(arts)) {
  manifest[name] = LAYERS.filter((l) => a[l]);
  for (const l of manifest[name]) fs.writeFileSync(path.join(OUT, `${name}-${l}.svg`), svg(a.vb, a[l]));
}
fs.writeFileSync(path.join(OUT, "layers.json"), JSON.stringify(manifest));
console.log(manifest);

require("child_process").execSync(`node ${path.join(__dirname, "rasterize.cjs")}`, { stdio: "inherit" });
