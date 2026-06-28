import { KNOCKOUT_ADVANCEMENT } from "../data/worldCupBracket.js";

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function sameFixtureByTeamsAndDay(left, right) {
  const sameTeams = (
    normalizeName(left.home?.name) === normalizeName(right.home?.name) &&
    normalizeName(left.away?.name) === normalizeName(right.away?.name)
  );

  if (!sameTeams) return false;

  const leftTime = new Date(left.kickoff).getTime();
  const rightTime = new Date(right.kickoff).getTime();
  if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) return false;

  // Provedores retornam UTC, enquanto o fallback guarda o fuso do estadio.
  return Math.abs(leftTime - rightTime) <= 36 * 60 * 60 * 1000;
}

function mapWinnerToExistingIds(existing, incoming) {
  if (!incoming.winner) return null;
  if (incoming.winner === incoming.home?.id) return existing.home?.id || incoming.winner;
  if (incoming.winner === incoming.away?.id) return existing.away?.id || incoming.winner;
  return incoming.winner;
}

function mergeFixture(existing, incoming, keepExistingId = false) {
  const existingFinished = existing.status === "FINISHED";
  const incomingFinished = incoming.status === "FINISHED";
  const preferredResult = existingFinished && !incomingFinished ? existing : incoming;

  const merged = {
    ...existing,
    ...incoming,
    id: keepExistingId ? existing.id : incoming.id,
    home: {
      ...existing.home,
      ...incoming.home,
      id: keepExistingId ? existing.home?.id || incoming.home?.id : incoming.home?.id || existing.home?.id,
    },
    away: {
      ...existing.away,
      ...incoming.away,
      id: keepExistingId ? existing.away?.id || incoming.away?.id : incoming.away?.id || existing.away?.id,
    },
    winner: keepExistingId ? mapWinnerToExistingIds(existing, incoming) : incoming.winner,
  };

  if (existingFinished !== incomingFinished) {
    merged.status = "FINISHED";
    merged.homeScore = preferredResult.homeScore;
    merged.awayScore = preferredResult.awayScore;
    merged.winner = keepExistingId && preferredResult === incoming
      ? mapWinnerToExistingIds(existing, incoming)
      : preferredResult.winner;
    merged.classificationMethod = preferredResult.classificationMethod;
  }

  return merged;
}

export function mergeFixtureLists(currentFixtures, incomingFixtures) {
  const merged = [...(currentFixtures || [])];

  for (const incoming of incomingFixtures || []) {
    const idIndex = merged.findIndex((fixture) => fixture.id === incoming.id);

    if (idIndex >= 0) {
      merged[idIndex] = mergeFixture(merged[idIndex], incoming);
      continue;
    }

    const semanticIndex = merged.findIndex((fixture) => sameFixtureByTeamsAndDay(fixture, incoming));

    if (semanticIndex >= 0) {
      merged[semanticIndex] = mergeFixture(merged[semanticIndex], incoming, true);
      continue;
    }

    merged.push(incoming);
  }

  return merged.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
}

export function applyKnockoutProgression(fixtures, sourceFixtureId, winnerTeamId) {
  const assignments = KNOCKOUT_ADVANCEMENT[sourceFixtureId];
  if (!assignments?.length || !winnerTeamId) return fixtures;

  const source = fixtures.find((fixture) => fixture.id === sourceFixtureId);
  if (!source) return fixtures;

  const winner = [source.home, source.away].find((team) => team.id === winnerTeamId);
  const loser = [source.home, source.away].find((team) => team.id !== winnerTeamId);
  if (!winner || !loser) return fixtures;

  return fixtures.map((fixture) => {
    const fixtureAssignments = assignments.filter((assignment) => assignment.targetId === fixture.id);
    if (!fixtureAssignments.length) return fixture;

    return fixtureAssignments.reduce((updated, assignment) => ({
      ...updated,
      [assignment.side]: assignment.outcome === "loser" ? loser : winner,
    }), fixture);
  });
}
