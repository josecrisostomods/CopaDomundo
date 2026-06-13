import React, { useState, useMemo } from "react";
import { Trophy, UsersRound, CheckCircle2, ClipboardList, Medal, CalendarDays } from "lucide-react";
import { StatCard } from "./Shared.jsx";
import { PerformanceChart } from "./PerformanceChart.jsx";
import { useApp } from "../contexts/AppContext.jsx";
import { buildRanking } from "../lib/scoring.js";

export function RankingView({ activeLeague, ranking: globalRanking, fixtures, predictions }) {
  const [viewMode, setViewMode] = useState("table");
  const [period, setPeriod] = useState("all");
  const { users, leagues, setActiveLeagueId } = useApp();

  const ranking = useMemo(() => {
    if (period === "all") return globalRanking;

    let filteredFixtures = fixtures;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (period === "today") {
      filteredFixtures = fixtures.filter(f => f.kickoff.startsWith(todayStr));
    } else if (period === "yesterday") {
      filteredFixtures = fixtures.filter(f => f.kickoff.startsWith(yesterdayStr));
    } else if (period === "last-7-days") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filteredFixtures = fixtures.filter(f => {
        const d = new Date(f.kickoff);
        return d >= sevenDaysAgo && d <= now;
      });
    } else if (period.startsWith("date-")) {
      const dateStr = period.replace("date-", "");
      filteredFixtures = fixtures.filter(f => f.kickoff.startsWith(dateStr));
    }

    return buildRanking(users, filteredFixtures, predictions, activeLeague?.settings);
  }, [period, globalRanking, fixtures, predictions, users, activeLeague]);

  const finished = fixtures.filter((fixture) => fixture.status === "FINISHED").length;
  const uniqueDates = [...new Set(fixtures.filter(f => f.status === "FINISHED").map(f => f.kickoff.split('T')[0]))].sort().reverse();

  const totalPoints = ranking.reduce((sum, user) => sum + user.points, 0);

  return (
    <section className="screen-stack">
      <div className="ranking-header-selector" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--panel-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
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

      <div className="period-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--panel-bg)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
        <CalendarDays size={20} style={{ color: 'var(--text-secondary)' }} />
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          style={{
            flex: 1,
            padding: '8px',
            borderRadius: '8px',
            background: 'var(--bg-color)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-color)',
            fontSize: '0.95rem'
          }}
        >
          <optgroup label="Visao Geral">
            <option value="all">Todo o campeonato</option>
            <option value="today">Apenas os jogos de Hoje</option>
            <option value="yesterday">Jogos de Ontem</option>
            <option value="last-7-days">Ultimos 7 dias</option>
          </optgroup>
          {uniqueDates.length > 0 && (
            <optgroup label="Por Dia Específico">
              {uniqueDates.map(date => {
                const parts = date.split('-');
                const label = `${parts[2]}/${parts[1]}`;
                return <option key={date} value={`date-${date}`}>Jogos do dia {label}</option>;
              })}
            </optgroup>
          )}
        </select>
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
