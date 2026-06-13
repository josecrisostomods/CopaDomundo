import React, { useState } from "react";
import { Star, Trophy, Target, Sparkles, Save } from "lucide-react";
import { ScreenHeading } from "./Shared.jsx";
import { useApp } from "../contexts/AppContext.jsx";

export function BonusPredictions({ fixtures, bonusPredictions, onSaveBonusPrediction }) {
  const { currentUser, activeLeague } = useApp();
  
  const existingBonus = bonusPredictions.find(
    (bp) => bp.userId === currentUser?.id && bp.leagueId === activeLeague?.id
  );

  const [championTeamId, setChampionTeamId] = useState(existingBonus?.championTeamId || "");
  const [topScorerName, setTopScorerName] = useState(existingBonus?.topScorerName || "");
  const [revelationName, setRevelationName] = useState(existingBonus?.revelationName || "");
  const [isSaving, setIsSaving] = useState(false);

  // Extract unique teams
  const teamsMap = new Map();
  fixtures.forEach(fixture => {
    if (fixture.home.id && !teamsMap.has(fixture.home.id)) {
      teamsMap.set(fixture.home.id, fixture.home);
    }
    if (fixture.away.id && !teamsMap.has(fixture.away.id)) {
      teamsMap.set(fixture.away.id, fixture.away);
    }
  });
  const teams = Array.from(teamsMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const hasChanges =
    championTeamId !== (existingBonus?.championTeamId || "") ||
    topScorerName !== (existingBonus?.topScorerName || "") ||
    revelationName !== (existingBonus?.revelationName || "");

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSaveBonusPrediction({
        championTeamId,
        topScorerName,
        revelationName,
      });
    } finally {
      setIsSaving(false);
    }
  }

  // The World Cup starts on June 11, 2026. Let's allow bonus predictions until then.
  // In a real scenario, this would check against the first match's kickoff.
  const firstMatchKickoff = fixtures.length > 0 
    ? new Date(Math.min(...fixtures.map(f => new Date(f.kickoff).getTime())))
    : null;
    
  const isClosed = firstMatchKickoff && Date.now() >= firstMatchKickoff.getTime();

  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={Star}
        title="Palpites Bonus"
        subtitle="Acerte o campeao, artilheiro e revelacao para ganhar pontos extras ao final da Copa!"
      />

      <div className="fixture-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {isClosed && (
          <div className="data-pill" style={{ background: "var(--danger-color)", color: "#fff", alignSelf: "flex-start", marginBottom: "-8px" }}>
            Palpites bonus encerrados
          </div>
        )}

        <div className="input-group">
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", marginBottom: "8px" }}>
            <Trophy size={18} style={{ color: "var(--primary-color)" }} />
            Selecao Campea
          </label>
          <select 
            value={championTeamId} 
            onChange={e => setChampionTeamId(e.target.value)}
            disabled={isClosed}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontSize: '1rem',
              width: '100%'
            }}
          >
            <option value="">Selecione o campeao...</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <small style={{ color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
            Vale 15 pontos se acertar o campeao da Copa.
          </small>
        </div>

        <div className="input-group">
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", marginBottom: "8px" }}>
            <Target size={18} style={{ color: "var(--primary-color)" }} />
            Artilheiro da Copa
          </label>
          <input 
            type="text" 
            placeholder="Ex: Mbappe" 
            value={topScorerName}
            onChange={e => setTopScorerName(e.target.value)}
            disabled={isClosed}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontSize: '1rem',
              width: '100%'
            }}
          />
          <small style={{ color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
            Vale 10 pontos. Digite apenas o nome ou sobrenome principal.
          </small>
        </div>

        <div className="input-group">
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold", marginBottom: "8px" }}>
            <Sparkles size={18} style={{ color: "var(--primary-color)" }} />
            Jogador Revelacao
          </label>
          <input 
            type="text" 
            placeholder="Ex: Endrick" 
            value={revelationName}
            onChange={e => setRevelationName(e.target.value)}
            disabled={isClosed}
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-color)',
              fontSize: '1rem',
              width: '100%'
            }}
          />
          <small style={{ color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
            Vale 10 pontos. Melhor jogador jovem da FIFA.
          </small>
        </div>

        {!isClosed && (
          <button 
            className="primary-button" 
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            style={{ marginTop: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <Save size={18} />
            {isSaving ? "Salvando..." : "Salvar Palpites Bonus"}
          </button>
        )}
      </div>
    </section>
  );
}
