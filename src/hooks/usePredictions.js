import { useState, useEffect } from "react";
import { STORAGE } from "../config/appConfig";
import { readStorage, writeStorage, makeId } from "../lib/storage";
import { isSupabaseConfigured } from "../lib/supabase";
import { saveRemotePrediction } from "../services/supabaseData";

function getInitialPredictions() {
  const storedPredictions = readStorage(STORAGE.predictions, []);
  if (!Array.isArray(storedPredictions)) return [];
  return storedPredictions.filter((prediction) => prediction.leagueId !== "league-demo");
}

export function usePredictions(sessionToken, currentUser, activeLeague) {
  const [predictions, setPredictions] = useState(getInitialPredictions);

  useEffect(() => writeStorage(STORAGE.predictions, predictions), [predictions]);

  async function savePrediction(fixture, form) {
    if (!activeLeague || !currentUser) {
      throw new Error("Entre em uma liga antes de enviar palpites.");
    }

    const existing = predictions.find(
      (prediction) =>
        prediction.fixtureId === fixture.id &&
        prediction.userId === currentUser.id &&
        prediction.leagueId === activeLeague.id,
    );

    const nextPrediction = {
      id: existing?.id || makeId("prediction"),
      leagueId: activeLeague.id,
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
        const saved = await saveRemotePrediction(nextPrediction, sessionToken);
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

  return {
    predictions,
    setPredictions,
    savePrediction,
  };
}
