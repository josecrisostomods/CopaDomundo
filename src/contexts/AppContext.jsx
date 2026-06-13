import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { AUTO_SYNC_INTERVAL_MS } from "../config/appConfig";
import { useToast } from "../components/Toast.jsx";
import { isSupabaseConfigured } from "../lib/supabase";
import { DEFAULT_SCORING, buildRanking } from "../lib/scoring";
import {
  createAdminRemoteLeague,
  deleteRemoteLeague,
  deleteRemoteUser,
  fetchAdminState,
  fetchRemoteState,
  updateRemoteFixtureResult,
} from "../services/supabaseData";

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
  const [adminState, setAdminState] = useState({ loading: false, users: [], leagues: [], totals: {}, message: "" });
  
  const {
    profile,
    setProfile,
    sessionToken,
    recoveryCode,
    clearRecoveryCode,
    generateRecoveryCode,
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

        if (remote.profile.isAdmin) {
          setAdminState((current) => ({ ...current, loading: true, message: "Carregando painel admin..." }));
          try {
            const remoteAdmin = await fetchAdminState(sessionToken);
            if (!cancelled) setAdminState({ ...remoteAdmin, loading: false, message: "Painel admin carregado." });
          } catch (adminError) {
            if (!cancelled) {
              setAdminState((current) => ({
                ...current,
                loading: false,
                message: adminError.message || "Nao foi possivel carregar o painel admin.",
              }));
            }
          }
        } else {
          setAdminState({ loading: false, users: [], leagues: [], totals: {}, message: "" });
        }
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

  useEffect(() => {
    if (activeTab === "admin" && !currentUser?.isAdmin) {
      setActiveTab("home");
    }
  }, [activeTab, currentUser?.isAdmin]);

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

  async function handleGenerateRecoveryCode() {
    try {
      await generateRecoveryCode();
      addToast("Codigo de validacao gerado.", "success");
    } catch (error) {
      addToast(error.message || "Nao foi possivel gerar o codigo", "error");
      throw error;
    }
  }

  async function refreshAdminState() {
    if (!currentUser?.isAdmin || !sessionToken) return null;

    setAdminState((current) => ({ ...current, loading: true, message: "Atualizando painel admin..." }));

    try {
      const remoteAdmin = await fetchAdminState(sessionToken);
      setAdminState({ ...remoteAdmin, loading: false, message: "Painel admin atualizado." });
      return remoteAdmin;
    } catch (error) {
      setAdminState((current) => ({
        ...current,
        loading: false,
        message: error.message || "Nao foi possivel atualizar o painel admin.",
      }));
      addToast(error.message || "Nao foi possivel atualizar o painel admin", "error");
      throw error;
    }
  }

  async function adminUpdateFixtureResult(payload) {
    try {
      const savedFixture = await updateRemoteFixtureResult(payload, sessionToken);

      setFixtures((items) =>
        items.map((fixture) =>
          fixture.id === savedFixture.id
            ? {
                ...fixture,
                status: savedFixture.status,
                homeScore: savedFixture.home_score,
                awayScore: savedFixture.away_score,
                winner: savedFixture.winner_team_id,
                classificationMethod: savedFixture.classification_method,
              }
            : fixture,
        ),
      );
      addToast("Resultado atualizado.", "success");
      return savedFixture;
    } catch (error) {
      addToast(error.message || "Nao foi possivel atualizar o resultado", "error");
      throw error;
    }
  }

  async function adminCreateLeague(name, isPublic) {
    try {
      const league = await createAdminRemoteLeague(name, sessionToken, isPublic);
      setLeagues((items) => [league, ...items.filter((item) => item.id !== league.id)]);
      setActiveLeagueId(league.id);
      await refreshAdminState();
      addToast("Liga criada pelo admin.", "success");
      return league;
    } catch (error) {
      addToast(error.message || "Nao foi possivel criar a liga", "error");
      throw error;
    }
  }

  async function adminDeleteUser(userId) {
    try {
      await deleteRemoteUser(userId, sessionToken);
      setPredictions((items) => items.filter((prediction) => prediction.userId !== userId));
      setBonusPredictions((items) => items.filter((prediction) => prediction.userId !== userId));
      setMembersByLeague((items) =>
        Object.fromEntries(
          Object.entries(items).map(([leagueId, members]) => [
            leagueId,
            members.filter((member) => member.id !== userId),
          ]),
        ),
      );
      await refreshAdminState();
      addToast("Usuario excluido.", "success");
    } catch (error) {
      addToast(error.message || "Nao foi possivel excluir o usuario", "error");
      throw error;
    }
  }

  async function adminDeleteLeague(leagueId) {
    try {
      await deleteRemoteLeague(leagueId, sessionToken);
      const remainingLeagues = leagues.filter((league) => league.id !== leagueId);
      setLeagues(remainingLeagues);
      setPublicLeagues((items) => items.filter((league) => league.id !== leagueId));
      setPredictions((items) => items.filter((prediction) => prediction.leagueId !== leagueId));
      setBonusPredictions((items) => items.filter((prediction) => prediction.leagueId !== leagueId));
      setMembersByLeague((items) => {
        const next = { ...items };
        delete next[leagueId];
        return next;
      });
      setActiveLeagueId((current) => (current === leagueId ? remainingLeagues[0]?.id || null : current));
      await refreshAdminState();
      addToast("Liga excluida.", "success");
    } catch (error) {
      addToast(error.message || "Nao foi possivel excluir a liga", "error");
      throw error;
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
    setAdminState({ loading: false, users: [], leagues: [], totals: {}, message: "" });
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
    adminState,
    sessionToken,
    recoveryCode,
    clearRecoveryCode,
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
    generateRecoveryCode: handleGenerateRecoveryCode,
    refreshAdminState,
    adminUpdateFixtureResult,
    adminCreateLeague,
    adminDeleteUser,
    adminDeleteLeague,
    handleLogout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
