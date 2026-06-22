import React, { useState } from "react";
import { Search, CalendarDays } from "lucide-react";
import { ScreenHeading } from "./Shared.jsx";
import { FixtureCard, FixtureSkeleton } from "./Fixture.jsx";
import { isFixtureClosed } from "../lib/scoring";

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
        subtitle={`${fixtures.length} jogos no calendario. No mata-mata, escolha tambem quem passa e como passa.`}
      />

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
