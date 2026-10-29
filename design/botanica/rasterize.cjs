// Converte as camadas SVG (src/assets/botanica/*-camada.svg) em PNGs com
// transparência, usados como máscara no app. Cada camada é recortada onde as de
// cima passam por ela: assim a flor cobre a folha em vez de deixar as nervuras
// aparecerem através da cor.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const DIR = path.resolve(__dirname, "../../src/assets/botanica");
const SCALE = { "orquidea-haste": 2.4, "guirlanda-1": 2.6, "guirlanda-2": 2.6, raminho: 2.4, orquidea: 3, borboleta: 3 };
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, "layers.json"), "utf8"));

const solid = (svg) => svg.replace(/(fill|stroke)-opacity="[\d.]+"/g, '$1-opacity="1"');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent("<canvas></canvas>");
  for (const [name, layers] of Object.entries(manifest)) {
    const svgs = layers.map((l) => fs.readFileSync(path.join(DIR, `${name}-${l}.svg`), "utf8"));
    const [, , w, h] = svgs[0].match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
    const scale = SCALE[name];
    const W = Math.round(w * scale), H = Math.round(h * scale);
    const pngs = await page.evaluate(
      async ({ svgs, solids, W, H }) => {
        const load = (s) =>
          new Promise((ok, fail) => {
            const img = new Image();
            img.onload = () => ok(img);
            img.onerror = fail;
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.replace("<svg ", `<svg width="${W}" height="${H}" `));
          });
        const imgs = await Promise.all(svgs.map(load));
        const masks = await Promise.all(solids.map(load));
        return imgs.map((img, i) => {
          const c = document.createElement("canvas");
          c.width = W;
          c.height = H;
          const g = c.getContext("2d");
          g.drawImage(img, 0, 0);
          g.globalCompositeOperation = "destination-out";
          for (let j = i + 1; j < masks.length; j++) g.drawImage(masks[j], 0, 0);
          return c.toDataURL("image/png").split(",")[1];
        });
      },
      { svgs, solids: svgs.map(solid), W, H },
    );
    layers.forEach((l, i) => {
      const file = path.join(DIR, `${name}-${l}.png`);
      fs.writeFileSync(file, Buffer.from(pngs[i], "base64"));
      fs.unlinkSync(path.join(DIR, `${name}-${l}.svg`));
      console.log(`${name}-${l}`, W, "x", H, (fs.statSync(file).size / 1024).toFixed(0) + "KB");
    });
  }
  await browser.close();
})();
