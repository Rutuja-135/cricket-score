import { highlights, leaderboard, liveSnapshot } from '../stats';
import { useStore } from '../store';
import type { AppView } from '../types';

interface DashboardProps {
  onNavigate: (view: AppView) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { state } = useStore();
  const summary = highlights(state);
  const live = liveSnapshot(state);
  const board = leaderboard(state, 'career').slice(0, 5);
  const recent = state.matches.slice(0, 3);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Night match</p>
          <h1>Dashboard</h1>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={() => onNavigate(!live && state.players.length < 2 ? 'players' : 'live')}
        >
          {live ? 'Open scorer' : state.players.length < 2 ? 'Add players' : 'Go to live match'}
        </button>
      </header>

      <section className="stat-grid" aria-label="Season summary">
        <button type="button" className="stat-card" onClick={() => onNavigate('players')}>
          <p className="label">Total players</p>
          <p className="value">{summary.totalPlayers}</p>
          <p className="hint">Profiles on this device</p>
        </button>
        <button type="button" className="stat-card" onClick={() => onNavigate('history')}>
          <p className="label">Total matches</p>
          <p className="value" data-testid="total-matches">
            {summary.totalMatches}
          </p>
          <p className="hint">{state.liveMatch ? 'Includes the live match' : 'Saved matches'}</p>
        </button>
        <article className="stat-card">
          <p className="label">Highest scorer</p>
          <p className="value">{summary.highestScorer ? summary.highestScorer.name : '—'}</p>
          <p className="hint">{summary.highestScorer ? `${summary.highestScorer.runs} runs` : 'No scores yet'}</p>
        </article>
        <article className="stat-card accent">
          <p className="label">Highest individual points</p>
          <p className="value">{summary.highestPoints ? summary.highestPoints.points : '—'}</p>
          <p className="hint">{summary.highestPoints ? summary.highestPoints.name : 'Points appear as you score'}</p>
        </article>
      </section>

      <section className="panel live-banner">
        <div className="panel-head">
          <h2>Live match</h2>
          {live ? <span className="live-dot">Live</span> : null}
        </div>
        {live ? (
          <div className="live-grid">
            <div>
              <p className="eyebrow">{live.title}</p>
              <p className="score-figure" data-testid="dashboard-score">
                {live.runs}/{live.wickets}
              </p>
            </div>
            <div className="crease-mini">
              <p className="label">Batting</p>
              <strong>{live.strikerName ?? 'Select a batsman'}</strong>
              <span>
                {live.strikerRuns} runs · {live.strikerPoints} pts
              </span>
            </div>
            <button type="button" className="btn primary" onClick={() => onNavigate('live')}>
              Continue scoring
            </button>
          </div>
        ) : (
          <div className="empty compact">
            <p>No match is in progress.</p>
            <button type="button" className="btn primary" onClick={() => onNavigate('live')}>
              Start from the scorer
            </button>
          </div>
        )}
      </section>

      <div className="split-panels">
        <section className="panel">
          <div className="panel-head">
            <h2>Leaderboard</h2>
            <button type="button" className="btn ghost" onClick={() => onNavigate('leaderboard')}>
              Full table
            </button>
          </div>
          {board.length === 0 ? (
            <p className="empty compact">Add players to start the table.</p>
          ) : (
            <ol className="mini-board">
              {board.map((row) => (
                <li key={row.playerId} className={row.rank <= 3 ? `medal medal-${row.rank}` : undefined}>
                  <span className="rank-num">{row.rank}</span>
                  <span>{row.name}</span>
                  <strong>{row.points} pts</strong>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>How points work</h2>
          </div>
          <ul className="legend">
            <li>
              <span>Every 5 runs</span>
              <strong>1 pt</strong>
            </li>
            <li>
              <span>Each four</span>
              <strong>3 pts</strong>
            </li>
            <li>
              <span>Each six</span>
              <strong>5 pts</strong>
            </li>
            <li>
              <span>Wicket or catch</span>
              <strong>10 pts</strong>
            </li>
            <li>
              <span>25, 50, 75, 100</span>
              <strong>10 pts each</strong>
            </li>
          </ul>
          <p className="hint legend-note">
            Fours and sixes are added on top of run points. Each milestone is awarded once per innings. Points are
            recalculated from the ball history, so an undo never doubles them.
          </p>
          <details className="example">
            <summary>25 runs, two fours, two sixes</summary>
            <p>Run points 5 + fours 6 + sixes 10 + 25-run bonus 10 = 31 points.</p>
          </details>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>Recent matches</h2>
          <button type="button" className="btn ghost" onClick={() => onNavigate('history')}>
            Match history
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="empty compact">Saved matches will land here.</p>
        ) : (
          <ul className="recent-list">
            {recent.map((match) => {
              const runs = match.events.reduce((sum, event) => sum + (event.kind === 'runs' ? event.runs : 0), 0);
              const wickets = match.events.filter((event) => event.kind === 'wicket').length;
              return (
                <li key={match.id}>
                  <span>{match.title}</span>
                  <strong>
                    {runs}/{wickets}
                  </strong>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
