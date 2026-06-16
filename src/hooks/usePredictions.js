import { useState, useEffect } from "react";
import { STORAGE } from "../config/appConfig";
import { readStorage, writeStorage, makeId } from "../lib/storage";
import { isSupabaseConfigured } from "../lib/supabase";
import { saveRemotePrediction, saveRemoteBonusPrediction } from "../services/supabaseData";
import { REIS_DO_PITACO_SEED } from "../data/reisDoPitacoSeed.js";

function seedReisPredictions() {
  return REIS_DO_PITACO_SEED.predictions.map((prediction) => ({
    id: `reis-${prediction.userId}-${prediction.fixtureId}`,
    leagueId: REIS_DO_PITACO_SEED.league.id,
    userId: prediction.userId,
    fixtureId: prediction.fixtureId,
    normalOutcome: prediction.normalOutcome,
    homeScore: prediction.homeScore,
    awayScore: prediction.awayScore,
    qualifier: null,
    qualificationMethod: null,
    extraHomeScore: null,
    extraAwayScore: null,
    penaltiesHome: null,
    penaltiesAway: null,
    sheetPoints: prediction.sheetPoints,
    updatedAt: "2026-06-16T00:00:00.000Z",
  }));
}

function normalizeStoredPredictions(items) {
  const byScopeUserAndFixture = new Map();

  for (const prediction of items) {
    if (prediction.leagueId === "league-demo") continue;
    const leagueId = prediction.leagueId || null;
    const key = `${leagueId || "global"}:${prediction.userId}:${prediction.fixtureId}`;
    const current = byScopeUserAndFixture.get(key);
    const currentTime = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
    const nextTime = prediction.updatedAt ? new Date(prediction.updatedAt).getTime() : 0;

    if (!current || nextTime >= currentTime) {
      byScopeUserAndFixture.set(key, { ...prediction, leagueId });
    }
  }

  for (const prediction of seedReisPredictions()) {
    const key = `${prediction.leagueId}:${prediction.userId}:${prediction.fixtureId}`;
    if (!byScopeUserAndFixture.has(key)) {
      byScopeUserAndFixture.set(key, prediction);
    }
  }

  return Array.from(byScopeUserAndFixture.values());
}

function getInitialPredictions() {
  const storedPredictions = readStorage(STORAGE.predictions, []);
  if (!Array.isArray(storedPredictions)) return [];
  return normalizeStoredPredictions(storedPredictions);
}

function normalizeStoredBonusPredictions(items) {
  const byUserAndLeague = new Map();

  for (const bonus of items) {
    if (!bonus?.leagueId || !bonus?.userId || bonus.leagueId === "league-demo") continue;

    const key = `${bonus.leagueId}:${bonus.userId}`;
    const current = byUserAndLeague.get(key);
    const currentTime = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
    const nextTime = bonus.updatedAt ? new Date(bonus.updatedAt).getTime() : 0;

    if (!current || nextTime >= currentTime) {
      byUserAndLeague.set(key, bonus);
    }
  }

  return Array.from(byUserAndLeague.values());
}

function getInitialBonusPredictions() {
  const storedBonusPredictions = readStorage(STORAGE.bonusPredictions, []);
  if (!Array.isArray(storedBonusPredictions)) return [];
  return normalizeStoredBonusPredictions(storedBonusPredictions);
}

export function usePredictions(sessionToken, currentUser, activeLeague) {
  const [predictions, setPredictions] = useState(getInitialPredictions);
  const [bonusPredictions, setBonusPredictions] = useState(getInitialBonusPredictions);

  useEffect(() => writeStorage(STORAGE.predictions, predictions), [predictions]);
  useEffect(() => writeStorage(STORAGE.bonusPredictions, bonusPredictions), [bonusPredictions]);

  async function savePrediction(fixture, form) {
    if (!currentUser) {
      throw new Error("Entre na sua conta antes de enviar palpites.");
    }

    const existing = predictions.find(
      (prediction) =>
        prediction.fixtureId === fixture.id &&
        prediction.userId === currentUser.id &&
        !prediction.leagueId,
    );

    const nextPrediction = {
      id: existing?.id || makeId("prediction"),
      leagueId: null,
      userId: currentUser.id,
      fixtureId: fixture.id,
      normalOutcome: form.normalOutcome,
      homeScore: Number(form.homeScore),
      awayScore: Number(form.awayScore),
      qualifier: fixture.stageType === "KNOCKOUT" ? form.qualifier : null,
      qualificationMethod: fixture.stageType === "KNOCKOUT" ? form.qualificationMethod : null,
      extraHomeScore: form.extraHomeScore === "" ? null : Number(form.extraHomeScore),
      extraAwayScore: form.extraAwayScore === "" ? null : Number(form.extraAwayScore),
      penaltiesHome: form.penaltiesHome === "" ? null : Number(form.penaltiesHome),
      penaltiesAway: form.penaltiesAway === "" ? null : Number(form.penaltiesAway),
      updatedAt: new Date().toISOString(),
    };

    const previousPredictions = predictions;
    setPredictions((items) =>
      existing
        ? items.map((item) => (item.id === existing.id ? nextPrediction : item))
        : [nextPrediction, ...items],
    );

    if (isSupabaseConfigured) {
      try {
        const saved = await saveRemotePrediction(nextPrediction, sessionToken, fixture);
        setPredictions((items) =>
          items.map((item) => (item.id === nextPrediction.id ? saved : item)),
        );
        return saved;
      } catch (error) {
        setPredictions(previousPredictions);
        throw error;
      }
    }
    return nextPrediction;
  }

  async function saveBonusPrediction(form) {
    if (!activeLeague || !currentUser) {
      throw new Error("Entre em uma liga antes de enviar palpites bonus.");
    }

    const nextBonus = {
      leagueId: activeLeague.id,
      userId: currentUser.id,
      championTeamId: form.championTeamId || null,
      topScorerName: form.topScorerName?.trim() || null,
      revelationName: form.revelationName?.trim() || null,
      updatedAt: new Date().toISOString(),
    };

    const previousBonus = bonusPredictions;
    setBonusPredictions((items) => {
      const existing = items.find((item) => item.leagueId === activeLeague.id && item.userId === currentUser.id);
      return existing
        ? items.map((item) => (item === existing ? nextBonus : item))
        : [...items, nextBonus];
    });

    if (isSupabaseConfigured) {
      try {
        const saved = await saveRemoteBonusPrediction(nextBonus, sessionToken);
        setBonusPredictions((items) => {
          const existing = items.find((item) => item.leagueId === activeLeague.id && item.userId === currentUser.id);
          return existing ? items.map((item) => (item === existing ? saved : item)) : [...items, saved];
        });
        return saved;
      } catch (error) {
        setBonusPredictions(previousBonus);
        throw error;
      }
    }
    return nextBonus;
  }

  return {
    predictions,
    setPredictions,
    bonusPredictions,
    setBonusPredictions,
    savePrediction,
    saveBonusPrediction,
  };
}
