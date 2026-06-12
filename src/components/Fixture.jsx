import React, { useState, useEffect } from "react";
import { CalendarDays, Edit3, Lock, ListChecks, Users, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate, methodLabel, outcomeLabel, statusLabel } from "../utils/formatters";
import { isFixtureClosed, scorePrediction, DEFAULT_SCORING } from "../lib/scoring";
import { useApp } from "../contexts/AppContext.jsx";

export function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function update() {
      const now = Date.now();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      if (days > 0) setTimeLeft(`Fecha em ${days}d ${hours}h`);
      else if (hours > 0) setTimeLeft(`Fecha em ${hours}h ${minutes}m`);
      else setTimeLeft(`Fecha em ${minutes}m`);
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export function FixtureSkeleton() {
  return (
    <article className="fixture-card skeleton-card">
      <div className="skeleton-line" style={{ width: "60%" }}></div>
      <div className="matchup" style={{ marginTop: "12px", marginBottom: "12px" }}>
        <div className="skeleton-circle"></div>
        <div className="skeleton-box" style={{ width: "78px", height: "46px" }}></div>
        <div className="skeleton-circle"></div>
      </div>
      <div className="skeleton-line" style={{ height: "48px", width: "100%", borderRadius: "8px" }}></div>
    </article>
  );
}

export function FixtureCard({ fixture, prediction, onSavePrediction, settings }) {
  const [expanded, setExpanded] = useState(false);
  const closed = isFixtureClosed(fixture);
  const result = scorePrediction(fixture, prediction, settings || DEFAULT_SCORING);
  const countdown = useCountdown(fixture.kickoff);

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
              Escolha: {outcomeLabel(prediction.normalOutcome, fixture)}
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
        <span style={{ flex: 1, textAlign: "center" }}>
          {expanded ? "Fechar" : prediction ? "Editar palpite" : "Fazer palpite"}
        </span>
        {!closed && !expanded && countdown && <span className="countdown-pill">{countdown}</span>}
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

      {closed && <FixtureHistory fixture={fixture} settings={settings || DEFAULT_SCORING} />}
    </article>
  );
}

export function FixtureHistory({ fixture, settings }) {
  const { leaguePredictions, users } = useApp();
  const [expanded, setExpanded] = useState(false);

  const matchPredictions = leaguePredictions.filter((p) => p.fixtureId === fixture.id);
  if (!matchPredictions.length) return null;

  return (
    <div className="fixture-history">
      <button className="history-toggle" onClick={() => setExpanded(!expanded)}>
        <Users size={16} />
        <span>Palpites da Liga ({matchPredictions.length})</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="history-list">
          {matchPredictions.map((p) => {
            const user = users.find((u) => u.id === p.userId);
            if (!user) return null;
            const points = fixture.status === "FINISHED" ? scorePrediction(fixture, p, settings).total : null;
            return (
              <div key={p.id} className="history-item">
                <div className="history-user">
                  <div className="avatar profile-avatar-mini">{user.avatar}</div>
                  <span className="truncate">{user.name}</span>
                </div>
                <div className="history-guess">
                  <strong>{p.homeScore} x {p.awayScore}</strong>
                  {fixture.stageType === "KNOCKOUT" && <small>({teamNameById(fixture, p.qualifier)})</small>}
                </div>
                {points !== null && <b className="history-points">{points} pts</b>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TeamBadge({ team, align }) {
  return (
    <div className={`team-badge ${align}`}>
      <TeamVisual team={team} />
      <strong>{team.name}</strong>
    </div>
  );
}

export function TeamVisual({ team }) {
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

export function teamNameById(fixture, id) {
  if (fixture.home.id === id) return fixture.home.name;
  if (fixture.away.id === id) return fixture.away.name;
  return "a definir";
}

export function PredictionForm({ fixture, prediction, closed, onSubmit }) {
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
        <legend>Palpite nos 90 minutos</legend>
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
        <div className="score-inputs">
          <input
            type="number"
            min="0"
            max="20"
            value={form.homeScore}
            onChange={(e) => setScore("homeScore", e.target.value)}
            placeholder="0"
          />
          <span>X</span>
          <input
            type="number"
            min="0"
            max="20"
            value={form.awayScore}
            onChange={(e) => setScore("awayScore", e.target.value)}
            placeholder="0"
          />
        </div>
      </fieldset>

      {fixture.stageType === "KNOCKOUT" && form.normalOutcome && (
        <fieldset disabled={closed}>
          <legend>Desempate e Classificacao</legend>
          {form.normalOutcome !== "DRAW" ? (
            <p className="helper-text" style={{ margin: 0 }}>
              Como escolheu vitoria no tempo normal, consideramos que{" "}
              <strong>{teamNameById(fixture, form.qualifier)}</strong> passa sem prorrogacao ou penaltis.
            </p>
          ) : (
            <>
              <div className="choice-grid">
                {[
                  [fixture.home.id, fixture.home.name],
                  [fixture.away.id, fixture.away.name],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={form.qualifier === id ? "active" : ""}
                    onClick={() => setForm({ ...form, qualifier: id })}
                  >
                    Passa {label}
                  </button>
                ))}
              </div>
              {form.qualifier && (
                <div className="choice-grid">
                  {[
                    ["EXTRA_TIME", "Na Prorrogacao"],
                    ["PENALTIES", "Nos Penaltis"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={form.qualificationMethod === id ? "active" : ""}
                      onClick={() => setForm({ ...form, qualificationMethod: id })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </fieldset>
      )}

      <button className="primary-button full" type="submit" disabled={!canSubmit()}>
        Salvar palpite
      </button>
    </form>
  );
}
