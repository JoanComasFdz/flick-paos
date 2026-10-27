// Bootstrapping, hash routing between views, and app state.

import * as api from "./api.js";
import { computeStandings, topScorers } from "./standings.js";
import { renderCard, mountScaled, loadCrest } from "./render.js";
import { renderForm } from "./form.js";
import { cardPng, downloadPng, sharePng, canShareFiles } from "./export.js";
import { escapeHtml, dieSvg } from "./icons.js";
import { t, getLang, setLang, locale, LANGS } from "./i18n.js";
import { renderNormas } from "./normas.js";

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
    if (state.data) toast(t("updateFailed", { msg: err.message }), true);
  } finally {
    state.loading = false;
    rerender();
  }
}

/** Re-renders after a background refresh, but never under a form being filled in. */
function rerender() {
  if (view.querySelector("form") || location.hash === "#/normas") return;
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
  seasonSelect.innerHTML = seasons.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(t("seasonOption", { s }))}</option>`).join("");
  seasonSelect.value = state.data.season;
}

seasonSelect.addEventListener("change", () => {
  const season = seasonSelect.value === state.data?.currentSeason ? "" : seasonSelect.value;
  storage.set("flickpaos:season", season);
  load({ season });
});

// ---------------------------------------------------------------- PIN

const PIN_KEY = "flickpaos:pin";

let pinPromise = null;

/**
 * The stored PIN, or one the user types and the backend accepts (then stored).
 * Null when the user cancels. Concurrent callers share one prompt.
 */
function ensurePin(message = "", onChecking = () => {}) {
  const stored = storage.get(PIN_KEY);
  if (stored) return Promise.resolve(stored);
  pinPromise ??= (async () => {
    for (;;) {
      const pin = await askPin(message);
      if (pin == null) return null;
      onChecking();
      try {
        await api.checkPin(pin);
      } catch (err) {
        if (!err.wrongPin) throw err;
        message = t("wrongPin");
        continue;
      }
      storage.set(PIN_KEY, pin);
      return pin;
    }
  })().finally(() => { pinPromise = null; });
  return pinPromise;
}

/** Runs a write with the PIN; a PIN that stopped working is forgotten and asked for again. */
async function withPin(write) {
  let message = "";
  for (;;) {
    const pin = await ensurePin(message);
    if (pin == null) return null;
    try {
      return await write(pin);
    } catch (err) {
      if (!err.wrongPin) throw err;
      storage.remove(PIN_KEY);
      message = t("wrongPin");
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
  markTab(hash);
  // The rules don't need the league data.
  if (hash === "#/normas") return showNormas();
  if (!state.data) return renderLoadingOrError();
  const m = /^#\/jornada\/(new|\d+)$/.exec(hash);
  if (m) return openForm(m[1] === "new" ? null : Number(m[1]));
  if (hash === "#/historial") return showHistory();
  return showScoreboard();
}

/** Highlights the tab of the current view; a matchday form belongs to none. */
function markTab(hash) {
  const tab = hash === "#/historial" ? "history" : hash === "#/normas" ? "rules" : hash.startsWith("#/jornada") ? "" : "standings";
  document.querySelectorAll("[data-tab]").forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

function showNormas() {
  view.innerHTML = renderNormas(getLang());
  window.scrollTo(0, 0);
}

function renderLoadingOrError() {
  if (state.error) {
    view.innerHTML = `<div class="error-box" role="alert">
      <p>${escapeHtml(state.error.message)}</p>
      <button type="button" class="btn btn-primary retry">${t("retry")}</button></div>`;
    view.querySelector(".retry").addEventListener("click", () => load());
  } else {
    view.innerHTML = `<div class="loading" role="status"><div class="spinner"></div><p>${t("loading")}</p></div>`;
  }
}

function statusLine() {
  const age = `<span class="age">${state.loading ? t("updating") : t("updated", { ago: timeAgo(state.fetchedAt) })}</span>`;
  const retry = state.error && !state.loading ? `<button type="button" class="btn btn-small retry">${t("retry")}</button>` : "";
  return `<div class="status">${age}${retry}</div>`;
}

/** "Cerrar sesión": only while this phone remembers the PIN. */
function logoutButton() {
  return storage.get(PIN_KEY) ? `<button type="button" class="logout">${t("logout")}</button>` : "";
}

function bindStatus() {
  view.querySelector(".status .retry")?.addEventListener("click", () => load());
  view.querySelector(".logout")?.addEventListener("click", (e) => {
    storage.remove(PIN_KEY);
    e.currentTarget.remove();
    toast(t("loggedOut"));
  });
  ageTimer = setInterval(() => {
    const el = view.querySelector(".status .age");
    if (el && !state.loading) el.textContent = t("updated", { ago: timeAgo(state.fetchedAt) });
  }, 30000);
}

const shareSupported = canShareFiles();

function showScoreboard() {
  const vm = computeStandings(state.data);
  view.innerHTML = `
    ${statusLine()}
    <div class="card-host" role="img" aria-label="${escapeHtml(cardDescription(vm))}"></div>
    <div class="actions">
      <button type="button" class="btn btn-primary download ${shareSupported ? "" : "wide"}">${t("download")}</button>
      ${shareSupported ? `<button type="button" class="btn btn-garnet share">${t("share")}</button>` : ""}
      <a class="btn wide" href="#/jornada/new">${t("newMatchday")}</a>
    </div>
    ${logoutButton()}`;
  bindStatus();
  refit = mountScaled(view.querySelector(".card-host"), renderCard(vm));

  const download = view.querySelector(".download");
  download.addEventListener("click", () => busy(download, t("generating"), () => downloadPng(vm)));
  const share = view.querySelector(".share");
  share?.addEventListener("click", () => busy(share, t("preparing"), async () => {
    try {
      await sharePng(vm);
    } catch (err) {
      if (err.name === "AbortError") return; // the user closed the share sheet
      // Safari needs the share to start right after the tap; the image is ready now.
      if (err.name === "NotAllowedError") return toast(t("shareAgain"));
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
    toast(t("imageFailed", { msg: err.message }), true);
  } finally {
    button.disabled = false;
    button.textContent = text;
  }
}

function cardDescription(vm) {
  const top = vm.rows.slice(0, 3).map((r) => `${r.pos}. ${r.name} ${r.points}`).join(", ");
  return t("cardDescription", { season: vm.season, n: vm.jornadasPlayed, top });
}

/** Asks for the PIN before showing the form, so nobody fills it in for nothing. */
async function openForm(jornada) {
  if (storage.get(PIN_KEY)) return showForm(jornada);
  const hash = location.hash;
  let pin = null;
  try {
    pin = await ensurePin("", () => {
      view.innerHTML = `<div class="loading" role="status"><div class="spinner"></div><p>${t("checkingPin")}</p></div>`;
    });
  } catch (err) {
    toast(err.message, true);
  }
  if (location.hash !== hash) return; // the user went elsewhere meanwhile
  if (pin == null) {
    location.hash = "#/";
    return;
  }
  showForm(jornada);
}

let openFormState = null; // { jornada, form } while a form is on screen

function showForm(jornada, draft) {
  const form = renderForm(view, {
    data: state.data,
    jornada,
    draft,
    onCancel: () => { location.hash = "#/"; },
    onSave: async (matchday, scores) => {
      const data = await withPin((pin) => api.upsertMatchday(pin, matchday, scores));
      if (!data) return;
      applyWrite(data);
      location.hash = "#/";
      toast(t("saved", { n: matchday.jornada }));
    },
    onDelete: async (n) => {
      if (!(await confirmDialog(t("confirmDelete", { n }), t("delete")))) return;
      const data = await withPin((pin) => api.deleteMatchday(pin, state.data.season, n));
      if (!data) return;
      applyWrite(data);
      location.hash = "#/";
      toast(t("deleted", { n }));
    },
  });
  openFormState = form ? { jornada, form } : null;
  if (!draft) window.scrollTo(0, 0);
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
      : t("noMatch");
    const best = top.names.length
      ? t("best", { names: top.names.map(escapeHtml).join(", "), pts: `${top.points > 0 ? "+" : ""}${top.points}` })
      : t("noPoints");
    return `<li><a href="#/jornada/${md.jornada}" aria-label="${t("editMatchday", { n: md.jornada })}">
      <span class="j">J<b>${md.jornada}</b></span>
      <span class="rival">${title}${md.type === "adjustment" ? `<span class="tag">${t("adjustmentTag")}</span>` : ""}</span>
      ${md.dice ? dieSvg(md.dice, { style: "white" }) : "<span></span>"}
      <span class="meta">${md.date ? formatDate(md.date) + " · " : ""}${best}</span>
    </a></li>`;
  }).join("");
  view.innerHTML = `
    ${statusLine()}
    <h2>${t("history")} <span>T${escapeHtml(data.season)}</span></h2>
    ${items ? `<ul class="history">${items}</ul>` : `<p style="color:var(--muted)">${t("noMatchdays")}</p>`}
    <div class="actions"><a class="btn btn-primary wide" href="#/jornada/new">${t("newMatchday")}</a></div>
    ${logoutButton()}`;
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

function timeAgo(at) {
  const relative = new Intl.RelativeTimeFormat(getLang(), { numeric: "auto" });
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 45) return t("justNow");
  if (s < 3600) return relative.format(-Math.round(s / 60), "minute");
  if (s < 86400) return relative.format(-Math.round(s / 3600), "hour");
  return relative.format(-Math.round(s / 86400), "day");
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(locale(), { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------- language

/** Translates the static page (index.html) and marks the active flag. */
function applyLanguage() {
  document.documentElement.lang = getLang();
  document.title = t("docTitle") + (api.isMock ? " (mock)" : "");
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === getLang())));
  document.querySelector("nav.tabs").setAttribute("aria-label", t("sections"));
  renderSeasons();
}

document.querySelectorAll("[data-lang]").forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.lang === getLang() || !LANGS.includes(button.dataset.lang)) return;
  setLang(button.dataset.lang);
  applyLanguage();
  // Keep a form being filled in: render it again in the new language with what was typed.
  const form = view.querySelector("form") && openFormState;
  if (form) showForm(form.jornada, form.form.draft());
  else route();
}));

// ---------------------------------------------------------------- start

window.addEventListener("hashchange", route);
window.addEventListener("resize", () => refit?.());
applyLanguage();
await loadCrest();
load();
