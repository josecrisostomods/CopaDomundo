import React from "react";
import { Crown, ClipboardList, CheckCircle2, Gauge, Edit3, CalendarDays, Medal } from "lucide-react";
import { formatTime, formatDate } from "../utils/formatters";
import { StatCard } from "./Shared.jsx";

export function Dashboard({
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
          <h1>{activeLeague?.name || "Entre em uma liga"}</h1>
          <p>
            {activeLeague
              ? "Veja os proximos jogos, complete seus palpites e acompanhe o ranking da turma."
              : "Voce ja pode palpitar agora. Quando entrar em uma liga, seus pontos entram no ranking automaticamente."}
          </p>
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
        <StatCard icon={Gauge} label="Atualizacao" value={formatTime(lastSync)} hint={syncState.loading ? "buscando partidas" : "automatica"} />
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
            {!ranking.length && <p className="helper-text">Seu ranking aparece quando seus palpites comecarem a pontuar.</p>}
          </div>
        </section>
      </div>
    </section>
  );
}
