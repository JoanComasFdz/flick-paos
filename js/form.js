// Add / edit matchday form, with a live preview of the resulting standings.

import { computeStandings, withMatchday } from "./standings.js";
import { renderMiniTable } from "./render.js";
import { escapeHtml, dieSvg } from "./icons.js";
import { MAX_EXTRA_DICE, isDieFace } from "./rules.js";

/**
 * @param {HTMLElement} root
 * @param {{data: object, jornada: number|null,
 *          onSave: (matchday: object, scores: object[], replacing: boolean) => Promise<void>,
 *          onDelete: (jornada: number) => Promise<void>,
 *          onCancel: () => void}} options
 */
export function renderForm(root, { data, jornada, onSave, onDelete, onCancel }) {
  const players = data.players.filter((p) => p.active).sort((a, b) => a.order - b.order);
  const existing = jornada == null ? null : data.matchdays.find((m) => m.jornada === jornada);
  if (jornada != null && !existing) {
    root.innerHTML = `<div class="error-box"><p>La jornada ${jornada} no existe.</p><a class="btn" href="#/">Volver</a></div>`;
    return;
  }

  const state = initialState(data, players, existing);
  const editing = Boolean(existing);
  const rivals = [...new Set(data.matchdays.map((m) => m.rival).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

  root.innerHTML = `
    <form class="matchday-form" novalidate>
      <h2>${editing ? `Editar <span>jornada ${state.jornada}</span>` : "Nueva <span>jornada</span>"}</h2>
      <p class="form-error" role="alert" hidden></p>

      <div class="panel">
        <div class="row2">
          <div class="field">
            <label for="f-jornada">Jornada</label>
            <input id="f-jornada" class="input" type="number" inputmode="numeric" min="1" step="1"
              value="${state.jornada}" ${editing ? "readonly" : ""}>
          </div>
          <div class="field">
            <label for="f-date">Fecha</label>
            <input id="f-date" class="input" type="date" value="${escapeHtml(state.date)}">
          </div>
        </div>
        <button type="button" class="toggle-advanced" aria-expanded="${state.type === "adjustment"}">Avanzado</button>
        <div class="field advanced" ${state.type === "adjustment" ? "" : "hidden"}>
          <span class="label" id="f-type-label">Tipo</span>
          <div class="seg" role="group" aria-labelledby="f-type-label" data-seg="type">
            <button type="button" data-value="match">Partido</button>
            <button type="button" data-value="adjustment">Ajuste</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <h3 class="match-title"></h3>
        <p class="adjustment-only match-hint" style="color:var(--muted);font-size:13px;margin:-4px 0 12px">
          Solo se muestra en la cabecera; un ajuste nunca cuenta como tirada del dado.</p>
        <div class="field">
          <label for="f-rival">Rival</label>
          <input id="f-rival" class="input" type="text" list="f-rivals" autocomplete="off" value="${escapeHtml(state.rival)}">
          <datalist id="f-rivals">${rivals.map((r) => `<option value="${escapeHtml(r)}">`).join("")}</datalist>
        </div>
        <div class="field">
          <span class="label" id="f-home-label">El Barça juega</span>
          <div class="seg" role="group" aria-labelledby="f-home-label" data-seg="home_away">
            <button type="button" data-value="home">En casa</button>
            <button type="button" data-value="away">Fuera</button>
          </div>
        </div>
        <div class="row2">
          <div class="field">
            <span class="label">Goles Barça</span>
            ${stepper("barca_goals", state.barca_goals, "Goles del Barça", { min: 0 })}
          </div>
          <div class="field">
            <span class="label">Goles rival</span>
            ${stepper("rival_goals", state.rival_goals, "Goles del rival", { min: 0 })}
          </div>
        </div>
        <div class="field">
          <span class="label" id="f-dice-label">Dado</span>
          <div class="dice-picker" role="group" aria-labelledby="f-dice-label">
            ${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" data-dice="${n}" aria-label="Dado ${n}">${dieSvg(n, { style: "white" })}</button>`).join("")}
          </div>
        </div>
      </div>

      <div class="panel adjustment-only">
        <h3>Veces que ha salido cada cara</h3>
        <div class="dice-counts">
          ${state.dice_counts.map((c, i) => `
            <div class="field">
              <label for="f-count-${i}">Cara ${i + 1}</label>
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
          <label for="f-notes">Notas</label>
          <input id="f-notes" class="input" type="text" value="${escapeHtml(state.notes)}">
        </div>
      </div>

      <div class="panel">
        <h3>Vista previa</h3>
        <div class="preview"></div>
      </div>

      ${editing ? `<button type="button" class="btn btn-danger delete" style="width:100%;margin-bottom:14px">Borrar jornada</button>` : ""}

      <div class="savebar">
        <button type="button" class="btn cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary save">Guardar</button>
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
    const adjustment = state.type === "adjustment";
    form.querySelectorAll(".adjustment-only").forEach((el) => (el.hidden = !adjustment));
    $(".match-title").textContent = adjustment ? "Partido (opcional)" : "Partido";
    $(".players-title").textContent = adjustment ? "Totales de cada jugador" : "Puntos de la jornada";
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
    if (!Number.isInteger(state.jornada) || state.jornada < 1) return "La jornada debe ser un número mayor que 0.";
    if (state.type === "match") {
      if (!state.rival.trim()) return "Falta el rival.";
      if (!isDieFace(state.dice)) return "Elige el número del dado.";
    }
    if (state.type === "adjustment" && state.dice_counts.some((c) => !Number.isInteger(c) || c < 0)) {
      return "Las veces que ha salido cada cara deben ser números enteros.";
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
      state.scores[btn.dataset.extra].extra_dice = Number(btn.dataset.value);
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
    save.textContent = "Guardando…";
    try {
      await onSave(...build(), replacing);
    } catch (err) {
      showError(err.message);
    } finally {
      save.disabled = false;
      save.textContent = "Guardar";
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
      ? { points: row.points, casa: row.casa, extra_dice: row.extra_dice }
      // A new matchday keeps each player's current dado extra unless changed.
      : { points: 0, casa: 0, extra_dice: holding[p.player_id] ?? 0 };
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
    <button type="button" data-step="-1" aria-label="${escapeHtml(label)}: restar 1">−</button>
    <input type="number" inputmode="numeric" step="1" ${min != null ? `min="${min}"` : ""} ${data}
      value="${value}" aria-label="${escapeHtml(label)}">
    <button type="button" data-step="1" aria-label="${escapeHtml(label)}: sumar 1">+</button>
  </div>`;
}

function playerRow(p, s) {
  const name = escapeHtml(p.name);
  const extra = Array.from({ length: MAX_EXTRA_DICE + 1 }, (_, n) =>
    `<button type="button" data-extra="${p.player_id}" data-value="${n}">${n}</button>`).join("");
  return `<div class="player-row">
    <div class="player-name">${name}</div>
    <div class="player-controls">
      <div><span class="mini-label">Puntos</span>${stepper(null, s.points, `Puntos de ${p.name}`, { player: p.player_id, key: "points" })}</div>
      <div><span class="mini-label">Casa</span>${stepper(null, s.casa, `Casa de ${p.name}`, { player: p.player_id, key: "casa" })}</div>
      <div><span class="mini-label" id="x-${p.player_id}">Dado extra</span>
        <div class="seg" role="group" aria-labelledby="x-${p.player_id}">${extra}</div></div>
    </div>
  </div>`;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
