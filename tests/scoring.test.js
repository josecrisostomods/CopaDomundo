import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SCORING,
  getNormalOutcome,
  scorePrediction,
  buildRanking,
} from "../src/lib/scoring.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function finishedFixture(overrides = {}) {
  return {
    id: "fixture-1",
    stageType: "GROUP",
    status: "FINISHED",
    homeScore: 2,
    awayScore: 1,
    winner: null,
    classificationMethod: null,
    ...overrides,
  };
}

function prediction(overrides = {}) {
  return {
    id: "pred-1",
    userId: "user-1",
    fixtureId: "fixture-1",
    leagueId: null,
    normalOutcome: "HOME",
    homeScore: 2,
    awayScore: 1,
    qualifier: null,
    qualificationMethod: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DEFAULT_SCORING values
// ---------------------------------------------------------------------------

test("DEFAULT_SCORING has correct point values", () => {
  assert.equal(DEFAULT_SCORING.exactScore, 5);
  assert.equal(DEFAULT_SCORING.outcome, 2);
  assert.equal(DEFAULT_SCORING.qualifier, 2);
  assert.equal(DEFAULT_SCORING.qualificationMethod, 2);
});

// ---------------------------------------------------------------------------
// getNormalOutcome
// ---------------------------------------------------------------------------

test("getNormalOutcome returns HOME when home wins", () => {
  assert.equal(getNormalOutcome(3, 1), "HOME");
});

test("getNormalOutcome returns AWAY when away wins", () => {
  assert.equal(getNormalOutcome(0, 2), "AWAY");
});

test("getNormalOutcome returns DRAW on tie", () => {
  assert.equal(getNormalOutcome(1, 1), "DRAW");
});

test("getNormalOutcome returns null when scores are null", () => {
  assert.equal(getNormalOutcome(null, null), null);
  assert.equal(getNormalOutcome(2, null), null);
  assert.equal(getNormalOutcome(null, 0), null);
});

// ---------------------------------------------------------------------------
// scorePrediction — basic scenarios
// ---------------------------------------------------------------------------

test("placar exato = 5 pontos (nao soma outcome)", () => {
  const fixture = finishedFixture({ homeScore: 2, awayScore: 1 });
  const pred = prediction({ normalOutcome: "HOME", homeScore: 2, awayScore: 1 });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 5);
  assert.equal(result.details.length, 1);
  assert.equal(result.details[0].label, "Placar exato");
  assert.equal(result.details[0].points, 5);
});

test("acertar vencedor sem placar exato = 2 pontos", () => {
  const fixture = finishedFixture({ homeScore: 3, awayScore: 0 });
  const pred = prediction({ normalOutcome: "HOME", homeScore: 2, awayScore: 1 });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 2);
  assert.equal(result.details.length, 1);
  assert.equal(result.details[0].label, "Vencedor/empate");
  assert.equal(result.details[0].points, 2);
});

test("acertar empate sem placar exato = 2 pontos", () => {
  const fixture = finishedFixture({ homeScore: 0, awayScore: 0 });
  const pred = prediction({ normalOutcome: "DRAW", homeScore: 1, awayScore: 1 });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 2);
  assert.equal(result.details[0].label, "Vencedor/empate");
});

test("empate exato = 5 pontos", () => {
  const fixture = finishedFixture({ homeScore: 1, awayScore: 1 });
  const pred = prediction({ normalOutcome: "DRAW", homeScore: 1, awayScore: 1 });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 5);
  assert.equal(result.details[0].label, "Placar exato");
});

test("errar tudo = 0 pontos", () => {
  const fixture = finishedFixture({ homeScore: 2, awayScore: 1 });
  const pred = prediction({ normalOutcome: "AWAY", homeScore: 0, awayScore: 3 });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 0);
  assert.equal(result.details.length, 0);
});

test("jogo nao finalizado = 0 pontos", () => {
  const fixture = finishedFixture({ status: "SCHEDULED", homeScore: null, awayScore: null });
  const pred = prediction({ normalOutcome: "HOME", homeScore: 2, awayScore: 1 });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 0);
});

test("prediction nula = 0 pontos", () => {
  const fixture = finishedFixture();
  const result = scorePrediction(fixture, null);

  assert.equal(result.total, 0);
});

test("fixture FINISHED sem placar = 0 pontos (outcome null)", () => {
  const fixture = finishedFixture({ homeScore: null, awayScore: null });
  const pred = prediction({ normalOutcome: "HOME", homeScore: 2, awayScore: 1 });
  const result = scorePrediction(fixture, pred);

  // getNormalOutcome retorna null quando scores são null,
  // então nenhum outcome bate — 0 pontos.
  assert.equal(result.total, 0);
});

// ---------------------------------------------------------------------------
// scorePrediction — mata-mata
// ---------------------------------------------------------------------------

test("mata-mata: placar exato + classificado + forma = 5+2+2 = 9", () => {
  const fixture = finishedFixture({
    stageType: "KNOCKOUT",
    homeScore: 1,
    awayScore: 1,
    winner: "BRA",
    classificationMethod: "PENALTIES",
  });
  const pred = prediction({
    normalOutcome: "DRAW",
    homeScore: 1,
    awayScore: 1,
    qualifier: "BRA",
    qualificationMethod: "PENALTIES",
  });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 9);
  assert.equal(result.details.length, 3);
});

test("mata-mata: resultado simples nao pontua, mas classificado e forma somam 4", () => {
  const fixture = finishedFixture({
    stageType: "KNOCKOUT",
    homeScore: 2,
    awayScore: 0,
    winner: "BRA",
    classificationMethod: "NORMAL_TIME",
  });
  const pred = prediction({
    normalOutcome: "HOME",
    homeScore: 3,
    awayScore: 1,
    qualifier: "BRA",
    qualificationMethod: "NORMAL_TIME",
  });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 4);
  assert.equal(result.details.some((d) => d.label === "Vencedor/empate"), false);
  assert.equal(result.details.some((d) => d.label === "Classificado"), true);
  assert.equal(result.details.some((d) => d.label === "Forma de classificacao"), true);
});

test("mata-mata: forma correta vale 2 mesmo com classificado errado", () => {
  const fixture = finishedFixture({
    stageType: "KNOCKOUT",
    homeScore: 1,
    awayScore: 1,
    winner: "BRA",
    classificationMethod: "PENALTIES",
  });
  const pred = prediction({
    normalOutcome: "DRAW",
    homeScore: 0,
    awayScore: 0,
    qualifier: "JPN",
    qualificationMethod: "PENALTIES",
  });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 2);
  assert.deepEqual(result.details, [{ label: "Forma de classificacao", points: 2 }]);
});

test("mata-mata: so acertar classificado sem outcome = 2", () => {
  const fixture = finishedFixture({
    stageType: "KNOCKOUT",
    homeScore: 3,
    awayScore: 0,
    winner: "BRA",
    classificationMethod: "NORMAL_TIME",
  });
  const pred = prediction({
    normalOutcome: "AWAY",
    homeScore: 0,
    awayScore: 2,
    qualifier: "BRA",
    qualificationMethod: "EXTRA_TIME",
  });
  const result = scorePrediction(fixture, pred);

  assert.equal(result.total, 2);
  assert.equal(result.details.length, 1);
  assert.equal(result.details[0].label, "Classificado");
});

// ---------------------------------------------------------------------------
// buildRanking — global predictions (leagueId: null)
// ---------------------------------------------------------------------------

test("buildRanking usa predictions globais (leagueId: null)", () => {
  const users = [
    { id: "user-A", name: "Alice" },
    { id: "user-B", name: "Bob" },
  ];

  const fixtures = [
    finishedFixture({ id: "f1", homeScore: 2, awayScore: 1 }),
    finishedFixture({ id: "f2", homeScore: 0, awayScore: 0 }),
  ];

  const predictions = [
    // Alice: placar exato no f1 (5pts), erra f2 (0pts)
    prediction({ userId: "user-A", fixtureId: "f1", leagueId: null, normalOutcome: "HOME", homeScore: 2, awayScore: 1 }),
    prediction({ userId: "user-A", fixtureId: "f2", leagueId: null, normalOutcome: "HOME", homeScore: 1, awayScore: 0 }),
    // Bob: acerta vencedor no f1 (2pts), placar exato no f2 (5pts)
    prediction({ userId: "user-B", fixtureId: "f1", leagueId: null, normalOutcome: "HOME", homeScore: 3, awayScore: 0 }),
    prediction({ userId: "user-B", fixtureId: "f2", leagueId: null, normalOutcome: "DRAW", homeScore: 0, awayScore: 0 }),
  ];

  const ranking = buildRanking(users, fixtures, predictions);

  // Bob: 2 + 5 = 7 pontos, Alice: 5 + 0 = 5 pontos
  assert.equal(ranking[0].id, "user-B");
  assert.equal(ranking[0].points, 7);
  assert.equal(ranking[0].position, 1);

  assert.equal(ranking[1].id, "user-A");
  assert.equal(ranking[1].points, 5);
  assert.equal(ranking[1].position, 2);
});

// ---------------------------------------------------------------------------
// buildRanking — liga filtra por membros
// ---------------------------------------------------------------------------

test("buildRanking de liga usa apenas predictions de membros da liga", () => {
  const leagueMembers = [
    { id: "user-A", name: "Alice" },
    { id: "user-B", name: "Bob" },
  ];

  const fixtures = [finishedFixture({ id: "f1", homeScore: 1, awayScore: 0 })];

  // user-C nao e membro da liga — sua prediction nao deve aparecer
  const allPredictions = [
    prediction({ userId: "user-A", fixtureId: "f1", leagueId: null, normalOutcome: "HOME", homeScore: 1, awayScore: 0 }),
    prediction({ userId: "user-B", fixtureId: "f1", leagueId: null, normalOutcome: "AWAY", homeScore: 0, awayScore: 2 }),
    prediction({ userId: "user-C", fixtureId: "f1", leagueId: null, normalOutcome: "HOME", homeScore: 1, awayScore: 0 }),
  ];

  // Filtra predictions dos membros (como faz AppContext.jsx)
  const leagueUserIds = new Set(leagueMembers.map((u) => u.id));
  const leaguePredictions = allPredictions.filter((p) => leagueUserIds.has(p.userId));

  const ranking = buildRanking(leagueMembers, fixtures, leaguePredictions);

  assert.equal(ranking.length, 2);
  assert.equal(ranking[0].id, "user-A");
  assert.equal(ranking[0].points, 5);
  assert.equal(ranking[1].id, "user-B");
  assert.equal(ranking[1].points, 0);
});

test("buildRanking sem liga ativa retorna ranking pessoal", () => {
  const users = [{ id: "user-A", name: "Alice" }];
  const fixtures = [finishedFixture({ id: "f1", homeScore: 2, awayScore: 1 })];
  const predictions = [
    prediction({ userId: "user-A", fixtureId: "f1", leagueId: null, normalOutcome: "HOME", homeScore: 2, awayScore: 1 }),
  ];

  const ranking = buildRanking(users, fixtures, predictions);

  assert.equal(ranking.length, 1);
  assert.equal(ranking[0].points, 5);
  assert.equal(ranking[0].position, 1);
});

test("buildRanking respeita inicio de pontuacao configurado por liga", () => {
  const users = [{ id: "user-A", name: "Alice" }];
  const fixtures = [
    finishedFixture({ id: "f1", homeScore: 1, awayScore: 0 }),
    finishedFixture({ id: "f2", homeScore: 1, awayScore: 0 }),
    finishedFixture({ id: "f3", homeScore: 1, awayScore: 0 }),
    finishedFixture({ id: "f4", homeScore: 1, awayScore: 0 }),
  ];
  const predictions = fixtures.map((fixture) =>
    prediction({
      userId: "user-A",
      fixtureId: fixture.id,
      leagueId: null,
      normalOutcome: "HOME",
      homeScore: 1,
      awayScore: 0,
    }),
  );

  const standardLeagueRanking = buildRanking(users, fixtures, predictions, {
    ...DEFAULT_SCORING,
    scoreFromFixtureIndex: 3,
  });
  const specialLeagueRanking = buildRanking(users, fixtures, predictions, {
    ...DEFAULT_SCORING,
    scoreFromFixtureIndex: 0,
  });

  assert.equal(standardLeagueRanking[0].points, 5);
  assert.equal(standardLeagueRanking[0].predictions, 1);
  assert.equal(specialLeagueRanking[0].points, 20);
  assert.equal(specialLeagueRanking[0].predictions, 4);
});

test("buildRanking desempate: exacts > knockout > predictions > nome", () => {
  const users = [
    { id: "user-A", name: "Alice" },
    { id: "user-B", name: "Bob" },
  ];

  const fixtures = [
    finishedFixture({ id: "f1", homeScore: 2, awayScore: 1 }),
    finishedFixture({ id: "f2", homeScore: 0, awayScore: 0 }),
  ];

  const predictions = [
    // Ambos com 5 pts: Alice acerta placar exato, Bob acerta 2 outcomes + 1 placar errado
    prediction({ userId: "user-A", fixtureId: "f1", leagueId: null, normalOutcome: "HOME", homeScore: 2, awayScore: 1 }),
    prediction({ userId: "user-B", fixtureId: "f1", leagueId: null, normalOutcome: "HOME", homeScore: 3, awayScore: 0 }),
    prediction({ userId: "user-B", fixtureId: "f2", leagueId: null, normalOutcome: "DRAW", homeScore: 1, awayScore: 1 }),
  ];

  const ranking = buildRanking(users, fixtures, predictions);

  // Bob: 2 + 2 = 4 pts (2 outcomes, 0 exacts)
  // Alice: 5 pts (1 exact)
  // Alice ganha por mais pontos
  assert.equal(ranking[0].id, "user-A");
  assert.equal(ranking[0].exacts, 1);
});
