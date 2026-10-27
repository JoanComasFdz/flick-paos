// Add / edit matchday form, with a live preview of the resulting standings.

import { computeStandings, withMatchday } from "./standings.js";
import { renderMiniTable } from "./render.js";
import { escapeHtml, dieSvg, teamBadgeSvg } from "./icons.js";
import { EXTRA_DIE_MIN_WATCHERS, isDieFace } from "./rules.js";
import { t } from "./i18n.js";
import { COMPETITIONS, findTeam, normalize, searchTeams } from "./teams.js";

/** Most extra dice a player can be given in an adjustment (dice won before it). */
const ADJUSTMENT_MAX_EXTRA_DICE = 5;

/**
 * @param {HTMLElement} root
 * @param {{data: object, jornada: number|null,
 *          onSave: (matchday: object, scores: object[]) => Promise<void>,
 *          onDelete: (jornada: number) => Promise<void>,
 *          onCancel: () => void, draft?: object}} options
 *   `draft` restores a form being filled in (after a language change).
 * @returns {{draft: () => object} | undefined}
 */
export function renderForm(root, { data, jornada, onSave, onDelete, onCancel, draft }) {
  const players = data.players.filter((p) => p.active).sort((a, b) => a.order - b.order);
  const existing = jornada == null ? null : data.matchdays.find((m) => m.jornada === jornada);
  if (jornada != null && !existing) {
    root.innerHTML = `<div class="error-box"><p>${t("notFound", { n: jornada })}</p><a class="btn" href="#/">${t("back")}</a></div>`;
    return;
  }

  const state = draft ?? initialState(data, players, existing);
  const editing = Boolean(existing);
  // Rivals typed by hand before (e.g. a Copa del Rey team), offered next to the listed teams.
  const otherRivals = [...new Set(data.matchdays.map((m) => m.rival).filter(Boolean))]
    .filter((r) => !findTeam(r)?.comps.length)
    .sort((a, b) => a.localeCompare(b, "es"));

  root.innerHTML = `
    <form class="matchday-form" novalidate>
      <h2>${editing ? t("editTitle", { n: state.jornada }) : t("newTitle")}</h2>
      <p class="form-error" role="alert" hidden></p>

      <div class="panel">
        <div class="row2">
          <div class="field">
            <label for="f-jornada">${t("jornada")}</label>
            <input id="f-jornada" class="input" type="number" inputmode="numeric" min="1" step="1"
              value="${state.jornada}" ${editing ? "readonly" : ""}>
          </div>
          <div class="field">
            <label for="f-date">${t("date")}</label>
            <input id="f-date" class="input" type="date" value="${escapeHtml(state.date)}">
          </div>
        </div>
        <p class="exists-notice" hidden>
          <span></span>
          <a class="btn btn-small" href="#/"></a>
        </p>
        <button type="button" class="toggle-advanced" aria-expanded="${state.type === "adjustment"}">${t("advanced")}</button>
        <div class="field advanced" ${state.type === "adjustment" ? "" : "hidden"}>
          <span class="label" id="f-type-label">${t("type")}</span>
          <div class="seg" role="group" aria-labelledby="f-type-label" data-seg="type">
            <button type="button" data-value="match">${t("match")}</button>
            <button type="button" data-value="adjustment">${t("adjustment")}</button>
          </div>
          <p class="hint adjustment-only" style="margin:4px 0 0">${t("totalsHint")}</p>
        </div>
      </div>

      <div class="panel">
        <h3 class="match-title"></h3>
        <p class="adjustment-only match-hint" style="color:var(--muted);font-size:13px;margin:-4px 0 12px">
          ${t("matchHint")}</p>
        <div class="field rival-field">
          <label for="f-rival">${t("rival")}</label>
          <div class="rival-input">
            <span class="rival-badge" aria-hidden="true"></span>
            <input id="f-rival" class="input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false"
              aria-controls="f-rival-list" autocomplete="off" enterkeyhint="search"
              placeholder="${escapeHtml(t("rivalSearch"))}" value="${escapeHtml(state.rival)}">
          </div>
          <div id="f-rival-list" class="team-list" role="listbox" aria-label="${escapeHtml(t("rival"))}" hidden></div>
          <p class="hint" style="margin:0">${t("rivalHint")}</p>
        </div>
        <div class="field">
          <span class="label" id="f-home-label">${t("barcaPlays")}</span>
          <div class="seg" role="group" aria-labelledby="f-home-label" data-seg="home_away">
            <button type="button" data-value="home">${t("home")}</button>
            <button type="button" data-value="away">${t("away")}</button>
          </div>
        </div>
        <div class="row2">
          <div class="field">
            <span class="label">${t("barcaGoals")}</span>
            ${stepper("barca_goals", state.barca_goals, t("barcaGoalsLabel"), { min: 0 })}
          </div>
          <div class="field">
            <span class="label">${t("rivalGoals")}</span>
            ${stepper("rival_goals", state.rival_goals, t("rivalGoalsLabel"), { min: 0 })}
          </div>
        </div>
        <div class="field">
          <span class="label" id="f-dice-label">${t("dice")}</span>
          <div class="dice-picker" role="group" aria-labelledby="f-dice-label">
            ${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" data-dice="${n}" aria-label="${t("diceN", { n })}">${dieSvg(n, { style: "white" })}</button>`).join("")}
          </div>
        </div>
      </div>

      <div class="panel match-only">
        <h3>${t("extraDice")}</h3>
        <p class="hint">${t("extraHint", { n: EXTRA_DIE_MIN_WATCHERS })}</p>
        <div class="field">
          <label for="f-extra-player">${t("extraWho")}</label>
          <select id="f-extra-player" class="input">
            <option value="">${t("extraNobody")}</option>
            ${lastFirst(data, players).map((p) => `<option value="${escapeHtml(p.player_id)}" ${state.extra.player === p.player_id ? "selected" : ""}>${escapeHtml(p.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field extra-face-field" ${state.extra.player ? "" : "hidden"}>
          <span class="label" id="f-extra-face-label">${t("extraFace")}</span>
          <div class="dice-picker" role="group" aria-labelledby="f-extra-face-label">
            ${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" data-extra-face="${n}" aria-label="${n}">${dieSvg(n, { style: "ivory" })}</button>`).join("")}
          </div>
        </div>
      </div>

      <div class="panel adjustment-only">
        <h3>${t("facesTitle")}</h3>
        <div class="dice-counts">
          ${state.dice_counts.map((c, i) => `
            <div class="field">
              <label for="f-count-${i}">${t("faceN", { n: i + 1 })}</label>
              <input id="f-count-${i}" class="input" type="number" inputmode="numeric" min="0" step="1" data-count="${i}" value="${c}">
            </div>`).join("")}
        </div>
      </div>

      <div class="panel">
        <h3 class="players-title"></h3>
        <p class="hint match-only">${t("pointsHint")}</p>
        ${players.map((p) => playerRow(p, state.scores[p.player_id])).join("")}
      </div>

      <div class="panel">
        <div class="field">
          <label for="f-notes">${t("notes")}</label>
          <input id="f-notes" class="input" type="text" value="${escapeHtml(state.notes)}">
        </div>
      </div>

      <div class="panel">
        <h3>${t("preview")}</h3>
        <div class="preview"></div>
      </div>

      ${editing ? `<button type="button" class="btn btn-danger delete" style="width:100%;margin-bottom:14px">${t("deleteMatchday")}</button>` : ""}

      <div class="savebar">
        <button type="button" class="btn cancel">${t("cancel")}</button>
        <button type="submit" class="btn btn-primary save">${t("save")}</button>
      </div>
    </form>`;

  const form = root.querySelector("form");
  const $ = (sel) => form.querySelector(sel);
  const errorBox = $(".form-error");

  function sync() {
    form.querySelectorAll("[data-seg]").forEach((seg) => {
      seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === state[seg.dataset.seg])));
    });
    form.querySelectorAll("[data-dice]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.dice) === state.dice)));
    form.querySelectorAll("[data-extra]").forEach((b) => {
      b.setAttribute("aria-pressed", String(Number(b.dataset.value) === state.scores[b.dataset.extra].extra_dice_faces.length));
    });
    form.querySelectorAll("[data-face]").forEach((b) => {
      const faces = state.scores[b.dataset.face].extra_dice_faces;
      b.setAttribute("aria-pressed", String(faces[Number(b.dataset.index)] === Number(b.dataset.value)));
    });
    const adjustment = state.type === "adjustment";
    form.querySelectorAll(".adjustment-only").forEach((el) => (el.hidden = !adjustment));
    form.querySelectorAll(".match-only").forEach((el) => (el.hidden = adjustment));
    form.querySelectorAll("[data-extra-face]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.extraFace) === state.extra.face)));
    $(".extra-face-field").hidden = !state.extra.player;
    $(".match-title").textContent = t(adjustment ? "matchOptional" : "match");
    $(".players-title").textContent = t(adjustment ? "playersTotals" : "playersPoints");
    // A new matchday never overwrites an existing one: it points to it instead.
    const exists = !editing && data.matchdays.some((m) => m.jornada === state.jornada);
    const notice = $(".exists-notice");
    notice.hidden = !exists;
    if (exists) {
      notice.querySelector("span").textContent = t("existsNotice", { n: state.jornada });
      const link = notice.querySelector("a");
      link.textContent = t("openExisting", { n: state.jornada });
      link.href = `#/jornada/${state.jornada}`;
    }
    $(".preview").innerHTML = renderMiniTable(computeStandings(withMatchday(data, ...build())));
  }

  /** The matchday and scores as they would be saved. */
  function build() {
    const adjustment = state.type === "adjustment";
    const hasMatch = !adjustment || state.rival.trim() !== "";
    const matchday = {
      season: String(data.season),
      jornada: state.jornada,
      type: state.type,
      date: state.date,
      rival: hasMatch ? state.rival.trim() : "",
      home_away: hasMatch ? state.home_away : "",
      barca_goals: hasMatch ? state.barca_goals : null,
      rival_goals: hasMatch ? state.rival_goals : null,
      dice: hasMatch && isDieFace(state.dice) ? state.dice : null,
      dice_counts: adjustment ? [...state.dice_counts] : null,
      notes: state.notes.trim(),
    };
    const scores = players.map((p) => {
      const s = state.scores[p.player_id];
      // A match has at most one extra die; an adjustment lists the dice won before it.
      const faces = adjustment ? s.extra_dice_faces : state.extra.player === p.player_id ? [state.extra.face] : [];
      return { player_id: p.player_id, points: s.points, casa: s.casa, extra_dice: faces.length, extra_dice_faces: faces };
    });
    return [matchday, scores];
  }

  function validate() {
    if (!Number.isInteger(state.jornada) || state.jornada < 1) return t("errJornada");
    if (!editing && data.matchdays.some((m) => m.jornada === state.jornada)) return t("existsNotice", { n: state.jornada });
    if (state.type === "match") {
      if (!state.rival.trim()) return t("errRival");
      if (!isDieFace(state.dice)) return t("errDice");
    }
    if (state.type === "match" && state.extra.player && !isDieFace(state.extra.face)) return t("errExtraFace");
    const missingFace = state.type === "adjustment"
      && players.find((p) => state.scores[p.player_id].extra_dice_faces.some((f) => !isDieFace(f)));
    if (missingFace) return t("errFace", { name: missingFace.name });
    if (state.type === "adjustment" && state.dice_counts.some((c) => !Number.isInteger(c) || c < 0)) {
      return t("errCounts");
    }
    return "";
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = !message;
    if (message) errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---- rival picker: the text field searches the teams of Barça's competitions

  const rivalInput = $("#f-rival");
  const rivalList = $("#f-rival-list");

  // The badge of the chosen rival; hidden while searching, when the text is still partial.
  function showRivalBadge() {
    const rival = state.rival.trim();
    $(".rival-badge").innerHTML = rival && rivalList.hidden ? teamBadgeSvg(rival, false) : "";
  }

  function openRivalList() {
    const query = rivalInput.value;
    const option = (name) => `<button type="button" role="option" class="team-option" data-team="${escapeHtml(name)}"
      aria-selected="${normalize(name) === normalize(state.rival)}">${teamBadgeSvg(name, false)}<span>${escapeHtml(name)}</span></button>`;
    const found = searchTeams(query);
    const shown = new Set();
    let html = "";
    for (const comp of COMPETITIONS) {
      const teams = found.filter((team) => team.comps.includes(comp.id) && !shown.has(team.name));
      teams.forEach((team) => shown.add(team.name));
      if (teams.length) html += `<div class="team-group">${escapeHtml(comp.label)}</div>${teams.map((team) => option(team.name)).join("")}`;
    }
    const words = normalize(query).split(" ").filter(Boolean);
    const others = otherRivals.filter((r) => words.every((w) => normalize(r).includes(w)));
    if (others.length) html += `<div class="team-group">${t("otherRivals")}</div>${others.map(option).join("")}`;
    const typed = query.trim();
    if (typed && !found.concat(others.map((name) => ({ name }))).some((x) => normalize(x.name) === normalize(typed))) {
      html += `<button type="button" role="option" class="team-option team-custom" data-team="${escapeHtml(typed)}">${t("useTyped", { name: escapeHtml(typed) })}</button>`;
    }
    rivalList.innerHTML = html;
    rivalList.hidden = !html;
    rivalInput.setAttribute("aria-expanded", String(!rivalList.hidden));
    showRivalBadge();
  }

  function closeRivalList() {
    rivalList.hidden = true;
    rivalInput.setAttribute("aria-expanded", "false");
    showRivalBadge();
  }

  rivalInput.addEventListener("focus", openRivalList);
  rivalInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRivalList();
    if (e.key === "Enter") {
      e.preventDefault(); // pick the first match instead of submitting the form
      rivalList.querySelector(".team-option")?.click();
    }
  });
  // Close the list when tapping anywhere else; the listener goes away with the form.
  const onOutside = (e) => {
    if (!form.isConnected) return document.removeEventListener("pointerdown", onOutside);
    if (!e.target.closest(".rival-field")) closeRivalList();
  };
  document.addEventListener("pointerdown", onOutside);

  form.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.dataset.team != null) {
      state.rival = btn.dataset.team;
      rivalInput.value = state.rival;
      closeRivalList();
      sync();
      return;
    }
    if (btn.classList.contains("toggle-advanced")) {
      const adv = $(".advanced");
      adv.hidden = !adv.hidden;
      btn.setAttribute("aria-expanded", String(!adv.hidden));
      return;
    }
    if (btn.parentElement?.dataset.seg) {
      state[btn.parentElement.dataset.seg] = btn.dataset.value;
    } else if (btn.dataset.dice) {
      const n = Number(btn.dataset.dice);
      // In an adjustment the dice is optional: tapping it again clears it.
      state.dice = state.dice === n && state.type === "adjustment" ? null : n;
    } else if (btn.dataset.extra) {
      const score = state.scores[btn.dataset.extra];
      score.extra_dice_faces = Array.from({ length: Number(btn.dataset.value) }, (_, i) => score.extra_dice_faces[i] ?? null);
      form.querySelector(`.extra-faces[data-player="${btn.dataset.extra}"]`).innerHTML =
        facePickers(players.find((p) => p.player_id === btn.dataset.extra), score);
    } else if (btn.dataset.extraFace) {
      state.extra.face = Number(btn.dataset.extraFace);
    } else if (btn.dataset.face) {
      state.scores[btn.dataset.face].extra_dice_faces[Number(btn.dataset.index)] = Number(btn.dataset.value);
    } else if (btn.dataset.step) {
      const input = btn.parentElement.querySelector("input");
      const min = input.min === "" ? -Infinity : Number(input.min);
      const value = Math.max(min, (parseInt(input.value, 10) || 0) + Number(btn.dataset.step));
      input.value = String(value);
      setField(input);
    } else if (btn.classList.contains("cancel")) {
      onCancel();
      return;
    } else if (btn.classList.contains("delete")) {
      deleteMatchday(btn);
      return;
    } else {
      return;
    }
    sync();
  });

  form.addEventListener("input", (e) => {
    if (e.target.id === "f-extra-player") {
      state.extra.player = e.target.value || null;
      sync();
    } else if (e.target.matches("input")) {
      setField(e.target);
      if (e.target === rivalInput) openRivalList();
      sync();
    }
  });

  function setField(input) {
    const int = (v) => (v.trim() === "" ? 0 : parseInt(v, 10));
    if (input.id === "f-jornada") state.jornada = parseInt(input.value, 10);
    else if (input.id === "f-date") state.date = input.value;
    else if (input.id === "f-rival") state.rival = input.value;
    else if (input.id === "f-notes") state.notes = input.value;
    else if (input.dataset.count) state.dice_counts[Number(input.dataset.count)] = int(input.value);
    else if (input.dataset.field) state[input.dataset.field] = int(input.value) || 0;
    else if (input.dataset.player) state.scores[input.dataset.player][input.dataset.key] = int(input.value) || 0;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const problem = validate();
    showError(problem);
    if (problem) return;
    const save = $(".save");
    save.disabled = true;
    save.textContent = t("saving");
    try {
      await onSave(...build());
    } catch (err) {
      showError(err.message);
    } finally {
      save.disabled = false;
      save.textContent = t("save");
    }
  });

  async function deleteMatchday(btn) {
    btn.disabled = true;
    try {
      await onDelete(state.jornada);
    } catch (err) {
      showError(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  showRivalBadge();
  sync();
  return { draft: () => state };
}

function initialState(data, players, existing) {
  const before = computeStandings({
    ...data,
    matchdays: data.matchdays.filter((m) => !existing || m.jornada < existing.jornada),
    scores: data.scores.filter((s) => !existing || s.jornada < existing.jornada),
  });
  const wonBefore = Object.fromEntries(before.rows.map((r) => [r.player_id, r.extraDiceFaces]));
  const last = data.matchdays.reduce((max, m) => Math.max(max, m.jornada), 0);

  const scores = {};
  const extra = { player: null, face: null };
  for (const p of players) {
    const row = existing && data.scores.find((s) => s.jornada === existing.jornada && s.player_id === p.player_id);
    const faces = row ? facesOf(row) : [];
    if (existing?.type === "match" && faces.length && !extra.player) Object.assign(extra, { player: p.player_id, face: faces[0] });
    scores[p.player_id] = {
      points: row ? row.points : 0,
      casa: row ? row.casa : 0,
      // Used by an adjustment: the dice won before it (by default, those won so far).
      extra_dice_faces: existing?.type === "adjustment" ? faces : (wonBefore[p.player_id] || []).map((f) => f || null),
    };
  }

  if (!existing) {
    return {
      jornada: last + 1, date: today(), type: "match", rival: "", home_away: "home",
      barca_goals: 0, rival_goals: 0, dice: null, dice_counts: before.diceCounts, notes: "", scores, extra,
    };
  }
  return {
    jornada: existing.jornada,
    date: existing.date || "",
    type: existing.type,
    rival: existing.rival || "",
    home_away: existing.home_away || "home",
    barca_goals: existing.barca_goals ?? 0,
    rival_goals: existing.rival_goals ?? 0,
    dice: existing.dice,
    dice_counts: existing.dice_counts ? [...existing.dice_counts] : before.diceCounts,
    notes: existing.notes || "",
    scores,
    extra,
  };
}

function stepper(field, value, label, { min, player, key } = {}) {
  const data = player ? `data-player="${player}" data-key="${key}"` : `data-field="${field}"`;
  return `<div class="stepper">
    <button type="button" data-step="-1" aria-label="${escapeHtml(t("minus", { label }))}">−</button>
    <input type="number" inputmode="numeric" step="1" ${min != null ? `min="${min}"` : ""} ${data}
      value="${value}" aria-label="${escapeHtml(label)}">
    <button type="button" data-step="1" aria-label="${escapeHtml(t("plus", { label }))}">+</button>
  </div>`;
}

function playerRow(p, s) {
  const name = escapeHtml(p.name);
  const extra = Array.from({ length: ADJUSTMENT_MAX_EXTRA_DICE + 1 }, (_, n) =>
    `<button type="button" data-extra="${p.player_id}" data-value="${n}">${n}</button>`).join("");
  return `<div class="player-row">
    <div class="player-name">${name}</div>
    <div class="player-controls">
      <div><span class="mini-label">${t("points")}</span>${stepper(null, s.points, t("pointsOf", { name: p.name }), { player: p.player_id, key: "points" })}</div>
      <div><span class="mini-label">${t("casa")}</span>${stepper(null, s.casa, t("casaOf", { name: p.name }), { player: p.player_id, key: "casa" })}</div>
      <div class="adjustment-only"><span class="mini-label" id="x-${p.player_id}">${t("extraDiceWon")}</span>
        <div class="seg" role="group" aria-labelledby="x-${p.player_id}">${extra}</div></div>
    </div>
    <div class="extra-faces adjustment-only" data-player="${p.player_id}">${facePickers(p, s)}</div>
  </div>`;
}

/** One row of six die buttons per extra die, to enter the face it rolled. */
function facePickers(p, s) {
  return s.extra_dice_faces.map((_, i) => `
    <div class="extra-face" role="group" aria-label="${escapeHtml(t("extraFaceOf", { n: i + 1, name: p.name }))}">
      <span class="mini-label">${t("extraDieN", { n: i + 1 })}</span>
      <div class="dice-picker dice-picker-small">
        ${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" data-face="${p.player_id}" data-index="${i}" data-value="${n}"
          aria-label="${n}">${dieSvg(n, { style: "ivory" })}</button>`).join("")}
      </div>
    </div>`).join("");
}

/** Players from last to first in the table: the extra die usually goes to the first one watching. */
function lastFirst(data, players) {
  const order = computeStandings(data).rows.map((r) => r.player_id).reverse();
  return [...players].sort((a, b) => order.indexOf(a.player_id) - order.indexOf(b.player_id));
}

function facesOf(row) {
  const faces = Array.isArray(row.extra_dice_faces) ? row.extra_dice_faces : [];
  const count = Math.max(Number(row.extra_dice) || 0, faces.length);
  return Array.from({ length: count }, (_, i) => (isDieFace(faces[i]) ? faces[i] : null));
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
