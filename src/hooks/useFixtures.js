import { useState, useEffect, useCallback } from "react";
import { STORAGE, FIXTURE_DATA_VERSION, WORLD_CUP_FIXTURE_COUNT } from "../config/appConfig";
import { readStorage, writeStorage } from "../lib/storage";
import { MOCK_FIXTURES } from "../data/mockWorldCup";
import { mergeFixtureLists } from "../lib/fixtures";
import { syncFixtures } from "../services/fixtureApi";

function getInitialFixtures() {
  const storedVersion = readStorage(STORAGE.fixturesVersion, null);
  if (storedVersion !== FIXTURE_DATA_VERSION) return MOCK_FIXTURES;

  const storedFixtures = readStorage(STORAGE.fixtures, null);
  if (!Array.isArray(storedFixtures) || !storedFixtures.length) return MOCK_FIXTURES;

  return mergeFixtureLists(MOCK_FIXTURES, storedFixtures);
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

      if (payload.fallback) {
        setFixtures((current) => mergeFixtureLists(payload.fixtures, current));
        const syncedAt = payload.syncedAt || new Date().toISOString();
        setLastSync(syncedAt);
        if (!silent) {
          setSyncState({
            loading: false,
            message: `Calendario completo com ${WORLD_CUP_FIXTURE_COUNT} jogos. Configure a API para atualizar placares.`,
          });
        }
        return payload.fixtures;
      }

      if (payload.fixtures.length < WORLD_CUP_FIXTURE_COUNT) {
        setFixtures((current) =>
          mergeFixtureLists(mergeFixtureLists(MOCK_FIXTURES, current), payload.fixtures),
        );
        const syncedAt = payload.syncedAt || new Date().toISOString();
        setLastSync(syncedAt);
        if (!silent) {
          setSyncState({
            loading: false,
            message: `${payload.fixtures.length} jogo(s) atualizado(s). Os ${WORLD_CUP_FIXTURE_COUNT} jogos foram mantidos.`,
          });
        }
        return payload.fixtures;
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
