// Add / edit matchday form, with a live preview of the resulting standings.

import { computeStandings, withMatchday } from "./standings.js";
import { renderMiniTable } from "./render.js";
import { escapeHtml, dieSvg } from "./icons.js";
import { MAX_EXTRA_DICE, isDieFace } from "./rules.js";
import { t } from "./i18n.js";

/**
 * @param {HTMLElement} root
 * @param {{data: object, jornada: number|null,
 *          onSave: (matchday: object, scores: object[], replacing: boolean) => Promise<void>,
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
  const rivals = [...new Set(data.matchdays.map((m) => m.rival).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

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
        <button type="button" class="toggle-advanced" aria-expanded="${state.type === "adjustment"}">${t("advanced")}</button>
        <div class="field advanced" ${state.type === "adjustment" ? "" : "hidden"}>
          <span class="label" id="f-type-label">${t("type")}</span>
          <div class="seg" role="group" aria-labelledby="f-type-label" data-seg="type">
            <button type="button" data-value="match">${t("match")}</button>
            <button type="button" data-value="adjustment">${t("adjustment")}</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3 class="match-title"></h3>
        <p class="adjustment-only match-hint" style="color:var(--muted);font-size:13px;margin:-4px 0 12px">
          ${t("matchHint")}</p>
        <div class="field">
          <label for="f-rival">${t("rival")}</label>
          <input id="f-rival" class="input" type="text" list="f-rivals" autocomplete="off" value="${escapeHtml(state.rival)}">
          <datalist id="f-rivals">${rivals.map((r) => `<option value="${escapeHtml(r)}">`).join("")}</datalist>
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
      b.setAttribute("aria-pressed", String(Number(b.dataset.value) === state.scores[b.dataset.extra].extra_dice));
    });
    form.querySelectorAll("[data-face]").forEach((b) => {
      const faces = state.scores[b.dataset.face].extra_dice_faces;
      b.setAttribute("aria-pressed", String(faces[Number(b.dataset.index)] === Number(b.dataset.value)));
    });
    const adjustment = state.type === "adjustment";
    form.querySelectorAll(".adjustment-only").forEach((el) => (el.hidden = !adjustment));
    $(".match-title").textContent = t(adjustment ? "matchOptional" : "match");
    $(".players-title").textContent = t(adjustment ? "playersTotals" : "playersPoints");
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
    const scores = players.map((p) => ({ player_id: p.player_id, ...state.scores[p.player_id] }));
    return [matchday, scores];
  }

  function validate() {
    if (!Number.isInteger(state.jornada) || state.jornada < 1) return t("errJornada");
    if (state.type === "match") {
      if (!state.rival.trim()) return t("errRival");
      if (!isDieFace(state.dice)) return t("errDice");
    }
    const missingFace = players.find((p) => state.scores[p.player_id].extra_dice_faces.some((f) => !isDieFace(f)));
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

  form.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
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
      score.extra_dice = Number(btn.dataset.value);
      score.extra_dice_faces = Array.from({ length: score.extra_dice }, (_, i) => score.extra_dice_faces[i] ?? null);
      form.querySelector(`.extra-faces[data-player="${btn.dataset.extra}"]`).innerHTML =
        facePickers(players.find((p) => p.player_id === btn.dataset.extra), score);
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
    if (e.target.matches("input")) {
      setField(e.target);
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
    const replacing = !editing && data.matchdays.some((m) => m.jornada === state.jornada);
    const save = $(".save");
    save.disabled = true;
    save.textContent = t("saving");
    try {
      await onSave(...build(), replacing);
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

  sync();
  return { draft: () => state };
}

function initialState(data, players, existing) {
  const before = computeStandings({
    ...data,
    matchdays: data.matchdays.filter((m) => !existing || m.jornada < existing.jornada),
    scores: data.scores.filter((s) => !existing || s.jornada < existing.jornada),
  });
  const holding = Object.fromEntries(before.rows.map((r) => [r.player_id, r.extraDice]));
  const last = data.matchdays.reduce((max, m) => Math.max(max, m.jornada), 0);

  const scores = {};
  for (const p of players) {
    const row = existing && data.scores.find((s) => s.jornada === existing.jornada && s.player_id === p.player_id);
    scores[p.player_id] = row
      ? { points: row.points, casa: row.casa, extra_dice: row.extra_dice, extra_dice_faces: facesOf(row) }
      // A new matchday keeps each player's number of extra dice; they're rolled again, so no faces yet.
      : { points: 0, casa: 0, extra_dice: holding[p.player_id] ?? 0, extra_dice_faces: [] };
    const s = scores[p.player_id];
    s.extra_dice_faces = Array.from({ length: s.extra_dice }, (_, i) => s.extra_dice_faces[i] ?? null);
  }

  if (!existing) {
    return {
      jornada: last + 1, date: today(), type: "match", rival: "", home_away: "home",
      barca_goals: 0, rival_goals: 0, dice: null, dice_counts: before.diceCounts, notes: "", scores,
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
  const extra = Array.from({ length: MAX_EXTRA_DICE + 1 }, (_, n) =>
    `<button type="button" data-extra="${p.player_id}" data-value="${n}">${n}</button>`).join("");
  return `<div class="player-row">
    <div class="player-name">${name}</div>
    <div class="player-controls">
      <div><span class="mini-label">${t("points")}</span>${stepper(null, s.points, t("pointsOf", { name: p.name }), { player: p.player_id, key: "points" })}</div>
      <div><span class="mini-label">${t("casa")}</span>${stepper(null, s.casa, t("casaOf", { name: p.name }), { player: p.player_id, key: "casa" })}</div>
      <div><span class="mini-label" id="x-${p.player_id}">${t("extraDice")}</span>
        <div class="seg" role="group" aria-labelledby="x-${p.player_id}">${extra}</div></div>
    </div>
    <div class="extra-faces" data-player="${p.player_id}">${facePickers(p, s)}</div>
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

function facesOf(row) {
  return Array.isArray(row.extra_dice_faces) ? row.extra_dice_faces.map((f) => (isDieFace(f) ? f : null)) : [];
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
