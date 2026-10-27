// Fetch wrappers for the Google Apps Script backend (contract in SPEC.md §5).
// With ?mock=1 the data comes from mock-data.json and writes stay in memory (PIN "1234").

import { API_URL } from "./config.js";
import { t } from "./i18n.js";

const TIMEOUT_MS = 20000;
const MOCK_PIN = "1234";

export const isMock = new URLSearchParams(location.search).get("mock") === "1";

export class ApiError extends Error {
  constructor(message, { wrongPin = false, timeout = false } = {}) {
    super(message);
    this.wrongPin = wrongPin;
    this.timeout = timeout;
  }
}

/** GET the league data for a season (the current one when season is empty). */
export async function getLeague(season) {
  if (isMock) return mockRead(season);
  const url = season ? `${API_URL}?season=${encodeURIComponent(season)}` : API_URL;
  return unwrap(await request(url, { method: "GET" }));
}

export async function checkPin(pin) {
  await post({ action: "checkPin", pin });
}

export async function upsertMatchday(pin, matchday, scores) {
  return post({ action: "upsertMatchday", pin, matchday, scores });
}

export async function deleteMatchday(pin, season, jornada) {
  return post({ action: "deleteMatchday", pin, season, jornada });
}

async function post(body) {
  if (isMock) return mockWrite(body);
  // text/plain and no other headers: Apps Script cannot answer a CORS preflight.
  return unwrap(await request(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  }));
}

async function request(url, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, redirect: "follow", signal: controller.signal });
    if (!res.ok) throw new ApiError(t("serverError", { status: res.status }));
    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === "AbortError") throw new ApiError(t("serverTimeout"), { timeout: true });
    throw new ApiError(t("noConnection"));
  } finally {
    clearTimeout(timer);
  }
}

function unwrap(json) {
  if (!json || json.ok !== true) {
    const message = (json && json.error) || t("unexpected");
    throw new ApiError(message, { wrongPin: message === "Wrong PIN" });
  }
  return json.data;
}

// ---------------------------------------------------------------- mock backend

let mockDb = null;

async function mockDbLoad() {
  if (!mockDb) {
    const res = await fetch(new URL("../mock-data.json", import.meta.url));
    mockDb = await res.json();
  }
  return mockDb;
}

async function mockRead(season) {
  const db = await mockDbLoad();
  await delay(300);
  const s = String(season || db.currentSeason);
  return structuredClone({
    ...db,
    season: s,
    matchdays: db.matchdays.filter((m) => m.season === s).sort((a, b) => a.jornada - b.jornada),
    scores: db.scores.filter((x) => x.season === s),
  });
}

async function mockWrite(body) {
  const db = await mockDbLoad();
  await delay(500);
  if (String(body.pin || "") !== MOCK_PIN) throw new ApiError("Wrong PIN", { wrongPin: true });
  const drop = (season, jornada) => (x) => !(x.season === String(season) && x.jornada === Number(jornada));
  if (body.action === "checkPin") return undefined;
  if (body.action === "deleteMatchday") {
    db.matchdays = db.matchdays.filter(drop(body.season, body.jornada));
    db.scores = db.scores.filter(drop(body.season, body.jornada));
    return mockRead(body.season);
  }
  if (body.action === "upsertMatchday") {
    const md = { ...body.matchday, season: String(body.matchday.season), updated_at: new Date().toISOString() };
    db.matchdays = db.matchdays.filter(drop(md.season, md.jornada)).concat({ dice_counts: null, ...md });
    db.scores = db.scores.filter(drop(md.season, md.jornada))
      .concat(body.scores.map((s) => ({ ...s, season: md.season, jornada: md.jornada })));
    return mockRead(md.season);
  }
  throw new ApiError("Unknown action: " + body.action);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
