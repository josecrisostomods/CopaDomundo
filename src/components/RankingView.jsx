import React from "react";
import { Trophy, UsersRound, CheckCircle2, ClipboardList, Medal } from "lucide-react";
import { ScreenHeading, StatCard } from "./Shared.jsx";

export function RankingView({ activeLeague, ranking, fixtures, predictions }) {
  const finished = fixtures.filter((fixture) => fixture.status === "FINISHED").length;
  const totalPoints = ranking.reduce((sum, user) => sum + user.points, 0);

  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={Trophy}
        title={`Ranking - ${activeLeague?.name}`}
        subtitle="Desempate por placares exatos, acertos no mata-mata, palpites feitos e nome."
      />

      <div className="stats-grid">
        <StatCard icon={UsersRound} label="Participantes" value={ranking.length} hint="nesta liga" />
        <StatCard icon={CheckCircle2} label="Jogos finalizados" value={finished} hint="pontuando agora" />
        <StatCard icon={ClipboardList} label="Palpites" value={predictions.length} hint="enviados na liga" />
        <StatCard icon={Medal} label="Pontos somados" value={totalPoints} hint="todos os jogadores" />
      </div>

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
    </section>
  );
}
