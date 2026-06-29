export const DEFAULT_SCORING = {
  outcome: 2,
  exactScore: 5,
  qualifier: 2,
  qualificationMethod: 2,
  scoreFromFixtureIndex: 0,
};

const OUTCOME_DETAIL_LABEL = "Vencedor/empate";

export function getNormalOutcome(homeScore, awayScore) {
  if (homeScore === null || awayScore === null || homeScore === undefined || awayScore === undefined) {
    return null;
  }

  if (homeScore > awayScore) return "HOME";
  if (awayScore > homeScore) return "AWAY";
  return "DRAW";
}

export function isFixtureClosed(fixture) {
  const now = Date.now();
  const startsAt = new Date(fixture.kickoff).getTime();
  return fixture.status !== "SCHEDULED" || now >= startsAt;
}

export function scorePrediction(fixture, prediction, scoring = DEFAULT_SCORING) {
  if (!prediction || fixture.status !== "FINISHED") {
    return { total: 0, details: [] };
  }

  const details = [];
  let total = 0;
  const actualOutcome = getNormalOutcome(fixture.homeScore, fixture.awayScore);

  const isExactScore =
    Number(prediction.homeScore) === Number(fixture.homeScore) &&
    Number(prediction.awayScore) === Number(fixture.awayScore);

  if (isExactScore) {
    // Placar exato: dá o total de exactScore (5). Não soma outcome separadamente.
    total += scoring.exactScore;
    details.push({ label: "Placar exato", points: scoring.exactScore });
  } else if (fixture.stageType !== "KNOCKOUT" && prediction.normalOutcome === actualOutcome) {
    // Na fase de grupos, acertar vencedor/empate sem o placar exato vale outcome (2).
    // No mata-mata, pontuam apenas placar exato, classificado e forma de classificacao.
    total += scoring.outcome;
    details.push({ label: OUTCOME_DETAIL_LABEL, points: scoring.outcome });
  }

  if (fixture.stageType === "KNOCKOUT") {
    if (prediction.qualifier && prediction.qualifier === fixture.winner) {
      total += scoring.qualifier;
      details.push({ label: "Classificado", points: scoring.qualifier });
    }

    if (
      prediction.qualificationMethod &&
      prediction.qualificationMethod === fixture.classificationMethod
    ) {
      total += scoring.qualificationMethod;
      details.push({ label: "Forma de classificacao", points: scoring.qualificationMethod });
    }
  }

  return { total, details };
}

export function eligibleFixturesForScoring(fixtures, scoring = DEFAULT_SCORING, fixtureOrder = fixtures) {
  const startIndex = Number(scoring.scoreFromFixtureIndex || 0);
  if (startIndex <= 0) return fixtures;

  const skippedFixtureIds = new Set(
    [...fixtureOrder]
      .sort((a, b) => {
        const dateDiff = new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
        return dateDiff || String(a.id).localeCompare(String(b.id));
      })
      .slice(0, startIndex)
      .map((fixture) => fixture.id),
  );

  return fixtures.filter((fixture) => !skippedFixtureIds.has(fixture.id));
}

export function buildRanking(users, fixtures, predictions, scoring = DEFAULT_SCORING, fixtureOrder = fixtures) {
  const scoringFixtures = eligibleFixturesForScoring(fixtures, scoring, fixtureOrder);

  return users
    .map((user) => {
      const userPredictions = predictions.filter((prediction) => prediction.userId === user.id);
      const stats = userPredictions.reduce(
        (acc, prediction) => {
          const fixture = scoringFixtures.find((item) => item.id === prediction.fixtureId);
          const result = fixture ? scorePrediction(fixture, prediction, scoring) : { total: 0, details: [] };
          if (!fixture) return acc;
          acc.points += result.total;
          acc.predictions += 1;
          if (result.details.some((detail) => detail.label === OUTCOME_DETAIL_LABEL)) acc.outcomes += 1;
          if (result.details.some((detail) => detail.label === "Placar exato")) acc.exacts += 1;
          if (result.details.some((detail) => detail.label === "Classificado")) acc.knockout += 1;
          return acc;
        },
        { points: 0, predictions: 0, outcomes: 0, exacts: 0, knockout: 0 },
      );

      return { ...user, ...stats };
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exacts !== a.exacts) return b.exacts - a.exacts;
      if (b.knockout !== a.knockout) return b.knockout - a.knockout;
      if (b.predictions !== a.predictions) return b.predictions - a.predictions;
      return a.name.localeCompare(b.name, "pt-BR");
    })
    .map((user, index) => ({ ...user, position: index + 1 }));
}
