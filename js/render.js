// View model (standings.js) → DOM for the 1080×1620 scoreboard card.

import {
  escapeHtml, dieSvg, bigRedDieSvg, trophySvg, calendarSvg, ribbonSvg, teamBadgeSvg,
} from "./icons.js";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1620;

let crestMarkup = "";
let crestCount = 0;

/** Loads the league crest once, to inline it (inline SVG exports reliably on iOS). */
export async function loadCrest() {
  if (crestMarkup) return;
  try {
    const res = await fetch(new URL("../assets/crest.svg", import.meta.url));
    crestMarkup = (await res.text()).replace(/<\?xml[^>]*>/, "");
  } catch {
    crestMarkup = "";
  }
}

/** Builds the scoreboard card element. */
export function renderCard(vm) {
  const card = document.createElement("div");
  card.className = "card";
  card.style.setProperty("--rows", String(Math.max(vm.rows.length, 1)));
  card.style.setProperty("--row-font", `${rowFontSize(vm.rows.length)}px`);
  card.innerHTML = `
    <div class="c-header">
      <div class="c-crest">${uniqueCrest()}</div>
      <div class="c-title">
        <div class="c-title-top">LA LIGA DE LOS</div>
        <div class="c-title-main">FLICK-PAOS</div>
      </div>
      <div class="c-ribbon">${ribbonSvg("c-ribbon-bg")}<span>TEMPORADA <b>${escapeHtml(vm.season)}</b></span></div>
    </div>
    ${matchBar(vm.header)}
    <div class="c-table">
      <div class="c-thead">
        <div class="c-pos">POS.</div><div class="c-name">JUGADOR</div><div class="c-pts">PUNTOS</div>
        <div class="c-casa">CASA</div><div class="c-extra">DADO<br>EXTRA</div>
      </div>
      <div class="c-tbody">${vm.rows.map(tableRow).join("") || `<div class="c-empty">Sin jugadores</div>`}</div>
    </div>
    ${dicePanel(vm.diceCounts, vm.header?.dice ?? null)}
    <div class="c-footer">
      <div class="c-played">${calendarSvg("c-cal")}<span>${vm.jornadasPlayed} ${vm.jornadasPlayed === 1 ? "JORNADA DISPUTADA" : "JORNADAS DISPUTADAS"}</span></div>
      <div class="c-note">*Un dado por jugador para<br>la fase de bonificación</div>
    </div>`;
  return card;
}

// Each inlined crest gets its own ids, so a copy inside a hidden view never
// provides the gradient for a visible one.
function uniqueCrest() {
  const prefix = `crest${++crestCount}-`;
  return crestMarkup.replace(/crest-/g, prefix);
}

function rowFontSize(n) {
  // 10 rows fill the table at 46px; more rows shrink the text, fewer don't grow it.
  return Math.round(Math.min(46, (46 * 10) / Math.max(n, 1)));
}

function matchBar(h) {
  const jornada = `<div class="c-jornada">${calendarSvg("c-cal")}<span>${h ? `JORNADA ${h.jornada}` : "SIN JORNADAS"}</span></div>`;
  if (!h || !h.showMatch) {
    return `<div class="c-match c-match-bare">${jornada}${h?.dice ? diceBox(h.dice) : ""}</div>`;
  }
  const [a, b] = h.teams;
  const team = (t, side) => `
    <div class="c-team c-team-${side}">
      ${side === "left" ? teamBadgeSvg(t.name, t.isBarca, "c-badge") : ""}
      <span class="c-team-name" style="font-size:${teamNameSize(t.name)}px">${escapeHtml(t.name.toUpperCase())}</span>
      ${side === "right" ? teamBadgeSvg(t.name, t.isBarca, "c-badge") : ""}
    </div>`;
  const score = h.hasScore
    ? `<div class="c-goals">${a.goals}<span>-</span>${b.goals}</div>`
    : `<div class="c-goals c-vs">VS</div>`;
  return `<div class="c-match">
    ${jornada}
    <div class="c-scoreline">${team(a, "left")}${score}${team(b, "right")}</div>
    ${h.dice ? diceBox(h.dice) : `<div class="c-dice"></div>`}
  </div>`;
}

/** Team names wrap on words over two lines; long words and names get a smaller font. */
function teamNameSize(name) {
  const longestWord = Math.max(...name.split(/\s+/).map((w) => w.length));
  const size = Math.min(30, 230 / Math.max(longestWord, 1), 560 / Math.max(name.length, 1));
  return Math.max(18, Math.round(size));
}

function diceBox(face) {
  return `<div class="c-dice"><div class="c-dice-label">DADO:<span class="c-dice-num">${face}</span></div>${dieSvg(face, { style: "red", className: "c-dice-die" })}</div>`;
}

function tableRow(r) {
  const trophies = Array.from({ length: r.titles }, () => trophySvg("c-trophy")).join("");
  const dice = Array.from({ length: r.extraDice }, () => dieSvg(0, { style: "ivory", className: "c-extra-die" })).join("");
  return `<div class="c-row${r.leader ? " is-leader" : ""}">
    <div class="c-pos">${r.pos}</div>
    <div class="c-name"><span class="c-name-text">${escapeHtml(r.name)}</span>${trophies}</div>
    <div class="c-pts">${r.points}</div>
    <div class="c-casa${r.casaHighlighted ? " is-positive" : ""}">${r.casa}</div>
    <div class="c-extra">${dice}</div>
  </div>`;
}

function dicePanel(counts, lastFace) {
  const cols = counts.map((count, i) => `
    <div class="c-face${i + 1 === lastFace ? " is-last" : ""}">
      <div class="c-face-num">${i + 1}</div>
      ${dieSvg(i + 1, { style: "white", className: "c-face-die" })}
      <div class="c-face-count">${count}</div>
    </div>`).join("");
  return `<div class="c-dicepanel">
    <div class="c-dicepanel-title">${bigRedDieSvg("c-bigdie")}<span>DADO – VECES QUE HA SALIDO</span></div>
    <div class="c-faces">${cols}</div>
  </div>`;
}

/** Puts the card in `host`, scaled to the host's width. */
export function mountScaled(host, card) {
  host.replaceChildren(card);
  const fit = () => {
    const scale = host.clientWidth / CARD_WIDTH;
    card.style.transform = `scale(${scale})`;
    host.style.height = `${CARD_HEIGHT * scale}px`;
  };
  fit();
  return fit;
}

/** Compact standings table for the form's live preview. */
export function renderMiniTable(vm) {
  const rows = vm.rows.map((r) => `
    <tr class="${r.leader ? "is-leader" : ""}">
      <td>${r.pos}</td><td>${escapeHtml(r.name)}</td><td class="num">${r.points}</td>
      <td class="num">${r.casa}</td><td class="num">${r.extraDice || ""}</td>
    </tr>`).join("");
  return `<table class="mini">
    <thead><tr><th>Pos.</th><th>Jugador</th><th class="num">Puntos</th><th class="num">Casa</th><th class="num">Dado extra</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="mini-dice">Dado: ${vm.diceCounts.map((c, i) => `<span>${i + 1}<b>×${c}</b></span>`).join(" ")}</p>`;
}
