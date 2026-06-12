import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Cloud,
  Crown,
  Edit3,
  Gauge,
  Home,
  Link2,
  ListChecks,
  Lock,
  Medal,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import {
  DEMO_LEAGUE,
  DEMO_PREDICTIONS,
  DEMO_USERS,
  MOCK_FIXTURES,
} from "./data/mockWorldCup";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { makeId, readStorage, writeStorage } from "./lib/storage";
import {
  DEFAULT_SCORING,
  buildRanking,
  getNormalOutcome,
  isFixtureClosed,
  scorePrediction,
} from "./lib/scoring";
import { syncFixtures } from "./services/fixtureApi";
import {
  createRemoteLeague,
  fetchRemoteState,
  joinRemoteLeague,
  saveRemotePrediction,
  upsertProfile,
} from "./services/supabaseData";

const STORAGE = {
  profile: "copa-profile",
  leagues: "copa-leagues",
  activeLeague: "copa-active-league",
  fixtures: "copa-fixtures",
  fixturesVersion: "copa-fixtures-version",
  lastSync: "copa-last-sync",
  predictions: "copa-predictions",
};

const FIXTURE_DATA_VERSION = "2026-pt-br-confirmed-results-v6";
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

const navItems = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "games", label: "Jogos", icon: CalendarDays },
  { id: "ranking", label: "Ranking", icon: Trophy },
  { id: "league", label: "Liga", icon: UsersRound },
  { id: "admin", label: "Admin", icon: Settings },
];

const methodOptions = [
  { id: "NORMAL_TIME", label: "Tempo normal" },
  { id: "EXTRA_TIME", label: "Prorrogacao" },
  { id: "PENALTIES", label: "Penaltis" },
];

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

function formatDate(dateString) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatTime(dateString) {
  if (!dateString) return "Pendente";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function statusLabel(status) {
  const labels = {
    SCHEDULED: "Aberto",
    LIVE: "Ao vivo",
    FINISHED: "Finalizado",
    POSTPONED: "Adiado",
    CANCELLED: "Cancelado",
  };

  return labels[status] || status;
}

function outcomeLabel(outcome, fixture) {
  const labels = {
    HOME: fixture?.home?.name || "Time A",
    DRAW: "Empate",
    AWAY: fixture?.away?.name || "Time B",
  };

  return labels[outcome] || "Sem palpite";
}

function methodLabel(method) {
  return methodOptions.find((item) => item.id === method)?.label || "A definir";
}

function App() {
  const [profile, setProfile] = useState(() => readStorage(STORAGE.profile, null));
  const [activeTab, setActiveTab] = useState("home");
  const [leagues, setLeagues] = useState(() => readStorage(STORAGE.leagues, [DEMO_LEAGUE]));
  const [activeLeagueId, setActiveLeagueId] = useState(() =>
    readStorage(STORAGE.activeLeague, DEMO_LEAGUE.id),
  );
  const [fixtures, setFixtures] = useState(getInitialFixtures);
  const [predictions, setPredictions] = useState(() =>
    readStorage(STORAGE.predictions, DEMO_PREDICTIONS),
  );
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [syncState, setSyncState] = useState({ loading: false, message: "" });
  const [dataState, setDataState] = useState({ loading: false, message: "" });
  const [lastSync, setLastSync] = useState(() => readStorage(STORAGE.lastSync, null));

  useEffect(() => writeStorage(STORAGE.profile, profile), [profile]);
  useEffect(() => writeStorage(STORAGE.leagues, leagues), [leagues]);
  useEffect(() => writeStorage(STORAGE.activeLeague, activeLeagueId), [activeLeagueId]);
  useEffect(() => {
    writeStorage(STORAGE.fixtures, fixtures);
    writeStorage(STORAGE.fixturesVersion, FIXTURE_DATA_VERSION);
  }, [fixtures]);
  useEffect(() => writeStorage(STORAGE.lastSync, lastSync), [lastSync]);
  useEffect(() => writeStorage(STORAGE.predictions, predictions), [predictions]);

  const activeLeague = leagues.find((league) => league.id === activeLeagueId) || leagues[0];
  const currentUser = profile || DEMO_USERS[0];
  useEffect(() => {
    if (!profile || !isSupabaseConfigured) return undefined;

    let cancelled = false;

    async function loadRemoteData() {
      setDataState({ loading: true, message: "Carregando dados do Supabase..." });
      try {
        await upsertProfile(profile);
        let remote = await fetchRemoteState();

        if (!remote.leagues.length) {
          const firstLeague = await createRemoteLeague("Bolao da turma");
          remote = { ...remote, leagues: [firstLeague] };
        }

        if (cancelled) return;

        if (remote.leagues.length) {
          setLeagues(remote.leagues);
          setActiveLeagueId((current) =>
            remote.leagues.some((league) => league.id === current) ? current : remote.leagues[0].id,
          );
        }

        if (remote.fixtures.length) setFixtures(remote.fixtures);
        setPredictions(remote.predictions);
        setRemoteUsers(remote.users);
        setDataState({ loading: false, message: "Dados conectados ao Supabase." });
      } catch (error) {
        if (cancelled) return;
        setDataState({
          loading: false,
          message: `${error.message} O modo local continua funcionando.`,
        });
      }
    }

    loadRemoteData();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const users = useMemo(() => {
    const baseUsers = remoteUsers.length
      ? remoteUsers
      : DEMO_USERS.filter((user) => user.id !== "user-demo");
    const withoutCurrent = baseUsers.filter((user) => user.id !== currentUser.id);
    return [currentUser, ...withoutCurrent];
  }, [currentUser, remoteUsers]);
  const leaguePredictions = predictions.filter((prediction) => prediction.leagueId === activeLeague?.id);
  const userPredictions = leaguePredictions.filter((prediction) => prediction.userId === currentUser.id);
  const ranking = useMemo(
    () => buildRanking(users, fixtures, leaguePredictions, DEFAULT_SCORING),
    [users, fixtures, leaguePredictions],
  );
  const profileRank = ranking.find((item) => item.id === currentUser.id);

  function handleLocalLogin(payload) {
    setProfile({
      id: "user-demo",
      name: payload.name || "Voce",
      email: payload.email || "",
      avatar: (payload.name || "VC").slice(0, 2).toUpperCase(),
    });
  }

  async function handleSupabaseAuth(payload, mode) {
    if (!isSupabaseConfigured || !supabase) {
      handleLocalLogin(payload);
      return;
    }

    const authCall =
      mode === "register"
        ? supabase.auth.signUp({ email: payload.email, password: payload.password })
        : supabase.auth.signInWithPassword({ email: payload.email, password: payload.password });

    const { data, error } = await authCall;
    if (error) throw error;

    const name = payload.name || data.user?.email?.split("@")[0] || "Jogador";
    setProfile({
      id: data.user?.id || "user-demo",
      name,
      email: data.user?.email || payload.email,
      avatar: name.slice(0, 2).toUpperCase(),
    });
  }

  async function savePrediction(fixture, form) {
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

    setPredictions((items) =>
      existing
        ? items.map((item) => (item.id === existing.id ? nextPrediction : item))
        : [nextPrediction, ...items],
    );

    if (isSupabaseConfigured && activeLeague?.id !== DEMO_LEAGUE.id) {
      try {
        const saved = await saveRemotePrediction(nextPrediction);
        setPredictions((items) =>
          items.map((item) => (item.id === nextPrediction.id ? saved : item)),
        );
        setDataState({ loading: false, message: "Palpite salvo no Supabase." });
      } catch (error) {
        setDataState({
          loading: false,
          message: `${error.message} O palpite ficou salvo apenas neste navegador.`,
        });
      }
    }
  }

  async function createLeague(name) {
    if (isSupabaseConfigured) {
      setDataState({ loading: true, message: "Criando liga no Supabase..." });
      try {
        const league = await createRemoteLeague(name);
        setLeagues((items) => [league, ...items.filter((item) => item.id !== league.id)]);
        setActiveLeagueId(league.id);
        setActiveTab("league");
        setDataState({ loading: false, message: "Liga criada no Supabase." });
        return;
      } catch (error) {
        setDataState({
          loading: false,
          message: `${error.message} Criando liga local como fallback.`,
        });
      }
    }

    const league = {
      id: makeId("league"),
      name: name || "Minha liga",
      code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    };
    setLeagues((items) => [league, ...items]);
    setActiveLeagueId(league.id);
    setActiveTab("league");
  }

  async function joinLeague(code) {
    const normalized = code.trim().toUpperCase();

    if (isSupabaseConfigured) {
      try {
        const league = await joinRemoteLeague(normalized);
        setLeagues((items) => [league, ...items.filter((item) => item.id !== league.id)]);
        setActiveLeagueId(league.id);
        setDataState({ loading: false, message: "Voce entrou na liga pelo Supabase." });
        return "Voce entrou na liga.";
      } catch (error) {
        setDataState({
          loading: false,
          message: `${error.message} Tentando fallback local.`,
        });
      }
    }

    const existing = leagues.find((league) => league.code === normalized);
    if (existing) {
      setActiveLeagueId(existing.id);
      return "Voce entrou na liga.";
    }

    const league = {
      id: makeId("league"),
      name: `Liga ${normalized}`,
      code: normalized,
    };
    setLeagues((items) => [league, ...items]);
    setActiveLeagueId(league.id);
    return "Liga adicionada em modo local. No Supabase, o codigo valida o convite real.";
  }

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
        return;
      }

      setFixtures(payload.fixtures);
      const syncedAt = payload.syncedAt || new Date().toISOString();
      setLastSync(syncedAt);
      setSyncState({
        loading: false,
        message: automatic
          ? `Resultados atualizados automaticamente as ${formatTime(syncedAt)}.`
          : `${payload.fixtures.length} jogos importados de ${payload.provider}.`,
      });
    } catch (error) {
      if (!silent) {
        setSyncState({
          loading: false,
          message: `${error.message} O fallback local continua disponivel.`,
        });
      }
    }
  }, []);

  function updateFixture(nextFixture) {
    setFixtures((items) => items.map((fixture) => (fixture.id === nextFixture.id ? nextFixture : fixture)));
  }

  useEffect(() => {
    if (!profile) return undefined;

    let busy = false;

    async function runAutoSync() {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      await handleSync("api-football", { automatic: true, silent: true });
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

  if (!profile) {
    return <LoginScreen onLocalLogin={handleLocalLogin} onSupabaseAuth={handleSupabaseAuth} />;
  }

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        activeLeague={activeLeague}
        dataState={dataState}
        lastSync={lastSync}
        profile={currentUser}
        setActiveTab={setActiveTab}
        syncState={syncState}
        onLogout={() => setProfile(null)}
      />

      <main className="app-main">
        {activeTab === "home" && (
          <Dashboard
            activeLeague={activeLeague}
            fixtures={fixtures}
            lastSync={lastSync}
            profileRank={profileRank}
            ranking={ranking}
            setActiveTab={setActiveTab}
            syncState={syncState}
            userPredictions={userPredictions}
          />
        )}

        {activeTab === "games" && (
          <GamesView
            fixtures={fixtures}
            predictions={userPredictions}
            onSavePrediction={savePrediction}
          />
        )}

        {activeTab === "ranking" && (
          <RankingView
            activeLeague={activeLeague}
            ranking={ranking}
            fixtures={fixtures}
            predictions={leaguePredictions}
          />
        )}

        {activeTab === "league" && (
          <LeagueView
            activeLeague={activeLeague}
            leagues={leagues}
            onCreateLeague={createLeague}
            onJoinLeague={joinLeague}
            onSelectLeague={setActiveLeagueId}
          />
        )}

        {activeTab === "admin" && (
          <AdminView
            fixtures={fixtures}
            onSync={handleSync}
            onUpdateFixture={updateFixture}
            syncState={syncState}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

function LoginScreen({ onLocalLogin, onSupabaseAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (isSupabaseConfigured && form.email && form.password) {
        await onSupabaseAuth(form, mode);
      } else {
        onLocalLogin(form);
      }
    } catch (error) {
      setMessage(error.message || "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <img src="/world-cup-mark.svg" alt="" className="brand-mark" />
        <span className="eyebrow">Bolao entre amigos</span>
        <h1>Copa do Mundo Palpites</h1>
        <p>
          Palpite nos jogos, acompanhe o ranking da sua liga e dispute ponto a ponto pelo celular.
        </p>
      </section>

      <form className="login-card" onSubmit={submit}>
        <div className="mode-switch">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Entrar
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Cadastrar
          </button>
        </div>

        <label>
          Nome
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Seu nome no ranking"
          />
        </label>

        <label>
          E-mail
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="voce@email.com"
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder={isSupabaseConfigured ? "Senha do Supabase" : "Opcional no modo local"}
          />
        </label>

        {message && <p className="form-message">{message}</p>}

        <button className="primary-button" disabled={loading}>
          {loading ? "Entrando..." : isSupabaseConfigured ? "Continuar" : "Entrar em modo demo"}
          <ChevronRight size={18} />
        </button>

        <p className="helper-text">
          {isSupabaseConfigured
            ? "Supabase detectado. O login real sera usado."
            : "Sem Supabase configurado: o app salva dados no navegador para teste."}
        </p>
      </form>
    </main>
  );
}

function Header({ activeTab, activeLeague, dataState, lastSync, profile, setActiveTab, syncState, onLogout }) {
  const statusMessage = syncState.loading
    ? "Atualizando resultados..."
    : syncState.message || dataState.message || `Atualizado: ${formatTime(lastSync)}`;

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img src="/world-cup-mark.svg" alt="" />
        <div>
          <strong>Copa Palpites</strong>
          <span>{activeLeague?.name || "Sem liga ativa"}</span>
        </div>
      </div>

      <nav className="desktop-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activeTab === item.id ? "active" : ""}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </nav>

      {statusMessage && (
        <div className={`data-pill ${dataState.loading || syncState.loading ? "loading" : ""}`}>
          {statusMessage}
        </div>
      )}

      <div className="profile-chip">
        <span>{profile.avatar}</span>
        <button onClick={onLogout}>Sair</button>
      </div>
    </header>
  );
}

function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={activeTab === item.id ? "active" : ""}
          onClick={() => setActiveTab(item.id)}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Dashboard({
  activeLeague,
  fixtures,
  lastSync,
  profileRank,
  ranking,
  setActiveTab,
  syncState,
  userPredictions,
}) {
  const upcoming = fixtures
    .filter((fixture) => fixture.status === "SCHEDULED")
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    .slice(0, 4);
  const pending = fixtures.filter(
    (fixture) => fixture.status === "SCHEDULED" && !userPredictions.some((prediction) => prediction.fixtureId === fixture.id),
  ).length;
  const finished = fixtures.filter((fixture) => fixture.status === "FINISHED").length;

  return (
    <section className="screen-stack">
      <div className="hero-panel">
        <div>
          <span className="eyebrow">Liga ativa</span>
          <h1>{activeLeague?.name}</h1>
          <p>Veja os proximos jogos, complete seus palpites e acompanhe o ranking da turma.</p>
        </div>
        <button className="primary-button compact" onClick={() => setActiveTab("games")}>
          Palpitar agora
          <Edit3 size={18} />
        </button>
      </div>

      <div className="stats-grid">
        <StatCard icon={Crown} label="Sua posicao" value={`#${profileRank?.position || "-"}`} hint={`${profileRank?.points || 0} pts`} />
        <StatCard icon={ClipboardList} label="Palpites feitos" value={userPredictions.length} hint={`${pending} pendentes`} />
        <StatCard icon={CheckCircle2} label="Jogos fechados" value={finished} hint={`${fixtures.length} no calendario`} />
        <StatCard icon={Gauge} label="Atualizacao" value={formatTime(lastSync)} hint={syncState.loading ? "buscando resultados" : "automatica"} />
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <CalendarDays size={20} />
            <h2>Proximos jogos</h2>
          </div>
          <div className="mini-list">
            {upcoming.map((fixture) => (
              <button key={fixture.id} className="mini-fixture" onClick={() => setActiveTab("games")}>
                <span>{formatDate(fixture.kickoff)}</span>
                <strong>{fixture.home.name} x {fixture.away.name}</strong>
                <small>{fixture.phase}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <Medal size={20} />
            <h2>Top ranking</h2>
          </div>
          <div className="ranking-mini">
            {ranking.slice(0, 5).map((user) => (
              <div key={user.id}>
                <span>#{user.position}</span>
                <strong>{user.name}</strong>
                <b>{user.points} pts</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <article className="stat-card">
      <Icon size={22} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function GamesView({ fixtures, predictions, onSavePrediction }) {
  const [filter, setFilter] = useState("open");
  const [query, setQuery] = useState("");

  const filteredFixtures = fixtures
    .filter((fixture) => {
      const search = `${fixture.home.name} ${fixture.away.name} ${fixture.phase} ${fixture.group || ""}`.toLowerCase();
      const matchesSearch = search.includes(query.toLowerCase());
      const hasPrediction = predictions.some((prediction) => prediction.fixtureId === fixture.id);
      if (!matchesSearch) return false;
      if (filter === "open") return fixture.status === "SCHEDULED" && !isFixtureClosed(fixture);
      if (filter === "results") return fixture.status === "FINISHED";
      if (filter === "mine") return hasPrediction;
      if (filter === "knockout") return fixture.stageType === "KNOCKOUT";
      return true;
    })
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));

  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={CalendarDays}
        title="Jogos da Copa"
        subtitle="Palpite antes de a bola rolar. No mata-mata, escolha tambem quem passa e como passa."
      />

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar selecao ou fase" />
        </div>
        <div className="segmented">
          {[
            ["open", "Abertos"],
            ["results", "Resultados"],
            ["all", "Todos"],
            ["mine", "Meus"],
            ["knockout", "Mata-mata"],
          ].map(([id, label]) => (
            <button key={id} className={filter === id ? "active" : ""} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="fixture-grid">
        {filteredFixtures.map((fixture) => (
          <FixtureCard
            key={fixture.id}
            fixture={fixture}
            prediction={predictions.find((item) => item.fixtureId === fixture.id)}
            onSavePrediction={onSavePrediction}
          />
        ))}
      </div>

      {!filteredFixtures.length && (
        <div className="empty-state">
          <CalendarDays size={24} />
          <strong>Nenhum jogo neste filtro</strong>
          <span>Use o filtro Todos ou sincronize a API no Admin para carregar novas partidas.</span>
        </div>
      )}
    </section>
  );
}

function FixtureCard({ fixture, prediction, onSavePrediction }) {
  const [expanded, setExpanded] = useState(false);
  const closed = isFixtureClosed(fixture);
  const result = scorePrediction(fixture, prediction);

  return (
    <article className="fixture-card">
      <div className="fixture-meta">
        <span className={`status status-${fixture.status.toLowerCase()}`}>{statusLabel(fixture.status)}</span>
        <span>{fixture.group ? `Grupo ${fixture.group}` : fixture.phase}</span>
        <span>{formatDate(fixture.kickoff)}</span>
      </div>

      <div className="matchup">
        <TeamBadge team={fixture.home} align="left" />
        <div className={`score-box ${fixture.status === "FINISHED" && fixture.homeScore === null ? "pending" : ""}`}>
          <strong>
            {fixture.homeScore ?? "-"} : {fixture.awayScore ?? "-"}
          </strong>
          {fixture.status === "FINISHED" && fixture.homeScore === null && (
            <em>Aguardando API</em>
          )}
          <small>{fixture.venue}</small>
        </div>
        <TeamBadge team={fixture.away} align="right" />
      </div>

      {prediction ? (
        <div className="prediction-summary saved">
          <div>
            <strong>Seu palpite</strong>
            <span className="prediction-scoreline">
              {fixture.home.name} {prediction.homeScore} x {prediction.awayScore} {fixture.away.name}
            </span>
            <small>
              Resultado: {outcomeLabel(prediction.normalOutcome, fixture)}
              {fixture.stageType === "KNOCKOUT" && ` · passa ${teamNameById(fixture, prediction.qualifier)} por ${methodLabel(prediction.qualificationMethod).toLowerCase()}`}
            </small>
          </div>
          {fixture.status === "FINISHED" && <b>{result.total} pts</b>}
        </div>
      ) : (
        <div className="prediction-summary muted">
          <ListChecks size={17} />
          <span>Nenhum palpite enviado nesta liga.</span>
        </div>
      )}

      <button
        className="secondary-button full"
        onClick={() => setExpanded((value) => !value)}
        disabled={closed && !prediction}
      >
        {closed ? <Lock size={17} /> : <Edit3 size={17} />}
        {expanded ? "Fechar" : prediction ? "Editar palpite" : "Fazer palpite"}
      </button>

      {expanded && (
        <PredictionForm
          fixture={fixture}
          prediction={prediction}
          closed={closed}
          onSubmit={(form) => {
            onSavePrediction(fixture, form);
            setExpanded(false);
          }}
        />
      )}
    </article>
  );
}

function TeamBadge({ team, align }) {
  return (
    <div className={`team-badge ${align}`}>
      <TeamVisual team={team} />
      <strong>{team.name}</strong>
    </div>
  );
}

function TeamVisual({ team }) {
  const [failed, setFailed] = useState(false);

  if (team.crest && !failed) {
    return (
      <span className="team-crest">
        <img src={team.crest} alt={`Escudo de ${team.name}`} onError={() => setFailed(true)} />
      </span>
    );
  }

  return <span className="team-code">{team.flag || "FIFA"}</span>;
}

function teamNameById(fixture, id) {
  if (fixture.home.id === id) return fixture.home.name;
  if (fixture.away.id === id) return fixture.away.name;
  return "a definir";
}

function PredictionForm({ fixture, prediction, closed, onSubmit }) {
  const [form, setForm] = useState(() => ({
    normalOutcome: prediction?.normalOutcome || "",
    homeScore: prediction?.homeScore ?? "",
    awayScore: prediction?.awayScore ?? "",
    qualifier: prediction?.qualifier || "",
    qualificationMethod: prediction?.qualificationMethod || "",
    extraHomeScore: prediction?.extraHomeScore ?? "",
    extraAwayScore: prediction?.extraAwayScore ?? "",
    penaltiesHome: prediction?.penaltiesHome ?? "",
    penaltiesAway: prediction?.penaltiesAway ?? "",
  }));

  function setOutcome(outcome) {
    const next = { ...form, normalOutcome: outcome };
    if (fixture.stageType === "KNOCKOUT") {
      if (outcome === "HOME") {
        next.qualifier = fixture.home.id;
        next.qualificationMethod = "NORMAL_TIME";
      }
      if (outcome === "AWAY") {
        next.qualifier = fixture.away.id;
        next.qualificationMethod = "NORMAL_TIME";
      }
      if (outcome === "DRAW" && next.qualificationMethod === "NORMAL_TIME") {
        next.qualificationMethod = "EXTRA_TIME";
      }
    }
    setForm(next);
  }

  function outcomeFromScore(homeScore, awayScore) {
    if (homeScore === "" || awayScore === "") return "";
    const home = Number(homeScore);
    const away = Number(awayScore);
    if (Number.isNaN(home) || Number.isNaN(away)) return "";
    if (home > away) return "HOME";
    if (away > home) return "AWAY";
    return "DRAW";
  }

  function setScore(field, value) {
    const next = { ...form, [field]: value };
    const derivedOutcome = outcomeFromScore(next.homeScore, next.awayScore);

    if (derivedOutcome) {
      next.normalOutcome = derivedOutcome;

      if (fixture.stageType === "KNOCKOUT") {
        if (derivedOutcome === "HOME") {
          next.qualifier = fixture.home.id;
          next.qualificationMethod = "NORMAL_TIME";
        }
        if (derivedOutcome === "AWAY") {
          next.qualifier = fixture.away.id;
          next.qualificationMethod = "NORMAL_TIME";
        }
        if (derivedOutcome === "DRAW" && next.qualificationMethod === "NORMAL_TIME") {
          next.qualificationMethod = "EXTRA_TIME";
        }
      }
    }

    setForm(next);
  }

  function canSubmit() {
    if (closed) return false;
    if (!form.normalOutcome || form.homeScore === "" || form.awayScore === "") return false;
    if (fixture.stageType === "KNOCKOUT") {
      if (!form.qualifier || !form.qualificationMethod) return false;
      if (form.normalOutcome === "DRAW" && form.qualificationMethod === "NORMAL_TIME") return false;
    }
    return true;
  }

  return (
    <form
      className="prediction-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit()) onSubmit(form);
      }}
    >
      <fieldset disabled={closed}>
        <legend>Resultado nos 90 minutos</legend>
        <div className="choice-grid">
          {[
            ["HOME", fixture.home.name],
            ["DRAW", "Empate"],
            ["AWAY", fixture.away.name],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={form.normalOutcome === id ? "active" : ""}
              onClick={() => setOutcome(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="score-inputs">
        <label>
          {fixture.home.name}
          <input
            type="number"
            min="0"
            value={form.homeScore}
            onChange={(event) => setScore("homeScore", event.target.value)}
            disabled={closed}
          />
        </label>
        <span>x</span>
        <label>
          {fixture.away.name}
          <input
            type="number"
            min="0"
            value={form.awayScore}
            onChange={(event) => setScore("awayScore", event.target.value)}
            disabled={closed}
          />
        </label>
      </div>

      {fixture.stageType === "KNOCKOUT" && (
        <div className="knockout-box">
          <fieldset disabled={closed}>
            <legend>Quem passa?</legend>
            <div className="choice-grid two">
              {[fixture.home, fixture.away].map((team) => (
                <button
                  key={team.id}
                  type="button"
                  className={form.qualifier === team.id ? "active" : ""}
                  onClick={() => setForm({ ...form, qualifier: team.id })}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={closed}>
            <legend>Como passa?</legend>
            <div className="choice-grid">
              {methodOptions.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className={form.qualificationMethod === method.id ? "active" : ""}
                  onClick={() => setForm({ ...form, qualificationMethod: method.id })}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="optional-grid">
            <label>
              Prorrogacao casa
              <input
                type="number"
                min="0"
                value={form.extraHomeScore}
                onChange={(event) => setForm({ ...form, extraHomeScore: event.target.value })}
                disabled={closed}
              />
            </label>
            <label>
              Prorrogacao fora
              <input
                type="number"
                min="0"
                value={form.extraAwayScore}
                onChange={(event) => setForm({ ...form, extraAwayScore: event.target.value })}
                disabled={closed}
              />
            </label>
            <label>
              Penaltis casa
              <input
                type="number"
                min="0"
                value={form.penaltiesHome}
                onChange={(event) => setForm({ ...form, penaltiesHome: event.target.value })}
                disabled={closed}
              />
            </label>
            <label>
              Penaltis fora
              <input
                type="number"
                min="0"
                value={form.penaltiesAway}
                onChange={(event) => setForm({ ...form, penaltiesAway: event.target.value })}
                disabled={closed}
              />
            </label>
          </div>
        </div>
      )}

      {closed && <p className="form-message">Palpite bloqueado porque o jogo ja comecou ou terminou.</p>}
      {!closed && !form.normalOutcome && (
        <p className="form-message">Digite o placar ou toque em uma opcao de resultado para liberar o palpite.</p>
      )}
      {form.normalOutcome === "DRAW" && form.qualificationMethod === "NORMAL_TIME" && (
        <p className="form-message">Em empate no mata-mata, escolha prorrogacao ou penaltis.</p>
      )}

      <button className="primary-button full" disabled={!canSubmit()}>
        Salvar palpite
        <ShieldCheck size={18} />
      </button>
    </form>
  );
}

function RankingView({ activeLeague, ranking, fixtures, predictions }) {
  const finished = fixtures.filter((fixture) => fixture.status === "FINISHED").length;
  const totalPoints = ranking.reduce((sum, user) => sum + user.points, 0);

  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={Trophy}
        title={`Ranking - ${activeLeague?.name}`}
        subtitle="Desempate por placares exatos, acertos no mata-mata, palpites feitos e nome."
      />

      <div className="stats-grid">
        <StatCard icon={UsersRound} label="Participantes" value={ranking.length} hint="nesta liga" />
        <StatCard icon={CheckCircle2} label="Jogos finalizados" value={finished} hint="pontuando agora" />
        <StatCard icon={ClipboardList} label="Palpites" value={predictions.length} hint="enviados na liga" />
        <StatCard icon={Medal} label="Pontos somados" value={totalPoints} hint="todos os jogadores" />
      </div>

      <div className="ranking-table">
        {ranking.map((user) => (
          <article key={user.id} className={user.position === 1 ? "leader" : ""}>
            <span className="rank-position">#{user.position}</span>
            <div className="avatar">{user.avatar}</div>
            <div className="rank-info">
              <strong>{user.name}</strong>
              <small>{user.exacts} placares exatos · {user.knockout} mata-mata · {user.predictions} palpites</small>
            </div>
            <b>{user.points} pts</b>
          </article>
        ))}
      </div>
    </section>
  );
}

function LeagueView({ activeLeague, leagues, onCreateLeague, onJoinLeague, onSelectLeague }) {
  const [newLeagueName, setNewLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [joining, setJoining] = useState(false);

  async function handleJoinLeague() {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const result = await onJoinLeague(inviteCode);
      setMessage(result);
      setInviteCode("");
    } finally {
      setJoining(false);
    }
  }

  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={UsersRound}
        title="Ligas e convites"
        subtitle="Crie uma liga para sua turma ou entre usando um codigo de convite."
      />

      <div className="two-column">
        <section className="panel">
          <div className="panel-title">
            <Link2 size={20} />
            <h2>Liga ativa</h2>
          </div>
          <div className="league-code">
            <span>{activeLeague?.name}</span>
            <strong>{activeLeague?.code}</strong>
          </div>
          <p className="helper-text">Compartilhe esse codigo com seus amigos para todos disputarem o mesmo ranking.</p>
        </section>

        <section className="panel form-panel">
          <div className="panel-title">
            <Edit3 size={20} />
            <h2>Criar liga</h2>
          </div>
          <label>
            Nome da liga
            <input value={newLeagueName} onChange={(event) => setNewLeagueName(event.target.value)} placeholder="Ex: Amigos da firma" />
          </label>
          <button
            className="primary-button full"
            onClick={() => {
              onCreateLeague(newLeagueName);
              setNewLeagueName("");
            }}
          >
            Criar liga
            <ChevronRight size={18} />
          </button>
        </section>
      </div>

      <section className="panel form-panel">
        <div className="panel-title">
          <UsersRound size={20} />
          <h2>Entrar em liga</h2>
        </div>
        <label>
          Codigo de convite
          <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="COPA26" />
        </label>
        {message && <p className="form-message">{message}</p>}
        <button
          className="secondary-button full"
          onClick={handleJoinLeague}
          disabled={joining}
        >
          {joining ? "Entrando..." : "Entrar na liga"}
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="panel">
        <div className="panel-title">
          <ListChecks size={20} />
          <h2>Suas ligas</h2>
        </div>
        <div className="league-list">
          {leagues.map((league) => (
            <button
              key={league.id}
              className={league.id === activeLeague?.id ? "active" : ""}
              onClick={() => onSelectLeague(league.id)}
            >
              <span>{league.name}</span>
              <strong>{league.code}</strong>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

function AdminView({ fixtures, onSync, onUpdateFixture, syncState }) {
  const [provider, setProvider] = useState("api-football");
  const [selectedId, setSelectedId] = useState(fixtures[0]?.id || "");
  const selectedFixture = fixtures.find((fixture) => fixture.id === selectedId) || fixtures[0];
  const [draft, setDraft] = useState(selectedFixture);

  useEffect(() => {
    setDraft(selectedFixture);
  }, [selectedFixture]);

  if (!draft) return null;

  function updateScore(field, value) {
    const next = { ...draft, [field]: value === "" ? null : Number(value) };
    const outcome = getNormalOutcome(next.homeScore, next.awayScore);
    if (outcome === "HOME") next.winner = next.home.id;
    if (outcome === "AWAY") next.winner = next.away.id;
    if (outcome === "DRAW" && next.stageType === "GROUP") next.winner = null;
    setDraft(next);
  }

  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={Settings}
        title="Admin"
        subtitle="Sincronize a API, corrija placares e complete dados de prorrogação ou penaltis."
      />

      <div className="two-column">
        <section className="panel form-panel">
          <div className="panel-title">
            <Cloud size={20} />
            <h2>Sincronizar API</h2>
          </div>
          <label>
            Provedor
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="api-football">API-Football recomendada</option>
              <option value="football-data">football-data.org</option>
            </select>
          </label>
          <button className="primary-button full" onClick={() => onSync(provider)} disabled={syncState.loading}>
            {syncState.loading ? "Sincronizando..." : "Buscar jogos"}
            <RefreshCw size={18} />
          </button>
          {syncState.message && <p className="form-message">{syncState.message}</p>}
        </section>

        <section className="panel">
          <div className="panel-title">
            <ShieldCheck size={20} />
            <h2>Regras</h2>
          </div>
          <ul className="rules-list">
            <li>Resultado nos 90 minutos: 3 pts</li>
            <li>Placar exato: +2 pts</li>
            <li>Classificado no mata-mata: +2 pts</li>
            <li>Forma de classificacao: +2 pts</li>
          </ul>
        </section>
      </div>

      <section className="panel form-panel">
        <div className="panel-title">
          <Edit3 size={20} />
          <h2>Editar partida</h2>
        </div>

        <label>
          Jogo
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {fixtures.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.phase} · {fixture.home.name} x {fixture.away.name}
              </option>
            ))}
          </select>
        </label>

        <div className="score-inputs admin-score">
          <label>
            {draft.home.name}
            <input type="number" min="0" value={draft.homeScore ?? ""} onChange={(event) => updateScore("homeScore", event.target.value)} />
          </label>
          <span>x</span>
          <label>
            {draft.away.name}
            <input type="number" min="0" value={draft.awayScore ?? ""} onChange={(event) => updateScore("awayScore", event.target.value)} />
          </label>
        </div>

        <div className="optional-grid">
          <label>
            Status
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              <option value="SCHEDULED">Aberto</option>
              <option value="LIVE">Ao vivo</option>
              <option value="FINISHED">Finalizado</option>
              <option value="POSTPONED">Adiado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>
          <label>
            Classificado
            <select value={draft.winner || ""} onChange={(event) => setDraft({ ...draft, winner: event.target.value || null })}>
              <option value="">Sem vencedor</option>
              <option value={draft.home.id}>{draft.home.name}</option>
              <option value={draft.away.id}>{draft.away.name}</option>
            </select>
          </label>
          <label>
            Forma
            <select
              value={draft.classificationMethod || ""}
              onChange={(event) => setDraft({ ...draft, classificationMethod: event.target.value || null })}
            >
              <option value="">A definir</option>
              {methodOptions.map((method) => (
                <option key={method.id} value={method.id}>{method.label}</option>
              ))}
            </select>
          </label>
          <label>
            Local
            <input value={draft.venue} onChange={(event) => setDraft({ ...draft, venue: event.target.value })} />
          </label>
        </div>

        <button className="primary-button full" onClick={() => onUpdateFixture(draft)}>
          Salvar resultado
          <ShieldCheck size={18} />
        </button>
      </section>
    </section>
  );
}

function ScreenHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="screen-heading">
      <Icon size={24} />
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

export default App;
