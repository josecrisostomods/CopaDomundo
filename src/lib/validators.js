export const FIXTURE_STATUS_OPTIONS = ["SCHEDULED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"];
export const QUALIFICATION_METHOD_OPTIONS = ["NORMAL_TIME", "EXTRA_TIME", "PENALTIES"];

export function requiredText(value, fieldName, maxLength = 60) {
  const text = String(value || "").trim();

  if (!text) {
    throw new Error(`${fieldName} e obrigatorio.`);
  }

  if (text.length > maxLength) {
    throw new Error(`${fieldName} deve ter no maximo ${maxLength} caracteres.`);
  }

  return text;
}

export function normalizeScoreValue(value, fieldName) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number) || number < 0 || number > 99) {
    throw new Error(`${fieldName} deve ser um numero entre 0 e 99.`);
  }

  return number;
}

export function validateFixtureResultForm(form, fixture) {
  if (!fixture?.id) {
    throw new Error("Escolha um jogo.");
  }

  const status = String(form.status || "").toUpperCase();
  if (!FIXTURE_STATUS_OPTIONS.includes(status)) {
    throw new Error("Status invalido.");
  }

  const homeScore = normalizeScoreValue(form.homeScore, "Placar da casa");
  const awayScore = normalizeScoreValue(form.awayScore, "Placar visitante");
  const winnerTeamId = form.winnerTeamId || null;
  const classificationMethod = form.classificationMethod || null;

  if (status === "FINISHED" && (homeScore === null || awayScore === null)) {
    throw new Error("Informe o placar final.");
  }

  if (winnerTeamId && ![fixture.home.id, fixture.away.id].includes(winnerTeamId)) {
    throw new Error("Vencedor invalido para este jogo.");
  }

  if (classificationMethod && !QUALIFICATION_METHOD_OPTIONS.includes(classificationMethod)) {
    throw new Error("Forma de classificacao invalida.");
  }

  if (fixture.stageType === "KNOCKOUT" && status === "FINISHED" && !winnerTeamId) {
    throw new Error("No mata-mata, informe quem passou.");
  }

  return {
    fixtureId: fixture.id,
    status,
    homeScore,
    awayScore,
    winnerTeamId,
    classificationMethod,
  };
}
