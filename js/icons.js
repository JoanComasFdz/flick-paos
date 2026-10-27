// Inline SVG artwork for the scoreboard. No external images, so the PNG export
// renders the same on every browser.

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
    ${dieBody("#8E0E1A", "#E8303F", "#C4142A", "#A80F20")}
    <g fill="#FFFFFF">
      <ellipse cx="60" cy="29" rx="7" ry="4"/>
      <ellipse cx="24" cy="48" rx="4" ry="6"/><ellipse cx="36" cy="66" rx="4" ry="6"/><ellipse cx="48" cy="84" rx="4" ry="6"/>
      <ellipse cx="24" cy="76" rx="4" ry="6"/><ellipse cx="48" cy="56" rx="4" ry="6"/>
      <ellipse cx="74" cy="60" rx="4" ry="6"/><ellipse cx="92" cy="50" rx="4" ry="6"/>
      <ellipse cx="72" cy="90" rx="4" ry="6"/><ellipse cx="90" cy="80" rx="4" ry="6"/>
    </g>
  </svg>`;
}

/** A small tilted ivory die (one "dado extra"), with big pips so it reads as a die at row size. */
export function extraDieSvg(className = "") {
  return `<svg class="${className}" viewBox="0 0 120 120" aria-hidden="true">
    ${dieBody("#8C7550", "#FFF6E0", "#E9D7B0", "#D6C094")}
    <g fill="#5B4630">
      <ellipse cx="60" cy="29" rx="11" ry="7"/>
      <ellipse cx="26" cy="52" rx="6.5" ry="9"/><ellipse cx="46" cy="86" rx="6.5" ry="9"/>
      <ellipse cx="94" cy="44" rx="6.5" ry="9"/><ellipse cx="83" cy="69" rx="6.5" ry="9"/><ellipse cx="72" cy="94" rx="6.5" ry="9"/>
    </g>
  </svg>`;
}

function dieBody(edge, top, left, right) {
  return `<path d="M60 6 L110 30 L104 88 L56 114 L12 86 L12 30 Z" fill="${edge}"/>
    <path d="M60 6 L110 30 L62 52 L12 30 Z" fill="${top}"/>
    <path d="M12 30 L62 52 L56 114 L12 86 Z" fill="${left}"/>
    <path d="M62 52 L110 30 L104 88 L56 114 Z" fill="${right}"/>`;
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

const TEAMS = [
  { keys: ["real madrid", "madrid"], code: "RMA", colors: ["#FFFFFF"], text: "#00529F", accent: "#FEBE10" },
  { keys: ["athletic", "bilbao"], code: "ATH", colors: ["#E2231A", "#FFFFFF"], text: "#111111", accent: "#111111" },
  { keys: ["atletico", "atleti"], code: "ATM", colors: ["#CB3524", "#FFFFFF"], text: "#FFFFFF", accent: "#272E61" },
  { keys: ["sevilla"], code: "SEV", colors: ["#FFFFFF"], text: "#D71920", accent: "#D71920" },
  { keys: ["betis"], code: "BET", colors: ["#00954C", "#FFFFFF"], text: "#FFFFFF", accent: "#00954C" },
  { keys: ["valencia"], code: "VCF", colors: ["#FFFFFF"], text: "#111111", accent: "#EE7814" },
  { keys: ["real sociedad", "sociedad", "la real"], code: "RSO", colors: ["#0067B1", "#FFFFFF"], text: "#FFFFFF", accent: "#0067B1" },
  { keys: ["villarreal"], code: "VIL", colors: ["#FFE667"], text: "#005187", accent: "#005187" },
  { keys: ["girona"], code: "GIR", colors: ["#CD2534", "#FFFFFF"], text: "#FFFFFF", accent: "#CD2534" },
  { keys: ["espanyol"], code: "ESP", colors: ["#007FC8", "#FFFFFF"], text: "#FFFFFF", accent: "#007FC8" },
  { keys: ["celta"], code: "CEL", colors: ["#8AC3EE"], text: "#FFFFFF", accent: "#E5254E" },
  { keys: ["osasuna"], code: "OSA", colors: ["#D91A21"], text: "#FFFFFF", accent: "#0A346F" },
  { keys: ["mallorca"], code: "MLL", colors: ["#E20613"], text: "#FFFFFF", accent: "#111111" },
  { keys: ["getafe"], code: "GET", colors: ["#005999"], text: "#FFFFFF", accent: "#FFFFFF" },
  { keys: ["rayo"], code: "RAY", colors: ["#FFFFFF"], text: "#E53027", accent: "#E53027" },
  { keys: ["alaves"], code: "ALA", colors: ["#0761AF", "#FFFFFF"], text: "#FFFFFF", accent: "#0761AF" },
  { keys: ["las palmas"], code: "LPA", colors: ["#FFE400"], text: "#0055A5", accent: "#0055A5" },
  { keys: ["leganes"], code: "LEG", colors: ["#1B4A9C", "#FFFFFF"], text: "#FFFFFF", accent: "#1B4A9C" },
  { keys: ["valladolid"], code: "VLL", colors: ["#5C2D82", "#FFFFFF"], text: "#FFFFFF", accent: "#5C2D82" },
  { keys: ["elche"], code: "ELC", colors: ["#FFFFFF"], text: "#05642C", accent: "#05642C" },
  { keys: ["levante"], code: "LEV", colors: ["#004F9F", "#B4053F"], text: "#FFFFFF", accent: "#B4053F" },
  { keys: ["oviedo"], code: "OVI", colors: ["#0055A5"], text: "#FFFFFF", accent: "#FFFFFF" },
  { keys: ["psg", "paris"], code: "PSG", colors: ["#004170"], text: "#FFFFFF", accent: "#DA291C" },
  { keys: ["bayern"], code: "FCB", colors: ["#DC052D"], text: "#FFFFFF", accent: "#0066B2" },
  { keys: ["inter"], code: "INT", colors: ["#0068A8", "#111111"], text: "#FFFFFF", accent: "#111111" },
  { keys: ["milan"], code: "MIL", colors: ["#FB090B", "#111111"], text: "#FFFFFF", accent: "#111111" },
  { keys: ["juventus", "juve"], code: "JUV", colors: ["#111111", "#FFFFFF"], text: "#FFFFFF", accent: "#111111" },
  { keys: ["benfica"], code: "BEN", colors: ["#E83030"], text: "#FFFFFF", accent: "#FFFFFF" },
  { keys: ["chelsea"], code: "CHE", colors: ["#034694"], text: "#FFFFFF", accent: "#FFFFFF" },
  { keys: ["liverpool"], code: "LIV", colors: ["#C8102E"], text: "#FFFFFF", accent: "#F6EB61" },
  { keys: ["arsenal"], code: "ARS", colors: ["#EF0107"], text: "#FFFFFF", accent: "#FFFFFF" },
  { keys: ["manchester city", "city"], code: "MCI", colors: ["#6CABDD"], text: "#FFFFFF", accent: "#1C2C5B" },
  { keys: ["manchester united", "united"], code: "MUN", colors: ["#DA291C"], text: "#FFFFFF", accent: "#FBE122" },
  { keys: ["dortmund"], code: "BVB", colors: ["#FDE100"], text: "#111111", accent: "#111111" },
];

const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function teamStyle(name) {
  const n = normalize(name);
  const known = TEAMS.find((t) => t.keys.some((k) => n.includes(k)));
  if (known) return known;
  let hash = 0;
  for (const c of n) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return { code: teamCode(name), colors: [`hsl(${hue} 55% 38%)`], text: "#FFFFFF", accent: "#FFFFFF" };
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
