import React, { useState } from "react";
import { Trophy, UsersRound, CheckCircle2, ClipboardList, Medal } from "lucide-react";
import { ScreenHeading, StatCard } from "./Shared.jsx";
import { PerformanceChart } from "./PerformanceChart.jsx";
import { useApp } from "../contexts/AppContext.jsx";

export function RankingView({ activeLeague, ranking, fixtures, predictions }) {
  const [viewMode, setViewMode] = useState("table");
  const { users, leagues, setActiveLeagueId } = useApp();

  const finished = fixtures.filter((fixture) => fixture.status === "FINISHED").length;
  const totalPoints = ranking.reduce((sum, user) => sum + user.points, 0);

  return (
    <section className="screen-stack">
      <div className="ranking-header-selector" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--panel-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <Trophy size={28} style={{ color: 'var(--primary-color)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-secondary)' }}>Ranking da Liga</h2>
          {leagues.length > 1 ? (
            <select
              value={activeLeague?.id || ""}
              onChange={(e) => setActiveLeagueId(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-color)',
                fontSize: '1rem',
                fontWeight: 'bold',
                width: '100%',
                cursor: 'pointer'
              }}
            >
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          ) : (
            <strong style={{ fontSize: '1.2rem', color: 'var(--text-color)' }}>{activeLeague?.name}</strong>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={UsersRound} label="Participantes" value={ranking.length} hint="nesta liga" />
        <StatCard icon={CheckCircle2} label="Jogos finalizados" value={finished} hint="pontuando agora" />
        <StatCard icon={ClipboardList} label="Palpites" value={predictions.length} hint="enviados na liga" />
        <StatCard icon={Medal} label="Pontos somados" value={totalPoints} hint="todos os jogadores" />
      </div>

      <div className="toolbar" style={{ marginTop: "16px", marginBottom: "16px", justifyContent: "center" }}>
        <div className="segmented">
          <button className={viewMode === "table" ? "active" : ""} onClick={() => setViewMode("table")}>
            Tabela de Classificacao
          </button>
          <button className={viewMode === "chart" ? "active" : ""} onClick={() => setViewMode("chart")}>
            Grafico de Desempenho
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
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
      ) : (
        <PerformanceChart
          users={users}
          fixtures={fixtures}
          predictions={predictions}
          settings={activeLeague?.settings}
        />
      )}
    </section>
  );
}
