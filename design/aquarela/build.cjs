// Gera todas as aquarelas do app em src/assets/aquarela (WebP com transparência).
// Uma versão de cada peça por paleta; o app escolhe a do tema atual.
// O pintor fica em src/features/flora/painter (o app usa o mesmo código para o jardim vivo).
const { chromium } = require("playwright");
const fs = require("fs");
const http = require("http");
const path = require("path");
const OUT = path.resolve(__dirname, "../../src/assets/aquarela");
const PAINTER = path.resolve(__dirname, "../../src/features/flora/painter");

// Servidor mínimo: módulos ES não carregam de file://
function serve() {
  return new Promise((ok) => {
    const server = http.createServer((req, res) => {
      if (req.url === "/") {
        res.setHeader("Content-Type", "text/html");
        return res.end(`<script type="module">import { Arte } from "./art.js"; import { Aquarela } from "./paint.js"; window.Arte = Arte; window.Aquarela = Aquarela; window.ready = true;</script>`);
      }
      const file = path.join(PAINTER, path.basename(req.url));
      if (!fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
      res.setHeader("Content-Type", "text/javascript");
      res.end(fs.readFileSync(file));
    });
    server.listen(0, () => ok(server));
  });
}

// [função, largura, altura, opções, margem {l, r, t, b}]: a margem dá espaço para as
// folhas nunca baterem na borda da imagem. Onde não há margem, o ramo sai pela borda
// de propósito e, no app, essa borda fica fora da tela (a planta "continua" lá fora).
const GARLAND_PAD = { l: 0, r: 0, t: 160, b: 0 };
const CLIMB_PAD = { l: 180, r: 180, t: 140, b: 0 };
const PIECES = {
  "guirlanda-1": ["shelfGarland", 1100, 560, { seed: 1 }, GARLAND_PAD],
  "guirlanda-2": ["shelfGarland", 1100, 560, { seed: 2 }, GARLAND_PAD],
  "guirlanda-3": ["shelfGarland", 1100, 560, { seed: 3 }, GARLAND_PAD],
  "guirlanda-4": ["shelfGarland", 1100, 560, { seed: 4 }, GARLAND_PAD],
  "guirlanda-5": ["shelfGarland", 1100, 560, { seed: 5 }, GARLAND_PAD],
  "guirlanda-6": ["shelfGarland", 1100, 560, { seed: 6 }, GARLAND_PAD],
  trepadeira: ["climb", 420, 1100, { seed: 2 }, CLIMB_PAD],
  "trepadeira-2": ["climbTwined", 460, 1300, { seed: 4 }, CLIMB_PAD],
  canto: ["cornerBig", 1100, 1500, { seed: 7 }, { l: 0, r: 0, t: 0, b: 0 }],
  raminho: ["sprig", 700, 700, { seed: 5 }, { l: 120, r: 120, t: 120, b: 120 }],
};
const PALETTES = ["lilas", "azul", "rosa", "coral", "mista"];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const URL = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch();
  const jobs = [];
  for (const [name, [fn, W, H, opts, pad]] of Object.entries(PIECES))
    for (const palette of PALETTES) jobs.push({ name, fn, W, H, pad, opts: { ...opts, palette } });
  // algumas abas em paralelo
  const run = async (job) => {
    if (process.env.ONLY_MISSING && fs.existsSync(path.join(OUT, `${job.name}-${job.opts.palette}.webp`))) return;
    const p = await b.newPage();
    await p.goto(URL);
    await p.waitForFunction(() => window.ready);
    const data = await p.evaluate(({ fn, W, H, opts, pad }) => {
      const c = document.createElement("canvas");
      c.width = W + pad.l + pad.r; c.height = H + pad.t + pad.b;
      const g = c.getContext("2d");
      g.translate(pad.l, pad.t);
      window.Arte[fn](g, W, H, opts);
      g.setTransform(1, 0, 0, 1, 0, 0);
      window.Aquarela.granulate(g, c.width, c.height, 0.16);
      return c.toDataURL("image/webp", 0.7).split(",")[1];
    }, job);
    const file = path.join(OUT, `${job.name}-${job.opts.palette}.webp`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    console.log(path.basename(file), (fs.statSync(file).size / 1024).toFixed(0) + "KB");
    await p.close();
  };
  for (let i = 0; i < jobs.length; i += 4) await Promise.all(jobs.slice(i, i + 4).map(run));
  await b.close();
  server.close();
})();
