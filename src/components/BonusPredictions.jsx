import React, { useEffect, useMemo, useState } from "react";
import { Star, Trophy, Target, Sparkles, Save } from "lucide-react";
import { ScreenHeading } from "./Shared.jsx";
import { useApp } from "../contexts/AppContext.jsx";
import { filterWorldCupPlayers, getWorldCupPlayers } from "../services/playerDatabase.js";

function FieldLabel({ icon: Icon, children }) {
  return (
    <span className="bonus-field-label">
      <Icon size={18} />
      {children}
    </span>
  );
}

function PlayerAutocompleteField({
  disabled,
  helperText,
  icon,
  id,
  label,
  onChange,
  players,
  placeholder,
  value,
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => filterWorldCupPlayers(players, value), [players, value]);
  const showSuggestions = focused && !disabled && value.trim().length > 0 && suggestions.length > 0;

  function selectPlayer(player) {
    onChange(player.name);
    setFocused(false);
  }

  return (
    <div className="input-group autocomplete-field">
      <label htmlFor={id}>
        <FieldLabel icon={icon}>{label}</FieldLabel>
      </label>
      <div className="autocomplete-shell">
        <input
          autoComplete="off"
          disabled={disabled}
          id={id}
          onBlur={() => setFocused(false)}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          type="text"
          value={value}
        />
        {showSuggestions && (
          <div className="autocomplete-menu" role="listbox">
            {suggestions.map((player) => (
              <button
                className="autocomplete-option"
                key={`${player.team}:${player.name}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPlayer(player)}
                role="option"
                type="button"
              >
                <strong>{player.name}</strong>
                <small>{player.team}{player.position ? ` - ${player.position}` : ""}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <small>{helperText}</small>
    </div>
  );
}

export function BonusPredictions({ fixtures, bonusPredictions, onSaveBonusPrediction }) {
  const { currentUser, activeLeague } = useApp();
  
  const existingBonus = bonusPredictions.find(
    (bp) => bp.userId === currentUser?.id && bp.leagueId === activeLeague?.id
  );

  const [championTeamId, setChampionTeamId] = useState(existingBonus?.championTeamId || "");
  const [topScorerName, setTopScorerName] = useState(existingBonus?.topScorerName || "");
  const [revelationName, setRevelationName] = useState(existingBonus?.revelationName || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setChampionTeamId(existingBonus?.championTeamId || "");
    setTopScorerName(existingBonus?.topScorerName || "");
    setRevelationName(existingBonus?.revelationName || "");
  }, [existingBonus?.championTeamId, existingBonus?.topScorerName, existingBonus?.revelationName]);

  const teams = useMemo(() => {
    const teamsMap = new Map();

    fixtures
      .filter((fixture) => fixture.stageType === "GROUP")
      .forEach((fixture) => {
        if (fixture.home.id && !teamsMap.has(fixture.home.id)) {
          teamsMap.set(fixture.home.id, fixture.home);
        }
        if (fixture.away.id && !teamsMap.has(fixture.away.id)) {
          teamsMap.set(fixture.away.id, fixture.away);
        }
      });

    return Array.from(teamsMap.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [fixtures]);

  const players = useMemo(() => getWorldCupPlayers(teams), [teams]);

  const hasChanges =
    championTeamId !== (existingBonus?.championTeamId || "") ||
    topScorerName !== (existingBonus?.topScorerName || "") ||
    revelationName !== (existingBonus?.revelationName || "");

  const bonusLocked = Boolean(activeLeague?.settings?.bonusLocked);

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

  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={Star}
        title="Palpites Bonus"
        subtitle="Acerte o campeao, artilheiro e revelacao para ganhar pontos extras ao final da Copa!"
      />

      <div className="fixture-card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {bonusLocked && (
          <div className="data-pill" style={{ background: "var(--danger-color)", color: "#fff", alignSelf: "flex-start", marginBottom: "-8px" }}>
            Palpites bonus encerrados
          </div>
        )}

        <div className="input-group">
          <label htmlFor="bonus-champion">
            <FieldLabel icon={Trophy}>Selecao Campea</FieldLabel>
          </label>
          <select 
            id="bonus-champion"
            value={championTeamId} 
            onChange={e => setChampionTeamId(e.target.value)}
            disabled={bonusLocked}
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

        <PlayerAutocompleteField
          disabled={bonusLocked}
          helperText="Vale 10 pontos."
          icon={Target}
          id="bonus-top-scorer"
          label="Artilheiro da Copa"
          onChange={setTopScorerName}
          players={players}
          placeholder="Ex: Mbappe"
          value={topScorerName}
        />

        <PlayerAutocompleteField
          disabled={bonusLocked}
          helperText="Vale 10 pontos."
          icon={Sparkles}
          id="bonus-revelation"
          label="Jogador Revelacao"
          onChange={setRevelationName}
          players={players}
          placeholder="Ex: Endrick"
          value={revelationName}
        />

        {!bonusLocked && (
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
