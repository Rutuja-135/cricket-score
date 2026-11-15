import { useState, type FormEvent } from 'react';
import { Modal } from '../components/Modal';
import { PlayerCard } from '../components/PlayerCard';
import { ROLE_LABEL } from '../format';
import { inningsBreakdown, tallyEvents } from '../scoring';
import { careerFor, matchesForStats } from '../stats';
import { useStore } from '../store';
import type { Player, Role } from '../types';

export function Players() {
  const { state, addPlayer, updatePlayer, deletePlayer, toggleSquad } = useStore();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('batsman');
  const [editing, setEditing] = useState<Player | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<Role>('batsman');
  const [pendingDelete, setPendingDelete] = useState<Player | null>(null);
  const [recordPlayer, setRecordPlayer] = useState<Player | null>(null);

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const saved = addPlayer(name, role);
    if (saved) setName('');
  }

  function beginEdit(player: Player) {
    setEditing(player);
    setEditName(player.name);
    setEditRole(player.role);
  }

  function onSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const saved = updatePlayer(editing.id, editName, editRole);
    if (saved) setEditing(null);
  }

  const live = state.liveMatch;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Squad</p>
          <h1>Players</h1>
          <p className="hint">Everyone is an individual. A role is only a label, not a team.</p>
        </div>
      </header>

      <form className="panel add-form" aria-label="Add player" onSubmit={onAdd}>
        <div className="field">
          <label htmlFor="player-name">Name</label>
          <input
            id="player-name"
            aria-label="Player name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Virat Kohli"
            maxLength={32}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="player-role">Role</label>
          <select
            id="player-role"
            aria-label="Player role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            <option value="batsman">Batsman</option>
            <option value="bowler">Bowler</option>
            <option value="all-rounder">All-rounder</option>
          </select>
        </div>
        <button type="submit" className="btn primary">
          Add player
        </button>
      </form>

      {state.players.length === 0 ? (
        <div className="empty">
          <h2>No players yet</h2>
          <p>Add at least two players, then start a match and pick who is batting and bowling.</p>
        </div>
      ) : (
        <div className="card-grid">
          {state.players.map((player) => {
            const career = careerFor(state, player.id);
            const inLive = Boolean(live?.roster.some((entry) => entry.playerId === player.id));
            const livePoints = inLive && live ? inningsBreakdown(live.events, player.id) : null;
            const liveRuns = inLive && live ? tallyEvents(live.events, player.id).runs : 0;
            return (
              <PlayerCard
                key={player.id}
                player={player}
                career={career}
                live={livePoints}
                liveRuns={liveRuns}
                selected={state.squadIds.includes(player.id)}
                squadLocked={Boolean(live)}
                onEdit={() => beginEdit(player)}
                onRemove={() => setPendingDelete(player)}
                onToggleSquad={() => toggleSquad(player.id)}
                onOpenRecord={() => setRecordPlayer(player)}
              />
            );
          })}
        </div>
      )}

      {editing ? (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form aria-label={`Edit ${editing.name}`} onSubmit={onSaveEdit} className="stack-form">
            <div className="field">
              <label htmlFor="edit-name">Name</label>
              <input
                id="edit-name"
                aria-label={`Name for ${editing.name}`}
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                maxLength={32}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-role">Role</label>
              <select
                id="edit-role"
                aria-label={`Role for ${editing.name}`}
                value={editRole}
                onChange={(event) => setEditRole(event.target.value as Role)}
              >
                <option value="batsman">Batsman</option>
                <option value="bowler">Bowler</option>
                <option value="all-rounder">All-rounder</option>
              </select>
            </div>
            <div className="confirm-actions">
              <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn primary">
                Save player
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {pendingDelete ? (
        <Modal title="Remove player" onClose={() => setPendingDelete(null)}>
          <p>
            Remove {pendingDelete.name}? Past match scorecards keep their name. They leave the leaderboard and this
            squad.
          </p>
          <div className="confirm-actions">
            <button type="button" className="btn ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                const removed = deletePlayer(pendingDelete.id);
                if (removed) setPendingDelete(null);
              }}
            >
              Confirm remove
            </button>
          </div>
        </Modal>
      ) : null}

      {recordPlayer ? (
        <Modal title={`${recordPlayer.name} across matches`} onClose={() => setRecordPlayer(null)}>
          <PlayerRecord player={recordPlayer} />
        </Modal>
      ) : null}
    </div>
  );
}

function PlayerRecord({ player }: { player: Player }) {
  const { state } = useStore();
  const matches = matchesForStats(state).filter((match) => match.roster.some((entry) => entry.playerId === player.id));
  if (matches.length === 0) {
    return <p>No matches yet. {ROLE_LABEL[player.role]} stats will appear here after a match.</p>;
  }
  return (
    <ul className="record-list">
      {matches.map((match) => {
        const tally = tallyEvents(match.events, player.id);
        const points = inningsBreakdown(match.events, player.id);
        return (
          <li key={match.id}>
            <div>
              <strong>{match.title}</strong>
              <span className="hint">{match.status === 'live' ? 'Live' : 'Saved'}</span>
            </div>
            <p>
              {tally.runs} runs · {tally.fours} fours · {tally.sixes} sixes · {tally.wickets} wickets · {tally.catches}{' '}
              catches
            </p>
            <p>
              {points.total} pts
              {points.milestones.length > 0 ? ` · milestones ${points.milestones.join(', ')}` : ''}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
