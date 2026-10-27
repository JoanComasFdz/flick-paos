import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeStandings, matchHeader, topScorers, withMatchday } from "../js/standings.js";
import * as rules from "../js/rules.js";

const jornada14 = JSON.parse(readFileSync(new URL("./fixtures/jornada14.json", import.meta.url)));

const player = (id, name = id, extra = {}) => ({ player_id: id, name, titles: 0, active: true, order: 1, ...extra });
const score = (jornada, id, points, casa = 0, extra_dice = 0) => ({ season: "3", jornada, player_id: id, points, casa, extra_dice });
const match = (jornada, dice, extra = {}) => ({
  season: "3", jornada, type: "match", date: "", rival: "Girona", home_away: "home",
  barca_goals: 2, rival_goals: 0, dice, dice_counts: null, notes: "", updated_at: "", ...extra,
});
const adjustment = (jornada, dice_counts, extra = {}) => ({
  season: "3", jornada, type: "adjustment", date: "", rival: "", home_away: "",
  barca_goals: null, rival_goals: null, dice: null, dice_counts, notes: "", updated_at: "", ...extra,
});
const league = (players, matchdays, scores) => ({ season: "3", players, matchdays, scores });
const summary = (vm) => vm.rows.map((r) => [r.pos, r.name, r.points]);

test("jornada 14 fixture: order, points, casa and dice", () => {
  const vm = computeStandings(jornada14);
  assert.deepEqual(
    vm.rows.map((r) => [r.name, r.points]),
    [["Salva", 56], ["Víctor", 53], ["Olí", 50], ["Colo", 48], ["Puig", 47],
     ["Edgar", 42], ["Roger", 41], ["Joan", 31], ["Jon", 28], ["Lucas", 27]],
  );
  assert.deepEqual(vm.rows.map((r) => r.pos), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(
    Object.fromEntries(vm.rows.map((r) => [r.name, r.casa])),
    { Salva: 5, Víctor: 2, Olí: 2, Colo: 3, Puig: 1, Edgar: 0, Roger: 0, Joan: 0, Jon: 2, Lucas: 0 },
  );
  assert.deepEqual(vm.diceCounts, [0, 4, 2, 3, 4, 1]);
  assert.equal(vm.jornadasPlayed, 14);
  assert.equal(vm.rows[0].leader, true);
  assert.equal(vm.rows.filter((r) => r.leader).length, 1);
  assert.equal(vm.rows[0].titles, 2);
});

test("totals add matches and adjustments; negative points count", () => {
  const vm = computeStandings(league(
    [player("a"), player("b")],
    [adjustment(1, null), match(2, 3), match(3, 5)],
    [score(1, "a", 10), score(2, "a", -2), score(3, "a", 1), score(1, "b", 8), score(3, "b", 3)],
  ));
  assert.deepEqual(summary(vm), [[1, "b", 11], [2, "a", 9]]);
});

test("CASA is summed over the season", () => {
  const vm = computeStandings(league(
    [player("a")], [match(1, 1), match(2, 2)], [score(1, "a", 0, 1), score(2, "a", 0, 2)],
  ));
  assert.equal(vm.rows[0].casa, 3);
  assert.equal(vm.rows[0].casaHighlighted, true);
});

test("ties break by CASA desc, then name asc in Spanish order", () => {
  const vm = computeStandings(league(
    [player("v", "Víctor"), player("z", "Zoe"), player("a", "Ana"), player("o", "Olí")],
    [match(1, 1)],
    [score(1, "v", 5, 0), score(1, "z", 5, 1), score(1, "a", 5, 0), score(1, "o", 5, 0)],
  ));
  assert.deepEqual(vm.rows.map((r) => r.name), ["Zoe", "Ana", "Olí", "Víctor"]);
});

test("positions are sequential on ties by default", () => {
  const data = league(
    [player("a"), player("b"), player("c"), player("d")],
    [match(1, 1)],
    [score(1, "a", 9), score(1, "b", 5), score(1, "c", 5), score(1, "d", 1)],
  );
  assert.deepEqual(computeStandings(data).rows.map((r) => r.pos), [1, 2, 3, 4]);
  assert.deepEqual(computeStandings(data, { sharedPositions: true }).rows.map((r) => r.pos), [1, 2, 2, 4]);
});

test("shared positions: tied leaders are both highlighted", () => {
  const vm = computeStandings(league(
    [player("a"), player("b")], [match(1, 1)], [score(1, "a", 5), score(1, "b", 5)],
  ), { sharedPositions: true });
  assert.deepEqual(vm.rows.map((r) => r.leader), [true, true]);
});

test("dice counts without an adjustment count every match", () => {
  assert.deepEqual(rules.diceCounts([match(1, 2), match(2, 2), match(3, 6)]), [0, 2, 0, 0, 0, 1]);
});

test("dice counts start from the latest adjustment and add later matches", () => {
  const counts = rules.diceCounts([
    match(1, 1), adjustment(2, [1, 1, 1, 1, 1, 1]), match(3, 6),
    adjustment(4, [0, 4, 2, 3, 4, 1]), match(5, 4), match(6, 4), match(7, 1),
  ]);
  assert.deepEqual(counts, [1, 4, 2, 5, 4, 1]);
});

test("an adjustment never counts as a roll, even with a dice value", () => {
  const counts = rules.diceCounts([adjustment(14, [0, 4, 2, 3, 4, 1], { dice: 4 })]);
  assert.deepEqual(counts, [0, 4, 2, 3, 4, 1]);
});

test("an adjustment without dice counts leaves the counter unchanged", () => {
  assert.deepEqual(rules.diceCounts([match(1, 3), adjustment(2, null), match(3, 3)]), [0, 0, 2, 0, 0, 0]);
});

test("dice counts don't depend on input order", () => {
  assert.deepEqual(
    rules.diceCounts([match(16, 2), adjustment(14, [0, 4, 2, 3, 4, 1]), match(15, 5), match(10, 6)]),
    [0, 5, 2, 3, 5, 1],
  );
});

test("inactive players are excluded", () => {
  const vm = computeStandings(league(
    [player("a"), player("b", "b", { active: false })], [match(1, 1)], [score(1, "a", 1), score(1, "b", 99)],
  ));
  assert.deepEqual(vm.rows.map((r) => r.name), ["a"]);
});

test("a player with no score rows shows 0", () => {
  const vm = computeStandings(league([player("a"), player("b")], [match(1, 1)], [score(1, "a", 3, 1, 1)]));
  assert.deepEqual(vm.rows[1], {
    player_id: "b", name: "b", titles: 0, points: 0, casa: 0, extraDiceFaces: [], pos: 2, leader: false, casaHighlighted: false,
  });
});

test("an empty season has no header and zero jornadas", () => {
  const vm = computeStandings(league([player("a")], [], []));
  assert.equal(vm.header, null);
  assert.equal(vm.jornadasPlayed, 0);
  assert.deepEqual(vm.diceCounts, [0, 0, 0, 0, 0, 0]);
});

test("header puts the home team first", () => {
  assert.deepEqual(matchHeader(match(3, 2, { rival: "Athletic", home_away: "home" })).teams.map((t) => t.name), ["Barça", "Athletic"]);
  assert.deepEqual(matchHeader(match(3, 2, { rival: "Athletic", home_away: "away" })).teams.map((t) => t.name), ["Athletic", "Barça"]);
  assert.equal(matchHeader(match(3, 2)).dice, 2);
});

test("header of a bare adjustment shows only the jornada", () => {
  const h = matchHeader(adjustment(14, [0, 0, 0, 0, 0, 0]));
  assert.equal(h.jornada, 14);
  assert.equal(h.showMatch, false);
  assert.equal(h.dice, null);
});

test("the header is the matchday with the highest jornada", () => {
  const vm = computeStandings(league([player("a")], [match(5, 1, { rival: "Sevilla" }), match(4, 2)], []));
  assert.equal(vm.header.jornada, 5);
  assert.equal(vm.header.teams[1].name, "Sevilla");
});

test("topScorers lists every player tied on the most points", () => {
  const data = league([player("a", "Ana"), player("b", "Bea"), player("c", "Carla")], [match(1, 1)],
    [score(1, "a", 3), score(1, "b", 3), score(1, "c", 1)]);
  assert.deepEqual(topScorers(data, 1), { names: ["Ana", "Bea"], points: 3 });
  assert.deepEqual(topScorers(data, 2), { names: [], points: 0 });
});

test("withMatchday replaces the matchday and its scores", () => {
  const data = league([player("a")], [match(1, 1), match(2, 2)], [score(1, "a", 1), score(2, "a", 2)]);
  const next = withMatchday(data, match(2, 6), [{ player_id: "a", points: 5, casa: 0, extra_dice: 0 }]);
  assert.deepEqual(next.matchdays.map((m) => [m.jornada, m.dice]), [[1, 1], [2, 6]]);
  assert.equal(computeStandings(next).rows[0].points, 6);
  assert.equal(data.scores.length, 2, "input is not mutated");
});

const won = (s, faces) => ({ ...s, extra_dice: faces.length, extra_dice_faces: faces });

test("DADO EXTRA lists every extra die won this season, in jornada order", () => {
  const vm = computeStandings(league(
    [player("a"), player("b"), player("c")],
    [match(1, 1), match(2, 2), match(3, 3)],
    [won(score(3, "a", 0), [2]), won(score(1, "a", 0), [6]), score(2, "a", 0),
     won(score(2, "b", 0), [5]),
     score(1, "c", 0)],
  ));
  const faces = Object.fromEntries(vm.rows.map((r) => [r.name, r.extraDiceFaces]));
  assert.deepEqual(faces, { a: [6, 2], b: [5], c: [] });
});

test("an extra die won in a match adds its face to the points", () => {
  const vm = computeStandings(league(
    [player("a"), player("b")], [match(1, 1), match(2, 2)],
    [won(score(1, "a", 3), [4]), score(2, "a", 1), score(1, "b", 3)],
  ));
  assert.deepEqual(summary(vm), [[1, "a", 8], [2, "b", 3]]);
});

test("an adjustment's extra dice are listed but their faces aren't added again", () => {
  const vm = computeStandings(league(
    [player("a")], [adjustment(14, [0, 0, 0, 0, 0, 0]), match(15, 1)],
    [won(score(14, "a", 42), [4, 2]), won(score(15, "a", 3), [5])],
  ));
  assert.equal(vm.rows[0].points, 42 + 3 + 5);
  assert.deepEqual(vm.rows[0].extraDiceFaces, [4, 2, 5]);
});

test("an extra die without a face shows blank and adds nothing", () => {
  const vm = computeStandings(league(
    [player("a")], [match(1, 1)], [{ ...score(1, "a", 2), extra_dice: 2, extra_dice_faces: [9] }],
  ));
  assert.deepEqual(vm.rows[0].extraDiceFaces, [0, 0]);
  assert.equal(vm.rows[0].points, 2);
});

test("topScorers counts the extra die of a match", () => {
  const data = league([player("a", "Ana"), player("b", "Bea")], [match(1, 1)],
    [won(score(1, "a", 3), [2]), score(1, "b", 4)]);
  assert.deepEqual(topScorers(data, 1), { names: ["Ana"], points: 5 });
});
