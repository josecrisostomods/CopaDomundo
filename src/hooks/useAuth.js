import { useState, useEffect } from "react";
import { STORAGE } from "../config/appConfig";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { readStorage, writeStorage } from "../lib/storage";
import {
  loginPlayer,
  logoutPlayer,
  registerPlayer,
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

  useEffect(() => writeStorage(STORAGE.profile, profile), [profile]);
  useEffect(() => writeStorage(STORAGE.session, sessionToken), [sessionToken]);

  async function handlePlayerAuth(payload, mode) {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Login indisponivel no momento.");
    }

    if (!payload.username || !payload.password) {
      throw new Error("Informe usuario e senha.");
    }

    const result = mode === "register" ? await registerPlayer(payload) : await loginPlayer(payload);
    setSessionToken(result.sessionToken);
    setProfile(result.profile);
    return result;
  }

  async function updateProfile(draft) {
    if (!profile) return null;
    const saved = await upsertProfile(draft, sessionToken);
    setProfile((prev) => ({ ...prev, ...saved }));
    return saved;
  }

  async function handleLogout() {
    await logoutPlayer(sessionToken);
    setProfile(null);
    setSessionToken(null);
  }

  return {
    profile,
    setProfile,
    sessionToken,
    handlePlayerAuth,
    updateProfile,
    handleLogout,
  };
}
