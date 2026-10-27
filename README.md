# flick-paos

La liga de los Flick-paos!

The league's scoreboard: a static page (GitHub Pages) that reads the league from a Google Sheet through a Google Apps Script web app, computes the standings and renders the image for the WhatsApp group. The full spec is in [SPEC.md](SPEC.md).

## Setup

1. **Backend.** Create a Google Sheet, open *Extensions → Apps Script*, paste [code.gs](code.gs) and run `setup()` once. In *Project Settings → Script Properties* set `PIN` (the group's shared PIN) and `CURRENT_SEASON` (e.g. `3`). Deploy as a web app: *Execute as: Me*, *Who has access: Anyone*.
2. **API URL.** Put the web app URL in [js/config.js](js/config.js) (`API_URL`). It is the only configuration; the PIN is never stored in the repo.
   After changing `code.gs` later, paste it again, run `setup()` once (it adds any new column headers and keeps the data) and publish a new version: *Deploy → Manage deployments → Edit → Version: New version*, so the URL stays the same.
3. **Publish.** GitHub → *Settings → Pages → Deploy from a branch*, branch `main`, folder `/`.

## Run locally

```bash
python3 -m http.server 8000     # or: npx serve
```

Open <http://localhost:8000/>. With <http://localhost:8000/?mock=1> the page uses [mock-data.json](mock-data.json) (the table after jornada 14) instead of the API; writes stay in memory and the PIN is `1234`.

Tests (Node 20+, no dependencies):

```bash
node --test
```

## How the scorekeeper adds a matchday

1. Open the page on the phone and tap **Nueva jornada**. The first time, the page asks for the group's PIN and remembers it on that phone.
2. The jornada number and today's date are filled in. Enter the rival, *En casa* / *Fuera*, the goals and tap the die that came out.
3. For each player set the points of the matchday (− / +, can be negative), and *Casa*. If you were 5 or more, pick who rolled the extra die (the last in the table among those watching) and what it showed: its face is added to their points. The **Vista previa** at the bottom shows the resulting table.
4. Tap **Guardar**. If the PIN has changed since, the page asks for the new one.
5. Back on the scoreboard, tap **Compartir** (sends the image straight to WhatsApp) or **Descargar imagen**.

To fix a matchday: **Historial** → tap it → change it and save, or **Borrar jornada**.

### Starting from an existing table (Ajuste)

To start from totals instead of the full history (e.g. the table after jornada 14), tap **Avanzado** → **Ajuste**: enter each player's *total* points and casa, the extra dice each one has won (with their faces), and how many times each die face has come out. The match fields are optional and only show in the header; an adjustment never counts as a die roll. Matches added after it add on top.

## Changing the rules

Every scoring and ranking rule is in [js/rules.js](js/rules.js), one documented function or constant each:

| Rule | Where |
|---|---|
| Total points | `totalPoints` |
| CASA column, and when it is green | `casaTotal`, `isCasaHighlighted` |
| Points of a matchday, extra die included | `scorePoints` |
| DADO EXTRA column | `extraDiceWon`, `EXTRA_DIE_MIN_WATCHERS` |
| Ranking and tiebreaks | `compareStandings`, `isTie` |
| Shared positions on ties (1, 2, 2, 4) | `SHARED_POSITIONS_ON_TIE` |
| Dice counter | `diceCounts` |
| Jornadas played, header matchday | `jornadasPlayed`, `lastMatchday` |

Change the rule there, update its test in [tests/standings.test.js](tests/standings.test.js) and run `node --test`.

## Files

| File | What |
|---|---|
| `index.html`, `css/styles.css` | The page and the 1080×1620 card styles |
| `js/config.js` | `API_URL` |
| `js/api.js` | Backend calls, and the `?mock=1` backend |
| `js/rules.js`, `js/standings.js` | Pure rules and the standings view model |
| `js/render.js`, `js/icons.js` | The card's DOM and its inline SVG artwork |
| `js/form.js` | Add / edit matchday form with live preview |
| `js/export.js` | PNG export (html-to-image) and sharing |
| `js/i18n.js` | Spanish and Catalan texts (flags in the top bar; the choice is remembered per phone) |
| `js/normas.js` | The league's rules, shown in the *Normas* tab, in Spanish and Catalan |
| `js/app.js` | Routing (`#/`, `#/jornada/new`, `#/jornada/{n}`, `#/historial`, `#/normas`), cache, PIN |
| `assets/crest.svg` | League crest |
| `code.gs` | The Apps Script backend |
