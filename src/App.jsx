import React from "react";
import { LoginScreen, RecoveryCodeScreen, DisplayNameScreen, LeagueRequired, LeagueView } from "./components/AuthAndLeague.jsx";
import { Header, BottomNav } from "./components/Layout.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { GamesView } from "./components/GamesView.jsx";
import { BonusPredictions } from "./components/BonusPredictions.jsx";
import { RankingView } from "./components/RankingView.jsx";
import { ProfileView } from "./components/ProfileView.jsx";
import { AdminView } from "./components/AdminView.jsx";
import { AppAssistant } from "./components/AdminAssistant.jsx";
import { AppProvider, useApp } from "./contexts/AppContext.jsx";
import { isSupabaseConfigured } from "./lib/supabase";

function AppContent() {
  const {
    profile,
    currentUser,
    recoveryCode,
    clearRecoveryCode,
    activeTab,
    setActiveTab,
    leagues,
    publicLeagues,
    activeLeague,
    setActiveLeagueId,
    membersByLeague,
    fixtures,
    bonusPredictions,
    userPredictions,
    leaguePredictions,
    ranking,
    profileRank,
    adminState,
    sessionToken,
    syncState,
    dataState,
    lastSync,
    handlePlayerAuth,
    savePrediction,
    saveBonusPrediction,
    createLeague,
    joinLeague,
    joinPublicLeague,
    removeLeagueMember,
    updateProfile,
    generateRecoveryCode,
    refreshAdminState,
    adminUpdateFixtureResult,
    adminCreateLeague,
    adminUpdateLeague,
    adminUpsertPlayer,
    adminDeleteUser,
    adminDeleteLeague,
    handleLogout,
  } = useApp();

  async function confirmAssistantAction(action) {
    if (!currentUser?.isAdmin) throw new Error("Acesso administrativo não autorizado.");
    const args = action.arguments || {};

    switch (action.name) {
      case "create_league":
        return adminCreateLeague(args.name, args.is_public);
      case "update_league":
        return adminUpdateLeague({
          leagueId: args.league_id,
          name: args.name,
          isPublic: args.is_public,
        });
      case "delete_league":
        return adminDeleteLeague(args.league_id);
      case "delete_user":
        if (args.user_id === currentUser.id) throw new Error("Você não pode excluir sua própria conta.");
        return adminDeleteUser(args.user_id);
      case "update_fixture_result": {
        const fixture = fixtures.find((item) => item.id === args.fixture_id);
        if (!fixture) throw new Error("A partida não foi encontrada nos dados atuais.");
        return adminUpdateFixtureResult({
          fixtureId: args.fixture_id,
          status: args.status,
          homeScore: args.home_score,
          awayScore: args.away_score,
          winnerTeamId: args.winner_team_id,
          classificationMethod: args.classification_method,
          fixture,
        });
      }
      default:
        throw new Error("Ação administrativa não permitida.");
    }
  }

  const assistant = (
    <AppAssistant
      sessionToken={sessionToken}
      canUseAdmin={Boolean(currentUser?.isAdmin)}
      onConfirmAction={confirmAssistantAction}
    />
  );

  if (!profile) {
    return (
      <>
        <LoginScreen onPlayerAuth={handlePlayerAuth} isSupabaseConfigured={isSupabaseConfigured} />
        {assistant}
      </>
    );
  }

  if (recoveryCode) {
    return (
      <>
        <RecoveryCodeScreen code={recoveryCode} onContinue={clearRecoveryCode} />
        {assistant}
      </>
    );
  }

  if (!profile.displayNameSet) {
    return (
      <>
        <DisplayNameScreen onSaveName={updateProfile} />
        {assistant}
      </>
    );
  }

  return (
    <div className="app-shell">
      <Header
        activeTab={activeTab}
        activeLeague={activeLeague}
        dataState={dataState}
        lastSync={lastSync}
        profile={currentUser}
        setActiveTab={setActiveTab}
        syncState={syncState}
        onLogout={handleLogout}
      />

      <main className="app-main">
        {activeTab === "home" && (
          <Dashboard
            activeLeague={activeLeague}
            fixtures={fixtures}
            lastSync={lastSync}
            profileRank={profileRank}
            ranking={ranking}
            setActiveTab={setActiveTab}
            syncState={syncState}
            userPredictions={userPredictions}
          />
        )}

        {activeTab === "games" && (
          <GamesView
            fixtures={fixtures}
            predictions={userPredictions}
            onSavePrediction={savePrediction}
            loading={dataState.loading && fixtures.length === 0}
            settings={activeLeague?.settings}
          />
        )}

        {activeTab === "bonus" && (
          activeLeague ? (
            <BonusPredictions
              fixtures={fixtures}
              bonusPredictions={bonusPredictions || []}
              onSaveBonusPrediction={saveBonusPrediction}
            />
          ) : (
            <LeagueRequired setActiveTab={setActiveTab} />
          )
        )}

        {activeTab === "ranking" && (
          <RankingView
            activeLeague={activeLeague}
            ranking={ranking}
            fixtures={fixtures}
            predictions={leaguePredictions}
          />
        )}

        {activeTab === "league" && (
          <LeagueView
            activeLeague={activeLeague}
            currentUser={currentUser}
            leagues={leagues}
            members={membersByLeague[activeLeague?.id] || []}
            publicLeagues={publicLeagues}
            onCreateLeague={createLeague}
            onJoinLeague={joinLeague}
            onJoinPublicLeague={joinPublicLeague}
            onRemoveLeagueMember={removeLeagueMember}
            onSelectLeague={setActiveLeagueId}
          />
        )}

        {activeTab === "profile" && (
          <ProfileView
            activeLeague={activeLeague}
            dataState={dataState}
            lastSync={lastSync}
            onLogout={handleLogout}
            onGenerateRecoveryCode={generateRecoveryCode}
            onUpdateProfile={updateProfile}
            profile={currentUser}
            profileRank={profileRank}
            syncState={syncState}
            userPredictions={userPredictions}
            bonusPredictions={bonusPredictions || []}
            fixtures={fixtures}
          />
        )}

        {activeTab === "admin" && currentUser?.isAdmin && (
          <AdminView
            adminState={adminState}
            currentUser={currentUser}
            fixtures={fixtures}
            onCreateLeague={adminCreateLeague}
            onDeleteLeague={adminDeleteLeague}
            onDeleteUser={adminDeleteUser}
            onRefresh={refreshAdminState}
            onUpdateLeague={adminUpdateLeague}
            onUpdateFixtureResult={adminUpdateFixtureResult}
            onUpsertPlayer={adminUpsertPlayer}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} profile={currentUser} setActiveTab={setActiveTab} />
      {assistant}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
