import React from "react";
import { formatTime } from "../utils/formatters";
import { navItems } from "../config/appConfig";

function getVisibleNavItems(profile) {
  return navItems.filter((item) => !item.adminOnly || profile?.isAdmin);
}

export function Header({ activeTab, activeLeague, dataState, lastSync, profile, setActiveTab, syncState, onLogout }) {
  const statusMessage = syncState.loading
    ? "Atualizando partidas..."
    : syncState.message || dataState.message || `Atualizado: ${formatTime(lastSync)}`;
  const visibleNavItems = getVisibleNavItems(profile);

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img src="/world-cup-mark.svg" alt="" />
        <div>
          <strong>Copa Palpites</strong>
          <span>{activeLeague?.name || "Sem liga ativa"}</span>
        </div>
      </div>

      <nav className="desktop-nav">
        {visibleNavItems.map((item) => (
          <button
            key={item.id}
            className={activeTab === item.id ? "active" : ""}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </nav>

      {statusMessage && (
        <div className={`data-pill ${dataState.loading || syncState.loading ? "loading" : ""}`}>
          {statusMessage}
        </div>
      )}

      <div className="profile-chip">
        <span>{profile.avatar}</span>
        <button onClick={onLogout}>Sair</button>
      </div>
    </header>
  );
}

export function BottomNav({ activeTab, profile, setActiveTab }) {
  const visibleNavItems = getVisibleNavItems(profile);

  return (
    <nav className="bottom-nav" style={{ "--nav-count": visibleNavItems.length }}>
      {visibleNavItems.map((item) => (
        <button
          key={item.id}
          className={activeTab === item.id ? "active" : ""}
          onClick={() => setActiveTab(item.id)}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
