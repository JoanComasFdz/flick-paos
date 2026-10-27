// All league scoring and ranking rules live here. Every function is pure.
// Rules marked TBC are defaults still to be confirmed by the group: change
// them here and every view (scoreboard, form preview, history) follows.

/** When true, players tied on every ranking criterion share a position (1, 2, 2, 4). */
export const SHARED_POSITIONS_ON_TIE = false;

/** Most "dado extra" dice shown for a player. TBC. */
export const MAX_EXTRA_DICE = 3;

/** Locale used to break ties by name. */
export const NAME_LOCALE = "es";

/** Total points: sum of `points` over every matchday of the season (matches and adjustments). */
export function totalPoints(playerScores) {
  return playerScores.reduce((sum, s) => sum + (Number(s.points) || 0), 0);
}

/** CASA column: sum of `casa` over the season. TBC: meaning to be confirmed. */
export function casaTotal(playerScores) {
  return playerScores.reduce((sum, s) => sum + (Number(s.casa) || 0), 0);
}

/** Whether a CASA value is shown highlighted (green). */
export function isCasaHighlighted(casa) {
  return casa > 0;
}

/**
 * DADO EXTRA column: the `extra_dice` of the latest matchday with a score row
 * for the player. It is a current holding, not a sum. TBC.
 */
export function currentExtraDice(playerScores) {
  if (!playerScores.length) return 0;
  const latest = playerScores.reduce((a, b) => (b.jornada > a.jornada ? b : a));
  return clamp(Number(latest.extra_dice) || 0, 0, MAX_EXTRA_DICE);
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

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}
