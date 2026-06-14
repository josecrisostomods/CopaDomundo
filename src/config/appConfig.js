import { CalendarDays, Home, ShieldCheck, Star, Trophy, UserRound, UsersRound } from "lucide-react";

export const STORAGE = {
  profile: "copa-profile",
  session: "copa-session",
  leagues: "copa-leagues",
  activeLeague: "copa-active-league",
  fixtures: "copa-fixtures",
  fixturesVersion: "copa-fixtures-version",
  lastSync: "copa-last-sync",
  predictions: "copa-predictions",
};

export const FIXTURE_DATA_VERSION = "2026-pt-br-confirmed-results-v9";

export const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 1000;

export const navItems = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "games", label: "Jogos", icon: CalendarDays },
  { id: "bonus", label: "Bonus", icon: Star },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "league", label: "Liga", icon: UsersRound },
  { id: "profile", label: "Perfil", icon: UserRound },
  { id: "admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];

export const methodOptions = [
  { id: "NORMAL_TIME", label: "Tempo normal" },
  { id: "EXTRA_TIME", label: "Prorrogacao" },
  { id: "PENALTIES", label: "Penaltis" },
];
