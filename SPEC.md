# La Liga de los Flick-Paos — Scoreboard web app

## 1. Goal

A friends' league: we watch FC Barcelona matches together, roll a die, and each friend earns points according to house rules. After every match, one person (the "scorekeeper") posts a standings image to the WhatsApp group.

Today that image is made by an AI image generator that edits the previous image each time, so quality degrades and numbers/rankings come out wrong.

Build a **static web page hosted on GitHub Pages** that:

1. Reads all league data from a **Google Apps Script web app** backed by a Google Sheet (backend already exists; contract in §5).
2. Lets the scorekeeper **add, edit or delete a matchday** from a form on the page, protected by a shared PIN. No GitHub, Google or other account needed.
3. **Computes** standings, ranking and dice statistics deterministically.
4. Renders a **scoreboard graphic** that matches the current design (§6) and lets the user **download it as a PNG** for WhatsApp.

The scorekeeper uses a phone. Mobile-first.

## 2. Constraints

- Pure static site: `index.html`, CSS, ES modules. **No build step**, no framework required (vanilla JS is preferred; a tiny dependency is fine).
- Third-party JS only from a CDN (jsDelivr/cdnjs/unpkg), pinned to a version. Needed: one DOM-to-image library (e.g. `html-to-image`) for the PNG export.
- Fonts: Google Fonts only (suggestion: *Oswald* or *Bebas Neue* for condensed headings/numbers, *Permanent Marker* or similar brush font for the "FLICK-PAOS" title).
- **Never embed secrets.** The only configuration is the Apps Script URL in `config.js`. The PIN is typed by the user.
- All UI text in **Spanish** (the group's language). Code and comments in English.
- Works in current Safari iOS and Chrome Android.

## 3. Files

```
/index.html
/css/styles.css
/js/config.js        // export const API_URL = "https://script.google.com/macros/s/.../exec";
/js/api.js           // fetch wrappers for §5
/js/rules.js         // ALL scoring/ranking rules live here (see §4) — pure functions
/js/standings.js     // computeStandings(data) → view model; pure, unit-testable
/js/render.js        // view model → DOM for the scoreboard card
/js/form.js          // add/edit matchday form
/js/export.js        // PNG export
/js/app.js           // bootstrapping, routing between views, state
/assets/crest.svg    // original league crest
/tests/standings.test.html  // or a node test runner — see §9
/README.md           // setup + how the scorekeeper uses it
/.nojekyll
```

## 4. Domain model and rules

### 4.1 Data (as returned by the backend)

```ts
type Player = {
  player_id: string;   // stable slug, e.g. "salva"
  name: string;        // display name, may contain accents, e.g. "Víctor"
  titles: number;      // past league titles → shown as 🏆 icons after the name
  active: boolean;     // inactive players are hidden from table and form
  order: number;       // default order in the form
};

type Matchday = {
  season: string;      // e.g. "3"
  jornada: number;     // 1..n, unique per season
  type: "match" | "adjustment";
  date: string;        // "YYYY-MM-DD" or ""
  rival: string;       // e.g. "Real Madrid"
  home_away: "home" | "away" | "";   // Barça at home or away (affects score display order)
  barca_goals: number | null;
  rival_goals: number | null;
  dice: number | null; // 1..6 for type "match"; null for "adjustment"
  dice_counts: number[] | null; // only for "adjustment": absolute counts for faces 1..6 up to this jornada
  notes: string;
  updated_at: string;  // ISO timestamp
};

type Score = {
  season: string;
  jornada: number;
  player_id: string;
  points: number;      // points earned in that matchday (can be negative)
  casa: number;        // per-matchday "casa" value (see rules)
  extra_dice: number;  // see rules
  extra_dice_faces: number[]; // face (1..6) of each extra die won in that matchday; [] when none
};
```

### 4.2 Rules (put in `rules.js`, documented, easy to change)

Some rules are still being confirmed. Implement these defaults behind clearly named functions/constants so they can be changed in one place:

| Rule | Default | Status |
|---|---|---|
| Total points | Sum of `points` over all matchdays of the season (match + adjustment), plus the face of each extra die won in a match (an adjustment's points already include its dice) | Confirmed |
| CASA column | Sum of `casa` over the season: how many times the player hosted (+1 point each, included in `points`) | Confirmed |
| DADO EXTRA column | Every extra die the player won this season, in jornada order, each drawn with its face. When 5 or more watch the match, whoever is last in the table among them rolls one die and adds its face to their points: a match has at most one. An adjustment lists the dice won before it | Confirmed |
| Ranking | Sort by total points desc, then CASA desc, then name asc (locale `es`) | **TBC** tiebreak |
| Position numbers | Sequential 1..n even on ties (matches current images) | Configurable: `SHARED_POSITIONS_ON_TIE = false` |
| Leader highlight | Row in position 1 gets the green highlight | Confirmed |
| Dice counter | For faces 1–6: start from `dice_counts` of the latest `adjustment` (if any), then add 1 per `match` matchday after it, using its `dice` | Confirmed |
| Jornadas played | Highest `jornada` in the season | Confirmed |
| "Last match" header | The matchday with the highest `jornada`. If it is an `adjustment` with no score/dice, show only "JORNADA n" | Confirmed |

**Adjustments** exist to load a starting point (e.g. totals after jornada 14) without the full history. An adjustment's `points` count toward totals; it never counts as a dice roll.

## 5. Backend contract (Google Apps Script — already implemented, do not change)

Base URL: `API_URL` from `config.js`.

**Read**
```
GET  {API_URL}              → current season
GET  {API_URL}?season=3     → given season
```
Response:
```json
{ "ok": true, "data": {
  "season": "3", "currentSeason": "3", "seasons": ["2","3"],
  "players":   [Player...],
  "matchdays": [Matchday...],   // sorted by jornada asc
  "scores":    [Score...]
}}
```

**Write** — `POST {API_URL}` with header `Content-Type: text/plain;charset=utf-8` and a JSON string body. (Must be text/plain: Apps Script cannot answer a CORS preflight. Do not set any other headers.)

```jsonc
{ "action": "checkPin", "pin": "1234" }

{ "action": "upsertMatchday", "pin": "1234",
  "matchday": { "season": "3", "jornada": 15, "type": "match", "date": "2026-10-26",
                "rival": "Real Madrid", "home_away": "away",
                "barca_goals": 1, "rival_goals": 2, "dice": 4, "notes": "" },
  "scores": [ { "player_id": "salva", "points": 3, "casa": 1, "extra_dice": 2, "extra_dice_faces": [4, 2] }, ... ] }

{ "action": "deleteMatchday", "pin": "1234", "season": "3", "jornada": 15 }
```
Write responses: `{ "ok": true, "data": {...same as GET...} }` or `{ "ok": false, "error": "Wrong PIN" }`.

Notes:
- `upsertMatchday` **replaces** the whole matchday (its row and all its score rows) for that season+jornada.
- Errors come back with HTTP 200 and `ok: false`; always check `ok`.
- Apps Script responds via a redirect to `script.googleusercontent.com`; `fetch` follows it automatically. Use `redirect: "follow"`.
- Cold starts can take 2–5 s. Show a loading state; time out after 20 s with a retry button.

## 6. Scoreboard design (the PNG)

Reproduce the layout of the group's existing image as a clean, sharp, code-rendered card. Fixed logical size **1080 × 1620 px** (2:3 portrait), scaled down to fit the screen with CSS `transform` for on-screen preview; exported at full size.

Top to bottom:

1. **Header**: league crest SVG (left), title "LA LIGA DE LOS" (white, condensed bold) over "FLICK-PAOS" (large, gold `#F5C518`-ish, brush font, slight italic), and a red brush-stroke ribbon "TEMPORADA {season}".
2. **Match bar** (rounded panel): calendar icon + "JORNADA {n}" (gold) · Barça badge + "BARÇA {x} - {y} {RIVAL}" + rival badge (order by `home_away`: home team first) · "DADO:" with a gold box showing the number and a red die face showing the pips.
3. **Standings table**, 10 rows:
   - Header row on dark red/garnet: POS. · JUGADOR · PUNTOS · CASA · DADO EXTRA
   - Body on navy: position (gold), name (white) + 🏆 per title (use an inline SVG trophy, not emoji, for consistent rendering), points (gold, large), casa (white; green if > 0), dado extra (0–3 small die icons).
   - Leader row highlighted green.
   - Thin separators; alternating subtle row shading.
4. **Dice panel**: red die icon + "DADO – VECES QUE HA SALIDO", six columns 1–6 each with face number (gold), white die face with pips (SVG), and count (white; the face rolled in the latest match shown in green).
5. **Footer**: calendar icon + "{n} JORNADAS DISPUTADAS" (gold, italic), and small text "*Un dado por jugador para la fase de bonificación".

Palette: navy background `#0B1730` → `#0E1F3D`, garnet `#7A0F1E`/`#A50044`, blaugrana blue `#004D98`, gold `#F5C518`, white `#FFFFFF`, leader green `#2E7D32`. Subtle noise/texture allowed (CSS only, no external images). All icons are inline SVG.

Must look right with 10 players and degrade gracefully for 8–14 (row height adapts; card height fixed).

## 7. Views and UX

Single page, hash routing:

- `#/` **Scoreboard** (default): rendered card + buttons: **Descargar imagen**, **Compartir** (Web Share API with the PNG file when `navigator.canShare({files})`; hide otherwise), **Nueva jornada**, **Historial**. Season selector if more than one season.
- `#/jornada/new` and `#/jornada/{n}` **Matchday form**:
  - Fields: Jornada (pre-filled with last + 1), Fecha (date, default today), Tipo (Partido / Ajuste — Ajuste hidden behind an "Avanzado" toggle), Rival (free text with datalist of previous rivals), Casa/Fuera, goles Barça, goles rival, Dado (six big tappable die buttons).
  - One row per active player: name, points (numeric stepper with − / + buttons, default 0, allow negative), casa (toggle or stepper, per rules), dado extra (0–3 segmented).
  - For Ajuste: hide match fields, show six "veces que ha salido" inputs.
  - **Live preview**: a mini version of the resulting standings updates as you type.
  - Save → if no PIN stored, prompt for it (validate with `checkPin`), store it in `localStorage` (wrapped in try/catch). On `Wrong PIN`, clear the stored PIN and prompt again.
  - On success: navigate to `#/` with the new data and a toast "Jornada {n} guardada".
  - Editing an existing jornada pre-fills everything; a **Borrar jornada** button with confirm dialog.
- `#/historial` **History**: list of matchdays (newest first): jornada, rival, score, dice, top scorer of that matchday; tap to edit.

General:
- Cache the last GET response in `localStorage` and render it immediately on load, then refresh from the API (stale-while-revalidate). Show "Actualizado hace X" subtly.
- Big touch targets (≥ 44 px), works one-handed on a phone.
- No login, no analytics, no cookies.

## 8. PNG export

- Render the card off-screen at 1080×1620 with `pixelRatio: 1` (the card is already full-size) and wait for `document.fonts.ready` before capturing, so brush/condensed fonts are embedded.
- File name: `flickpaos-t{season}-j{jornada}.png`.
- Verify fonts and SVGs appear in the exported PNG on iOS Safari (html-to-image needs fonts loaded via CSS `@font-face`/Google Fonts with CORS — test this specifically).

## 9. Tests

- `standings.js` and `rules.js` are pure; cover them with a small test suite runnable with `node --test` (ES modules, no deps):
  - totals, CASA sum, latest extra_dice, tiebreaks, sequential vs shared positions;
  - dice counts with and without an adjustment baseline; adjustment followed by matches;
  - inactive players excluded; player with no score rows shows 0.
- Fixture: reproduce the jornada-14 table from the group (as an adjustment) and assert the expected order:
  Salva 56, Víctor 53, Olí 50, Colo 48, Puig 47, Edgar 42, Roger 41, Joan 31, Jon 28, Lucas 27; dice counts [0,4,2,3,4,1]; casa Salva 5, Víctor 2, Olí 2, Colo 3, Puig 1, Jon 2, others 0.
- Provide a `?mock=1` mode that loads a local `mock-data.json` instead of the API, for design work without a backend.

## 10. Deliverables / Definition of done

- Repo ready to publish with GitHub Pages (Settings → Pages → Deploy from branch `main`, folder `/`).
- `README.md`: how to set `API_URL`, how to run locally (`npx serve` or `python -m http.server`), how the scorekeeper adds a matchday, how to change rules in `rules.js`.
- Exported PNG visually matches §6, text crisp, no layout shift between screen and export.
- Lighthouse mobile: no console errors; accessible labels on all form controls.
