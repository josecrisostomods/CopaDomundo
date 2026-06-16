import { useState, useEffect } from "react";
import { STORAGE } from "../config/appConfig";
import { makeId, readStorage, writeStorage } from "../lib/storage";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  createRemoteLeague,
  joinPublicRemoteLeague,
  joinRemoteLeague,
  removeRemoteLeagueMember,
} from "../services/supabaseData";
import { REIS_DO_PITACO_SEED } from "../data/reisDoPitacoSeed.js";

const LOCAL_LEAGUE_ID = "league-local";

function seedMembers() {
  return REIS_DO_PITACO_SEED.participants.map((participant) => ({
    ...participant,
    role: "player",
    isAdmin: false,
    displayNameSet: true,
  }));
}

function localLeagueFor(currentUser, overrides = {}) {
  return {
    id: overrides.id || LOCAL_LEAGUE_ID,
    name: overrides.name || "Liga Local",
    code: overrides.code || "LOCAL",
    ownerId: overrides.ownerId || currentUser.id,
    role: overrides.role || "owner",
    memberCount: overrides.memberCount || 1,
    isPublic: false,
    settings: {
      outcome: 2,
      exactScore: 5,
      qualifier: 2,
      qualificationMethod: 2,
      scoreFromFixtureIndex: 3,
      leagueScopedOnly: false,
      bonusLocked: false,
      ...(overrides.settings || {}),
    },
  };
}

function reisLeagueFor(currentUser) {
  return localLeagueFor(currentUser, {
    id: REIS_DO_PITACO_SEED.league.id,
    name: REIS_DO_PITACO_SEED.league.name,
    code: REIS_DO_PITACO_SEED.league.code,
    memberCount: REIS_DO_PITACO_SEED.participants.length,
    settings: {
      ...REIS_DO_PITACO_SEED.league.settings,
      leagueScopedOnly: true,
    },
  });
}

function getInitialLeagues() {
  const storedLeagues = readStorage(STORAGE.leagues, []);
  if (!Array.isArray(storedLeagues)) return [];
  return storedLeagues.filter((league) => league.id !== "league-demo");
}

function getInitialActiveLeagueId() {
  const storedLeagueId = readStorage(STORAGE.activeLeague, null);
  return storedLeagueId === "league-demo" ? null : storedLeagueId;
}

export function useLeagues(sessionToken, currentUser) {
  const [leagues, setLeagues] = useState(getInitialLeagues);
  const [activeLeagueId, setActiveLeagueId] = useState(getInitialActiveLeagueId);
  const [publicLeagues, setPublicLeagues] = useState([]);
  const [membersByLeague, setMembersByLeague] = useState({});
  const [dataState, setDataState] = useState({ loading: false, message: "" });

  useEffect(() => writeStorage(STORAGE.leagues, leagues), [leagues]);
  useEffect(() => writeStorage(STORAGE.activeLeague, activeLeagueId), [activeLeagueId]);

  useEffect(() => {
    if (isSupabaseConfigured || !currentUser) return;

    setLeagues((items) => {
      const localLeague = localLeagueFor(currentUser);
      const reisLeague = reisLeagueFor(currentUser);
      const next = items.length ? items : [localLeague, reisLeague];

      return [
        ...next.filter((league) => league.id !== localLeague.id && league.id !== reisLeague.id),
        localLeague,
        reisLeague,
      ];
    });
    setActiveLeagueId((current) => current || LOCAL_LEAGUE_ID);
    setMembersByLeague((items) => {
      const leagueId = activeLeagueId || LOCAL_LEAGUE_ID;
      return {
        ...items,
        [leagueId]: leagueId === REIS_DO_PITACO_SEED.league.id ? seedMembers() : [currentUser],
        [REIS_DO_PITACO_SEED.league.id]: seedMembers(),
      };
    });
  }, [activeLeagueId, currentUser]);

  const activeLeague = leagues.find((league) => league.id === activeLeagueId) || leagues[0] || null;

  async function createLeague(name, isPublic = false) {
    if (!isSupabaseConfigured || !currentUser) {
      const league = localLeagueFor(currentUser, {
        id: makeId("league"),
        name: name?.trim() || "Liga Local",
        code: "LOCAL",
      });
      setLeagues((items) => [league, ...items.filter((item) => item.id !== league.id)]);
      setMembersByLeague((items) => ({ ...items, [league.id]: [currentUser] }));
      setActiveLeagueId(league.id);
      setDataState({ loading: false, message: "Liga local criada." });
      return league;
    }

    setDataState({ loading: true, message: "Criando liga..." });
    try {
      const league = await createRemoteLeague(name, sessionToken, isPublic);
      setLeagues((items) => [league, ...items.filter((item) => item.id !== league.id)]);
      setPublicLeagues((items) => items.filter((item) => item.id !== league.id));
      setMembersByLeague((items) => ({ ...items, [league.id]: [currentUser] }));
      setActiveLeagueId(league.id);
      setDataState({ loading: false, message: "Liga criada." });
      return league;
    } catch (error) {
      setDataState({
        loading: false,
        message: `${error.message} Nao foi possivel criar a liga.`,
      });
      throw error;
    }
  }

  async function joinLeague(code) {
    const normalized = code.trim().toUpperCase();

    if (!isSupabaseConfigured || !currentUser) {
      if (normalized !== "LOCAL") {
        throw new Error("No modo local, use o codigo LOCAL.");
      }

      const league = localLeagueFor(currentUser);
      setLeagues((items) => [league, ...items.filter((item) => item.id !== league.id)]);
      setMembersByLeague((items) => ({ ...items, [league.id]: [currentUser] }));
      setActiveLeagueId(league.id);
      setDataState({ loading: false, message: "Voce entrou na liga local." });
      return league;
    }

    try {
      const league = await joinRemoteLeague(normalized, sessionToken);
      setLeagues((items) => [league, ...items.filter((item) => item.id !== league.id)]);
      setMembersByLeague((items) => ({
        ...items,
        [league.id]: items[league.id]?.some((user) => user.id === currentUser.id)
          ? items[league.id]
          : [currentUser, ...(items[league.id] || [])],
      }));
      setActiveLeagueId(league.id);
      setDataState({ loading: false, message: "Voce entrou na liga." });
      return league;
    } catch (error) {
      setDataState({
        loading: false,
        message: `${error.message} Nao foi possivel entrar na liga.`,
      });
      throw error;
    }
  }

  async function joinPublicLeague(leagueId) {
    if (!isSupabaseConfigured || !currentUser) {
      throw new Error("Ligas publicas precisam do Supabase.");
    }

    try {
      const league = await joinPublicRemoteLeague(leagueId, sessionToken);
      setLeagues((items) => [league, ...items.filter((item) => item.id !== league.id)]);
      setPublicLeagues((items) => items.filter((item) => item.id !== league.id));
      setMembersByLeague((items) => ({
        ...items,
        [league.id]: items[league.id]?.some((user) => user.id === currentUser.id)
          ? items[league.id]
          : [currentUser, ...(items[league.id] || [])],
      }));
      setActiveLeagueId(league.id);
      setDataState({ loading: false, message: "Voce entrou na liga." });
      return league;
    } catch (error) {
      setDataState({
        loading: false,
        message: `${error.message} Nao foi possivel entrar na liga.`,
      });
      throw error;
    }
  }

  async function removeLeagueMember(leagueId, userId) {
    if (!isSupabaseConfigured || !currentUser) {
      setMembersByLeague((items) => ({
        ...items,
        [leagueId]: (items[leagueId] || []).filter((user) => user.id !== userId),
      }));
      return { memberCount: 1 };
    }

    try {
      const result = await removeRemoteLeagueMember({ leagueId, userId }, sessionToken);
      setMembersByLeague((items) => ({
        ...items,
        [leagueId]: (items[leagueId] || []).filter((user) => user.id !== userId),
      }));
      setLeagues((items) =>
        items.map((league) =>
          league.id === leagueId
            ? { ...league, memberCount: result.memberCount ?? Math.max((league.memberCount || 1) - 1, 1) }
            : league,
        ),
      );
      setDataState({ loading: false, message: "Participante removido." });
      return result;
    } catch (error) {
      setDataState({
        loading: false,
        message: `${error.message} Nao foi possivel remover o participante.`,
      });
      throw error;
    }
  }

  return {
    leagues,
    setLeagues,
    publicLeagues,
    setPublicLeagues,
    activeLeagueId,
    setActiveLeagueId,
    activeLeague,
    membersByLeague,
    setMembersByLeague,
    dataState,
    setDataState,
    createLeague,
    joinLeague,
    joinPublicLeague,
    removeLeagueMember,
  };
}
