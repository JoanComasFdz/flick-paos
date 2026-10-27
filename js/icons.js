// Inline SVG artwork for the scoreboard. No external images, so the PNG export
// renders the same on every browser.

import { findTeam, normalize } from "./teams.js";

let uid = 0;
const nextId = (prefix) => `${prefix}-${++uid}`;

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const PIPS = {
  1: [[50, 50]],
  2: [[72, 28], [28, 72]],
  3: [[72, 28], [50, 50], [28, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]],
};

const DIE_STYLES = {
  white: { face: "#FFFFFF", edge: "#C9CED8", pip: "#111827", shine: "#FFFFFF" },
  red: { face: "#D7192B", edge: "#8E0E1A", pip: "#FFFFFF", shine: "#FF6B76" },
  ivory: { face: "#F4E7CC", edge: "#B79F74", pip: "#5B4630", shine: "#FFF8E8" },
};

/** A die face. `face` 0 draws a blank die. */
export function dieSvg(face, { style = "white", className = "" } = {}) {
  const s = DIE_STYLES[style];
  const pips = (PIPS[face] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${s.pip}"/>`).join("");
  return `<svg class="die ${className}" viewBox="0 0 100 100" aria-hidden="true">
    <rect x="3" y="6" width="94" height="91" rx="18" fill="${s.edge}"/>
    <rect x="3" y="3" width="94" height="88" rx="18" fill="${s.face}"/>
    <path d="M14 10 H70" stroke="${s.shine}" stroke-width="4" stroke-linecap="round" opacity=".6"/>
    ${pips}
  </svg>`;
}

/** A tilted 3D-looking red die for headings. */
export function bigRedDieSvg(className = "") {
  return `<svg class="${className}" viewBox="0 0 120 120" aria-hidden="true">
    <path d="M60 6 L110 30 L104 88 L56 114 L12 86 L12 30 Z" fill="#8E0E1A"/>
    <path d="M60 6 L110 30 L62 52 L12 30 Z" fill="#E8303F"/>
    <path d="M12 30 L62 52 L56 114 L12 86 Z" fill="#C4142A"/>
    <path d="M62 52 L110 30 L104 88 L56 114 Z" fill="#A80F20"/>
    <g fill="#FFFFFF">
      <ellipse cx="60" cy="29" rx="7" ry="4"/>
      <ellipse cx="24" cy="48" rx="4" ry="6"/><ellipse cx="36" cy="66" rx="4" ry="6"/><ellipse cx="48" cy="84" rx="4" ry="6"/>
      <ellipse cx="24" cy="76" rx="4" ry="6"/><ellipse cx="48" cy="56" rx="4" ry="6"/>
      <ellipse cx="74" cy="60" rx="4" ry="6"/><ellipse cx="92" cy="50" rx="4" ry="6"/>
      <ellipse cx="72" cy="90" rx="4" ry="6"/><ellipse cx="90" cy="80" rx="4" ry="6"/>
    </g>
  </svg>`;
}

export function trophySvg(className = "") {
  return `<svg class="${className}" viewBox="0 0 64 64" aria-hidden="true">
    <g fill="#F5C518" stroke="#8A6400" stroke-width="2" stroke-linejoin="round">
      <path d="M18 6 H46 V18 C46 32 40 38 32 39 C24 38 18 32 18 18 Z"/>
      <path d="M18 10 H8 C8 22 12 28 20 29 V25 C15 24 13 19 12 14 H18 Z"/>
      <path d="M46 10 H56 C56 22 52 28 44 29 V25 C49 24 51 19 52 14 H46 Z"/>
      <rect x="28" y="39" width="8" height="10"/>
      <path d="M18 50 H46 L48 58 H16 Z"/>
    </g>
    <path d="M24 11 C24 22 26 29 30 33" fill="none" stroke="#FFF2B0" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

export function calendarSvg(className = "") {
  return `<svg class="${className}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round">
    <rect x="6" y="9" width="36" height="33" rx="4"/>
    <path d="M6 18 H42 M15 5 V13 M33 5 V13"/>
    <g fill="currentColor" stroke="none">
      <rect x="12" y="23" width="6" height="5" rx="1"/><rect x="21" y="23" width="6" height="5" rx="1"/><rect x="30" y="23" width="6" height="5" rx="1"/>
      <rect x="12" y="32" width="6" height="5" rx="1"/><rect x="21" y="32" width="6" height="5" rx="1"/>
    </g>
  </svg>`;
}

/** Red brush-stroke ribbon behind "TEMPORADA n". */
export function ribbonSvg(className = "") {
  return `<svg class="${className}" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
    <path fill="#B3121F" d="M14 30 C70 18 140 14 210 12 C270 10 330 8 392 4 L384 22 L398 30 L386 44 L396 58 L384 70 L394 84
      L380 96 C320 100 250 104 180 106 C120 108 60 112 6 116 L18 102 L4 92 L16 80 L2 66 L16 54 L4 42 Z"/>
    <path fill="#7A0F1E" opacity=".55" d="M20 96 C90 92 170 88 250 86 C310 84 350 84 386 82 L380 96 C320 100 250 104 180 106 C120 108 60 112 6 116 Z"/>
    <path fill="none" stroke="#E2414E" stroke-width="3" opacity=".6" d="M30 34 C120 24 240 20 370 14 M40 52 C150 44 260 40 360 36"/>
  </svg>`;
}

// ---------------------------------------------------------------- team badges

function teamStyle(name) {
  const known = findTeam(name);
  if (known?.colors) return known;
  // Unknown team, or one without colours yet: a stable colour from its name.
  let hash = 0;
  for (const c of normalize(name)) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return { code: known?.code || teamCode(name), colors: [`hsl(${hue} 55% 38%)`], text: "#FFFFFF", accent: "#FFFFFF" };
}

function teamCode(name) {
  const words = normalize(name).replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

const SHIELD = "M50 4 C66 10 82 10 96 6 V58 C96 88 76 104 50 114 C24 104 4 88 4 58 V6 C18 10 34 10 50 4 Z";

/** A club-coloured shield with the club's initials. */
export function teamBadgeSvg(name, isBarca, className = "") {
  if (isBarca) return barcaBadgeSvg(className);
  const custom = CUSTOM_BADGES[findTeam(name)?.badge];
  if (custom) return custom(className);
  const t = teamStyle(name);
  const clip = nextId("badge");
  const stripes = t.colors.length > 1
    ? [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 14.3}" y="0" width="14.3" height="120" fill="${t.colors[i % 2]}"/>`).join("")
    : `<rect width="100" height="120" fill="${t.colors[0]}"/>`;
  const plate = t.colors.length > 1 ? `<rect x="10" y="44" width="80" height="30" rx="6" fill="${t.accent}"/>` : "";
  const textColor = t.colors.length > 1 ? contrastOn(t.accent) : t.text;
  return `<svg class="badge ${className}" viewBox="0 0 100 118" aria-hidden="true">
    <defs><clipPath id="${clip}"><path d="${SHIELD}"/></clipPath></defs>
    <g clip-path="url(#${clip})">${stripes}</g>
    <path d="${SHIELD}" fill="none" stroke="${t.accent}" stroke-width="5"/>
    ${plate}
    <text x="50" y="68" text-anchor="middle" font-family="Oswald, Arial Narrow, sans-serif" font-weight="700" font-size="26" fill="${textColor}">${escapeHtml(t.code)}</text>
  </svg>`;
}

function contrastOn(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#FFFFFF";
  const v = parseInt(m[1], 16);
  const lum = 0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255);
  return lum > 150 ? "#111111" : "#FFFFFF";
}

const CUSTOM_BADGES = { newTeam: newTeamBadgeSvg };

/** New Team (Oliver y Benji): a green circle with a yellow band, cut into an N. */
function newTeamBadgeSvg(className) {
  const mask = nextId("nt-mask");
  const clip = nextId("nt-clip");
  // The two notches that shape the N, and the edges of the N inside the circle.
  const notches = "M37 6 H64 V59 Z M38.5 57 L66 112 H38.5 Z";
  const edges = "M37.5 8 L63.5 59 V6 M38.5 112 V57 L66 112";
  return `<svg class="badge ${className}" viewBox="0 0 100 118" aria-hidden="true">
    <defs>
      <mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="118">
        <rect width="100" height="118" fill="#fff"/><path d="${notches}" fill="#000"/>
      </mask>
      <clipPath id="${clip}"><circle cx="50" cy="59" r="44"/></clipPath>
    </defs>
    <g mask="url(#${mask})">
      <circle cx="50" cy="59" r="44" fill="#009245" stroke="#111" stroke-width="4"/>
      <rect x="0" y="47.5" width="100" height="17" fill="#FFF200" clip-path="url(#${clip})"/>
    </g>
    <path d="${edges}" fill="none" stroke="#111" stroke-width="4" stroke-linejoin="round" clip-path="url(#${clip})"/>
  </svg>`;
}

function barcaBadgeSvg(className) {
  const clip = nextId("fcb");
  return `<svg class="badge ${className}" viewBox="0 0 100 118" aria-hidden="true">
    <defs><clipPath id="${clip}"><path d="${SHIELD}"/></clipPath></defs>
    <g clip-path="url(#${clip})">
      <rect width="100" height="120" fill="#FFFFFF"/>
      <rect x="44" y="0" width="12" height="44" fill="#D7192B"/>
      <rect x="0" y="18" width="50" height="10" fill="#D7192B"/>
      <g transform="translate(50 0)">
        <rect width="50" height="44" fill="#FCDD09"/>
        <rect x="8" width="6" height="44" fill="#DA121A"/><rect x="20" width="6" height="44" fill="#DA121A"/>
        <rect x="32" width="6" height="44" fill="#DA121A"/><rect x="44" width="6" height="44" fill="#DA121A"/>
      </g>
      <g transform="translate(0 58)">
        ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 14.3}" width="14.3" height="62" fill="${i % 2 ? "#A50044" : "#004D98"}"/>`).join("")}
      </g>
      <rect x="0" y="44" width="100" height="14" fill="#F5C518"/>
      <circle cx="50" cy="86" r="11" fill="#F5C518" stroke="#7A5A00" stroke-width="2"/>
    </g>
    <text x="50" y="55.5" text-anchor="middle" font-family="Oswald, Arial Narrow, sans-serif" font-weight="700" font-size="12" fill="#004D98" letter-spacing="2">FCB</text>
    <path d="${SHIELD}" fill="none" stroke="#F5C518" stroke-width="5"/>
  </svg>`;
}
