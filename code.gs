/**
 * La Liga de los Flick-Paos — backend for the scoreboard page.
 *
 * Google Sheet = database. This script is deployed as a Web App
 * (Execute as: Me, Who has access: Anyone) and is called by the
 * static page on GitHub Pages.
 *
 * Script Properties (Project Settings → Script Properties):
 *   PIN             shared PIN required for any write
 *   CURRENT_SEASON  season shown by default, e.g. "3"
 *
 * API
 *   GET  <url>                  → { ok, data }   (current season)
 *   GET  <url>?season=3         → { ok, data }   (given season)
 *   POST <url>  body (text/plain, JSON):
 *     { action: "checkPin", pin }
 *     { action: "upsertMatchday", pin, matchday: {...}, scores: [...] }
 *     { action: "deleteMatchday", pin, season, jornada }
 *   → { ok, data } on success, { ok: false, error } on failure.
 *
 * The frontend must send POST with Content-Type "text/plain;charset=utf-8"
 * (not application/json) so the browser does not send a CORS preflight,
 * which Apps Script cannot answer.
 */

const SHEETS = {
  players:   { name: 'Players',   header: ['player_id', 'name', 'titles', 'active', 'order'] },
  matchdays: { name: 'Matchdays', header: ['season', 'jornada', 'type', 'date', 'rival', 'home_away',
                                           'barca_goals', 'rival_goals', 'dice', 'dice_counts', 'notes', 'updated_at'] },
  scores:    { name: 'Scores',    header: ['season', 'jornada', 'player_id', 'points', 'casa', 'extra_dice',
                                           'extra_dice_faces'] },
};

const INITIAL_PLAYERS = [
  ['salva', 'Salva', 2], ['victor', 'Víctor', 0], ['oli', 'Olí', 0], ['colo', 'Colo', 0],
  ['puig', 'Puig', 0], ['edgar', 'Edgar', 0], ['roger', 'Roger', 0], ['joan', 'Joan', 0],
  ['jon', 'Jon', 0], ['lucas', 'Lucas', 0],
];

// ---------------------------------------------------------------- entry points

function doGet(e) {
  try {
    const season = (e && e.parameter && e.parameter.season) || currentSeason();
    return json({ ok: true, data: readAll(season) });
  } catch (err) {
    return json({ ok: false, error: message(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    checkPin(body.pin);

    switch (body.action) {
      case 'checkPin':
        return json({ ok: true });
      case 'upsertMatchday':
        upsertMatchday(body.matchday, body.scores);
        return json({ ok: true, data: readAll(String(body.matchday.season)) });
      case 'deleteMatchday':
        deleteMatchday(body.season, body.jornada);
        return json({ ok: true, data: readAll(String(body.season)) });
      default:
        throw new Error('Unknown action: ' + body.action);
    }
  } catch (err) {
    return json({ ok: false, error: message(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) { /* not held */ }
  }
}

/**
 * Run once from the editor: creates the tabs, headers and the player list.
 * Safe to run again: it only rewrites the header rows (adding new columns) and
 * adds the players when the Players tab is empty.
 */
function setup() {
  const ss = SpreadsheetApp.getActive();
  Object.values(SHEETS).forEach(def => {
    let sh = ss.getSheetByName(def.name);
    if (!sh) sh = ss.insertSheet(def.name);
    sh.getRange(1, 1, 1, def.header.length).setValues([def.header]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:Z').setNumberFormat('@'); // plain text: no auto-converted dates/numbers
  });

  const players = sheet(SHEETS.players.name);
  if (players.getLastRow() < 2) {
    const rows = INITIAL_PLAYERS.map((p, i) => [p[0], p[1], String(p[2]), 'TRUE', String(i + 1)]);
    players.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja 1') || ss.getSheetByName('Tabelle1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
}

// ---------------------------------------------------------------- reads

function readAll(season) {
  season = String(season);
  const players = rows(SHEETS.players.name).map(p => ({
    player_id: String(p.player_id),
    name: String(p.name),
    titles: int(p.titles, 0),
    active: String(p.active).toUpperCase() !== 'FALSE',
    order: int(p.order, 999),
  }));

  const matchdays = rows(SHEETS.matchdays.name)
    .filter(m => String(m.season) === season)
    .map(m => ({
      season: String(m.season),
      jornada: int(m.jornada),
      type: String(m.type || 'match'),
      date: String(m.date || ''),
      rival: String(m.rival || ''),
      home_away: String(m.home_away || ''),
      barca_goals: m.barca_goals === '' ? null : int(m.barca_goals),
      rival_goals: m.rival_goals === '' ? null : int(m.rival_goals),
      dice: m.dice === '' ? null : int(m.dice),
      dice_counts: m.dice_counts ? String(m.dice_counts).split(',').map(x => int(x, 0)) : null,
      notes: String(m.notes || ''),
      updated_at: String(m.updated_at || ''),
    }))
    .sort((a, b) => a.jornada - b.jornada);

  const scores = rows(SHEETS.scores.name)
    .filter(s => String(s.season) === season)
    .map(s => ({
      season: String(s.season),
      jornada: int(s.jornada),
      player_id: String(s.player_id),
      points: int(s.points, 0),
      casa: int(s.casa, 0),
      extra_dice: int(s.extra_dice, 0),
      extra_dice_faces: s.extra_dice_faces ? String(s.extra_dice_faces).split(',').map(x => int(x, 0)) : [],
    }));

  return { season, currentSeason: currentSeason(), seasons: seasons(), players, matchdays, scores };
}

function seasons() {
  const set = {};
  rows(SHEETS.matchdays.name).forEach(m => { if (m.season !== '') set[String(m.season)] = true; });
  set[currentSeason()] = true;
  return Object.keys(set).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
}

// ---------------------------------------------------------------- writes

function upsertMatchday(md, scores) {
  if (!md) throw new Error('Missing matchday');
  const season = String(md.season || '').trim();
  const jornada = int(md.jornada);
  const type = md.type || 'match';
  if (!season) throw new Error('Missing season');
  if (!(jornada >= 1)) throw new Error('Jornada must be a positive integer');
  if (['match', 'adjustment'].indexOf(type) < 0) throw new Error('type must be "match" or "adjustment"');

  if (type === 'match') {
    const dice = int(md.dice);
    if (!(dice >= 1 && dice <= 6)) throw new Error('Dice must be 1–6');
  }
  let diceCounts = '';
  if (md.dice_counts != null && md.dice_counts !== '') {
    const arr = Array.isArray(md.dice_counts) ? md.dice_counts : String(md.dice_counts).split(',');
    if (arr.length !== 6 || arr.some(x => !(int(x) >= 0))) throw new Error('dice_counts must be 6 non-negative integers');
    diceCounts = arr.map(x => int(x)).join(',');
  }

  const known = {};
  rows(SHEETS.players.name).forEach(p => { known[String(p.player_id)] = true; });
  const seen = {};
  (scores || []).forEach(s => {
    const id = String(s.player_id);
    if (!known[id]) throw new Error('Unknown player_id: ' + id);
    if (seen[id]) throw new Error('Duplicate player_id: ' + id);
    seen[id] = true;
    ['points', 'casa', 'extra_dice'].forEach(k => {
      if (s[k] != null && s[k] !== '' && isNaN(Number(s[k]))) throw new Error(k + ' must be a number for ' + id);
    });
    const faces = s.extra_dice_faces || [];
    if (!Array.isArray(faces) || faces.some(f => !(int(f) >= 1 && int(f) <= 6))) {
      throw new Error('extra_dice_faces must be dice values 1–6 for ' + id);
    }
    if (faces.length && faces.length !== int(s.extra_dice, 0)) {
      throw new Error('extra_dice_faces must have one face per extra die for ' + id);
    }
  });

  deleteMatchday(season, jornada);

  append(SHEETS.matchdays.name, [{
    season, jornada: String(jornada), type,
    date: String(md.date || ''),
    rival: String(md.rival || ''),
    home_away: String(md.home_away || ''),
    barca_goals: md.barca_goals == null ? '' : String(int(md.barca_goals)),
    rival_goals: md.rival_goals == null ? '' : String(int(md.rival_goals)),
    dice: md.dice == null || md.dice === '' ? '' : String(int(md.dice)),
    dice_counts: diceCounts,
    notes: String(md.notes || ''),
    updated_at: new Date().toISOString(),
  }]);

  append(SHEETS.scores.name, (scores || []).map(s => ({
    season, jornada: String(jornada),
    player_id: String(s.player_id),
    points: String(int(s.points, 0)),
    casa: String(int(s.casa, 0)),
    extra_dice: String(int(s.extra_dice, 0)),
    extra_dice_faces: (s.extra_dice_faces || []).map(f => int(f)).join(','),
  })));
}

function deleteMatchday(season, jornada) {
  const match = r => String(r.season) === String(season) && int(r.jornada) === int(jornada);
  deleteWhere(SHEETS.matchdays.name, match);
  deleteWhere(SHEETS.scores.name, match);
}

// ---------------------------------------------------------------- helpers

function checkPin(pin) {
  const expected = PropertiesService.getScriptProperties().getProperty('PIN');
  if (!expected) throw new Error('PIN is not configured in Script Properties');
  if (String(pin || '') !== String(expected)) throw new Error('Wrong PIN');
}

function currentSeason() {
  return String(PropertiesService.getScriptProperties().getProperty('CURRENT_SEASON') || '1');
}

function sheet(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet "' + name + '" — run setup() once');
  return sh;
}

function rows(name) {
  const values = sheet(name).getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0].map(String);
  return values.slice(1)
    .filter(r => r.some(c => c !== ''))
    .map(r => {
      const o = {};
      header.forEach((h, i) => { o[h] = r[i] instanceof Date ? Utilities.formatDate(r[i], 'UTC', 'yyyy-MM-dd') : r[i]; });
      return o;
    });
}

function append(name, objs) {
  if (!objs.length) return;
  const sh = sheet(name);
  const header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const data = objs.map(o => header.map(h => (o[h] === undefined || o[h] === null) ? '' : o[h]));
  sh.getRange(sh.getLastRow() + 1, 1, data.length, header.length).setValues(data);
}

function deleteWhere(name, pred) {
  const sh = sheet(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return;
  const header = values[0].map(String);
  for (let i = values.length - 1; i >= 1; i--) {
    const o = {};
    header.forEach((h, j) => { o[h] = values[i][j]; });
    if (pred(o)) sh.deleteRow(i + 1);
  }
}

function int(v, fallback) {
  const n = parseInt(v, 10);
  return isNaN(n) ? (fallback === undefined ? NaN : fallback) : n;
}

function message(err) { return (err && err.message) ? err.message : String(err); }

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
