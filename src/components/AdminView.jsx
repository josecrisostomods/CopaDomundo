import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck2,
  Loader2,
  ShieldCheck,
  Trash2,
  Trophy,
  UserRoundX,
  UsersRound,
} from "lucide-react";
import { FIXTURE_STATUS_OPTIONS, validateFixtureResultForm, requiredText } from "../lib/validators";
import { methodLabel, statusLabel } from "../utils/formatters";
import { ScreenHeading, StatCard } from "./Shared.jsx";

function getInitialResultForm(fixture) {
  return {
    status: fixture?.status || "SCHEDULED",
    homeScore: fixture?.homeScore ?? "",
    awayScore: fixture?.awayScore ?? "",
    winnerTeamId: fixture?.winner || "",
    classificationMethod: fixture?.classificationMethod || "",
  };
}

export function AdminView({
  adminState,
  currentUser,
  fixtures,
  onCreateLeague,
  onDeleteLeague,
  onDeleteUser,
  onRefresh,
  onUpdateFixtureResult,
}) {
  const [selectedFixtureId, setSelectedFixtureId] = useState(fixtures[0]?.id || "");
  const selectedFixture = useMemo(
    () => fixtures.find((fixture) => fixture.id === selectedFixtureId) || fixtures[0] || null,
    [fixtures, selectedFixtureId],
  );
  const [resultForm, setResultForm] = useState(() => getInitialResultForm(selectedFixture));
  const [leagueName, setLeagueName] = useState("");
  const [leagueVisibility, setLeagueVisibility] = useState("public");
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");

  useEffect(() => {
    if (!selectedFixture) return;
    setResultForm(getInitialResultForm(selectedFixture));
  }, [selectedFixture]);

  async function submitResult(event) {
    event.preventDefault();
    if (!selectedFixture) return;

    setBusyAction("result");
    setMessage("");

    try {
      const payload = validateFixtureResultForm(
        selectedFixture.stageType === "KNOCKOUT"
          ? resultForm
          : { ...resultForm, winnerTeamId: "", classificationMethod: "" },
        selectedFixture,
      );
      await onUpdateFixtureResult({ ...payload, fixture: selectedFixture });
      setMessage("Resultado atualizado.");
    } catch (error) {
      setMessage(error.message || "Nao foi possivel atualizar o resultado.");
    } finally {
      setBusyAction("");
    }
  }

  async function submitLeague(event) {
    event.preventDefault();
    setBusyAction("league");
    setMessage("");

    try {
      const name = requiredText(leagueName, "Nome da liga", 40);
      await onCreateLeague(name, leagueVisibility === "public");
      setLeagueName("");
      setMessage("Liga criada.");
    } catch (error) {
      setMessage(error.message || "Nao foi possivel criar a liga.");
    } finally {
      setBusyAction("");
    }
  }

  async function deleteUser(user) {
    const confirmed = window.confirm(`Excluir o usuario ${user.name}? Essa acao apaga palpites e participacoes dele.`);
    if (!confirmed) return;

    setBusyAction(`user-${user.id}`);
    setMessage("");

    try {
      await onDeleteUser(user.id);
      setMessage("Usuario excluido.");
    } catch (error) {
      setMessage(error.message || "Nao foi possivel excluir o usuario.");
    } finally {
      setBusyAction("");
    }
  }

  async function deleteLeague(league) {
    const confirmed = window.confirm(`Excluir a liga ${league.name}? Palpites dessa liga tambem serao apagados.`);
    if (!confirmed) return;

    setBusyAction(`league-${league.id}`);
    setMessage("");

    try {
      await onDeleteLeague(league.id);
      setMessage("Liga excluida.");
    } catch (error) {
      setMessage(error.message || "Nao foi possivel excluir a liga.");
    } finally {
      setBusyAction("");
    }
  }

  const users = adminState.users || [];
  const leagues = adminState.leagues || [];
  const totalPredictions = users.reduce((sum, user) => sum + user.predictionCount, 0);

  return (
    <section className="screen-stack">
      <ScreenHeading
        icon={ShieldCheck}
        title="Painel admin"
        subtitle="Controle usuarios, ligas e resultados oficiais da competicao."
      />

      <div className="stats-grid admin-stats">
        <StatCard icon={UsersRound} label="Usuarios" value={users.length} hint="contas cadastradas" />
        <StatCard icon={Trophy} label="Ligas" value={leagues.length} hint="publicas e privadas" />
        <StatCard icon={CalendarCheck2} label="Jogos" value={fixtures.length} hint="partidas carregadas" />
        <StatCard icon={ShieldCheck} label="Palpites" value={totalPredictions} hint="em todas as ligas" />
      </div>

      <div className="admin-actions-row">
        <button className="secondary-button" type="button" onClick={onRefresh} disabled={adminState.loading}>
          {adminState.loading ? <Loader2 size={17} className="spin-icon" /> : <ShieldCheck size={17} />}
          Atualizar painel
        </button>
        {message && <p className="form-message">{message}</p>}
      </div>

      <div className="two-column">
        <section className="panel form-panel">
          <div className="panel-title">
            <CalendarCheck2 size={20} />
            <h2>Editar resultado</h2>
          </div>

          <form className="profile-form" onSubmit={submitResult}>
            <label>
              Jogo
              <select value={selectedFixture?.id || ""} onChange={(event) => setSelectedFixtureId(event.target.value)}>
                {fixtures.map((fixture) => (
                  <option key={fixture.id} value={fixture.id}>
                    {fixture.home.name} x {fixture.away.name} - {fixture.phase}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={resultForm.status}
                onChange={(event) => setResultForm({ ...resultForm, status: event.target.value })}
              >
                {FIXTURE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <div className="score-inputs">
              <label>
                {selectedFixture?.home.name || "Casa"}
                <input
                  inputMode="numeric"
                  type="number"
                  min="0"
                  max="99"
                  value={resultForm.homeScore}
                  onChange={(event) => setResultForm({ ...resultForm, homeScore: event.target.value })}
                  placeholder="0"
                />
              </label>
              <span>X</span>
              <label>
                {selectedFixture?.away.name || "Visitante"}
                <input
                  inputMode="numeric"
                  type="number"
                  min="0"
                  max="99"
                  value={resultForm.awayScore}
                  onChange={(event) => setResultForm({ ...resultForm, awayScore: event.target.value })}
                  placeholder="0"
                />
              </label>
            </div>

            {selectedFixture?.stageType === "KNOCKOUT" && (
              <>
                <label>
                  Quem passou
                  <select
                    value={resultForm.winnerTeamId}
                    onChange={(event) => setResultForm({ ...resultForm, winnerTeamId: event.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value={selectedFixture.home.id}>{selectedFixture.home.name}</option>
                    <option value={selectedFixture.away.id}>{selectedFixture.away.name}</option>
                  </select>
                </label>

                <label>
                  Forma de classificacao
                  <select
                    value={resultForm.classificationMethod}
                    onChange={(event) => setResultForm({ ...resultForm, classificationMethod: event.target.value })}
                  >
                    <option value="">Selecione</option>
                    {["NORMAL_TIME", "EXTRA_TIME", "PENALTIES"].map((method) => (
                      <option key={method} value={method}>
                        {methodLabel(method)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <button className="primary-button full" disabled={!selectedFixture || busyAction === "result"}>
              {busyAction === "result" ? "Salvando..." : "Salvar resultado"}
            </button>
          </form>
        </section>

        <section className="panel form-panel">
          <div className="panel-title">
            <Trophy size={20} />
            <h2>Criar liga</h2>
          </div>

          <form className="profile-form" onSubmit={submitLeague}>
            <label>
              Nome da liga
              <input
                value={leagueName}
                onChange={(event) => setLeagueName(event.target.value)}
                placeholder="Ex: Amigos da Copa"
                maxLength={40}
              />
            </label>
            <div className="segmented compact-segmented">
              <button
                type="button"
                className={leagueVisibility === "public" ? "active" : ""}
                onClick={() => setLeagueVisibility("public")}
              >
                Publica
              </button>
              <button
                type="button"
                className={leagueVisibility === "private" ? "active" : ""}
                onClick={() => setLeagueVisibility("private")}
              >
                Privada
              </button>
            </div>
            <button className="secondary-button full" disabled={busyAction === "league"}>
              {busyAction === "league" ? "Criando..." : "Criar liga"}
            </button>
          </form>
        </section>
      </div>

      <section className="panel list-panel">
        <div className="panel-title">
          <UserRoundX size={20} />
          <h2>Usuarios</h2>
        </div>
        <div className="admin-table">
          {users.map((user) => (
            <article key={user.id} className="admin-row">
              <div className="history-user">
                <div className="avatar profile-avatar-mini">{user.avatar}</div>
                <div className="admin-row-info">
                  <strong>{user.name}</strong>
                  <small>@{user.username} {user.isAdmin ? "admin" : "jogador"}</small>
                </div>
              </div>
              <span>{user.leagueCount} liga(s)</span>
              <span>{user.predictionCount} palpite(s)</span>
              <button
                className="icon-danger-button"
                type="button"
                onClick={() => deleteUser(user)}
                disabled={user.id === currentUser.id || busyAction === `user-${user.id}`}
                title="Excluir usuario"
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel list-panel">
        <div className="panel-title">
          <Trophy size={20} />
          <h2>Ligas</h2>
        </div>
        <div className="admin-table">
          {leagues.map((league) => (
            <article key={league.id} className="admin-row league-admin-row">
              <div className="admin-row-info">
                <strong>{league.name}</strong>
                <small>
                  {league.isPublic ? "Publica" : "Privada"} - codigo {league.code} - dono {league.ownerName}
                </small>
              </div>
              <span>{league.memberCount} membro(s)</span>
              <span>{league.predictionCount} palpite(s)</span>
              <button
                className="icon-danger-button"
                type="button"
                onClick={() => deleteLeague(league)}
                disabled={busyAction === `league-${league.id}`}
                title="Excluir liga"
              >
                <Trash2 size={17} />
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
