import { avatarColor, initials, ROLE_LABEL } from '../format';
import { MILESTONES, type PointsBreakdown } from '../scoring';
import type { Career } from '../stats';
import type { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  career: Career;
  live: PointsBreakdown | null;
  liveRuns: number;
  selected: boolean;
  squadLocked: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onToggleSquad: () => void;
  onOpenRecord: () => void;
}

export function PlayerCard({
  player,
  career,
  live,
  liveRuns,
  selected,
  squadLocked,
  onEdit,
  onRemove,
  onToggleSquad,
  onOpenRecord,
}: PlayerCardProps) {
  return (
    <article className="player-card" aria-label={player.name}>
      <header className="player-top">
        <span className="avatar" style={{ background: avatarColor(player.name) }}>
          {initials(player.name)}
        </span>
        <div>
          <h2>{player.name}</h2>
          <span className={`role-pill role-${player.role}`}>{ROLE_LABEL[player.role]}</span>
        </div>
      </header>

      {live ? (
        <p className="today">
          This match · {liveRuns} runs · {live.total} pts
        </p>
      ) : null}

      <dl className="stat-pills">
        <div>
          <dt>Runs</dt>
          <dd>{career.runs}</dd>
        </div>
        <div>
          <dt>Fours</dt>
          <dd>{career.fours}</dd>
        </div>
        <div>
          <dt>Sixes</dt>
          <dd>{career.sixes}</dd>
        </div>
        <div>
          <dt>Wickets</dt>
          <dd>{career.wickets}</dd>
        </div>
        <div>
          <dt>Catches</dt>
          <dd>{career.catches}</dd>
        </div>
        <div>
          <dt>Balls</dt>
          <dd>{career.balls}</dd>
        </div>
      </dl>

      <div className="milestone-row" aria-label={`Milestones for ${player.name}`}>
        {MILESTONES.map((mark) => {
          const count = career.milestoneCounts[mark];
          return (
            <span key={mark} className={count > 0 ? 'milestone on' : 'milestone'}>
              {mark}
              {count > 0 ? ` ×${count}` : ''}
            </span>
          );
        })}
      </div>

      <p className="points-badge">
        <strong>{career.points}</strong>
        <span>total points</span>
      </p>

      <div className="card-actions">
        <button type="button" className="btn ghost" onClick={onEdit} aria-label={`Edit ${player.name}`}>
          Edit
        </button>
        <button type="button" className="btn ghost" onClick={onOpenRecord}>
          Record
        </button>
        <button type="button" className="btn danger" onClick={onRemove} aria-label={`Remove ${player.name}`}>
          Remove
        </button>
      </div>
      <button
        type="button"
        className={selected ? 'squad-toggle on' : 'squad-toggle'}
        aria-pressed={selected}
        disabled={squadLocked}
        onClick={onToggleSquad}
        aria-label={`${selected ? 'Remove' : 'Select'} ${player.name} for the next match`}
      >
        {squadLocked ? (live ? 'In this match' : 'Squad locked') : selected ? 'Selected for next match' : 'Select for next match'}
      </button>
    </article>
  );
}
