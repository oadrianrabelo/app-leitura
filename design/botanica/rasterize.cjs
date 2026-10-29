// Converte os SVGs (src/assets/botanica/*.svg) em PNGs com transparência, usados
// como máscara no app: a cor vem do tema (um tom só) e os arquivos ficam leves.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const DIR = path.resolve(__dirname, "../../src/assets/botanica");
const SCALE = { "orquidea-haste": 2.4, "guirlanda-1": 2.6, "guirlanda-2": 2.6, raminho: 2.4, orquidea: 3 };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const [name, scale] of Object.entries(SCALE)) {
    const svg = fs.readFileSync(path.join(DIR, `${name}.svg`), "utf8");
    const [, , w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
    const W = Math.round(w * scale), H = Math.round(h * scale);
    await page.setViewportSize({ width: W, height: H });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${W}px;height:${H}px;color:#000}</style>${svg}`);
    await page.screenshot({ path: path.join(DIR, `${name}.png`), omitBackground: true });
    fs.unlinkSync(path.join(DIR, `${name}.svg`));
    console.log(name, W, "x", H, (fs.statSync(path.join(DIR, `${name}.png`)).size / 1024).toFixed(0) + "KB");
  }
  await browser.close();
})();
