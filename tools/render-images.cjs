// Renders the PNG icons and the link-preview image from assets/crest.svg and
// tools/share-image.html. Needs Playwright with Chromium:
//   node tools/render-images.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const crest = fs.readFileSync(path.join(root, "assets/crest.svg"), "utf8");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Icons: the crest on the page's navy, so iOS and Android don't put it on black or white.
  const icons = [
    ["assets/favicon-32.png", 32, 2],
    ["assets/apple-touch-icon.png", 180, 14],
    ["assets/icon-192.png", 192, 16],
    ["assets/icon-512.png", 512, 44],
  ];
  for (const [file, size, pad] of icons) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<body style="margin:0;background:#0B1730;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">
      <div style="height:${size - 2 * pad}px;aspect-ratio:200/232">${crest}</div></body>`);
    await page.$eval("svg", (svg) => { svg.style.width = "100%"; svg.style.height = "100%"; });
    await page.screenshot({ path: path.join(root, file) });
  }

  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto("file://" + path.join(root, "tools/share-image.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // JPEG: WhatsApp skips preview images larger than about 300 KB.
  await page.screenshot({ path: path.join(root, "assets/og-image.jpg"), type: "jpeg", quality: 88 });

  await browser.close();
})();
