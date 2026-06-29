import React, { useState } from "react";
import { Search, CalendarDays, CircleHelp } from "lucide-react";
import { ScreenHeading } from "./Shared.jsx";
import { FixtureCard, FixtureSkeleton } from "./Fixture.jsx";
import { DEFAULT_SCORING, isFixtureClosed } from "../lib/scoring";

function ScoringRules({ settings }) {
  const scoring = settings || DEFAULT_SCORING;
  const knockoutMaximum = scoring.exactScore + scoring.qualifier + scoring.qualificationMethod;

  return (
    <details className="scoring-rules">
      <summary>
        <span>
          <CircleHelp size={19} />
          <strong>Como funciona a pontuacao?</strong>
        </span>
        <small>Ver regras</small>
      </summary>
      <div className="scoring-rules-grid">
        <section>
          <strong>Fase de grupos</strong>
          <ul>
            <li>Resultado correto: <b>+{scoring.outcome} pontos</b></li>
            <li>Placar exato: <b>{scoring.exactScore} pontos no total</b></li>
          </ul>
          <small>O placar exato substitui os pontos do resultado.</small>
        </section>
        <section className="knockout-rules">
          <strong>Mata-mata</strong>
          <ul>
            <li>Placar exato: <b>+{scoring.exactScore} pontos</b></li>
            <li>Quem se classifica: <b>+{scoring.qualifier} pontos</b></li>
            <li>Como se classifica: <b>+{scoring.qualificationMethod} pontos</b></li>
          </ul>
          <small>Voce pode somar ate {knockoutMaximum} pontos por jogo.</small>
        </section>
      </div>
    </details>
  );
}

export function GamesView({ fixtures, predictions, onSavePrediction, loading, settings }) {
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
        subtitle={`${fixtures.length} jogos no calendario. Informe o placar e, no mata-mata, como o classificado passou.`}
      />

      <ScoringRules settings={settings} />

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar selecao ou fase" />
        </div>
        <div className="segmented">
          {[
            ["open", "Abertos"],
            ["results", "Finalizados"],
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
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <FixtureSkeleton key={i} />)
        ) : (
          filteredFixtures.map((fixture) => (
            <FixtureCard
              key={fixture.id}
              fixture={fixture}
              prediction={predictions.find((item) => item.fixtureId === fixture.id)}
              onSavePrediction={onSavePrediction}
              settings={settings}
            />
          ))
        )}
      </div>

      {!loading && !filteredFixtures.length && (
        <div className="empty-state">
          <CalendarDays size={24} />
          <strong>Nenhum jogo neste filtro</strong>
          <span>Use o filtro Todos ou aguarde a atualizacao automatica para carregar novas partidas.</span>
        </div>
      )}
    </section>
  );
}
