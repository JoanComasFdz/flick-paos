// Bootstrapping, hash routing between views, and app state.

import * as api from "./api.js";
import { computeStandings, topScorers } from "./standings.js";
import { renderCard, mountScaled, loadCrest } from "./render.js";
import { renderForm } from "./form.js";
import { cardPng, downloadPng, sharePng, canShareFiles } from "./export.js";
import { escapeHtml, dieSvg } from "./icons.js";

const view = document.getElementById("view");
const seasonSelect = document.getElementById("season");
const seasonLabel = document.querySelector('label[for="season"]');

// ---------------------------------------------------------------- storage (may be unavailable)

const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode, quota */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* unavailable */ } },
};

const state = {
  season: storage.get("flickpaos:season") || "", // "" = the backend's current season
  data: null,
  fetchedAt: 0,
  loading: false,
  error: null,
};

// ---------------------------------------------------------------- cache

const cacheKey = (season) => `flickpaos:league:${api.isMock ? "mock:" : ""}${season || "current"}`;

function readCache(season) {
  try {
    const cached = JSON.parse(storage.get(cacheKey(season)));
    return cached && cached.data ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(season, data, at) {
  const value = JSON.stringify({ at, data });
  storage.set(cacheKey(season), value);
  storage.set(cacheKey(data.season), value);
}

// ---------------------------------------------------------------- data

/** Shows cached data at once, then refreshes it from the API (stale-while-revalidate). */
async function load({ season = state.season } = {}) {
  const cached = readCache(season);
  if (cached && (!state.data || state.season !== season)) setData(cached.data, cached.at);
  state.season = season;
  state.loading = true;
  state.error = null;
  rerender();
  try {
    const data = await api.getLeague(season);
    const at = Date.now();
    writeCache(season, data, at);
    setData(data, at);
  } catch (err) {
    state.error = err;
    if (state.data) toast("No se pudo actualizar: " + err.message, true);
  } finally {
    state.loading = false;
    rerender();
  }
}

/** Re-renders after a background refresh, but never under a form being filled in. */
function rerender() {
  if (view.querySelector("form")) return;
  route();
}

function setData(data, at) {
  state.data = data;
  state.fetchedAt = at;
  renderSeasons();
}

function applyWrite(data) {
  const at = Date.now();
  state.season = data.season === data.currentSeason ? "" : data.season;
  writeCache(state.season, data, at);
  setData(data, at);
}

function renderSeasons() {
  const seasons = state.data?.seasons || [];
  const show = seasons.length > 1;
  seasonSelect.hidden = !show;
  seasonLabel.hidden = !show;
  if (!show) return;
  seasonSelect.innerHTML = seasons.map((s) => `<option value="${escapeHtml(s)}">Temporada ${escapeHtml(s)}</option>`).join("");
  seasonSelect.value = state.data.season;
}

seasonSelect.addEventListener("change", () => {
  const season = seasonSelect.value === state.data?.currentSeason ? "" : seasonSelect.value;
  storage.set("flickpaos:season", season);
  load({ season });
});

// ---------------------------------------------------------------- PIN

const PIN_KEY = "flickpaos:pin";

/** Runs a write with the stored PIN, asking for it (and checking it) when needed. */
async function withPin(write) {
  let message = "";
  for (;;) {
    let pin = storage.get(PIN_KEY);
    if (!pin) {
      pin = await askPin(message);
      if (pin == null) return null;
      try {
        await api.checkPin(pin);
      } catch (err) {
        if (!err.wrongPin) throw err;
        message = "PIN incorrecto. Prueba otra vez.";
        continue;
      }
      storage.set(PIN_KEY, pin);
    }
    try {
      return await write(pin);
    } catch (err) {
      if (!err.wrongPin) throw err;
      storage.remove(PIN_KEY);
      message = "PIN incorrecto. Prueba otra vez.";
    }
  }
}

function askPin(message) {
  const dialog = document.getElementById("pin-dialog");
  const input = dialog.querySelector("input");
  const error = dialog.querySelector(".pin-error");
  error.textContent = message;
  error.hidden = !message;
  input.value = "";
  dialog.showModal();
  input.focus();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue === "ok" && input.value.trim() ? input.value.trim() : null);
    }, { once: true });
  });
}

function confirmDialog(text, okLabel) {
  const dialog = document.getElementById("confirm-dialog");
  dialog.querySelector("p").textContent = text;
  dialog.querySelector('[value="ok"]').textContent = okLabel;
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
  });
}

// ---------------------------------------------------------------- views

let refit = null;
let ageTimer = null;

function route() {
  const hash = location.hash || "#/";
  clearInterval(ageTimer);
  refit = null;
  if (!state.data) return renderLoadingOrError();
  const m = /^#\/jornada\/(new|\d+)$/.exec(hash);
  if (m) return showForm(m[1] === "new" ? null : Number(m[1]));
  if (hash === "#/historial") return showHistory();
  return showScoreboard();
}

function renderLoadingOrError() {
  if (state.error) {
    view.innerHTML = `<div class="error-box" role="alert">
      <p>${escapeHtml(state.error.message)}</p>
      <button type="button" class="btn btn-primary retry">Reintentar</button></div>`;
    view.querySelector(".retry").addEventListener("click", () => load());
  } else {
    view.innerHTML = `<div class="loading" role="status"><div class="spinner"></div><p>Cargando la liga…</p></div>`;
  }
}

function statusLine() {
  const age = `<span class="age">${state.loading ? "Actualizando…" : "Actualizado " + timeAgo(state.fetchedAt)}</span>`;
  const retry = state.error && !state.loading ? `<button type="button" class="btn btn-small retry">Reintentar</button>` : "";
  return `<div class="status">${age}${retry}</div>`;
}

function bindStatus() {
  view.querySelector(".status .retry")?.addEventListener("click", () => load());
  ageTimer = setInterval(() => {
    const el = view.querySelector(".status .age");
    if (el && !state.loading) el.textContent = "Actualizado " + timeAgo(state.fetchedAt);
  }, 30000);
}

const shareSupported = canShareFiles();

function showScoreboard() {
  const vm = computeStandings(state.data);
  view.innerHTML = `
    ${statusLine()}
    <div class="card-host" role="img" aria-label="${escapeHtml(cardDescription(vm))}"></div>
    <div class="actions">
      <button type="button" class="btn btn-primary download ${shareSupported ? "" : "wide"}">Descargar imagen</button>
      ${shareSupported ? `<button type="button" class="btn btn-garnet share">Compartir</button>` : ""}
      <a class="btn" href="#/jornada/new">Nueva jornada</a>
      <a class="btn" href="#/historial">Historial</a>
    </div>`;
  bindStatus();
  refit = mountScaled(view.querySelector(".card-host"), renderCard(vm));

  const download = view.querySelector(".download");
  download.addEventListener("click", () => busy(download, "Generando…", () => downloadPng(vm)));
  const share = view.querySelector(".share");
  share?.addEventListener("click", () => busy(share, "Preparando…", async () => {
    try {
      await sharePng(vm);
    } catch (err) {
      if (err.name === "AbortError") return; // the user closed the share sheet
      // Safari needs the share to start right after the tap; the image is ready now.
      if (err.name === "NotAllowedError") return toast("Imagen preparada: pulsa Compartir otra vez.");
      throw err;
    }
  }));

  // Prepare the PNG in the background so Compartir opens the share sheet at once.
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  idle(() => cardPng(vm).catch(() => {}));
}

async function busy(button, label, action) {
  const text = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    await action();
  } catch (err) {
    toast("No se pudo generar la imagen: " + err.message, true);
  } finally {
    button.disabled = false;
    button.textContent = text;
  }
}

function cardDescription(vm) {
  const top = vm.rows.slice(0, 3).map((r) => `${r.pos}. ${r.name} ${r.points}`).join(", ");
  return `Clasificación de la temporada ${vm.season} tras ${vm.jornadasPlayed} jornadas: ${top}`;
}

function showForm(jornada) {
  renderForm(view, {
    data: state.data,
    jornada,
    onCancel: () => { location.hash = "#/"; },
    onSave: async (matchday, scores, replacing) => {
      if (replacing && !(await confirmDialog(`La jornada ${matchday.jornada} ya existe. ¿Reemplazarla?`, "Reemplazar"))) return;
      const data = await withPin((pin) => api.upsertMatchday(pin, matchday, scores));
      if (!data) return;
      applyWrite(data);
      location.hash = "#/";
      toast(`Jornada ${matchday.jornada} guardada`);
    },
    onDelete: async (n) => {
      if (!(await confirmDialog(`¿Borrar la jornada ${n} y todos sus puntos? No se puede deshacer.`, "Borrar"))) return;
      const data = await withPin((pin) => api.deleteMatchday(pin, state.data.season, n));
      if (!data) return;
      applyWrite(data);
      location.hash = "#/";
      toast(`Jornada ${n} borrada`);
    },
  });
  window.scrollTo(0, 0);
}

function showHistory() {
  const data = state.data;
  const items = [...data.matchdays].reverse().map((md) => {
    const top = topScorers(data, md.jornada);
    const hasScore = md.barca_goals != null && md.rival_goals != null;
    const teams = md.home_away === "away" ? [md.rival, "Barça"] : ["Barça", md.rival];
    const goals = md.home_away === "away" ? [md.rival_goals, md.barca_goals] : [md.barca_goals, md.rival_goals];
    const title = md.rival
      ? `${escapeHtml(teams[0])} ${hasScore ? `${goals[0]}-${goals[1]}` : "vs"} ${escapeHtml(teams[1])}`
      : "Sin partido";
    const best = top.names.length ? `Máx.: ${top.names.map(escapeHtml).join(", ")} (${top.points > 0 ? "+" : ""}${top.points})` : "Sin puntos";
    return `<li><a href="#/jornada/${md.jornada}" aria-label="Editar jornada ${md.jornada}">
      <span class="j">J<b>${md.jornada}</b></span>
      <span class="rival">${title}${md.type === "adjustment" ? `<span class="tag">Ajuste</span>` : ""}</span>
      ${md.dice ? dieSvg(md.dice, { style: "white" }) : "<span></span>"}
      <span class="meta">${md.date ? formatDate(md.date) + " · " : ""}${best}</span>
    </a></li>`;
  }).join("");
  view.innerHTML = `
    ${statusLine()}
    <h2>Historial <span>T${escapeHtml(data.season)}</span></h2>
    ${items ? `<ul class="history">${items}</ul>` : `<p style="color:var(--muted)">Todavía no hay jornadas.</p>`}
    <div class="actions"><a class="btn btn-primary" href="#/jornada/new">Nueva jornada</a><a class="btn" href="#/">Clasificación</a></div>`;
  bindStatus();
}

// ---------------------------------------------------------------- helpers

let toastTimer = null;
function toast(message, isError = false) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.toggle("is-error", isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
function timeAgo(at) {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 45) return "ahora mismo";
  if (s < 3600) return relative.format(-Math.round(s / 60), "minute");
  if (s < 86400) return relative.format(-Math.round(s / 3600), "hour");
  return relative.format(-Math.round(s / 86400), "day");
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------- start

window.addEventListener("hashchange", route);
window.addEventListener("resize", () => refit?.());
if (api.isMock) document.title += " (mock)";
await loadCrest();
load();
