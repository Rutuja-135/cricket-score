import { useState } from 'react';
import { Modal } from '../components/Modal';
import { describeEvent, formatWhen } from '../format';
import { inningsBreakdown, matchScore, tallyEvents } from '../scoring';
import { useStore } from '../store';
import type { Match } from '../types';

export function History() {
  const { state, deleteMatch } = useStore();
  const [openId, setOpenId] = useState<string | null>(state.matches[0]?.id ?? null);
  const [pendingDelete, setPendingDelete] = useState<Match | null>(null);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Scorecards</p>
          <h1>Match history</h1>
        </div>
      </header>

      {state.matches.length === 0 ? (
        <div className="empty">
          <h2>No saved matches</h2>
          <p>Finish a live match with Save match. Player profiles stay even if you later reset a new game.</p>
        </div>
      ) : (
        <div className="history-list">
          {state.matches.map((match, index) => {
            const score = matchScore(match.events);
            const open = openId === match.id;
            return (
              <article key={match.id} className="panel history-card">
                <button
                  type="button"
                  className="history-toggle"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : match.id)}
                >
                  <span>
                    <strong>{match.title}</strong>
                    <span className="hint block">{formatWhen(match.completedAt ?? match.startedAt)}</span>
                  </span>
                  <span className="history-score">
                    {score.runs}/{score.wickets}
                  </span>
                </button>
                {open ? (
                  <div className="history-body" aria-label={`${match.title} scorecard`}>
                    <div className="table-wrap">
                      <table className="board">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Runs</th>
                            <th>4s</th>
                            <th>6s</th>
                            <th>W</th>
                            <th>C</th>
                            <th>Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {match.roster.map((entry) => {
                            const tally = tallyEvents(match.events, entry.playerId);
                            const points = inningsBreakdown(match.events, entry.playerId);
                            return (
                              <tr key={entry.playerId}>
                                <th scope="row">{entry.name}</th>
                                <td data-testid={`history-${index}-runs-${entry.name}`}>{tally.runs}</td>
                                <td>{tally.fours}</td>
                                <td>{tally.sixes}</td>
                                <td data-testid={`history-${index}-wickets-${entry.name}`}>{tally.wickets}</td>
                                <td data-testid={`history-${index}-catches-${entry.name}`}>{tally.catches}</td>
                                <td data-testid={`history-${index}-points-${entry.name}`}>{points.total}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <ol className="feed compact">
                      {match.events.map((event, eventIndex) => (
                        <li key={event.id}>
                          <span className="event-no">{eventIndex + 1}</span>
                          <span>{describeEvent(event, (id) => match.roster.find((entry) => entry.playerId === id)?.name ?? 'Player')}</span>
                        </li>
                      ))}
                    </ol>
                    <button type="button" className="btn danger" onClick={() => setPendingDelete(match)}>
                      Delete {match.title}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {pendingDelete ? (
        <Modal title="Delete match" onClose={() => setPendingDelete(null)}>
          <p>Delete {pendingDelete.title}? Player profiles stay. Their points from this match leave the leaderboard.</p>
          <div className="confirm-actions">
            <button type="button" className="btn ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                deleteMatch(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Confirm delete
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
