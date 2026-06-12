import { useState, useEffect, useCallback } from "react";
import { STORAGE, FIXTURE_DATA_VERSION } from "../config/appConfig";
import { readStorage, writeStorage } from "../lib/storage";
import { MOCK_FIXTURES } from "../data/mockWorldCup";
import { isFixtureClosed } from "../lib/scoring";
import { syncFixtures } from "../services/fixtureApi";

function getInitialFixtures() {
  const storedVersion = readStorage(STORAGE.fixturesVersion, null);
  if (storedVersion !== FIXTURE_DATA_VERSION) return MOCK_FIXTURES;

  const storedFixtures = readStorage(STORAGE.fixtures, null);
  if (!Array.isArray(storedFixtures) || !storedFixtures.length) return MOCK_FIXTURES;

  const hasOpenScheduledGame = storedFixtures.some(
    (fixture) => fixture.status === "SCHEDULED" && !isFixtureClosed(fixture),
  );

  return hasOpenScheduledGame ? storedFixtures : MOCK_FIXTURES;
}

export function useFixtures() {
  const [fixtures, setFixtures] = useState(getInitialFixtures);
  const [syncState, setSyncState] = useState({ loading: false, message: "" });
  const [lastSync, setLastSync] = useState(() => readStorage(STORAGE.lastSync, null));

  useEffect(() => {
    writeStorage(STORAGE.fixtures, fixtures);
    writeStorage(STORAGE.fixturesVersion, FIXTURE_DATA_VERSION);
  }, [fixtures]);

  useEffect(() => writeStorage(STORAGE.lastSync, lastSync), [lastSync]);

  const handleSync = useCallback(async (provider = "api-football", options = {}) => {
    const { automatic = false, silent = false } = options;

    if (!silent) {
      setSyncState({ loading: true, message: "Sincronizando jogos..." });
    }

    try {
      const payload = await syncFixtures(provider);
      if (!payload.fixtures?.length) {
        if (!silent) {
          setSyncState({ loading: false, message: "A API respondeu, mas nao retornou jogos." });
        }
        return null;
      }

      setFixtures(payload.fixtures);
      const syncedAt = payload.syncedAt || new Date().toISOString();
      setLastSync(syncedAt);
      setSyncState({
        loading: false,
        message: automatic
          ? `Partidas atualizadas automaticamente.`
          : `${payload.fixtures.length} jogos importados de ${payload.provider}.`,
      });
      return payload.fixtures;
    } catch (error) {
      if (!silent) {
        setSyncState({
          loading: false,
          message: `${error.message} O calendario salvo continua disponivel.`,
        });
      }
      throw error;
    }
  }, []);

  return {
    fixtures,
    setFixtures,
    syncState,
    setSyncState,
    lastSync,
    handleSync,
  };
}
