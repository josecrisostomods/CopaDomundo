import { WORLD_CUP_PLAYERS } from "../data/worldCupPlayers.js";

export function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function getWorldCupPlayers(teams = []) {
  const teamsByName = new Map(teams.map((team) => [normalizeSearchText(team.name), team]));

  return WORLD_CUP_PLAYERS
    .map((player) => {
      const team = teamsByName.get(normalizeSearchText(player.team));
      if (!team) return null;

      return {
        ...player,
        teamId: team.id,
        team: team.name,
        searchText: normalizeSearchText(`${player.name} ${team.name} ${player.position}`),
      };
    })
    .filter(Boolean);
}

export function filterWorldCupPlayers(players, query, limit = 8) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const startsWith = [];
  const includes = [];

  for (const player of players) {
    if (player.searchText.startsWith(normalizedQuery)) {
      startsWith.push(player);
    } else if (player.searchText.includes(normalizedQuery)) {
      includes.push(player);
    }
  }

  return [...startsWith, ...includes].slice(0, limit);
}
