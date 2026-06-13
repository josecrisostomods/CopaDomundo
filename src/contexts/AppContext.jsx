import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { AUTO_SYNC_INTERVAL_MS } from "../config/appConfig";
import { useToast } from "../components/Toast.jsx";
import { isSupabaseConfigured } from "../lib/supabase";
import { DEFAULT_SCORING, buildRanking } from "../lib/scoring";
import { fetchRemoteState } from "../services/supabaseData";

import { useAuth } from "../hooks/useAuth";
import { useFixtures } from "../hooks/useFixtures";
import { useLeagues } from "../hooks/useLeagues";
import { usePredictions } from "../hooks/usePredictions";

const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export function AppProvider({ children }) {
  const addToast = useToast();
  const [activeTab, setActiveTab] = useState("home");
  
  const {
    profile,
    setProfile,
    sessionToken,
    handlePlayerAuth: authPlayerAuth,
    updateProfile: authUpdateProfile,
    handleLogout: authLogout,
  } = useAuth();

  const {
    fixtures,
    setFixtures,
    syncState,
    lastSync,
    handleSync,
  } = useFixtures();

  const currentUser = profile;

  const {
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
    createLeague: leaguesCreateLeague,
    joinLeague: leaguesJoinLeague,
    joinPublicLeague: leaguesJoinPublicLeague,
  } = useLeagues(sessionToken, currentUser);

  const {
    predictions,
    setPredictions,
    bonusPredictions,
    setBonusPredictions,
    savePrediction: predictionsSavePrediction,
    saveBonusPrediction: predictionsSaveBonusPrediction,
  } = usePredictions(sessionToken, currentUser, activeLeague);

  useEffect(() => {
    if (!profile?.id || !sessionToken || !isSupabaseConfigured) return undefined;

    let cancelled = false;

    async function loadRemoteData() {
      setDataState({ loading: true, message: "Carregando suas ligas..." });
      try {
        const remote = await fetchRemoteState(sessionToken);

        if (cancelled) return;

        setProfile(remote.profile);
        setLeagues(remote.leagues);
        setPublicLeagues(remote.publicLeagues || []);
        setActiveLeagueId((current) =>
          remote.leagues.some((league) => league.id === current) ? current : remote.leagues[0]?.id || null,
        );

        if (remote.fixtures.length) setFixtures(remote.fixtures);
        setPredictions(remote.predictions);
        setBonusPredictions(remote.bonusPredictions || []);
        setMembersByLeague(remote.membersByLeague || {});
        setDataState({ loading: false, message: remote.leagues.length ? "Ligas carregadas." : "Crie ou entre em uma liga." });
      } catch (error) {
        if (cancelled) return;
        setDataState({
          loading: false,
          message: `${error.message} Nao foi possivel carregar suas ligas.`,
        });
      }
    }

    loadRemoteData();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, sessionToken, setDataState, setProfile, setLeagues, setPublicLeagues, setActiveLeagueId, setFixtures, setPredictions, setBonusPredictions, setMembersByLeague]);

  const users = useMemo(() => {
    if (!currentUser || !activeLeague?.id) return [];
    const leagueMembers = membersByLeague[activeLeague.id] || [];
    const withoutCurrent = leagueMembers.filter((user) => user.id !== currentUser.id);
    return [currentUser, ...withoutCurrent];
  }, [activeLeague?.id, currentUser, membersByLeague]);

  const leaguePredictions = predictions.filter((prediction) => prediction.leagueId === activeLeague?.id);
  const userPredictions = leaguePredictions.filter((prediction) => prediction.userId === currentUser?.id);
  const ranking = useMemo(
    () => buildRanking(users, fixtures, leaguePredictions, activeLeague?.settings || DEFAULT_SCORING),
    [users, fixtures, leaguePredictions, activeLeague?.settings],
  );
  const profileRank = ranking.find((item) => item.id === currentUser?.id);

  async function handlePlayerAuth(payload, mode) {
    await authPlayerAuth(payload, mode);
    setLeagues([]);
    setPublicLeagues([]);
    setActiveLeagueId(null);
    setPredictions([]);
    setMembersByLeague({});
    setActiveTab("home");
  }

  async function savePrediction(fixture, form) {
    try {
      await predictionsSavePrediction(fixture, form);
      addToast("Palpite salvo com sucesso!", "success");
    } catch (error) {
      addToast(error.message || "Erro ao salvar palpite", "error");
      throw error;
    }
  }

  async function saveBonusPrediction(form) {
    try {
      await predictionsSaveBonusPrediction(form);
      addToast("Palpites bonus salvos com sucesso!", "success");
    } catch (error) {
      addToast(error.message || "Erro ao salvar palpites bonus", "error");
      throw error;
    }
  }

  async function createLeague(name, isPublic = false) {
    try {
      await leaguesCreateLeague(name, isPublic);
      setActiveTab("league");
      addToast("Liga criada com sucesso!", "success");
    } catch (error) {
      addToast(error.message || "Erro ao criar liga", "error");
    }
  }

  async function joinLeague(code) {
    try {
      const league = await leaguesJoinLeague(code);
      addToast(`Entrou na liga ${league.name}!`, "success");
      return "Voce entrou na liga.";
    } catch (error) {
      addToast(error.message || "Codigo invalido", "error");
      return error.message;
    }
  }

  async function joinPublicLeague(leagueId) {
    try {
      const league = await leaguesJoinPublicLeague(leagueId);
      addToast(`Entrou na liga ${league.name}!`, "success");
      return "Voce entrou na liga.";
    } catch (error) {
      addToast(error.message || "Nao foi possivel entrar na liga", "error");
      return error.message;
    }
  }

  async function updateProfile(draft) {
    setDataState({ loading: true, message: "Salvando perfil..." });
    try {
      await authUpdateProfile(draft);
      addToast("Perfil salvo com sucesso!", "success");
      setDataState({ loading: false, message: "Perfil salvo." });
    } catch (error) {
      addToast(error.message || "Erro ao salvar perfil", "error");
      setDataState({
        loading: false,
        message: `${error.message} Nao foi possivel salvar o perfil.`,
      });
    }
  }

  useEffect(() => {
    if (!profile) return undefined;

    let busy = false;

    async function runAutoSync() {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      try {
        await handleSync("api-football", { automatic: true, silent: true });
      } catch {
        // silently fail on auto sync
      }
      busy = false;
    }

    runAutoSync();
    const interval = window.setInterval(runAutoSync, AUTO_SYNC_INTERVAL_MS);
    const onFocus = () => runAutoSync();
    const onVisibility = () => {
      if (document.visibilityState === "visible") runAutoSync();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [handleSync, profile]);

  async function handleLogout() {
    await authLogout();
    setLeagues([]);
    setPublicLeagues([]);
    setActiveLeagueId(null);
    setPredictions([]);
    setBonusPredictions([]);
    setMembersByLeague({});
    setDataState({ loading: false, message: "" });
  }

  const value = {
    profile,
    currentUser,
    activeTab,
    setActiveTab,
    leagues,
    publicLeagues,
    activeLeague,
    activeLeagueId,
    setActiveLeagueId,
    fixtures,
    predictions,
    bonusPredictions,
    userPredictions,
    leaguePredictions,
    membersByLeague,
    users,
    ranking,
    profileRank,
    sessionToken,
    syncState,
    dataState,
    lastSync,
    handlePlayerAuth,
    savePrediction,
    saveBonusPrediction,
    createLeague,
    joinLeague,
    joinPublicLeague,
    handleSync,
    updateProfile,
    handleLogout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
