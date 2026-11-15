import { useState } from 'react';
import { IconBat, IconBoard, IconDashboard, IconHistory, IconPlayers, StumpsMark } from './components/Icons';
import { formatSigned } from './format';
import { StoreProvider, useStore } from './store';
import type { AppView } from './types';
import { Dashboard } from './views/Dashboard';
import { History } from './views/History';
import { Leaderboard } from './views/Leaderboard';
import { LiveMatch } from './views/LiveMatch';
import { Players } from './views/Players';

const NAV: { id: AppView; label: string; icon: typeof IconDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: IconDashboard },
  { id: 'players', label: 'Players', icon: IconPlayers },
  { id: 'live', label: 'Live Match', icon: IconBat },
  { id: 'leaderboard', label: 'Leaderboard', icon: IconBoard },
  { id: 'history', label: 'Match History', icon: IconHistory },
];

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const [view, setView] = useState<AppView>('dashboard');
  const { ready, loadError, reload, notice, flashes, dismissNotice } = useStore();
  const current = NAV.find((item) => item.id === view);

  if (!ready) {
    return (
      <div className="boot">
        {loadError ? (
          <>
            <p role="alert">{loadError}</p>
            <button type="button" className="btn primary" onClick={reload}>
              Try again
            </button>
          </>
        ) : (
          <p>Loading scorebook…</p>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <StumpsMark className="brand-mark" />
          <div>
            <p className="brand-name">Crease</p>
            <p className="brand-tag">Score & points</p>
          </div>
        </div>
        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={active ? 'nav-btn active' : 'nav-btn'}
                aria-current={active ? 'page' : undefined}
                onClick={() => setView(item.id)}
              >
                <Icon />
                {item.label}
              </button>
            );
          })}
        </nav>
        <p className="sidebar-foot">Scores are saved in the shared database, including on your phone.</p>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <div className="brand compact">
            <StumpsMark className="brand-mark" />
            <p className="brand-name">Crease</p>
          </div>
          <p>{current?.label}</p>
        </header>
        <main className="content">
          {notice ? (
            <div className="notice" role="alert">
              <span>{notice}</span>
              <button type="button" onClick={dismissNotice} aria-label="Dismiss message">
                Dismiss
              </button>
            </div>
          ) : null}
          {view === 'dashboard' ? <Dashboard onNavigate={setView} /> : null}
          {view === 'players' ? <Players /> : null}
          {view === 'live' ? <LiveMatch /> : null}
          {view === 'leaderboard' ? <Leaderboard /> : null}
          {view === 'history' ? <History /> : null}
        </main>
      </div>
      <div className="flash-stack" aria-live="polite">
        {flashes.map((flash) => (
          <div
            key={flash.id}
            className={`flash${flash.detail.includes('milestone') ? ' milestone' : ''}${flash.amount < 0 ? ' down' : ''}`}
          >
            <strong>{flash.playerName}</strong>
            <span>{formatSigned(flash.amount)}</span>
            <small>{flash.detail}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
