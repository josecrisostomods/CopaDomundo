import assert from "node:assert/strict";
import test from "node:test";
import { scorePrediction } from "../src/lib/scoring.js";

const finishedFixture = {
  id: "fixture-1",
  status: "FINISHED",
  stageType: "GROUP",
  homeScore: 2,
  awayScore: 1,
};

test("placar exato vale 5 pontos no total", () => {
  const result = scorePrediction(finishedFixture, {
    normalOutcome: "HOME",
    homeScore: 2,
    awayScore: 1,
  });

  assert.equal(result.total, 5);
});

test("acerto apenas de vencedor ou empate vale 2 pontos", () => {
  const result = scorePrediction(finishedFixture, {
    normalOutcome: "HOME",
    homeScore: 1,
    awayScore: 0,
  });

  assert.equal(result.total, 2);
});
