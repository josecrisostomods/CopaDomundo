import React, { useState } from "react";
import { ChevronRight, Link2, Edit3, Share2, Copy, UsersRound, CheckCircle2, ShieldCheck, UserMinus } from "lucide-react";
import { useToast } from "./Toast.jsx";
import { ScreenHeading } from "./Shared.jsx";

export function LoginScreen({ onPlayerAuth, isSupabaseConfigured }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", recoveryCode: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const localMode = !isSupabaseConfigured;

  async function submit(event) {
    event.preventDefault();
    if (!localMode && mode === "recover" && !form.recoveryCode) {
      setMessage("Informe o codigo de validacao.");
      return;
    }

    if (!localMode && (!form.username || !form.password)) {
      setMessage("Preencha todos os campos.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await onPlayerAuth(
        localMode
          ? { username: form.username || "jogador-local", password: "local" }
          : form,
        localMode ? "local" : mode,
      );
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
        <div className="mode-switch mode-switch-three">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Entrar
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Cadastrar
          </button>
          <button type="button" className={mode === "recover" ? "active" : ""} onClick={() => setMode("recover")}>
            Recuperar
          </button>
        </div>

        {mode === "recover" && (
          <label>
            Codigo de validacao
            <input
              autoComplete="one-time-code"
              value={form.recoveryCode}
              onChange={(event) => setForm({ ...form, recoveryCode: event.target.value })}
              placeholder="Cole seu codigo"
            />
          </label>
        )}

        <label>
          {mode === "recover" ? "Novo usuario" : "Usuario"}
          <input
            autoComplete="username"
            value={form.username}
            onChange={(event) => setForm({ ...form, username: event.target.value })}
            placeholder={mode === "recover" ? "Digite o novo usuario" : "Digite seu usuario"}
          />
        </label>

        <label>
          {mode === "recover" ? "Nova senha" : "Senha"}
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            placeholder={mode === "recover" ? "Digite a nova senha" : "Senha"}
          />
        </label>

        {message && <p className="form-message">{message}</p>}

        <button className="primary-button" disabled={loading || !isSupabaseConfigured}>
          {loading
            ? "Processando..."
            : localMode
            ? "Entrar em modo local"
            : mode === "register"
            ? "Criar conta"
            : mode === "recover"
            ? "Criar novas credenciais"
            : "Entrar"}
          <ChevronRight size={18} />
        </button>

        <p className="helper-text">
          {!isSupabaseConfigured && "Supabase nao configurado. O modo local libera o app neste navegador."}
          {isSupabaseConfigured && mode === "login" && "Use usuario e senha para entrar."}
          {isSupabaseConfigured && mode === "register" && "Depois guarde o codigo de validacao da conta."}
          {isSupabaseConfigured && mode === "recover" && "Use seu codigo para criar novo usuario e senha."}
        </p>
      </form>
    </main>
  );
}

export function RecoveryCodeScreen({ code, onContinue }) {
  const [message, setMessage] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("Codigo copiado.");
    } catch {
      setMessage("Nao foi possivel copiar automaticamente.");
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <img src="/world-cup-mark.svg" alt="" className="brand-mark" />
        <span className="eyebrow">Codigo de validacao</span>
        <h1>Guarde este codigo</h1>
        <p>Ele permite recuperar sua conta mesmo se voce esquecer usuario e senha.</p>
      </section>

      <section className="login-card recovery-card">
        <div className="recovery-warning">
          <ShieldCheck size={20} />
          <span>Copie e guarde em um lugar seguro. O codigo aparece aqui uma unica vez.</span>
        </div>

        <div className="recovery-code-box">
          <strong>{code}</strong>
        </div>

        {message && <p className="form-message">{message}</p>}

        <button className="secondary-button full" type="button" onClick={copyCode}>
          <Copy size={18} />
          Copiar codigo
        </button>

        <button className="primary-button full" type="button" onClick={onContinue}>
          Ja guardei o codigo
          <ChevronRight size={18} />
        </button>
      </section>
    </main>
  );
}

export function DisplayNameScreen({ onSaveName }) {
  const [name, setName] = useState("");
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
        <p>Escolha o nome que seus amigos vao ver no ranking.</p>
      </section>

      <form className="login-card" onSubmit={submit}>
        <label>
          Nome no ranking
          <input
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Digite seu nome no ranking"
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

export function LeagueView({
  activeLeague,
  currentUser,
  leagues,
  members = [],
  publicLeagues = [],
  onCreateLeague,
  onJoinLeague,
  onJoinPublicLeague,
  onRemoveLeagueMember,
  onSelectLeague,
}) {
  const addToast = useToast();
  const [newLeagueName, setNewLeagueName] = useState("");
  const [leagueVisibility, setLeagueVisibility] = useState("private");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [joining, setJoining] = useState(false);
  const [joiningPublicId, setJoiningPublicId] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const canSeeActiveCode = activeLeague?.ownerId === currentUser?.id;
  const canManageActiveMembers = canSeeActiveCode || currentUser?.isAdmin;
  const createdLeaguesCount = leagues.filter((league) => league.ownerId === currentUser?.id).length;
  const reachedLeagueLimit = !currentUser?.isAdmin && createdLeaguesCount >= 3;

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

  async function handleJoinPublicLeague(leagueId) {
    setJoiningPublicId(leagueId);
    try {
      const result = await onJoinPublicLeague(leagueId);
      setMessage(result);
    } finally {
      setJoiningPublicId(null);
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

  async function handleRemoveMember(member) {
    if (!activeLeague || !onRemoveLeagueMember) return;
    const confirmed = window.confirm(`Remover ${member.name} da liga ${activeLeague.name}?`);
    if (!confirmed) return;

    setRemovingMemberId(member.id);
    try {
      await onRemoveLeagueMember(activeLeague.id, member.id);
      setMessage(`${member.name} foi removido da liga.`);
    } finally {
      setRemovingMemberId(null);
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
          {activeLeague ? (
            <>
              <div className={`league-code ${canSeeActiveCode ? "" : "private"}`}>
                <span>{activeLeague.name}</span>
                <strong>
                  {canSeeActiveCode && activeLeague.code
                    ? activeLeague.code
                    : activeLeague.isPublic
                    ? "Liga publica"
                    : "Convite privado"}
                </strong>
              </div>
              <p className="helper-text">
                {activeLeague.isPublic && "Essa liga aparece na lista publica para novos participantes."}
                {!activeLeague.isPublic && canSeeActiveCode && "Compartilhe esse codigo com seus amigos para todos disputarem o mesmo ranking."}
                {!activeLeague.isPublic && !canSeeActiveCode && "O codigo de convite fica visivel apenas para quem criou a liga."}
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
          <div className="segmented compact-segmented">
            <button
              type="button"
              className={leagueVisibility === "private" ? "active" : ""}
              onClick={() => setLeagueVisibility("private")}
            >
              Privada
            </button>
            <button
              type="button"
              className={leagueVisibility === "public" ? "active" : ""}
              onClick={() => setLeagueVisibility("public")}
            >
              Publica
            </button>
          </div>
          <p className="helper-text">
            {reachedLeagueLimit
              ? "Voce ja criou 3 ligas. Entre em outras por convite ou liga publica."
              : leagueVisibility === "public"
              ? "Aparece para todos os usuarios entrarem sem codigo."
              : "Entra apenas quem receber o codigo de convite."}
          </p>
          <button
            className="secondary-button full"
            onClick={() => {
              onCreateLeague(newLeagueName, leagueVisibility === "public");
              setNewLeagueName("");
            }}
            disabled={!newLeagueName.trim() || reachedLeagueLimit}
          >
            Criar liga
          </button>
        </section>
      </div>

      {activeLeague && (
        <section className="panel list-panel">
          <div className="panel-title">
            <UsersRound size={20} />
            <h2>Participantes da liga</h2>
          </div>
          <div className="league-list">
            {members.map((member) => {
              const isOwner = member.id === activeLeague.ownerId;
              const canRemove = canManageActiveMembers && member.id !== currentUser?.id && !isOwner;

              return (
                <div key={member.id} className="league-list-item member-list-item">
                  <div className="history-user">
                    <div className="avatar profile-avatar-mini">{member.avatar}</div>
                    <div className="league-list-info">
                      <strong>{member.name}</strong>
                      <small>@{member.username}{isOwner ? " - dono" : ""}</small>
                    </div>
                  </div>
                  {canRemove ? (
                    <button
                      className="icon-danger-button"
                      type="button"
                      onClick={() => handleRemoveMember(member)}
                      disabled={removingMemberId === member.id}
                      title="Remover participante"
                    >
                      <UserMinus size={17} />
                    </button>
                  ) : (
                    <b>{isOwner ? "Dono" : "Membro"}</b>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel list-panel">
        <div className="panel-title">
          <UsersRound size={20} />
          <h2>Ligas publicas</h2>
        </div>
        {publicLeagues.length > 0 ? (
          <div className="league-list">
            {publicLeagues.map((league) => (
              <div key={league.id} className="league-list-item public-league-item">
                <div className="league-list-info">
                  <strong>{league.name}</strong>
                  <small>{league.memberCount || 1} participante(s)</small>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => handleJoinPublicLeague(league.id)}
                  disabled={joiningPublicId === league.id}
                >
                  {joiningPublicId === league.id ? "Entrando..." : "Entrar"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="helper-text">Nenhuma liga publica disponivel agora.</p>
        )}
      </section>

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
