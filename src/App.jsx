import React from "react";
import { LoginScreen, DisplayNameScreen, LeagueRequired, LeagueView } from "./components/AuthAndLeague.jsx";
import { Header, BottomNav } from "./components/Layout.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { GamesView } from "./components/GamesView.jsx";
import { BonusPredictions } from "./components/BonusPredictions.jsx";
import { RankingView } from "./components/RankingView.jsx";
import { ProfileView } from "./components/ProfileView.jsx";
import { AppProvider, useApp } from "./contexts/AppContext.jsx";
import { isSupabaseConfigured } from "./lib/supabase";

function AppContent() {
  const {
    profile,
    currentUser,
    activeTab,
    setActiveTab,
    leagues,
    publicLeagues,
    activeLeague,
    setActiveLeagueId,
    fixtures,
    bonusPredictions,
    userPredictions,
    leaguePredictions,
    ranking,
    profileRank,
    syncState,
    dataState,
    lastSync,
    handlePlayerAuth,
    savePrediction,
    saveBonusPrediction,
    createLeague,
    joinLeague,
    joinPublicLeague,
    updateProfile,
    handleLogout,
  } = useApp();

  if (!profile) {
    return <LoginScreen onPlayerAuth={handlePlayerAuth} isSupabaseConfigured={isSupabaseConfigured} />;
  }

  if (!profile.displayNameSet) {
    return <DisplayNameScreen onSaveName={updateProfile} />;
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
          activeLeague ? (
            <GamesView
              fixtures={fixtures}
              predictions={userPredictions}
              onSavePrediction={savePrediction}
              loading={dataState.loading && fixtures.length === 0}
              settings={activeLeague.settings}
            />
          ) : (
            <LeagueRequired setActiveTab={setActiveTab} />
          )
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
          activeLeague ? (
            <RankingView
              activeLeague={activeLeague}
              ranking={ranking}
              fixtures={fixtures}
              predictions={leaguePredictions}
            />
          ) : (
            <LeagueRequired setActiveTab={setActiveTab} />
          )
        )}

        {activeTab === "league" && (
          <LeagueView
            activeLeague={activeLeague}
            currentUser={currentUser}
            leagues={leagues}
            publicLeagues={publicLeagues}
            onCreateLeague={createLeague}
            onJoinLeague={joinLeague}
            onJoinPublicLeague={joinPublicLeague}
            onSelectLeague={setActiveLeagueId}
          />
        )}

        {activeTab === "profile" && (
          <ProfileView
            activeLeague={activeLeague}
            dataState={dataState}
            lastSync={lastSync}
            onLogout={handleLogout}
            onUpdateProfile={updateProfile}
            profile={currentUser}
            profileRank={profileRank}
            syncState={syncState}
            userPredictions={userPredictions}
            bonusPredictions={bonusPredictions || []}
            fixtures={fixtures}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
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
