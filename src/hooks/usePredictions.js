import { useState, useEffect } from "react";
import { STORAGE } from "../config/appConfig";
import { readStorage, writeStorage, makeId } from "../lib/storage";
import { isSupabaseConfigured } from "../lib/supabase";
import { saveRemotePrediction, saveRemoteBonusPrediction } from "../services/supabaseData";

function normalizeStoredPredictions(items) {
  const byUserAndFixture = new Map();

  for (const prediction of items) {
    if (prediction.leagueId === "league-demo") continue;
    const key = `${prediction.userId}:${prediction.fixtureId}`;
    const current = byUserAndFixture.get(key);
    const currentTime = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
    const nextTime = prediction.updatedAt ? new Date(prediction.updatedAt).getTime() : 0;

    if (!current || nextTime >= currentTime) {
      byUserAndFixture.set(key, { ...prediction, leagueId: null });
    }
  }

  return Array.from(byUserAndFixture.values());
}

function getInitialPredictions() {
  const storedPredictions = readStorage(STORAGE.predictions, []);
  if (!Array.isArray(storedPredictions)) return [];
  return normalizeStoredPredictions(storedPredictions);
}

export function usePredictions(sessionToken, currentUser, activeLeague) {
  const [predictions, setPredictions] = useState(getInitialPredictions);
  const [bonusPredictions, setBonusPredictions] = useState([]);

  useEffect(() => writeStorage(STORAGE.predictions, predictions), [predictions]);

  async function savePrediction(fixture, form) {
    if (!currentUser) {
      throw new Error("Entre na sua conta antes de enviar palpites.");
    }

    const existing = predictions.find(
      (prediction) =>
        prediction.fixtureId === fixture.id &&
        prediction.userId === currentUser.id,
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
      topScorerName: form.topScorerName || null,
      revelationName: form.revelationName || null,
      updatedAt: new Date().toISOString(),
    };

    const previousBonus = bonusPredictions;
    setBonusPredictions((items) => {
      const existing = items.find(i => i.leagueId === activeLeague.id && i.userId === currentUser.id);
      return existing
        ? items.map(i => (i === existing ? nextBonus : i))
        : [...items, nextBonus];
    });

    if (isSupabaseConfigured) {
      try {
        const saved = await saveRemoteBonusPrediction(nextBonus, sessionToken);
        setBonusPredictions((items) => {
          const existing = items.find(i => i.leagueId === activeLeague.id && i.userId === currentUser.id);
          return existing ? items.map(i => (i === existing ? saved : i)) : [...items, saved];
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
