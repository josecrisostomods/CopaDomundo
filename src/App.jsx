import React from "react";
import { LoginScreen, DisplayNameScreen, LeagueRequired, LeagueView } from "./components/AuthAndLeague.jsx";
import { Header, BottomNav } from "./components/Layout.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { GamesView } from "./components/GamesView.jsx";
import { RankingView } from "./components/RankingView.jsx";
import { ProfileView } from "./components/ProfileView.jsx";
import { AppProvider, useApp } from "./contexts/AppContext.jsx";

function AppContent() {
  const {
    profile,
    currentUser,
    activeTab,
    setActiveTab,
    activeLeague,
    activeLeagueId,
    setActiveLeagueId,
    fixtures,
    predictions,
    userPredictions,
    leaguePredictions,
    membersByLeague,
    users,
    ranking,
    profileRank,
    sessionToken,
    syncState,
    dataState,
    lastSync,
    handlePlayerAuth,
    savePrediction,
    createLeague,
    joinLeague,
    updateProfile,
    handleLogout,
  } = useApp();

  if (!profile) {
    return <LoginScreen onPlayerAuth={handlePlayerAuth} />;
  }

  if (!profile.displayNameSet) {
    return <DisplayNameScreen profile={profile} onSaveName={updateProfile} />;
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
            activeLeagueId={activeLeagueId}
            onCreateLeague={createLeague}
            onJoinLeague={joinLeague}
            setActiveLeagueId={setActiveLeagueId}
            setActiveTab={setActiveTab}
            users={users}
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
