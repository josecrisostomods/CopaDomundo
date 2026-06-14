import { supabase } from "../lib/supabase";

function avatarFor(name) {
  return (name || "??").slice(0, 2).toUpperCase();
}

function mapLeague(row, meta = {}) {
  const isOwner = meta.role === "owner" || (meta.currentUserId && row.owner_id === meta.currentUserId);
  const settings = row.settings || {};

  return {
    id: row.id,
    name: row.name,
    code: isOwner ? row.code : null,
    ownerId: row.owner_id,
    role: meta.role || (isOwner ? "owner" : "member"),
    memberCount: meta.memberCount || 1,
    isPublic: Boolean(row.is_public),
    settings: {
      outcome: settings.outcome ?? 2,
      exactScore: settings.exactScore ?? 5,
      qualifier: settings.qualifier ?? 2,
      qualificationMethod: settings.qualificationMethod ?? 2,
    },
  };
}

function mapProfile(row) {
  return {
    id: row.id,
    username: row.username,
    name: row.name,
    avatar: row.avatar || avatarFor(row.name),
    role: row.role || "player",
    isAdmin: Boolean(row.is_admin || row.isAdmin || row.role === "admin"),
    displayNameSet: Boolean(row.display_name_set),
  };
}

function mapAdminUser(row) {
  return {
    ...mapProfile(row),
    leagueCount: row.leagueCount || 0,
    predictionCount: row.predictionCount || 0,
    createdAt: row.created_at,
  };
}

function mapAdminLeague(row) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    isPublic: Boolean(row.is_public),
    ownerId: row.owner_id,
    ownerName: row.owner_name || "Sem dono",
    memberCount: row.memberCount || 0,
    predictionCount: row.predictionCount || 0,
    createdAt: row.created_at,
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

function mapBonusPrediction(row) {
  return {
    leagueId: row.league_id,
    userId: row.user_id,
    championTeamId: row.champion_team_id,
    topScorerName: row.top_scorer_name,
    revelationName: row.revelation_name,
    updatedAt: row.updated_at,
  };
}

export async function upsertProfile(profile, sessionToken) {
  if (!supabase) return profile;

  const { data, error } = await supabase.rpc("update_player_profile", {
    session_token: sessionToken,
    display_name: profile.name,
  });

  if (error) throw error;
  return mapProfile(data);
}

function mapAuthPayload(payload) {
  return {
    sessionToken: payload.sessionToken,
    recoveryCode: payload.recoveryCode || null,
    profile: mapProfile(payload.profile),
  };
}

function fixturePayload(fixture) {
  return {
    id: fixture.id,
    apiId: fixture.apiId || null,
    group: fixture.group || null,
    round: fixture.round ? String(fixture.round) : null,
    phase: fixture.phase,
    stageType: fixture.stageType,
    venue: fixture.venue,
    kickoff: fixture.kickoff,
    status: fixture.status,
    home: {
      id: fixture.home.id,
      name: fixture.home.name,
      flag: fixture.home.flag || "FIFA",
      crest: fixture.home.crest || null,
    },
    away: {
      id: fixture.away.id,
      name: fixture.away.name,
      flag: fixture.away.flag || "FIFA",
      crest: fixture.away.crest || null,
    },
    homeScore: fixture.homeScore,
    awayScore: fixture.awayScore,
    winner: fixture.winner || null,
    classificationMethod: fixture.classificationMethod || null,
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

export async function logoutPlayer(sessionToken) {
  if (!supabase || !sessionToken) return;

  try {
    await supabase.rpc("logout_player", { session_token: sessionToken });
  } catch {
    // O logout local continua mesmo se o servidor nao responder.
  }
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

export async function resetPlayerCredentials({ recoveryCode, username, password }) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("reset_player_credentials", {
    recovery_code: recoveryCode,
    new_username: username,
    new_password: password,
  });

  if (error) throw error;
  return mapAuthPayload(data);
}

export async function rotateRecoveryCode(sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("rotate_player_recovery_code", {
    session_token: sessionToken,
  });

  if (error) throw error;
  return data?.recoveryCode || null;
}

export async function createRemoteLeague(name, sessionToken, isPublic = false) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("create_league_with_owner", {
    session_token: sessionToken,
    league_name: name || "Minha liga",
    league_is_public: isPublic,
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

export async function joinPublicRemoteLeague(leagueId, sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("join_public_league", {
    session_token: sessionToken,
    p_league_id: leagueId,
  });

  if (error) throw error;
  return mapLeague(data, data);
}

export async function removeRemoteLeagueMember({ leagueId, userId }, sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("remove_league_member", {
    session_token: sessionToken,
    p_league_id: leagueId,
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
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
    publicLeagues: (state.publicLeagues || []).map((league) => mapLeague(league, league)),
    fixtures: (fixturesResult.data || []).map((fixture) => mapFixture(fixture, teamMap)),
    predictions: (state.predictions || []).map(mapPrediction),
    bonusPredictions: (state.bonusPredictions || []).map(mapBonusPrediction),
    membersByLeague,
  };
}

export async function saveRemotePrediction(prediction, sessionToken, fixture) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  if (fixture) {
    const { error: fixtureError } = await supabase.rpc("ensure_fixture_for_prediction", {
      session_token: sessionToken,
      p_league_id: prediction.leagueId,
      fixture_data: fixturePayload(fixture),
    });

    if (fixtureError) throw fixtureError;
  }

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

export async function saveRemoteBonusPrediction(bonus, sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("save_bonus_prediction", {
    session_token: sessionToken,
    p_league_id: bonus.leagueId,
    p_champion_team_id: bonus.championTeamId,
    p_top_scorer_name: bonus.topScorerName,
    p_revelation_name: bonus.revelationName,
  });

  if (error) throw error;
  return mapBonusPrediction(data);
}

export async function fetchAdminState(sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("get_admin_state", {
    session_token: sessionToken,
  });

  if (error) throw error;

  return {
    users: (data?.users || []).map(mapAdminUser),
    leagues: (data?.leagues || []).map(mapAdminLeague),
    totals: data?.totals || { users: 0, leagues: 0 },
  };
}

export async function updateRemoteFixtureResult(result, sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  if (result.fixture) {
    const { error: fixtureError } = await supabase.rpc("admin_ensure_fixture_for_update", {
      session_token: sessionToken,
      fixture_data: fixturePayload(result.fixture),
    });

    if (fixtureError) throw fixtureError;
  }

  const { data, error } = await supabase.rpc("admin_update_fixture_result", {
    session_token: sessionToken,
    p_fixture_id: result.fixtureId,
    p_status: result.status,
    p_home_score: result.homeScore,
    p_away_score: result.awayScore,
    p_winner_team_id: result.winnerTeamId,
    p_classification_method: result.classificationMethod,
  });

  if (error) throw error;
  return data;
}

export async function deleteRemoteUser(userId, sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("admin_delete_user", {
    session_token: sessionToken,
    p_user_id: userId,
  });

  if (error) throw error;
  return data;
}

export async function deleteRemoteLeague(leagueId, sessionToken) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("admin_delete_league", {
    session_token: sessionToken,
    p_league_id: leagueId,
  });

  if (error) throw error;
  return data;
}

export async function createAdminRemoteLeague(name, sessionToken, isPublic = false) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("admin_create_league", {
    session_token: sessionToken,
    league_name: name,
    league_is_public: isPublic,
  });

  if (error) throw error;
  return mapLeague(data, data);
}
