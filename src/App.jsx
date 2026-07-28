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

  const assistant = (
    <AppAssistant
      canUseAdmin={Boolean(currentUser?.isAdmin)}
      assistantContext={{
        currentUser,
        fixtures,
        leagues,
        publicLeagues,
        activeLeague,
        membersByLeague,
        ranking,
        userPredictions,
        bonusPredictions,
        adminState,
        lastSync,
      }}
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
