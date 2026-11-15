import { useState } from 'react';
import { ROLE_LABEL } from '../format';
import { MILESTONES } from '../scoring';
import { leaderboard, type BoardScope } from '../stats';
import { useStore } from '../store';

export function Leaderboard() {
  const { state } = useStore();
  const [scope, setScope] = useState<BoardScope>('career');
  const rows = leaderboard(state, scope);
  const showPodium = rows.some((row) => row.points > 0);
  const podium = [rows[1], rows[0], rows[2]].filter((row) => row && row.points > 0);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Ranked by points</p>
          <h1>Leaderboard</h1>
        </div>
        <div className="segmented" role="group" aria-label="Leaderboard scope">
          <button type="button" aria-pressed={scope === 'career'} onClick={() => setScope('career')}>
            Overall
          </button>
          {state.liveMatch ? (
            <button type="button" aria-pressed={scope === 'match'} onClick={() => setScope('match')}>
              This match
            </button>
          ) : null}
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="empty">
          <h2>No rankings yet</h2>
          <p>{scope === 'match' ? 'Start a live match to rank this innings.' : 'Add players to build the table.'}</p>
        </div>
      ) : (
        <>
          {showPodium ? (
            <div className="podium">
              {podium.map((row) =>
                row ? (
                  <article key={row.playerId} className={`podium-card medal-${row.rank}`}>
                    <p className="podium-place">{ordinal(row.rank)}</p>
                    <h2>{row.name}</h2>
                    <p className="podium-points">{row.points}</p>
                    <p className="hint">
                      {row.runs} runs · {row.wickets} wkts · {row.catches} catches
                    </p>
                  </article>
                ) : null,
              )}
            </div>
          ) : (
            <p className="empty compact">Ranks are ready. Points will light up the podium after the first scoring shot.</p>
          )}

          <div className="table-wrap panel">
            <table className="board">
              <caption className="sr">
                {scope === 'match' ? 'This match rankings' : 'Overall rankings'}
              </caption>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Runs</th>
                  <th>Wickets</th>
                  <th>Catches</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.playerId}
                    data-testid={`row-${row.name}`}
                    className={row.rank <= 3 ? `medal medal-${row.rank}` : undefined}
                  >
                    <td data-testid={`rank-${row.name}`}>{row.rank}</td>
                    <td>
                      <strong>{row.name}</strong>
                      <span className="hint block">{ROLE_LABEL[row.role]}</span>
                      <span className="milestone-row tight">
                        {MILESTONES.filter((mark) => row.milestoneCounts[mark] > 0).map((mark) => (
                          <span key={mark} className="milestone on">
                            {mark}
                            {scope === 'career' && row.milestoneCounts[mark] > 1 ? ` ×${row.milestoneCounts[mark]}` : ''}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td data-testid={`board-runs-${row.name}`}>{row.runs}</td>
                    <td data-testid={`board-wickets-${row.name}`}>{row.wickets}</td>
                    <td data-testid={`board-catches-${row.name}`}>{row.catches}</td>
                    <td data-testid={`points-${row.name}`}>
                      <strong>{row.points}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ordinal(rank: number): string {
  if (rank === 1) return '1st · Gold';
  if (rank === 2) return '2nd · Silver';
  if (rank === 3) return '3rd · Bronze';
  return `${rank}th`;
}
