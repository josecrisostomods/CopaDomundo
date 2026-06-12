import { createClient } from "@supabase/supabase-js";

const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function normalizeStatus(status) {
  const map = {
    SCHEDULED: "SCHEDULED",
    TIMED: "SCHEDULED",
    IN_PLAY: "LIVE",
    PAUSED: "LIVE",
    LIVE: "LIVE",
    FINISHED: "FINISHED",
    POSTPONED: "POSTPONED",
    CANCELLED: "CANCELLED",
  };

  return map[status] || "SCHEDULED";
}

const TEAM_NAME_PT = {
  Algeria: "Argelia",
  Argentina: "Argentina",
  Australia: "Australia",
  Austria: "Austria",
  Belgium: "Belgica",
  Bosnia: "Bosnia",
  "Bosnia and Herzegovina": "Bosnia e Herzegovina",
  Brazil: "Brasil",
  Canada: "Canada",
  "Cape Verde": "Cabo Verde",
  Colombia: "Colombia",
  "Congo DR": "RD Congo",
  "Costa Rica": "Costa Rica",
  Croatia: "Croacia",
  Curacao: "Curacao",
  Czechia: "Tchequia",
  "Côte d'Ivoire": "Costa do Marfim",
  "Cote d'Ivoire": "Costa do Marfim",
  Denmark: "Dinamarca",
  Ecuador: "Equador",
  Egypt: "Egito",
  England: "Inglaterra",
  France: "Franca",
  Germany: "Alemanha",
  Ghana: "Gana",
  Haiti: "Haiti",
  Iran: "Ira",
  Iraq: "Iraque",
  Italy: "Italia",
  Japan: "Japao",
  Jordan: "Jordania",
  "Korea Republic": "Coreia do Sul",
  Mexico: "Mexico",
  Morocco: "Marrocos",
  Netherlands: "Paises Baixos",
  "New Zealand": "Nova Zelandia",
  Norway: "Noruega",
  Panama: "Panama",
  Paraguay: "Paraguai",
  Portugal: "Portugal",
  Qatar: "Catar",
  "Saudi Arabia": "Arabia Saudita",
  Scotland: "Escocia",
  Senegal: "Senegal",
  Serbia: "Servia",
  "South Africa": "Africa do Sul",
  Spain: "Espanha",
  Sweden: "Suecia",
  Switzerland: "Suica",
  Tunisia: "Tunisia",
  Turkey: "Turquia",
  Turkiye: "Turquia",
  USA: "Estados Unidos",
  "United States": "Estados Unidos",
  Uruguay: "Uruguai",
  Uzbekistan: "Uzbequistao",
  Wales: "Pais de Gales",
};

function teamNamePt(name, fallback = "Selecao") {
  return TEAM_NAME_PT[name] || name || fallback;
}

function normalizeFootballDataMatch(match) {
  const homeScore = match.score?.fullTime?.home ?? match.score?.regularTime?.home ?? null;
  const awayScore = match.score?.fullTime?.away ?? match.score?.regularTime?.away ?? null;
  const winner = match.score?.winner === "HOME_TEAM"
    ? String(match.homeTeam?.id)
    : match.score?.winner === "AWAY_TEAM"
      ? String(match.awayTeam?.id)
      : null;

  return {
    id: `fd-${match.id}`,
    apiId: String(match.id),
    group: match.group || null,
    round: match.matchday || null,
    phase: match.stage || "Copa do Mundo",
    stageType: String(match.stage || "").includes("GROUP") ? "GROUP" : "KNOCKOUT",
    venue: match.venue || "A definir",
    kickoff: match.utcDate,
    status: normalizeStatus(match.status),
    home: {
      id: String(match.homeTeam?.id || match.homeTeam?.name || "home"),
      name: teamNamePt(match.homeTeam?.shortName || match.homeTeam?.name, "Time A"),
      flag: match.homeTeam?.tla || "FIFA",
      crest: match.homeTeam?.crest || null,
    },
    away: {
      id: String(match.awayTeam?.id || match.awayTeam?.name || "away"),
      name: teamNamePt(match.awayTeam?.shortName || match.awayTeam?.name, "Time B"),
      flag: match.awayTeam?.tla || "FIFA",
      crest: match.awayTeam?.crest || null,
    },
    homeScore,
    awayScore,
    winner,
    classificationMethod: winner ? "NORMAL_TIME" : null,
  };
}

function fixtureToDbRow(fixture, provider) {
  return {
    id: fixture.id,
    api_provider: provider,
    api_id: fixture.apiId,
    group_name: fixture.group,
    round: fixture.round ? String(fixture.round) : null,
    phase: fixture.phase,
    stage_type: fixture.stageType,
    venue: fixture.venue,
    kickoff: fixture.kickoff,
    status: fixture.status,
    home_team_id: fixture.home.id,
    away_team_id: fixture.away.id,
    home_score: fixture.homeScore,
    away_score: fixture.awayScore,
    winner_team_id: fixture.winner,
    classification_method: fixture.classificationMethod,
    updated_at: new Date().toISOString(),
  };
}

async function persistFixtures(fixtures, provider) {
  const supabase = getAdminClient();
  if (!supabase) {
    return {
      persisted: false,
      reason: "SUPABASE_URL/VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nao configurados.",
    };
  }

  const teams = new Map();
  for (const fixture of fixtures) {
    teams.set(fixture.home.id, {
      id: fixture.home.id,
      name: fixture.home.name,
      flag: fixture.home.flag,
      crest_url: fixture.home.crest,
      api_provider: provider,
      api_id: fixture.home.id,
    });
    teams.set(fixture.away.id, {
      id: fixture.away.id,
      name: fixture.away.name,
      flag: fixture.away.flag,
      crest_url: fixture.away.crest,
      api_provider: provider,
      api_id: fixture.away.id,
    });
  }

  const { error: teamError } = await supabase
    .from("teams")
    .upsert(Array.from(teams.values()), { onConflict: "id" });

  if (teamError) throw teamError;

  const { error: fixtureError } = await supabase
    .from("fixtures")
    .upsert(fixtures.map((fixture) => fixtureToDbRow(fixture, provider)), { onConflict: "id" });

  if (fixtureError) throw fixtureError;

  const { error: logError } = await supabase.from("api_sync_logs").insert({
    provider,
    status: "success",
    message: "Jogos sincronizados com sucesso.",
    fixtures_count: fixtures.length,
  });

  if (logError) throw logError;

  return { persisted: true, teams: teams.size, fixtures: fixtures.length };
}

function normalizeApiFootballFixture(item) {
  const statusShort = item.fixture?.status?.short;
  const status = statusShort === "FT" || statusShort === "AET" || statusShort === "PEN"
    ? "FINISHED"
    : statusShort === "1H" || statusShort === "2H" || statusShort === "ET" || statusShort === "P"
      ? "LIVE"
      : "SCHEDULED";
  const homeScore = item.goals?.home ?? null;
  const awayScore = item.goals?.away ?? null;
  const homeWinner = item.teams?.home?.winner;
  const awayWinner = item.teams?.away?.winner;
  const winner = homeWinner ? String(item.teams.home.id) : awayWinner ? String(item.teams.away.id) : null;
  const method = statusShort === "PEN" ? "PENALTIES" : statusShort === "AET" ? "EXTRA_TIME" : winner ? "NORMAL_TIME" : null;

  return {
    id: `af-${item.fixture?.id}`,
    apiId: String(item.fixture?.id),
    group: item.league?.round?.includes("Group") ? item.league.round : null,
    round: item.league?.round || null,
    phase: item.league?.round || "Copa do Mundo",
    stageType: item.league?.round?.includes("Group") ? "GROUP" : "KNOCKOUT",
    venue: item.fixture?.venue?.name || "A definir",
    kickoff: item.fixture?.date,
    status,
    home: {
      id: String(item.teams?.home?.id || "home"),
      name: teamNamePt(item.teams?.home?.name, "Time A"),
      flag: item.teams?.home?.code || "FIFA",
      crest: item.teams?.home?.logo || null,
    },
    away: {
      id: String(item.teams?.away?.id || "away"),
      name: teamNamePt(item.teams?.away?.name, "Time B"),
      flag: item.teams?.away?.code || "FIFA",
      crest: item.teams?.away?.logo || null,
    },
    homeScore,
    awayScore,
    winner,
    classificationMethod: method,
  };
}

async function fetchFootballData() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return {
      status: 400,
      body: {
        error: "FOOTBALL_DATA_TOKEN nao configurado.",
        setup: "Crie uma chave em football-data.org e salve como variavel de ambiente na Vercel.",
      },
    };
  }

  const response = await fetch(`${FOOTBALL_DATA_BASE_URL}/competitions/WC/matches?season=2026`, {
    headers: { "X-Auth-Token": token },
  });

  const payload = await response.json();
  if (!response.ok) {
    return { status: response.status, body: { error: "Falha no football-data.org", payload } };
  }

  const fixtures = (payload.matches || []).map(normalizeFootballDataMatch);
  const persistence = await persistFixtures(fixtures, "football-data");

  return {
    status: 200,
    body: {
      provider: "football-data",
      syncedAt: new Date().toISOString(),
      persistence,
      fixtures,
    },
  };
}

async function fetchApiFootball() {
  const token = process.env.API_FOOTBALL_KEY;
  if (!token) {
    return {
      status: 400,
      body: {
        error: "API_FOOTBALL_KEY nao configurado.",
        setup: "Crie uma chave na API-Football/API-Sports e salve como variavel de ambiente na Vercel.",
      },
    };
  }

  const league = process.env.API_FOOTBALL_LEAGUE_ID || "1";
  const season = process.env.API_FOOTBALL_SEASON || "2026";
  const url = `${API_FOOTBALL_BASE_URL}/fixtures?league=${league}&season=${season}`;
  const response = await fetch(url, {
    headers: { "x-apisports-key": token },
  });

  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    return { status: response.status || 500, body: { error: "Falha na API-Football", payload } };
  }

  const fixtures = (payload.response || []).map(normalizeApiFootballFixture);
  const persistence = await persistFixtures(fixtures, "api-football");

  return {
    status: 200,
    body: {
      provider: "api-football",
      syncedAt: new Date().toISOString(),
      persistence,
      fixtures,
    },
  };
}

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  if (request.method !== "GET") {
    response.status(405).json({ error: "Metodo nao permitido" });
    return;
  }

  try {
    const provider = request.query.provider || "api-football";
    const result = provider === "api-football" ? await fetchApiFootball() : await fetchFootballData();
    response.status(result.status).json(result.body);
  } catch (error) {
    response.status(500).json({
      error: "Nao foi possivel sincronizar jogos.",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
