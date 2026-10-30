// Gera todas as aquarelas do app em src/assets/aquarela (WebP com transparência).
// Uma versão de cada peça por paleta; o app escolhe a do tema atual.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.resolve(__dirname, "../../src/assets/aquarela");

const PIECES = {
  "guirlanda-1": ["shelfGarland", 1100, 560, { seed: 1 }],
  "guirlanda-2": ["shelfGarland", 1100, 560, { seed: 2 }],
  "guirlanda-3": ["shelfGarland", 1100, 560, { seed: 3 }],
  "guirlanda-4": ["shelfGarland", 1100, 560, { seed: 4 }],
  trepadeira: ["climb", 420, 1100, { seed: 2 }],
  canto: ["cornerBig", 1100, 1500, { seed: 7 }],
  raminho: ["sprig", 700, 700, { seed: 5 }],
};
const PALETTES = ["lilas", "azul", "rosa", "coral"];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const jobs = [];
  for (const [name, [fn, W, H, opts]] of Object.entries(PIECES))
    for (const palette of PALETTES) jobs.push({ name, fn, W, H, opts: { ...opts, palette } });
  // algumas abas em paralelo
  const run = async (job) => {
    const p = await b.newPage();
    await p.setContent("<body></body>");
    await p.addScriptTag({ path: path.join(__dirname, "paint.js") });
    await p.addScriptTag({ path: path.join(__dirname, "art.js") });
    const data = await p.evaluate(({ fn, W, H, opts }) => {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const g = c.getContext("2d");
      window.Arte[fn](g, W, H, opts);
      window.Aquarela.granulate(g, W, H, 0.22);
      return c.toDataURL("image/webp", 0.74).split(",")[1];
    }, job);
    const file = path.join(OUT, `${job.name}-${job.opts.palette}.webp`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    console.log(path.basename(file), (fs.statSync(file).size / 1024).toFixed(0) + "KB");
    await p.close();
  };
  for (let i = 0; i < jobs.length; i += 4) await Promise.all(jobs.slice(i, i + 4).map(run));
  await b.close();
})();
