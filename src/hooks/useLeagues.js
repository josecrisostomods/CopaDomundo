import { useState, useEffect } from "react";
import { STORAGE } from "../config/appConfig";
import { readStorage, writeStorage } from "../lib/storage";
import { isSupabaseConfigured } from "../lib/supabase";
import { createRemoteLeague, joinRemoteLeague } from "../services/supabaseData";

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
  const [membersByLeague, setMembersByLeague] = useState({});
  const [dataState, setDataState] = useState({ loading: false, message: "" });

  useEffect(() => writeStorage(STORAGE.leagues, leagues), [leagues]);
  useEffect(() => writeStorage(STORAGE.activeLeague, activeLeagueId), [activeLeagueId]);

  const activeLeague = leagues.find((league) => league.id === activeLeagueId) || leagues[0] || null;

  async function createLeague(name) {
    if (!isSupabaseConfigured || !currentUser) {
      throw new Error("Nao foi possivel criar liga agora.");
    }

    setDataState({ loading: true, message: "Criando liga..." });
    try {
      const league = await createRemoteLeague(name, sessionToken);
      setLeagues((items) => [league, ...items.filter((item) => item.id !== league.id)]);
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
      throw new Error("Nao foi possivel entrar na liga agora.");
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

  return {
    leagues,
    setLeagues,
    activeLeagueId,
    setActiveLeagueId,
    activeLeague,
    membersByLeague,
    setMembersByLeague,
    dataState,
    setDataState,
    createLeague,
    joinLeague,
  };
}
