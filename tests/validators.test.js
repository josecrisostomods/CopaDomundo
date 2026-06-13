import assert from "node:assert/strict";
import test from "node:test";
import { normalizeScoreValue, requiredText, validateFixtureResultForm } from "../src/lib/validators.js";

const groupFixture = {
  id: "fixture-1",
  stageType: "GROUP",
  home: { id: "BRA", name: "Brasil" },
  away: { id: "MAR", name: "Marrocos" },
};

const knockoutFixture = {
  ...groupFixture,
  id: "fixture-2",
  stageType: "KNOCKOUT",
};

test("normaliza placar vazio como nulo", () => {
  assert.equal(normalizeScoreValue("", "Placar"), null);
});

test("bloqueia placar fora do intervalo permitido", () => {
  assert.throws(() => normalizeScoreValue(120, "Placar"), /entre 0 e 99/);
});

test("exige texto obrigatorio", () => {
  assert.throws(() => requiredText("   ", "Nome da liga"), /obrigatorio/);
});

test("valida resultado finalizado com placar", () => {
  const result = validateFixtureResultForm(
    {
      status: "FINISHED",
      homeScore: "2",
      awayScore: "1",
      winnerTeamId: "",
      classificationMethod: "",
    },
    groupFixture,
  );

  assert.deepEqual(result, {
    fixtureId: "fixture-1",
    status: "FINISHED",
    homeScore: 2,
    awayScore: 1,
    winnerTeamId: null,
    classificationMethod: null,
  });
});

test("exige classificado no mata-mata finalizado", () => {
  assert.throws(
    () =>
      validateFixtureResultForm(
        {
          status: "FINISHED",
          homeScore: "1",
          awayScore: "1",
          winnerTeamId: "",
          classificationMethod: "PENALTIES",
        },
        knockoutFixture,
      ),
    /quem passou/,
  );
});
