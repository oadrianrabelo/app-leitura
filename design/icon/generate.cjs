// Gera o ícone do Sépia em todos os tamanhos.
// Requer Playwright com Chromium disponível (não é dependência do app).
// Uso: node design/icon/generate.cjs [tema]   (temas: creme, noite, terracota, ouro)
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const FONT_DIR = path.join(ROOT, "node_modules/@fontsource-variable/fraunces/files");
const RES = path.join(ROOT, "src-tauri/gen/android/app/src/main/res");
const DENSITIES = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

const THEMES = {
  creme: { bg: ["#f7eedf", "#e7d3b2"], ribbon: ["#8e3b19", "#b9622f"], s: "#f7eedf", stitch: "#f2d9b3", shadow: 0.3, base: "#efe2cb" },
  noite: { bg: ["#2b241e", "#15110e"], ribbon: ["#b9822c", "#ecc461"], s: "#2b1d10", stitch: "#fff2cf", shadow: 0.6, base: "#201b16" },
  terracota: { bg: ["#c9784a", "#7e3416"], ribbon: ["#e9dcc4", "#fbf4e8"], s: "#9c4520", stitch: "#b88a5a", shadow: 0.4, base: "#a4552d" },
  ouro: { bg: ["#f7eedf", "#e7d3b2"], ribbon: ["#8e3b19", "#b9622f"], s: "#f0c766", stitch: "#e7b555", shadow: 0.3, base: "#efe2cb" },
};
const t = THEMES[process.argv[2] ?? "creme"];

// g = geometria da fita: tips (ponta), notch (corte), sTop/sSize (letra)
function ribbon(g) {
  return `
<svg viewBox="0 0 1024 1024" width="1024" height="1024" style="position:absolute;inset:0">
  <defs>
    <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.ribbon[0]}"/><stop offset="0.45" stop-color="${t.ribbon[1]}"/><stop offset="1" stop-color="${t.ribbon[0]}"/>
    </linearGradient>
    <linearGradient id="fold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
    </linearGradient>
    <filter id="sh" x="-40%" y="-20%" width="180%" height="150%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="20"/><feOffset dy="22"/>
      <feComponentTransfer><feFuncA type="linear" slope="${t.shadow}"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#sh)">
    <path d="M352 -20 L 672 -20 L 672 ${g.tips} L 512 ${g.notch} L 352 ${g.tips} Z" fill="url(#rb)"/>
    <rect x="352" y="-20" width="320" height="80" fill="url(#fold)"/>
    <path d="M380 0 L 380 ${g.tips - 46} M644 0 L 644 ${g.tips - 46}" stroke="${t.stitch}" stroke-width="5" stroke-dasharray="18 14" opacity="0.6"/>
  </g>
</svg>
<div style="position:absolute;left:340px;width:320px;top:${g.sTop}px;text-align:center;font-family:F;font-style:italic;font-weight:500;font-size:${g.sSize}px;line-height:1;color:${t.s};font-variation-settings:'SOFT' 100,'opsz' 144,'WONK' 1;text-shadow:0 2px 0 rgba(0,0,0,.12)">S</div>`;
}

function background() {
  return `
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,${t.bg[0]},${t.bg[1]})"></div>
  <svg width="1024" height="1024" style="position:absolute;inset:0;opacity:.5"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.3 0 0 0 0 0.2 0 0 0 0 0.1 0 0 0 0.09 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
  <div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 30% 0%,rgba(255,255,255,.35),transparent 60%)"></div>`;
}

const FULL = { tips: 812, notch: 694, sTop: 250, sSize: 400 };
// No Android a máscara mostra só o centro (~66%): a fita termina antes da borda do círculo.
const ADAPTIVE = { tips: 760, notch: 662, sTop: 300, sSize: 330 };

const pages = {
  "app-icon": `<div style="position:absolute;inset:0;border-radius:228px;overflow:hidden">${background()}${ribbon(FULL)}</div>`,
  "android-background": background(),
  "android-foreground": ribbon(ADAPTIVE),
};

(async () => {
  const font = (file, style) =>
    `@font-face{font-family:F;src:url(file://${path.join(FONT_DIR, file)});font-style:${style};font-weight:100 900}`;
  const css = font("fraunces-latin-full-italic.woff2", "italic") + "html,body{margin:0;width:1024px;height:1024px;background:transparent}";
  const tmp = path.join(__dirname, ".render.html");
  const out = {};
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [name, html] of Object.entries(pages)) {
    fs.writeFileSync(tmp, `<style>${css}</style>${html}`);
    await page.goto("file://" + tmp);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    out[name] = path.join(__dirname, `${name}.png`);
    await page.screenshot({ path: out[name], omitBackground: true });
  }
  // Ícones do desktop e ícones legados do Android a partir do app-icon.
  // Roda antes das camadas adaptativas, porque `tauri icon` também grava nelas.
  fs.copyFileSync(out["app-icon"], path.join(ROOT, "src-tauri/icons/app-icon.png"));
  execSync("npx tauri icon src-tauri/icons/app-icon.png", { cwd: ROOT, stdio: "inherit" });

  // Camadas do ícone adaptativo do Android
  for (const [density, px] of Object.entries(DENSITIES)) {
    for (const layer of ["foreground", "background"]) {
      fs.writeFileSync(tmp, `<body style="margin:0;background:transparent"><img src="file://${out["android-" + layer]}" width=${px} height=${px}></body>`);
      await page.setViewportSize({ width: px, height: px });
      await page.goto("file://" + tmp);
      await page.screenshot({ path: path.join(RES, `mipmap-${density}`, `ic_launcher_${layer}.png`), omitBackground: true });
    }
  }
  fs.writeFileSync(
    path.join(RES, "mipmap-anydpi-v26/ic_launcher.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
  <background android:drawable="@mipmap/ic_launcher_background"/>
</adaptive-icon>
`,
  );
  fs.writeFileSync(
    path.join(RES, "values/ic_launcher_background.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">${t.base}</color>
</resources>
`,
  );

  // Ícone usado dentro do app (barra lateral e favicon)
  fs.copyFileSync(out["app-icon"], path.join(ROOT, "public/icon.png"));
  await browser.close();
  fs.unlinkSync(tmp);
})();
