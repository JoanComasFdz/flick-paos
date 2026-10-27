// PNG export of the scoreboard card, at full size (1080×1620).

import { renderCard, CARD_WIDTH, CARD_HEIGHT } from "./render.js";
import { getLang } from "./i18n.js";

const HTML_TO_IMAGE = "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm";

// WebKit (every browser on iOS) often draws the SVG snapshot before its fonts
// and images have decoded; drawing it twice is the known workaround.
const isWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Android/.test(navigator.userAgent);

let libPromise = null;
let fontCssPromise = null;
const cache = new Map();

export function fileName(vm) {
  return `flickpaos-t${vm.season}-j${vm.header ? vm.header.jornada : 0}.png`;
}

/** The scoreboard as a PNG blob; the same view model is rendered only once. */
export function cardPng(vm) {
  const key = getLang() + JSON.stringify(vm);
  if (!cache.has(key)) {
    const promise = renderPng(vm);
    promise.catch(() => cache.delete(key));
    cache.clear();
    cache.set(key, promise);
  }
  return cache.get(key);
}

async function renderPng(vm) {
  const [lib, fontEmbedCSS] = await Promise.all([loadLib(), fontCss(), fontsReady()]);
  const host = document.createElement("div");
  host.className = "export-host";
  host.setAttribute("aria-hidden", "true");
  const card = renderCard(vm);
  host.append(card);
  document.body.append(host);
  try {
    const options = {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      pixelRatio: 1,
      fontEmbedCSS,
      backgroundColor: "#0B1730",
    };
    if (isWebKit) await lib.toCanvas(card, options);
    const blob = await lib.toBlob(card, options);
    if (!blob) throw new Error("No se pudo generar la imagen");
    return blob;
  } finally {
    host.remove();
  }
}

export async function downloadPng(vm) {
  const blob = await cardPng(vm);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName(vm);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Whether the browser can share a PNG file (Web Share API level 2). */
export function canShareFiles() {
  try {
    const probe = new File([new Uint8Array(1)], "x.png", { type: "image/png" });
    return Boolean(navigator.canShare && navigator.canShare({ files: [probe] }));
  } catch {
    return false;
  }
}

export async function sharePng(vm) {
  const blob = await cardPng(vm);
  const file = new File([blob], fileName(vm), { type: "image/png" });
  await navigator.share({ files: [file] });
}

function loadLib() {
  libPromise ??= import(HTML_TO_IMAGE).catch((err) => {
    libPromise = null;
    throw err;
  });
  return libPromise;
}

async function fontsReady() {
  const faces = ['400 100px "Permanent Marker"', '700 100px "Oswald"', '600 100px "Oswald"', '500 100px "Oswald"'];
  await Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)));
  await document.fonts.ready;
}

/**
 * The @font-face rules to embed in the PNG, with the fonts inlined as data URLs.
 * Only the latin subsets: the card has no other scripts, and embedding every
 * subset makes each export several times slower.
 */
function fontCss() {
  fontCssPromise ??= buildFontCss().catch(() => {
    fontCssPromise = null;
    return undefined; // let html-to-image embed the fonts itself
  });
  return fontCssPromise;
}

async function buildFontCss() {
  const link = document.querySelector('link[rel="stylesheet"][href^="https://fonts.googleapis.com"]');
  const css = await (await fetch(link.href)).text();
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*{[^}]*})/g)]
    .filter(([, subset]) => subset === "latin" || subset === "latin-ext")
    .map(([, , block]) => block);
  const inlined = await Promise.all(blocks.map(async (block) => {
    const url = /url\(([^)]+)\)/.exec(block)?.[1]?.replace(/["']/g, "");
    if (!url) return block;
    const data = await toDataUrl(await (await fetch(url)).blob());
    return block.replace(/url\([^)]+\)/, `url(${data})`);
  }));
  return inlined.join("\n");
}

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
