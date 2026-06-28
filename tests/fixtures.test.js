import test from "node:test";
import assert from "node:assert/strict";
import { MOCK_FIXTURES } from "../src/data/mockWorldCup.js";
import { applyKnockoutProgression, mergeFixtureLists } from "../src/lib/fixtures.js";

test("calendario local contem os 104 jogos da Copa", () => {
  assert.equal(MOCK_FIXTURES.length, 104);
  assert.equal(MOCK_FIXTURES.filter((fixture) => fixture.stageType === "GROUP").length, 72);
  assert.equal(MOCK_FIXTURES.filter((fixture) => fixture.stageType === "KNOCKOUT").length, 32);
});

test("todos os 72 jogos da fase de grupos possuem resultado", () => {
  const groupFixtures = MOCK_FIXTURES.filter((fixture) => fixture.stageType === "GROUP");

  assert.equal(groupFixtures.filter((fixture) => fixture.status === "FINISHED").length, 72);
  assert.ok(groupFixtures.every((fixture) => fixture.homeScore !== null && fixture.awayScore !== null));
});

test("mata-mata comeca com os 16 confrontos confirmados", () => {
  const roundOf32 = MOCK_FIXTURES.filter((fixture) => fixture.id.startsWith("r32-"));
  const openingMatch = roundOf32.find((fixture) => fixture.id === "r32-1");
  const brazilMatch = roundOf32.find((fixture) => fixture.id === "r32-2");

  assert.equal(roundOf32.length, 16);
  assert.equal(openingMatch.home.name, "Africa do Sul");
  assert.equal(openingMatch.away.name, "Canada");
  assert.equal(openingMatch.round, "73");
  assert.equal(brazilMatch.home.name, "Brasil");
  assert.equal(brazilMatch.away.name, "Japao");
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

test("registro agendado antigo nao apaga resultado final do calendario", () => {
  const finished = MOCK_FIXTURES[20];
  const stale = {
    ...finished,
    status: "SCHEDULED",
    homeScore: null,
    awayScore: null,
    winner: null,
  };

  const [merged] = mergeFixtureLists([finished], [stale]);

  assert.equal(merged.status, "FINISHED");
  assert.equal(merged.homeScore, finished.homeScore);
  assert.equal(merged.awayScore, finished.awayScore);
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

test("vencedor avanca para a vaga correta nas oitavas", () => {
  const winnerId = MOCK_FIXTURES.find((fixture) => fixture.id === "r32-3").home.id;
  const progressed = applyKnockoutProgression(MOCK_FIXTURES, "r32-3", winnerId);
  const nextFixture = progressed.find((fixture) => fixture.id === "r16-1");

  assert.equal(nextFixture.home.id, winnerId);
  assert.equal(nextFixture.home.name, "Alemanha");
  assert.equal(nextFixture.away.name, "Vencedor do jogo 77");
});

test("semifinal envia vencedor a final e perdedor ao terceiro lugar", () => {
  const semifinal = {
    ...MOCK_FIXTURES.find((fixture) => fixture.id === "sf-1"),
    home: { id: "brasil", name: "Brasil", flag: "BR", crest: null },
    away: { id: "franca", name: "Franca", flag: "FR", crest: null },
  };
  const fixtures = MOCK_FIXTURES.map((fixture) => fixture.id === semifinal.id ? semifinal : fixture);
  const progressed = applyKnockoutProgression(fixtures, "sf-1", "brasil");

  assert.equal(progressed.find((fixture) => fixture.id === "final-1").home.name, "Brasil");
  assert.equal(progressed.find((fixture) => fixture.id === "third-1").home.name, "Franca");
});
