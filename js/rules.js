// All league scoring and ranking rules live here. Every function is pure.
// Rules marked TBC are defaults still to be confirmed by the group: change
// them here and every view (scoreboard, form preview, history) follows.

/** When true, players tied on every ranking criterion share a position (1, 2, 2, 4). */
export const SHARED_POSITIONS_ON_TIE = false;

/** Players watching together needed for the extra die to be rolled. */
export const EXTRA_DIE_MIN_WATCHERS = 5;

/** Locale used to break ties by name. */
export const NAME_LOCALE = "es";

/**
 * Points a score row adds: its `points`, plus the face of each extra die won
 * in that matchday. An adjustment's points are totals that already include
 * the dice, so its dice add nothing.
 */
export function scorePoints(score, isAdjustment) {
  const dice = isAdjustment ? 0 : extraDiceFaces(score).reduce((sum, f) => sum + f, 0);
  return (Number(score.points) || 0) + dice;
}

/** Total points: scorePoints over every matchday of the season (matches and adjustments). */
export function totalPoints(playerScores, adjustmentJornadas = new Set()) {
  return playerScores.reduce((sum, s) => sum + scorePoints(s, adjustmentJornadas.has(s.jornada)), 0);
}

/** CASA column: how many times the player hosted (+1 per matchday), summed over the season. */
export function casaTotal(playerScores) {
  return playerScores.reduce((sum, s) => sum + (Number(s.casa) || 0), 0);
}

/** Whether a CASA value is shown highlighted (green). */
export function isCasaHighlighted(casa) {
  return casa > 0;
}

/**
 * DADO EXTRA column: every extra die the player has won this season, in
 * jornada order, by its face. When 5 or more watch the match, whoever is last
 * in the table among them rolls one die and adds its face to their points.
 * An adjustment lists the dice won before it. A face of 0 means not entered (blank die).
 */
export function extraDiceWon(playerScores) {
  return [...playerScores].sort((a, b) => a.jornada - b.jornada).flatMap(extraDiceFaces);
}

/** The extra dice faces of one score row: `extra_dice` dice, 0 where the face is unknown. */
function extraDiceFaces(score) {
  const faces = score.extra_dice_faces || [];
  const count = Math.max(Number(score.extra_dice) || 0, faces.length);
  return Array.from({ length: count }, (_, i) => (isDieFace(faces[i]) ? faces[i] : 0));
}

/** Ranking order: points desc, then CASA desc, then name asc. TBC tiebreak. */
export function compareStandings(a, b) {
  return (
    b.points - a.points ||
    b.casa - a.casa ||
    a.name.localeCompare(b.name, NAME_LOCALE, { sensitivity: "base" })
  );
}

/** Whether two rows are tied on every ranking criterion except the name. */
export function isTie(a, b) {
  return a.points === b.points && a.casa === b.casa;
}

/** Position numbers for rows already sorted by compareStandings. */
export function assignPositions(sortedRows, shared = SHARED_POSITIONS_ON_TIE) {
  return sortedRows.map((row, i) => {
    let pos = i + 1;
    if (shared) {
      let j = i;
      while (j > 0 && isTie(sortedRows[j - 1], row)) j--;
      pos = j + 1;
    }
    return { ...row, pos };
  });
}

/** Leader highlight: the row in position 1. */
export function isLeader(row) {
  return row.pos === 1;
}

/**
 * Dice counter, faces 1..6. Starts from `dice_counts` of the latest adjustment
 * that has them, then adds 1 per match after it, using its `dice`.
 * An adjustment never counts as a roll.
 */
export function diceCounts(matchdays) {
  const sorted = [...matchdays].sort((a, b) => a.jornada - b.jornada);
  let counts = [0, 0, 0, 0, 0, 0];
  let from = -Infinity;
  for (const md of sorted) {
    if (md.type === "adjustment" && Array.isArray(md.dice_counts) && md.dice_counts.length === 6) {
      counts = md.dice_counts.map((n) => Number(n) || 0);
      from = md.jornada;
    }
  }
  for (const md of sorted) {
    if (md.jornada > from && md.type === "match" && isDieFace(md.dice)) counts[md.dice - 1]++;
  }
  return counts;
}

/** Jornadas played: the highest jornada of the season. */
export function jornadasPlayed(matchdays) {
  return matchdays.reduce((max, md) => Math.max(max, md.jornada), 0);
}

/** The "last match" header shows the matchday with the highest jornada. */
export function lastMatchday(matchdays) {
  if (!matchdays.length) return null;
  return matchdays.reduce((a, b) => (b.jornada > a.jornada ? b : a));
}

export function isDieFace(n) {
  return Number.isInteger(n) && n >= 1 && n <= 6;
}
