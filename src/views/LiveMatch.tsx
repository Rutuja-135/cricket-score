import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal';
import { describeEvent, ROLE_LABEL } from '../format';
import { dismissedIds, inningsBreakdown, isInningsComplete, matchScore, tallyEvents } from '../scoring';
import { useStore } from '../store';
import type { Player, RunsValue } from '../types';
import type { StartMode } from '../reducer';

const RUN_BUTTONS: RunsValue[] = [0, 1, 2, 3, 4, 5, 6];

export function LiveMatch() {
  const store = useStore();
  const { state, setStriker, recordRuns, recordWicket, undo, deleteEvent, editRuns, resetLive, endMatch } = store;
  const match = state.liveMatch;
  const [startOpen, setStartOpen] = useState(false);
  const [wicketOpen, setWicketOpen] = useState(false);
  const [confirm, setConfirm] = useState<'reset' | 'end' | null>(null);

  useEffect(() => {
    if (!match) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      const key = event.key.toLowerCase();
      if (key >= '0' && key <= '6') {
        event.preventDefault();
        recordRuns(Number(key) as RunsValue);
      } else if (key === 'w') {
        event.preventDefault();
        setWicketOpen(true);
      } else if (key === 'u') {
        event.preventDefault();
        undo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [match, recordRuns, undo]);

  if (!match) {
    return (
      <div className="page">
        <header className="page-head">
          <div>
            <p className="eyebrow">Scorer</p>
            <h1>Live match</h1>
          </div>
        </header>
        <div className="empty pitch-empty">
          <h2>The pitch is clear</h2>
          <p>Pick a batsman and tap the runs for each ball. A wicket asks who bowled it, and who caught it if anyone did.</p>
          <button
            type="button"
            className="btn primary"
            onClick={() => setStartOpen(true)}
            disabled={state.players.length < 2}
          >
            Start match
          </button>
          {state.players.length < 2 ? <p className="hint">Add at least two players before the first ball.</p> : null}
        </div>
        {startOpen ? <StartMatchModal onClose={() => setStartOpen(false)} /> : null}
      </div>
    );
  }

  const score = matchScore(match.events);
  const dismissed = dismissedIds(match.events);
  const complete = isInningsComplete(match);
  const striker = match.roster.find((entry) => entry.playerId === match.strikerId) ?? null;
  const strikerName = striker ? display(state.players, striker.playerId, striker.name) : null;
  const strikerTally = striker ? tallyEvents(match.events, striker.playerId) : null;
  const strikerPoints = striker ? inningsBreakdown(match.events, striker.playerId) : null;
  const canScore = Boolean(striker && !complete && match.strikerId && !dismissed.has(match.strikerId));

  function nameOf(playerId: string): string {
    const player = state.players.find((item) => item.id === playerId);
    return player?.name ?? match?.roster.find((entry) => entry.playerId === playerId)?.name ?? 'Player';
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">
            <span className="live-dot">Live</span> {match.title}
          </p>
          <h1>Live match</h1>
        </div>
        <div className="head-actions">
          <button type="button" className="btn ghost" onClick={() => setStartOpen(true)}>
            New match
          </button>
          <button type="button" className="btn ghost" onClick={() => setConfirm('reset')} disabled={match.events.length === 0}>
            Reset match scores
          </button>
          <button type="button" className="btn primary" onClick={() => setConfirm('end')}>
            Save match
          </button>
        </div>
      </header>

      <div className="live-layout">
        <div className="stack">
          <section className="scoreboard" aria-live="polite">
            <div>
              <p className="label">Score</p>
              <p className="score-figure" key={`${score.runs}-${score.wickets}`}>
                <span data-testid="match-runs">{score.runs}</span>
                <span className="slash">/</span>
                <span data-testid="match-wickets">{score.wickets}</span>
              </p>
              <p className="hint">{score.balls} balls</p>
            </div>
            <div className="score-side">
              <p className="label">On strike</p>
              <strong>{strikerName ?? 'Nobody'}</strong>
              <span>{strikerPoints ? `${strikerPoints.total} pts` : 'Select a batsman'}</span>
            </div>
          </section>

          <section className="panel">
            <div className="crease-card striker">
                <p className="label">Current batsman</p>
                <h2>{strikerName ?? 'Select a batsman'}</h2>
                {strikerTally && strikerPoints ? (
                  <ul className="split" data-testid="striker-split">
                    <li>
                      Runs <b data-testid="striker-runs">{strikerTally.runs}</b>
                    </li>
                    <li>
                      Run points <b data-testid="striker-run-points">{strikerPoints.runPoints}</b>
                    </li>
                    <li>
                      Fours <b data-testid="striker-four-points">{strikerPoints.fourPoints}</b>
                    </li>
                    <li>
                      Sixes <b data-testid="striker-six-points">{strikerPoints.sixPoints}</b>
                    </li>
                    <li>
                      Milestones <b data-testid="striker-milestone-points">{strikerPoints.milestonePoints}</b>
                    </li>
                    <li>
                      Total <b data-testid="striker-total-points">{strikerPoints.total}</b>
                    </li>
                  </ul>
                ) : (
                  <p className="hint">Runs, fours, and sixes are credited here.</p>
                )}
                {strikerPoints && strikerPoints.milestones.length > 0 ? (
                  <div className="milestone-row">
                    {strikerPoints.milestones.map((mark) => (
                      <span key={mark} className="milestone on">
                        {mark}
                      </span>
                    ))}
                  </div>
                ) : null}
            </div>

            <div className="picker">
              <p className="label">Batsman</p>
              <div className="chip-row">
                {match.roster.map((entry) => {
                  const name = nameOf(entry.playerId);
                  const out = dismissed.has(entry.playerId);
                  return (
                    <button
                      key={entry.playerId}
                      type="button"
                      className={entry.playerId === match.strikerId ? 'chip selected' : 'chip'}
                      aria-pressed={entry.playerId === match.strikerId}
                      aria-label={`Set ${name} as batsman`}
                      disabled={out}
                      onClick={() => setStriker(entry.playerId)}
                    >
                      {name}
                      {out ? <em>Out</em> : null}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="attribution" data-testid="attribution">
              {strikerName ? `Runs to ${strikerName}.` : 'Select a batsman for runs.'} A wicket asks for the bowler, and a
              catcher only if there was one.
            </p>

            <div className="pad">
              {RUN_BUTTONS.map((runs) => (
                <button
                  key={runs}
                  type="button"
                  className={`score-btn${runs === 4 ? ' four' : ''}${runs === 6 ? ' six' : ''}`}
                  aria-label={`Score ${runs} runs`}
                  disabled={!canScore}
                  onClick={() => recordRuns(runs)}
                >
                  <span>{runs}</span>
                  {runs === 4 ? <small>Four · 3 pts</small> : null}
                  {runs === 6 ? <small>Six · 5 pts</small> : null}
                </button>
              ))}
              <button type="button" className="score-btn wicket" aria-label="Record wicket" disabled={!canScore} onClick={() => setWicketOpen(true)}>
                <span>W</span>
                <small>Wicket</small>
              </button>
              <button
                type="button"
                className="score-btn undo span-4"
                aria-label="Undo last event"
                disabled={match.events.length === 0}
                onClick={() => undo()}
              >
                Undo
              </button>
            </div>
            <p className="hint keys">Keys 0–6 score runs, W wicket, U undo.</p>
            {complete ? (
              <p className="banner" role="status">
                Innings complete. Save the match, or undo a wicket to keep scoring.
              </p>
            ) : null}
            {!striker && !complete ? (
              <p className="banner" role="status">
                Choose the next batsman. Anyone still in can take strike.
              </p>
            ) : null}
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <div className="panel-head">
              <h2>This innings</h2>
            </div>
            <div className="table-wrap">
              <table className="board dense">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>R</th>
                    <th>4s</th>
                    <th>6s</th>
                    <th>W</th>
                    <th>C</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {match.roster.map((entry) => {
                    const name = nameOf(entry.playerId);
                    const tally = tallyEvents(match.events, entry.playerId);
                    const points = inningsBreakdown(match.events, entry.playerId);
                    const tags = [
                      entry.playerId === match.strikerId ? 'Bat' : '',
                      dismissed.has(entry.playerId) ? 'Out' : '',
                    ].filter(Boolean);
                    return (
                      <tr key={entry.playerId} className={entry.playerId === match.strikerId ? 'is-striker' : undefined}>
                        <th scope="row">
                          {name}
                          {tags.length > 0 ? <span className="hint block">{tags.join(' · ')}</span> : null}
                          {points.milestones.length > 0 ? (
                            <span className="milestone-row tight">
                              {points.milestones.map((mark) => (
                                <span key={mark} className="milestone on">
                                  {mark}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </th>
                        <td data-testid={`innings-runs-${name}`}>{tally.runs}</td>
                        <td>{tally.fours}</td>
                        <td>{tally.sixes}</td>
                        <td data-testid={`innings-wickets-${name}`}>{tally.wickets}</td>
                        <td data-testid={`innings-catches-${name}`}>{tally.catches}</td>
                        <td data-testid={`innings-points-${name}`}>{points.total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Ball history</h2>
            </div>
            <p className="hint">
              Editing or removing a ball rebuilds the scorecard. Milestones and boundary points are counted once from the
              runs that remain.
            </p>
            {match.events.length === 0 ? (
              <p className="empty compact">No balls yet.</p>
            ) : (
              <ol className="feed">
                {[...match.events].reverse().map((event) => {
                  const number = match.events.findIndex((item) => item.id === event.id) + 1;
                  return (
                    <li key={event.id}>
                      <span className="event-no">{number}</span>
                      <span className="event-copy">{describeEvent(event, nameOf)}</span>
                      {event.kind === 'runs' ? (
                        <select
                          aria-label={`Edit event ${number}`}
                          value={event.runs}
                          onChange={(change) => editRuns(event.id, Number(change.target.value) as RunsValue)}
                        >
                          {RUN_BUTTONS.map((runs) => (
                            <option key={runs} value={runs}>
                              {runs}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <button type="button" className="btn ghost tiny" aria-label={`Remove event ${number}`} onClick={() => deleteEvent(event.id)}>
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>

      {startOpen ? <StartMatchModal onClose={() => setStartOpen(false)} /> : null}
      {wicketOpen && match.strikerId ? (
        <WicketDialog
          roster={match.roster}
          strikerId={match.strikerId}
          nameOf={nameOf}
          onClose={() => setWicketOpen(false)}
          onConfirm={(bowlerId, catcherId) => {
            const saved = recordWicket(bowlerId, catcherId);
            if (saved) setWicketOpen(false);
          }}
        />
      ) : null}
      {confirm === 'reset' ? (
        <Modal title="Reset scores" onClose={() => setConfirm(null)}>
          <p>Clear every ball in {match.title}? Player profiles and saved matches stay untouched.</p>
          <div className="confirm-actions">
            <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                resetLive();
                setConfirm(null);
              }}
            >
              Confirm reset
            </button>
          </div>
        </Modal>
      ) : null}
      {confirm === 'end' ? (
        <Modal title="Save match" onClose={() => setConfirm(null)}>
          <p>Save {match.title} to match history and clear the live scorer?</p>
          <div className="confirm-actions">
            <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                endMatch();
                setConfirm(null);
              }}
            >
              Confirm save
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function WicketDialog({
  roster,
  strikerId,
  nameOf,
  onClose,
  onConfirm,
}: {
  roster: { playerId: string }[];
  strikerId: string;
  nameOf: (playerId: string) => string;
  onClose: () => void;
  onConfirm: (bowlerId: string, catcherId: string | null) => void;
}) {
  const [bowlerId, setBowlerId] = useState<string | null>(null);
  const [catcherId, setCatcherId] = useState<string | null>(null);
  const fielders = roster.filter((entry) => entry.playerId !== strikerId);

  return (
    <Modal title="Wicket" onClose={onClose}>
      <p>Who bowled it? Add a catcher only if someone took the catch.</p>
      <div className="picker">
        <p className="label">Bowler</p>
        <div className="chip-row">
          {fielders.map((entry) => {
            const name = nameOf(entry.playerId);
            return (
              <button
                key={entry.playerId}
                type="button"
                className={bowlerId === entry.playerId ? 'chip selected' : 'chip'}
                aria-pressed={bowlerId === entry.playerId}
                aria-label={`Bowler ${name}`}
                onClick={() => setBowlerId(entry.playerId)}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="picker">
        <p className="label">Catch</p>
        <div className="chip-row">
          <button
            type="button"
            className={catcherId === null ? 'chip selected' : 'chip'}
            aria-pressed={catcherId === null}
            aria-label="No catch"
            onClick={() => setCatcherId(null)}
          >
            No catch
          </button>
          {fielders.map((entry) => {
            const name = nameOf(entry.playerId);
            return (
              <button
                key={entry.playerId}
                type="button"
                className={catcherId === entry.playerId ? 'chip selected' : 'chip'}
                aria-pressed={catcherId === entry.playerId}
                aria-label={`Catcher ${name}`}
                onClick={() => setCatcherId(entry.playerId)}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="confirm-actions">
        <button type="button" className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!bowlerId}
          onClick={() => {
            if (bowlerId) onConfirm(bowlerId, catcherId);
          }}
        >
          Confirm wicket
        </button>
      </div>
    </Modal>
  );
}

function display(players: Player[], playerId: string, fallback: string): string {
  return players.find((player) => player.id === playerId)?.name ?? fallback;
}

function StartMatchModal({ onClose }: { onClose: () => void }) {
  const { state, startMatch } = useStore();
  const [mode, setMode] = useState<StartMode>(state.liveMatch ? 'save' : 'fresh');
  const [titleTouched, setTitleTouched] = useState(false);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<string[]>(() => initialSquad(state.players, state.squadIds));

  const reserved = state.matches.length + (state.liveMatch && mode === 'save' ? 1 : 0);
  const suggested = `Match ${reserved + 1}`;
  const titleValue = titleTouched ? title : suggested;

  function toggle(playerId: string) {
    setSelected((current) => (current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]));
  }

  return (
    <Modal title="New match" onClose={onClose}>
      <form
        className="stack-form"
        onSubmit={(event) => {
          event.preventDefault();
          const started = startMatch(titleValue, selected, state.liveMatch ? mode : 'fresh');
          if (started) onClose();
        }}
      >
        {state.liveMatch ? (
          <fieldset>
            <legend>Current match</legend>
            <label className="radio">
              <input type="radio" name="existing-match" checked={mode === 'save'} onChange={() => setMode('save')} />
              Save {state.liveMatch.title} and start new
            </label>
            <label className="radio">
              <input type="radio" name="existing-match" checked={mode === 'discard'} onChange={() => setMode('discard')} />
              Discard {state.liveMatch.title}
            </label>
          </fieldset>
        ) : null}
        <div className="field">
          <label htmlFor="match-title">Match title</label>
          <input
            id="match-title"
            aria-label="Match title"
            value={titleValue}
            maxLength={48}
            onChange={(event) => {
              setTitleTouched(true);
              setTitle(event.target.value);
            }}
          />
        </div>
        <fieldset>
          <legend>Players in this match</legend>
          <ul className="check-list">
            {state.players.map((player) => (
              <li key={player.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes(player.id)}
                    aria-label={player.name}
                    onChange={() => toggle(player.id)}
                  />
                  <span>{player.name}</span>
                  <em>{ROLE_LABEL[player.role]}</em>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {selected.length < 2 ? <p className="hint">Select at least two players.</p> : null}
        <div className="confirm-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={selected.length < 2}>
            Begin scoring
          </button>
        </div>
      </form>
    </Modal>
  );
}

function initialSquad(players: Player[], squadIds: string[]): string[] {
  const known = squadIds.filter((id) => players.some((player) => player.id === id));
  if (known.length > 0) return known;
  return players.map((player) => player.id);
}
