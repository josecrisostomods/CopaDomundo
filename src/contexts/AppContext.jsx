import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { AUTO_SYNC_INTERVAL_MS } from "../config/appConfig";
import { useToast } from "../components/Toast.jsx";
import { isSupabaseConfigured } from "../lib/supabase";
import { applyKnockoutProgression, mergeFixtureLists } from "../lib/fixtures";
import { DEFAULT_SCORING, buildRanking } from "../lib/scoring";
import {
  createAdminRemoteLeague,
  deleteRemoteLeague,
  deleteRemoteUser,
  fetchAdminState,
  fetchRemoteState,
  updateRemoteFixtureResult,
  updateAdminRemoteLeague,
  upsertAdminRemotePlayer,
} from "../services/supabaseData";

import { useAuth } from "../hooks/useAuth";
import { useFixtures } from "../hooks/useFixtures";
import { useLeagues } from "../hooks/useLeagues";
import { usePredictions } from "../hooks/usePredictions";

const AppContext = createContext(null);

function avatarFor(name) {
  return (name || "??").slice(0, 2).toUpperCase();
}

function getPredictionTime(prediction) {
  return prediction?.updatedAt ? new Date(prediction.updatedAt).getTime() : 0;
}

function selectLeaguePredictions(predictions, activeLeague, users, currentUser) {
  if (!activeLeague) {
    return predictions.filter((prediction) => prediction.userId === currentUser?.id && !prediction.leagueId);
  }

  const leagueUserIds = new Set(users.map((user) => user.id));

  if (activeLeague.settings?.leagueScopedOnly) {
    return predictions.filter(
      (prediction) => prediction.leagueId === activeLeague.id && leagueUserIds.has(prediction.userId),
    );
  }

  const byUserAndFixture = new Map();

  for (const prediction of predictions) {
    if (!leagueUserIds.has(prediction.userId)) continue;
    if (prediction.leagueId && prediction.leagueId !== activeLeague.id) continue;

    const key = `${prediction.userId}:${prediction.fixtureId}`;
    const current = byUserAndFixture.get(key);
    const isLeaguePrediction = prediction.leagueId === activeLeague.id;
    const currentIsLeaguePrediction = current?.leagueId === activeLeague.id;

    if (
      !current ||
      (isLeaguePrediction && !currentIsLeaguePrediction) ||
      (isLeaguePrediction === currentIsLeaguePrediction && getPredictionTime(prediction) >= getPredictionTime(current))
    ) {
      byUserAndFixture.set(key, prediction);
    }
  }

  return Array.from(byUserAndFixture.values());
}

function localAdminStateFor({ leagues, membersByLeague, predictions, currentUser }) {
  const usersById = new Map();

  if (currentUser) usersById.set(currentUser.id, currentUser);

  for (const members of Object.values(membersByLeague || {})) {
    for (const member of members || []) {
      usersById.set(member.id, member);
    }
  }

  const users = Array.from(usersById.values()).map((user) => ({
    ...user,
    leagueCount: leagues.filter((league) =>
      (membersByLeague[league.id] || []).some((member) => member.id === user.id),
    ).length,
    predictionCount: predictions.filter((prediction) => prediction.userId === user.id).length,
  }));

  const adminLeagues = leagues.map((league) => {
    const members = membersByLeague[league.id] || [];
    const memberIds = new Set(members.map((member) => member.id));
    const predictionCount = predictions.filter((prediction) => {
      if (!memberIds.has(prediction.userId)) return false;
      if (league.settings?.leagueScopedOnly) return prediction.leagueId === league.id;
      return !prediction.leagueId || prediction.leagueId === league.id;
    }).length;

    return {
      ...league,
      ownerName: league.ownerId === currentUser?.id ? currentUser.name : "Sem dono",
      memberCount: members.length,
      predictionCount,
      members,
    };
  });

  return {
    loading: false,
    message: "Painel local.",
    users,
    leagues: adminLeagues,
    totals: { users: users.length, leagues: adminLeagues.length },
  };
}

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
    removeLeagueMember: leaguesRemoveLeagueMember,
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

        if (remote.fixtures.length > 0) {
          setFixtures((current) => mergeFixtureLists(current, remote.fixtures));
        }
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
        // Se a sessao expirou ou e invalida, forcar logout para voltar ao login
        if (error.message && error.message.includes('Sessao invalida')) {
          authLogout();
          setLeagues([]);
          setActiveLeagueId(null);
          setPredictions([]);
          setBonusPredictions([]);
          setMembersByLeague({});
        }
      }
    }

    loadRemoteData();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, sessionToken, authLogout, setDataState, setProfile, setLeagues, setPublicLeagues, setActiveLeagueId, setFixtures, setPredictions, setBonusPredictions, setMembersByLeague]);

  useEffect(() => {
    if (activeTab === "admin" && !currentUser?.isAdmin) {
      setActiveTab("home");
    }
  }, [activeTab, currentUser?.isAdmin]);

  const users = useMemo(() => {
    if (!currentUser) return [];
    if (!activeLeague?.id) return [currentUser];
    const leagueMembers = membersByLeague[activeLeague.id] || [];
    if (!leagueMembers.length) return [currentUser];
    if (!leagueMembers.some((user) => user.id === currentUser.id)) return leagueMembers;
    const withoutCurrent = leagueMembers.filter((user) => user.id !== currentUser.id);
    return [currentUser, ...withoutCurrent];
  }, [activeLeague?.id, currentUser, membersByLeague]);

  const leaguePredictions = useMemo(
    () => selectLeaguePredictions(predictions, activeLeague, users, currentUser),
    [predictions, activeLeague, users, currentUser],
  );
  const userPredictions = predictions.filter((prediction) => prediction.userId === currentUser?.id && !prediction.leagueId);
  const ranking = useMemo(
    () => buildRanking(users, fixtures, leaguePredictions, activeLeague?.settings || DEFAULT_SCORING),
    [users, fixtures, leaguePredictions, activeLeague?.settings],
  );
  const profileRank = ranking.find((item) => item.id === currentUser?.id);
  const displayedAdminState = useMemo(
    () =>
      isSupabaseConfigured
        ? adminState
        : localAdminStateFor({ leagues, membersByLeague, predictions, currentUser }),
    [adminState, leagues, membersByLeague, predictions, currentUser],
  );

  async function handlePlayerAuth(payload, mode) {
    await authPlayerAuth(payload, mode);
    setLeagues([]);
    setPublicLeagues([]);
    setActiveLeagueId(null);
    setPredictions([]);
    setBonusPredictions([]);
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

  async function removeLeagueMember(leagueId, userId) {
    try {
      await leaguesRemoveLeagueMember(leagueId, userId);
      setBonusPredictions((items) =>
        items.filter((prediction) => prediction.leagueId !== leagueId || prediction.userId !== userId),
      );
      addToast("Participante removido da liga.", "success");
    } catch (error) {
      addToast(error.message || "Nao foi possivel remover o participante", "error");
      throw error;
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

    if (!isSupabaseConfigured) {
      const localAdminState = localAdminStateFor({ leagues, membersByLeague, predictions, currentUser });
      setAdminState(localAdminState);
      return localAdminState;
    }

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

      setFixtures((items) => {
        const updatedFixtures = items.map((fixture) =>
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
        );

        return savedFixture.status === "FINISHED" && savedFixture.winner_team_id
          ? applyKnockoutProgression(updatedFixtures, savedFixture.id, savedFixture.winner_team_id)
          : updatedFixtures;
      });
      addToast("Resultado atualizado.", "success");
      return savedFixture;
    } catch (error) {
      addToast(error.message || "Nao foi possivel atualizar o resultado", "error");
      throw error;
    }
  }

  async function adminCreateLeague(name, isPublic) {
    try {
      if (!isSupabaseConfigured) {
        const league = await leaguesCreateLeague(name, isPublic);
        addToast("Liga criada pelo admin.", "success");
        return league;
      }

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
      if (!isSupabaseConfigured) {
        if (userId === currentUser?.id) throw new Error("Voce nao pode excluir sua propria conta.");
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
        addToast("Usuario excluido.", "success");
        return;
      }

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
      if (!isSupabaseConfigured) {
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
        addToast("Liga excluida.", "success");
        return;
      }

      await deleteRemoteLeague(leagueId, sessionToken);
      const remainingLeagues = leagues.filter((league) => league.id !== leagueId);
      setLeagues(remainingLeagues);
      setPublicLeagues((items) => items.filter((league) => league.id !== leagueId));
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

  async function adminUpdateLeague(payload) {
    try {
      if (!isSupabaseConfigured) {
        const savedLeague = {
          ...(leagues.find((league) => league.id === payload.leagueId) || {}),
          name: payload.name,
          isPublic: payload.isPublic,
        };
        setLeagues((items) =>
          items.map((league) =>
            league.id === payload.leagueId ? { ...league, name: payload.name, isPublic: payload.isPublic } : league,
          ),
        );
        setPublicLeagues((items) =>
          payload.isPublic
            ? [savedLeague, ...items.filter((league) => league.id !== payload.leagueId)]
            : items.filter((league) => league.id !== payload.leagueId),
        );
        addToast("Liga atualizada.", "success");
        return savedLeague;
      }

      const savedLeague = await updateAdminRemoteLeague(payload, sessionToken);
      setLeagues((items) =>
        items.map((league) =>
          league.id === savedLeague.id
            ? { ...league, name: savedLeague.name, isPublic: savedLeague.isPublic }
            : league,
        ),
      );
      setPublicLeagues((items) =>
        savedLeague.isPublic
          ? [savedLeague, ...items.filter((league) => league.id !== savedLeague.id)]
          : items.filter((league) => league.id !== savedLeague.id),
      );
      await refreshAdminState();
      addToast("Liga atualizada.", "success");
      return savedLeague;
    } catch (error) {
      addToast(error.message || "Nao foi possivel atualizar a liga", "error");
      throw error;
    }
  }

  async function adminUpsertPlayer(payload) {
    try {
      if (!isSupabaseConfigured) {
        const username = payload.username.trim().toLowerCase();
        const savedPlayer = {
          id: `local-${username.replace(/[^a-z0-9]/g, "-")}`,
          username,
          name: payload.name.trim(),
          avatar: avatarFor(payload.name),
          role: payload.role || "player",
          isAdmin: payload.role === "admin",
          displayNameSet: true,
        };

        setMembersByLeague((items) =>
          Object.fromEntries(
            Object.entries(items).map(([leagueId, members]) => [
              leagueId,
              members.map((member) =>
                member.username === username || member.id === savedPlayer.id ? { ...member, ...savedPlayer } : member,
              ),
            ]),
          ),
        );
        addToast("Usuario atualizado no modo local.", "success");
        return savedPlayer;
      }

      const savedPlayer = await upsertAdminRemotePlayer(payload, sessionToken);
      await refreshAdminState();
      addToast("Usuario salvo.", "success");
      return savedPlayer;
    } catch (error) {
      addToast(error.message || "Nao foi possivel salvar o usuario", "error");
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
    adminState: displayedAdminState,
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
    removeLeagueMember,
    handleSync,
    updateProfile,
    generateRecoveryCode: handleGenerateRecoveryCode,
    refreshAdminState,
    adminUpdateFixtureResult,
    adminCreateLeague,
    adminUpdateLeague,
    adminUpsertPlayer,
    adminDeleteUser,
    adminDeleteLeague,
    handleLogout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
