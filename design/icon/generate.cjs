// Gera o ícone do Sépia em todos os tamanhos: livro aberto com página virando,
// fita de marca-páginas, luz de abajur e faíscas de conquista.
// Requer Playwright com Chromium disponível (não é dependência do app).
// Uso: node design/icon/generate.cjs
const { chromium } = require("playwright");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const RES = path.join(ROOT, "src-tauri/gen/android/app/src/main/res");
const DENSITIES = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

const C = {
  bg: ["#f8efe0", "#efe0c6", "#e2c9a2"],
  glow: "#ffffff",
  cover: "#8e3b19",
  ribbon: ["#9c4520", "#c46b38"],
  base: "#efe0c6",
};

const spark = (x, y, r, o) => {
  const k = r * 0.12;
  return `<path d="M${x} ${y - r} C ${x + k} ${y - k} ${x + k} ${y - k} ${x + r} ${y} C ${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + r} C ${x - k} ${y + k} ${x - k} ${y + k} ${x - r} ${y} C ${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - r} Z" fill="url(#gold)" opacity="${o}"/>`;
};

const DEFS = `
<defs>
  <linearGradient id="bg" x1="0.2" y1="0" x2="0.8" y2="1">
    <stop offset="0" stop-color="${C.bg[0]}"/><stop offset="0.55" stop-color="${C.bg[1]}"/><stop offset="1" stop-color="${C.bg[2]}"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.42" r="0.5">
    <stop offset="0" stop-color="${C.glow}" stop-opacity="0.6"/>
    <stop offset="0.45" stop-color="${C.glow}" stop-opacity="0.15"/>
    <stop offset="1" stop-color="${C.glow}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="pl" x1="1" y1="0" x2="0" y2="0">
    <stop offset="0" stop-color="#dcc6a0"/><stop offset="0.14" stop-color="#fbf3e4"/><stop offset="1" stop-color="#f3e4c9"/>
  </linearGradient>
  <linearGradient id="pr" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#dcc6a0"/><stop offset="0.14" stop-color="#fdf6ea"/><stop offset="1" stop-color="#f1e1c4"/>
  </linearGradient>
  <linearGradient id="turn" x1="0" y1="0" x2="1" y2="0.3">
    <stop offset="0" stop-color="#e2cda8"/><stop offset="0.55" stop-color="#fff9ef"/><stop offset="1" stop-color="#efdfc2"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fbe3a0"/><stop offset="0.5" stop-color="#eec05c"/><stop offset="1" stop-color="#c98f2e"/>
  </linearGradient>
  <linearGradient id="rib" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.ribbon[0]}"/><stop offset="0.5" stop-color="${C.ribbon[1]}"/><stop offset="1" stop-color="${C.ribbon[0]}"/>
  </linearGradient>
  <filter id="sh" x="-30%" y="-30%" width="160%" height="170%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="24"/><feOffset dy="30"/>
    <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
    <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="soft"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <clipPath id="sq"><rect width="1024" height="1024" rx="228"/></clipPath>
</defs>`;

const BACKGROUND = `
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <rect width="1024" height="1024" filter="url(#grain)"/>`;

const BOOK = `
<g transform="translate(0 40)">
  <g filter="url(#sh)">
    <path d="M512 404 C 430 352 300 338 188 356 L 188 744 C 300 726 430 740 512 792 C 594 740 724 726 836 744 L 836 356 C 724 338 594 352 512 404 Z" fill="${C.cover}"/>
    <path d="M512 392 C 432 342 306 330 204 346 L 204 728 C 306 712 432 724 512 776 Z" fill="#d9c29b"/>
    <path d="M512 392 C 592 342 718 330 820 346 L 820 728 C 718 712 592 724 512 776 Z" fill="#d9c29b"/>
    <path d="M512 380 C 434 328 314 316 218 330 L 218 714 C 314 700 434 712 512 764 Z" fill="url(#pl)"/>
    <path d="M512 380 C 590 328 710 316 806 330 L 806 714 C 710 700 590 712 512 764 Z" fill="url(#pr)"/>
    <g stroke="#cbb089" stroke-width="11" stroke-linecap="round" fill="none" opacity="0.7">
      <path d="M276 404 C 330 396 390 404 446 426"/>
      <path d="M276 458 C 330 450 390 458 446 480"/>
      <path d="M276 512 C 330 504 390 512 446 534"/>
      <path d="M276 566 C 330 558 390 566 446 588"/>
      <path d="M276 620 C 324 614 364 618 400 630"/>
    </g>
    <path d="M520 386 C 580 320 660 280 760 262 L 742 640 C 660 650 580 700 520 760 Z" fill="#7a4a20" opacity="0.18" filter="url(#soft)" transform="translate(26 18)"/>
    <path d="M512 380 C 566 300 650 248 752 226 C 742 360 742 500 744 628 C 652 640 574 690 512 764 Z" fill="url(#turn)"/>
    <path d="M752 226 C 742 360 742 500 744 628" stroke="#d8c19a" stroke-width="3" fill="none"/>
    <g stroke="#cbb089" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.55">
      <path d="M572 420 C 610 380 660 352 712 340"/>
      <path d="M572 474 C 610 436 660 410 712 398"/>
      <path d="M572 528 C 610 492 660 468 712 456"/>
      <path d="M572 582 C 606 550 646 530 690 520"/>
    </g>
    <path d="M448 382 L 494 376 L 500 850 L 474 822 L 452 856 Z" fill="url(#rib)"/>
  </g>
  ${spark(300, 250, 30, 1)}${spark(360, 190, 16, 0.8)}${spark(250, 310, 12, 0.7)}
</g>`;

const svg = (body) => `<svg viewBox="0 0 1024 1024" width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">${DEFS}${body}</svg>`;

// No Android a máscara mostra só o centro (~66%), então o livro encolhe para caber.
const pages = {
  "app-icon": svg(`<g clip-path="url(#sq)">${BACKGROUND}</g>${BOOK}`),
  "android-background": svg(BACKGROUND),
  "android-foreground": svg(`<g transform="translate(512 512) scale(0.7) translate(-512 -530)">${BOOK}</g>`),
};

(async () => {
  const tmp = path.join(__dirname, ".render.html");
  const out = {};
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [name, body] of Object.entries(pages)) {
    fs.writeFileSync(tmp, `<style>html,body{margin:0;background:transparent}svg{display:block}</style>${body}`);
    await page.goto("file://" + tmp);
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
  <color name="ic_launcher_background">${C.base}</color>
</resources>
`,
  );

  // Ícone usado dentro do app (barra lateral e favicon)
  fs.copyFileSync(out["app-icon"], path.join(ROOT, "public/icon.png"));
  for (const name of ["android-background", "android-foreground"]) fs.unlinkSync(out[name]);
  await browser.close();
  fs.unlinkSync(tmp);
})();
