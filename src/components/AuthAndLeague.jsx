import React, { useState } from "react";
import { ChevronRight, Link2, Edit3, Share2, Copy, UsersRound, CheckCircle2 } from "lucide-react";
import { useToast } from "./Toast.jsx";
import { ScreenHeading } from "./Shared.jsx";

export function LoginScreen({ onPlayerAuth, isSupabaseConfigured }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (!form.username || !form.password) {
      setMessage("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await onPlayerAuth(form, mode);
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
          Usuario
          <input
            autoComplete="username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder="Digite seu usuario"
          />
        </label>

        <label>
          Senha
          <input
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder="Senha"
          />
        </label>

        {message && <p className="form-message">{message}</p>}

        <button className="primary-button" disabled={loading || !isSupabaseConfigured}>
          {loading ? "Entrando..." : mode === "register" ? "Criar conta" : "Entrar"}
          <ChevronRight size={18} />
        </button>

        <p className="helper-text">
          {isSupabaseConfigured
            ? "Use usuario e senha para entrar. O nome do ranking voce escolhe depois."
            : "Login indisponivel no momento."}
        </p>
      </form>
    </main>
  );
}

export function DisplayNameScreen({ profile, onSaveName }) {
  const [name, setName] = useState(profile.name || "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) {
      setMessage("Digite o nome que vai aparecer no jogo.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      await onSaveName({ name });
    } catch (error) {
      setMessage(error.message || "Nao foi possivel salvar seu nome.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <img src="/world-cup-mark.svg" alt="" className="brand-mark" />
        <span className="eyebrow">Perfil do jogador</span>
        <h1>Como voce quer aparecer?</h1>
        <p>Seu usuario e usado para entrar. Esse nome aparece para os amigos no ranking da liga.</p>
      </section>

      <form className="login-card" onSubmit={submit}>
        <label>
          Nome no jogo
          <input
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Jardel"
            maxLength={30}
          />
        </label>

        {message && <p className="form-message">{message}</p>}

        <button className="primary-button" disabled={saving}>
          {saving ? "Salvando..." : "Comecar a jogar"}
          <ChevronRight size={18} />
        </button>
      </form>
    </main>
  );
}

export function LeagueRequired({ setActiveTab }) {
  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={UsersRound}
        title="Entre em uma liga"
        subtitle="Crie uma liga ou use o codigo recebido para liberar palpites e ranking."
      />

      <section className="panel form-panel">
        <div className="panel-title">
          <Link2 size={20} />
          <h2>Ligas</h2>
        </div>
        <p className="helper-text">Cada liga tem seu proprio ranking, participantes e palpites.</p>
        <button className="primary-button full" onClick={() => setActiveTab("league")}>
          Abrir ligas
          <ChevronRight size={18} />
        </button>
      </section>
    </section>
  );
}

export function LeagueView({ activeLeague, currentUser, leagues, onCreateLeague, onJoinLeague, onSelectLeague }) {
  const addToast = useToast();
  const [newLeagueName, setNewLeagueName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [joining, setJoining] = useState(false);
  const canSeeActiveCode = activeLeague?.ownerId === currentUser?.id;

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

  function copyCode() {
    if (!activeLeague?.code) return;
    navigator.clipboard.writeText(activeLeague.code);
    addToast("Codigo copiado!", "success");
  }

  function shareWhatsApp() {
    if (!activeLeague?.code) return;
    const text = `Vem pro meu bolao da Copa! O codigo da liga '${activeLeague.name}' e: ${activeLeague.code}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
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
          {activeLeague ? (
            <>
              <div className={`league-code ${canSeeActiveCode ? "" : "private"}`}>
                <span>{activeLeague.name}</span>
                <strong>{canSeeActiveCode && activeLeague.code ? activeLeague.code : "Convite privado"}</strong>
              </div>
              <p className="helper-text">
                {canSeeActiveCode
                  ? "Compartilhe esse codigo com seus amigos para todos disputarem o mesmo ranking."
                  : "O codigo de convite fica visivel apenas para quem criou a liga."}
              </p>
              {canSeeActiveCode && activeLeague.code && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                  <button className="secondary-button full" onClick={copyCode}>
                    <Copy size={16} /> Copiar
                  </button>
                  <button className="secondary-button full" onClick={shareWhatsApp} style={{ borderColor: "#17b890", color: "#17b890" }}>
                    <Share2 size={16} /> WhatsApp
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state compact">
              <UsersRound size={22} />
              <strong>Nenhuma liga ativa</strong>
              <span>Crie uma liga ou entre com o codigo recebido de um amigo.</span>
            </div>
          )}
        </section>

        <section className="panel form-panel">
          <div className="panel-title">
            <Edit3 size={20} />
            <h2>Criar liga</h2>
          </div>
          <label>
            Nome da liga
            <input
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
              placeholder="Ex: Firma 2026, Familia Silva..."
              maxLength={40}
            />
          </label>
          <button
            className="secondary-button full"
            onClick={() => {
              onCreateLeague(newLeagueName);
              setNewLeagueName("");
            }}
            disabled={!newLeagueName.trim()}
          >
            Criar liga
          </button>
        </section>
      </div>

      <div className="two-column">
        <section className="panel form-panel">
          <div className="panel-title">
            <Link2 size={20} />
            <h2>Entrar com convite</h2>
          </div>
          <label>
            Codigo do convite
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Digite o codigo"
              style={{ textTransform: "uppercase" }}
            />
          </label>
          {message && <p className="form-message">{message}</p>}
          <button
            className="secondary-button full"
            onClick={handleJoinLeague}
            disabled={joining || !inviteCode.trim()}
          >
            {joining ? "Entrando..." : "Entrar na liga"}
          </button>
        </section>

        {leagues.length > 0 && (
          <section className="panel list-panel">
            <div className="panel-title">
              <UsersRound size={20} />
              <h2>Minhas Ligas</h2>
            </div>
            <div className="league-list">
              {leagues.map((league) => (
                <button
                  key={league.id}
                  className={`league-list-item ${league.id === activeLeague?.id ? "active" : ""}`}
                  onClick={() => onSelectLeague(league.id)}
                >
                  <div className="league-list-info">
                    <strong>{league.name}</strong>
                    <small>{league.memberCount || 1} participante(s)</small>
                  </div>
                  {league.id === activeLeague?.id && <CheckCircle2 size={18} className="active-icon" />}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
