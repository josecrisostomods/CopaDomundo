import { useState, useEffect, useCallback } from "react";
import { STORAGE } from "../config/appConfig";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { readStorage, writeStorage } from "../lib/storage";
import {
  loginPlayer,
  logoutPlayer,
  registerPlayer,
  resetPlayerCredentials,
  rotateRecoveryCode,
  upsertProfile,
} from "../services/supabaseData";

function getInitialProfile() {
  const storedSession = readStorage(STORAGE.session, null);
  if (!storedSession) return null;

  const storedProfile = readStorage(STORAGE.profile, null);
  return storedProfile?.id === "user-demo" ? null : storedProfile;
}

function getInitialSessionToken() {
  return readStorage(STORAGE.session, null);
}

export function useAuth() {
  const [profile, setProfile] = useState(getInitialProfile);
  const [sessionToken, setSessionToken] = useState(getInitialSessionToken);
  const [recoveryCode, setRecoveryCode] = useState(null);

  useEffect(() => writeStorage(STORAGE.profile, profile), [profile]);
  useEffect(() => writeStorage(STORAGE.session, sessionToken), [sessionToken]);

  async function handlePlayerAuth(payload, mode) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Login indisponivel no momento.");
    }

    if (!payload.username || !payload.password) {
      throw new Error("Informe usuario e senha.");
    }

    if (mode === "recover" && !payload.recoveryCode) {
      throw new Error("Informe o codigo de validacao.");
    }

    const result =
      mode === "register"
        ? await registerPlayer(payload)
        : mode === "recover"
        ? await resetPlayerCredentials(payload)
        : await loginPlayer(payload);
    let nextRecoveryCode = result.recoveryCode || null;

    if (mode === "register" && !nextRecoveryCode) {
      try {
        nextRecoveryCode = await rotateRecoveryCode(result.sessionToken);
      } catch {
        nextRecoveryCode = null;
      }
    }

    setSessionToken(result.sessionToken);
    setProfile(result.profile);
    setRecoveryCode(nextRecoveryCode);
    return result;
  }

  async function updateProfile(draft) {
    if (!profile) return null;
    const saved = await upsertProfile(draft, sessionToken);
    setProfile((prev) => ({ ...prev, ...saved }));
    return saved;
  }

  async function generateRecoveryCode() {
    if (!sessionToken) throw new Error("Sessao invalida.");
    const code = await rotateRecoveryCode(sessionToken);
    setRecoveryCode(code);
    return code;
  }

  const handleLogout = useCallback(async function handleLogout() {
    await logoutPlayer(sessionToken);
    setProfile(null);
    setSessionToken(null);
    setRecoveryCode(null);
  }, [sessionToken]);

  return {
    profile,
    setProfile,
    sessionToken,
    recoveryCode,
    clearRecoveryCode: () => setRecoveryCode(null),
    generateRecoveryCode,
    handlePlayerAuth,
    updateProfile,
    handleLogout,
  };
}
