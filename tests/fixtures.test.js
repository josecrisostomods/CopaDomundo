import test from "node:test";
import assert from "node:assert/strict";
import { MOCK_FIXTURES } from "../src/data/mockWorldCup.js";
import { mergeFixtureLists } from "../src/lib/fixtures.js";

test("calendario local contem os 104 jogos da Copa", () => {
  assert.equal(MOCK_FIXTURES.length, 104);
  assert.equal(MOCK_FIXTURES.filter((fixture) => fixture.stageType === "GROUP").length, 72);
  assert.equal(MOCK_FIXTURES.filter((fixture) => fixture.stageType === "KNOCKOUT").length, 32);
});

test("dados remotos parciais nao removem jogos do calendario", () => {
  const remoteFixtures = MOCK_FIXTURES.slice(0, 48).map((fixture) => ({ ...fixture }));
  const merged = mergeFixtureLists(MOCK_FIXTURES, remoteFixtures);

  assert.equal(merged.length, 104);
});

test("resultado remoto continua valendo sobre o calendario de fallback", () => {
  const remoteResult = {
    ...MOCK_FIXTURES[10],
    status: "FINISHED",
    homeScore: 3,
    awayScore: 0,
  };
  const merged = mergeFixtureLists(MOCK_FIXTURES, [remoteResult]);
  const saved = merged.find((fixture) => fixture.id === remoteResult.id);

  assert.equal(merged.length, 104);
  assert.equal(saved.status, "FINISHED");
  assert.equal(saved.homeScore, 3);
  assert.equal(saved.awayScore, 0);
});

test("a mesma partida em UTC atualiza o fallback sem criar duplicata", () => {
  const fallback = {
    ...MOCK_FIXTURES[0],
    id: "local-match",
    kickoff: "2026-06-17T23:00:00-04:00",
    status: "SCHEDULED",
  };
  const apiFixture = {
    ...fallback,
    id: "api-match",
    kickoff: "2026-06-18T03:00:00.000Z",
    status: "FINISHED",
    homeScore: 2,
    awayScore: 1,
  };

  const merged = mergeFixtureLists([fallback], [apiFixture]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, "local-match");
  assert.equal(merged[0].status, "FINISHED");
  assert.equal(merged[0].homeScore, 2);
});
