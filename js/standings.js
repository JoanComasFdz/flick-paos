// Pure: league data (as returned by the backend) → scoreboard view model.

import * as rules from "./rules.js";

/**
 * @param {{season:string, players:object[], matchdays:object[], scores:object[]}} data
 * @param {{sharedPositions?: boolean}} [options]
 */
export function computeStandings(data, options = {}) {
  const players = (data.players || []).filter((p) => p.active);
  const matchdays = data.matchdays || [];
  const scores = data.scores || [];

  const byPlayer = new Map(players.map((p) => [p.player_id, []]));
  for (const s of scores) byPlayer.get(s.player_id)?.push(s);

  const adjustments = new Set(matchdays.filter((m) => m.type === "adjustment").map((m) => m.jornada));
  const unranked = players.map((p) => {
    const own = byPlayer.get(p.player_id);
    return {
      player_id: p.player_id,
      name: p.name,
      titles: Number(p.titles) || 0,
      points: rules.totalPoints(own, adjustments),
      casa: rules.casaTotal(own),
      extraDiceFaces: rules.extraDiceWon(own),
    };
  });

  const sorted = unranked.sort(rules.compareStandings);
  const rows = rules
    .assignPositions(sorted, options.sharedPositions ?? rules.SHARED_POSITIONS_ON_TIE)
    .map((row) => ({
      ...row,
      leader: rules.isLeader(row),
      casaHighlighted: rules.isCasaHighlighted(row.casa),
    }));

  return {
    season: String(data.season ?? ""),
    rows,
    header: matchHeader(rules.lastMatchday(matchdays)),
    diceCounts: rules.diceCounts(matchdays),
    jornadasPlayed: rules.jornadasPlayed(matchdays),
  };
}

/** The match bar: jornada, teams in home-first order, score and dice when known. */
export function matchHeader(md) {
  if (!md) return null;
  const hasScore = md.barca_goals != null && md.rival_goals != null;
  const hasRival = Boolean(md.rival && md.rival.trim());
  const barca = { name: "Barça", goals: md.barca_goals, isBarca: true };
  const rival = { name: md.rival || "", goals: md.rival_goals, isBarca: false };
  return {
    jornada: md.jornada,
    type: md.type,
    showMatch: hasRival || hasScore,
    hasScore,
    teams: md.home_away === "away" ? [rival, barca] : [barca, rival],
    dice: rules.isDieFace(md.dice) ? md.dice : null,
  };
}

/** Players who earned the most points in one matchday (for the history list). */
export function topScorers(data, jornada) {
  const names = new Map((data.players || []).map((p) => [p.player_id, p.name]));
  const md = (data.matchdays || []).find((m) => m.jornada === jornada);
  const rows = (data.scores || [])
    .filter((s) => s.jornada === jornada)
    .map((s) => ({ ...s, total: rules.scorePoints(s, md?.type === "adjustment") }));
  if (!rows.length) return { names: [], points: 0 };
  const max = Math.max(...rows.map((s) => s.total));
  return {
    names: rows.filter((s) => s.total === max).map((s) => names.get(s.player_id) || s.player_id),
    points: max,
  };
}

/** The data as it would be after saving a matchday (form preview). */
export function withMatchday(data, matchday, scores) {
  const keep = (x) => x.jornada !== matchday.jornada;
  return {
    ...data,
    matchdays: [...data.matchdays.filter(keep), matchday].sort((a, b) => a.jornada - b.jornada),
    scores: [
      ...data.scores.filter(keep),
      ...scores.map((s) => ({ ...s, season: matchday.season, jornada: matchday.jornada })),
    ],
  };
}
