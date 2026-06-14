function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function sameFixtureByTeamsAndDay(left, right) {
  const leftDate = String(left.kickoff || "").slice(0, 10);
  const rightDate = String(right.kickoff || "").slice(0, 10);

  if (!leftDate || leftDate !== rightDate) return false;

  return (
    normalizeName(left.home?.name) === normalizeName(right.home?.name) &&
    normalizeName(left.away?.name) === normalizeName(right.away?.name)
  );
}

function mapWinnerToExistingIds(existing, incoming) {
  if (!incoming.winner) return null;
  if (incoming.winner === incoming.home?.id) return existing.home?.id || incoming.winner;
  if (incoming.winner === incoming.away?.id) return existing.away?.id || incoming.winner;
  return incoming.winner;
}

function mergeFixture(existing, incoming, keepExistingId = false) {
  return {
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
