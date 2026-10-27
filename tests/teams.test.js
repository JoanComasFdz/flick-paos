import { test } from "node:test";
import assert from "node:assert/strict";
import { TEAMS, findTeam, searchTeams } from "../js/teams.js";

const inComp = (id) => TEAMS.filter((t) => t.comps.includes(id)).map((t) => t.name);

test("LaLiga 2026-27 lists Barça's 19 rivals", () => {
  const laliga = inComp("laliga");
  assert.equal(laliga.length, 19);
  for (const name of ["Deportivo", "Málaga", "Racing de Santander", "Real Madrid"]) assert.ok(laliga.includes(name), name);
  for (const name of ["Girona", "Mallorca", "Real Oviedo"]) assert.ok(!laliga.includes(name), `${name} was relegated`);
});

test("Champions League 2026-27 lists the other 35 clubs of the league phase", () => {
  const ucl = inComp("ucl");
  assert.equal(ucl.length, 35);
  for (const name of ["Manchester City", "Paris Saint-Germain", "Aston Villa", "Sporting de Portugal", "Feyenoord", "Galatasaray", "Como", "Sabah"]) {
    assert.ok(ucl.includes(name), `${name} is a league phase opponent`);
  }
});

test("team names are unique and every listed team has a badge code", () => {
  const names = TEAMS.map((t) => t.name);
  assert.equal(new Set(names).size, names.length);
  for (const t of TEAMS) assert.ok(t.code, t.name);
});

test("findTeam matches names and aliases regardless of case and accents", () => {
  assert.equal(findTeam("real madrid").name, "Real Madrid");
  assert.equal(findTeam("Atletico de Madrid").name, "Atlético de Madrid");
  assert.equal(findTeam("Athletic Bilbao").name, "Athletic Club");
  assert.equal(findTeam("Bayern Munich").name, "Bayern de Múnich");
  assert.equal(findTeam("Napoli").name, "Nápoles");
  assert.equal(findTeam("Real Madrid CF").name, "Real Madrid");
  assert.equal(findTeam("Atlético Madrid B").name, "Atlético de Madrid");
  assert.equal(findTeam("Arosa"), null);
  assert.equal(findTeam(""), null);
});

test("searchTeams finds listed teams by any word of a name or alias", () => {
  const names = (q) => searchTeams(q).map((t) => t.name);
  assert.deepEqual(names("madrid").sort(), ["Atlético de Madrid", "Real Madrid"]);
  assert.deepEqual(names("bilbao"), ["Athletic Club"]);
  assert.deepEqual(names("sporting cp"), ["Sporting de Portugal"]);
  assert.ok(names("").length === 19 + 35 - 4, "an empty search lists every team once");
  assert.ok(!names("girona").length, "teams outside the 2026-27 lists aren't offered");
});

test("the New Team easter egg only shows when searched for", () => {
  const names = (q) => searchTeams(q).map((t) => t.name);
  assert.ok(!names("").includes("New Team"));
  assert.ok(!names("ne").includes("New Team"));
  assert.ok(names("new team").includes("New Team"));
  assert.deepEqual(names("oliver"), ["New Team"]);
  assert.deepEqual(names("benji"), ["New Team"]);
  assert.deepEqual(names("nankatsu"), ["New Team"]);
  assert.equal(findTeam("new team").code, "NT");
});
