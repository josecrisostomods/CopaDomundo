import React, { useState, useEffect } from "react";
import { UserRound, Crown, ClipboardList, CheckCircle2, ShieldCheck, Save } from "lucide-react";
import { ScreenHeading, StatCard } from "./Shared.jsx";
import { formatTime } from "../utils/formatters";

export function ProfileView({
  activeLeague,
  dataState,
  lastSync,
  onLogout,
  onUpdateProfile,
  profile,
  profileRank,
  syncState,
  userPredictions,
}) {
  const [draft, setDraft] = useState({ name: profile.name || "" });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({ name: profile.name || "" });
    setMessage("");
  }, [profile.id, profile.name]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await onUpdateProfile(draft);
      setMessage("Perfil salvo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={UserRound}
        title="Perfil"
        subtitle="Edite seus dados e acompanhe seu desempenho na liga ativa."
      />

      <div className="stats-grid">
        <StatCard icon={Crown} label="Sua posicao" value={`#${profileRank?.position || "-"}`} hint={`${profileRank?.points || 0} pts`} />
        <StatCard icon={ClipboardList} label="Palpites feitos" value={userPredictions.length} hint="nesta liga" />
        <StatCard icon={CheckCircle2} label="Placares exatos" value={profileRank?.exacts || 0} hint="criterio de desempate" />
        <StatCard icon={ShieldCheck} label="Mata-mata" value={profileRank?.knockout || 0} hint="classificados certos" />
      </div>

      <div className="two-column">
        <section className="panel form-panel">
          <div className="panel-title">
            <UserRound size={20} />
            <h2>Dados do jogador</h2>
          </div>

          <div className="profile-preview">
            <div className="avatar profile-avatar-large">{profile.avatar}</div>
            <div>
              <strong>{profile.name}</strong>
              <small>@{profile.username}</small>
            </div>
          </div>

          <form className="profile-form" onSubmit={submit}>
            <label>
              Nome no ranking
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Seu nome"
              />
            </label>

            {message && <p className="form-message">{message}</p>}

            <button className="primary-button full" disabled={saving}>
              {saving ? "Salvando..." : "Salvar perfil"}
              <Save size={18} />
            </button>
          </form>
        </section>

        <section className="panel form-panel">
          <div className="panel-title">
            <ShieldCheck size={20} />
            <h2>Seguranca</h2>
          </div>
          <p className="helper-text">
            Sua conta esta conectada em {profile.username}. Desconecte caso queira usar outro usuario neste dispositivo.
          </p>
          <button className="secondary-button full" onClick={onLogout}>
            Sair da conta
          </button>
        </section>
      </div>
    </section>
  );
}
