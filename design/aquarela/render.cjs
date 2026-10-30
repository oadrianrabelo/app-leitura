// Renderiza as aquarelas (design/aquarela/*.js) em PNG transparente.
// Uso: node render.cjs <saída.png> <função> <largura> <altura> [opções JSON]
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const [out, fn, w, h, opts = "{}"] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent("<canvas></canvas>");
  await p.addScriptTag({ path: path.join(__dirname, "paint.js") });
  await p.addScriptTag({ path: path.join(__dirname, "art.js") });
  const data = await p.evaluate(({ fn, W, H, opts }) => {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    window.Arte[fn](g, W, H, opts);
    window.Aquarela.granulate(g, W, H, 0.22);
    return c.toDataURL("image/png").split(",")[1];
  }, { fn, W: +w, H: +h, opts: JSON.parse(opts) });
  fs.writeFileSync(out, Buffer.from(data, "base64"));
  await b.close();
})();
