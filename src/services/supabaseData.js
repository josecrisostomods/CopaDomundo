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
    name: row.name,
    avatar: row.avatar || avatarFor(row.name),
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

  const row = {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar || avatarFor(profile.name),
  };

  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
  if (error) throw error;
  return profile;
}

export async function createRemoteLeague(name) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("create_league_with_owner", {
    league_name: name || "Minha liga",
  });

  if (error) throw error;
  return mapLeague(data, { role: "owner", memberCount: 1 });
}

export async function joinRemoteLeague(code) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const { data, error } = await supabase.rpc("join_league_by_code", {
    invite_code: code.trim().toUpperCase(),
  });

  if (error) throw error;
  return mapLeague(data, { role: "member", memberCount: 1 });
}

export async function fetchRemoteState() {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const userResult = await supabase.auth.getUser();
  const currentUserId = userResult.data.user?.id;

  const [
    leaguesResult,
    teamsResult,
    fixturesResult,
    predictionsResult,
    membersResult,
  ] = await Promise.all([
    supabase.from("leagues").select("id,name,code,owner_id").order("created_at", { ascending: false }),
    supabase.from("teams").select("id,name,flag,crest_url"),
    supabase.from("fixtures").select("*").order("kickoff", { ascending: true }),
    supabase.from("predictions").select("*").order("updated_at", { ascending: false }),
    supabase.from("league_members").select("league_id,user_id,role,profiles(id,name,avatar)"),
  ]);

  for (const result of [leaguesResult, teamsResult, fixturesResult, predictionsResult, membersResult]) {
    if (result.error) throw result.error;
  }

  const teamMap = new Map(
    (teamsResult.data || []).map((team) => [
      team.id,
      { id: team.id, name: team.name, flag: team.flag || "FIFA", crest: team.crest_url || null },
    ]),
  );
  const profileMap = new Map();
  const roleByLeague = new Map();
  const membersByLeague = {};

  for (const member of membersResult.data || []) {
    if (member.profiles?.id) {
      const profile = mapProfile(member.profiles);
      profileMap.set(member.profiles.id, profile);
      membersByLeague[member.league_id] = membersByLeague[member.league_id] || [];

      if (!membersByLeague[member.league_id].some((user) => user.id === profile.id)) {
        membersByLeague[member.league_id].push(profile);
      }
    }

    if (member.user_id === currentUserId) {
      roleByLeague.set(member.league_id, member.role);
    }
  }

  return {
    leagues: (leaguesResult.data || []).map((league) =>
      mapLeague(league, {
        currentUserId,
        role: roleByLeague.get(league.id),
        memberCount: membersByLeague[league.id]?.length || 1,
      }),
    ),
    fixtures: (fixturesResult.data || []).map((fixture) => mapFixture(fixture, teamMap)),
    predictions: (predictionsResult.data || []).map(mapPrediction),
    membersByLeague,
    users: Array.from(profileMap.values()),
  };
}

export async function saveRemotePrediction(prediction) {
  if (!supabase) throw new Error("Supabase nao configurado.");

  const row = {
    league_id: prediction.leagueId,
    user_id: prediction.userId,
    fixture_id: prediction.fixtureId,
    normal_outcome: prediction.normalOutcome,
    home_score: prediction.homeScore,
    away_score: prediction.awayScore,
    qualifier_team_id: prediction.qualifier,
    qualification_method: prediction.qualificationMethod,
    extra_home_score: prediction.extraHomeScore,
    extra_away_score: prediction.extraAwayScore,
    penalties_home: prediction.penaltiesHome,
    penalties_away: prediction.penaltiesAway,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("predictions")
    .upsert(row, { onConflict: "league_id,user_id,fixture_id" })
    .select()
    .single();

  if (error) throw error;
  return mapPrediction(data);
}
