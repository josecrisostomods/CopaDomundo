export const DEFAULT_SCORING = {
  outcome: 2,
  exactScore: 5,
  qualifier: 2,
  qualificationMethod: 2,
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
  const hasExactScore =
    Number(prediction.homeScore) === Number(fixture.homeScore) &&
    Number(prediction.awayScore) === Number(fixture.awayScore);

  if (hasExactScore) {
    total += scoring.exactScore;
    details.push({ label: "Placar exato", points: scoring.exactScore });
  } else if (prediction.normalOutcome === actualOutcome) {
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

export function buildRanking(users, fixtures, predictions, scoring = DEFAULT_SCORING) {
  return users
    .map((user) => {
      const userPredictions = predictions.filter((prediction) => prediction.userId === user.id);
      const stats = userPredictions.reduce(
        (acc, prediction) => {
          const fixture = fixtures.find((item) => item.id === prediction.fixtureId);
          const result = fixture ? scorePrediction(fixture, prediction, scoring) : { total: 0, details: [] };
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
