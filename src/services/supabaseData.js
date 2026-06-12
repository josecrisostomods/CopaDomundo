import { supabase } from "../lib/supabase";

function avatarFor(name) {
  return (name || "??").slice(0, 2).toUpperCase();
}

function mapLeague(row, meta = {}) {
  const isOwner = meta.role === "owner" || (meta.currentUserId && row.owner_id === meta.currentUserId);

  return {
    id: row.id,
    name: row.name,
    code: isOwner ? row.code : null,
    ownerId: row.owner_id,
    role: meta.role || (isOwner ? "owner" : "member"),
    memberCount: meta.memberCount || 1,
  };
}

function mapProfile(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatar: row.avatar || avatarFor(row.name),
    displayNameSet: Boolean(row.display_name_set),
  };
}

function mapFixture(row, teamMap) {
  const home = teamMap.get(row.home_team_id) || {
    id: row.home_team_id,
    name: "Time A",
    flag: "FIFA",
    crest: null,
  };
  const away = teamMap.get(row.away_team_id) || {
    id: row.away_team_id,
    name: "Time B",
    flag: "FIFA",
    crest: null,
  };

  return {
    id: row.id,
    apiId: row.api_id,
    group: row.group_name,
    round: row.round,
    phase: row.phase,
    stageType: row.stage_type,
    venue: row.venue || "A definir",
    kickoff: row.kickoff,
    status: row.status,
    home,
    away,
    homeScore: row.home_score,
    awayScore: row.away_score,
    winner: row.winner_team_id,
    classificationMethod: row.classification_method,
  };
}

function mapPrediction(row) {
  return {
    id: row.id,
    leagueId: row.league_id,
    userId: row.user_id,
    fixtureId: row.fixture_id,
    normalOutcome: row.normal_outcome,
    homeScore: row.home_score,
    awayScore: row.away_score,
    qualifier: row.qualifier_team_id,
    qualificationMethod: row.qualification_method,
    extraHomeScore: row.extra_home_score,
    extraAwayScore: row.extra_away_score,
    penaltiesHome: row.penalties_home,
    penaltiesAway: row.penalties_away,
    updatedAt: row.updated_at,
  };
}

export async function upsertProfile(profile) {
  if (!supabase) return profile;

  const { data, error } = await supabase.rpc("update_player_profile", {
    session_token: profile.sessionToken,
    display_name: profile.name,
  });

  if (error) throw error;
  return mapProfile(data);
}

function mapAuthPayload(payload) {
  return {
    sessionToken: payload.sessionToken,
    profile: mapProfile(payload.profile),
  };
}

export async function registerPlayer({ username, password }) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("register_player", {
    login_username: username,
    login_password: password,
  });

  if (error) throw error;
  return mapAuthPayload(data);
}

export async function loginPlayer({ username, password }) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("login_player", {
    login_username: username,
    login_password: password,
  });

  if (error) throw error;
  return mapAuthPayload(data);
}

export async function createRemoteLeague(name, sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("create_league_with_owner", {
    session_token: sessionToken,
    league_name: name || "Minha liga",
  });

  if (error) throw error;
  return mapLeague(data, data);
}

export async function joinRemoteLeague(code, sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("join_league_by_code", {
    session_token: sessionToken,
    invite_code: code.trim().toUpperCase(),
  });

  if (error) throw error;
  return mapLeague(data, data);
}

export async function fetchRemoteState(sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const [
    stateResult,
    teamsResult,
    fixturesResult,
  ] = await Promise.all([
    supabase.rpc("get_player_state", { session_token: sessionToken }),
    supabase.from("teams").select("id,name,flag,crest_url"),
    supabase.from("fixtures").select("*").order("kickoff", { ascending: true }),
  ]);

  for (const result of [stateResult, teamsResult, fixturesResult]) {
    if (result.error) throw result.error;
  }

  const teamMap = new Map(
    (teamsResult.data || []).map((team) => [
      team.id,
      { id: team.id, name: team.name, flag: team.flag || "FIFA", crest: team.crest_url || null },
    ]),
  );
  const state = stateResult.data || {};
  const membersByLeague = {};

  for (const member of state.members || []) {
    const profile = mapProfile(member);
    membersByLeague[member.leagueId] = membersByLeague[member.leagueId] || [];

    if (!membersByLeague[member.leagueId].some((user) => user.id === profile.id)) {
      membersByLeague[member.leagueId].push(profile);
    }
  }

  return {
    profile: mapProfile(state.profile),
    leagues: (state.leagues || []).map((league) => mapLeague(league, league)),
    fixtures: (fixturesResult.data || []).map((fixture) => mapFixture(fixture, teamMap)),
    predictions: (state.predictions || []).map(mapPrediction),
    membersByLeague,
  };
}

export async function saveRemotePrediction(prediction, sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("save_player_prediction", {
    session_token: sessionToken,
    p_league_id: prediction.leagueId,
    p_fixture_id: prediction.fixtureId,
    p_normal_outcome: prediction.normalOutcome,
    p_home_score: prediction.homeScore,
    p_away_score: prediction.awayScore,
    p_qualifier_team_id: prediction.qualifier,
    p_qualification_method: prediction.qualificationMethod,
    p_extra_home_score: prediction.extraHomeScore,
    p_extra_away_score: prediction.extraAwayScore,
    p_penalties_home: prediction.penaltiesHome,
    p_penalties_away: prediction.penaltiesAway,
  });

  if (error) throw error;
  return mapPrediction(data);
}
