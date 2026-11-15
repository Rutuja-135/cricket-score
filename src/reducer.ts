import {
  breakdown,
  describeDelta,
  dismissedIds,
  inningsBreakdown,
  isInningsComplete,
  isRunsValue,
  pointsFlashes,
  tallyEvents,
} from './scoring';
import type { AppState, Match, Player, PointsFlash, Role, RosterEntry, RunsValue, ScoreEvent } from './types';

export type StartMode = 'fresh' | 'save' | 'discard';

export type Action =
  | { type: 'ADD_PLAYER'; id: string; name: string; role: Role; now: number }
  | { type: 'UPDATE_PLAYER'; id: string; name: string; role: Role }
  | { type: 'DELETE_PLAYER'; id: string }
  | { type: 'TOGGLE_SQUAD'; playerId: string }
  | { type: 'START_MATCH'; id: string; title: string; playerIds: string[]; mode: StartMode; now: number }
  | { type: 'SET_STRIKER'; playerId: string }
  | { type: 'RECORD_RUNS'; id: string; runs: RunsValue; now: number }
  | { type: 'RECORD_WICKET'; id: string; bowlerId: string; catcherId: string | null; now: number }
  | { type: 'UNDO' }
  | { type: 'DELETE_EVENT'; eventId: string }
  | { type: 'EDIT_RUNS'; eventId: string; runs: RunsValue }
  | { type: 'RESET_LIVE' }
  | { type: 'END_MATCH'; now: number }
  | { type: 'DELETE_MATCH'; matchId: string };

export interface ReduceResult {
  state: AppState;
  error: string | null;
  flashes: PointsFlash[];
}

const MAX_EVENTS = 2000;
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} .'-]*$/u;

export function createEmptyState(): AppState {
  return { players: [], squadIds: [], liveMatch: null, matches: [] };
}

export function isRole(value: string): value is Role {
  return value === 'batsman' || value === 'bowler' || value === 'all-rounder';
}

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function validatePlayerName(name: string, players: Player[], exceptId?: string): string | null {
  const normalized = normalizeName(name);
  if (!normalized) return 'Enter a player name.';
  if (normalized.length > 32) return 'Keep the name to 32 characters or fewer.';
  if (!NAME_PATTERN.test(normalized)) return 'Use letters, numbers, spaces, apostrophes, or hyphens.';
  const key = normalized.toLocaleLowerCase();
  if (players.some((player) => player.id !== exceptId && player.name.toLocaleLowerCase() === key)) {
    return `A player named ${normalized} is already on the list.`;
  }
  return null;
}

function ok(state: AppState, flashes: PointsFlash[] = []): ReduceResult {
  return { state, error: null, flashes };
}

function fail(state: AppState, error: string): ReduceResult {
  return { state, error, flashes: [] };
}

function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function rosterNames(match: Match): Map<string, string> {
  return new Map(match.roster.map((entry) => [entry.playerId, entry.name]));
}

function involvedIds(event: ScoreEvent): string[] {
  const ids = new Set<string>();
  if (event.batsmanId) ids.add(event.batsmanId);
  if (event.bowlerId) ids.add(event.bowlerId);
  if (event.catcherId) ids.add(event.catcherId);
  return [...ids];
}

function nextStriker(match: Match, events: ScoreEvent[]): string | null {
  const out = dismissedIds(events);
  const found = match.roster.find((entry) => !out.has(entry.playerId));
  return found?.playerId ?? null;
}

function requireBatsman(state: AppState): { match: Match; strikerId: string } | { error: string } {
  const match = state.liveMatch;
  if (!match) return { error: 'Start a match before scoring.' };
  if (isInningsComplete(match)) return { error: 'This innings is complete. Save the match or undo a wicket.' };
  if (!match.strikerId) return { error: 'Select a batsman.' };
  if (dismissedIds(match.events).has(match.strikerId)) return { error: 'That batsman is out. Choose another.' };
  if (match.events.length >= MAX_EVENTS) return { error: 'This match has reached the scoring limit.' };
  return { match, strikerId: match.strikerId };
}

function finishMatch(match: Match, now: number): Match {
  return { ...match, status: 'completed', completedAt: now };
}

export function reduce(state: AppState, action: Action): ReduceResult {
  switch (action.type) {
    case 'ADD_PLAYER': {
      const nameError = validatePlayerName(action.name, state.players);
      if (nameError) return fail(state, nameError);
      if (!isRole(action.role)) return fail(state, 'Choose a role.');
      const player: Player = {
        id: action.id,
        name: normalizeName(action.name),
        role: action.role,
        createdAt: action.now,
      };
      return ok({ ...state, players: [...state.players, player] });
    }
    case 'UPDATE_PLAYER': {
      const existing = state.players.find((player) => player.id === action.id);
      if (!existing) return fail(state, 'Player not found.');
      const nameError = validatePlayerName(action.name, state.players, action.id);
      if (nameError) return fail(state, nameError);
      if (!isRole(action.role)) return fail(state, 'Choose a role.');
      const name = normalizeName(action.name);
      const players = state.players.map((player) =>
        player.id === action.id ? { ...player, name, role: action.role } : player,
      );
      const liveMatch = state.liveMatch
        ? {
            ...state.liveMatch,
            roster: state.liveMatch.roster.map((entry) =>
              entry.playerId === action.id ? { ...entry, name, role: action.role } : entry,
            ),
          }
        : null;
      return ok({ ...state, players, liveMatch });
    }
    case 'DELETE_PLAYER': {
      if (!state.players.some((player) => player.id === action.id)) return fail(state, 'Player not found.');
      if (state.liveMatch?.roster.some((entry) => entry.playerId === action.id)) {
        return fail(state, 'This player is in the live match. Save or reset that match before removing them.');
      }
      return ok({
        ...state,
        players: state.players.filter((player) => player.id !== action.id),
        squadIds: state.squadIds.filter((id) => id !== action.id),
      });
    }
    case 'TOGGLE_SQUAD': {
      if (state.liveMatch) return fail(state, 'The squad is locked while a match is live.');
      if (!state.players.some((player) => player.id === action.playerId)) return fail(state, 'Player not found.');
      const selected = state.squadIds.includes(action.playerId);
      const squadIds = selected
        ? state.squadIds.filter((id) => id !== action.playerId)
        : [...state.squadIds, action.playerId];
      return ok({ ...state, squadIds });
    }
    case 'START_MATCH': {
      if (action.mode === 'fresh' && state.liveMatch) {
        return fail(state, 'Save or discard the live match before starting another.');
      }
      const ids = uniqueIds(action.playerIds);
      const roster: RosterEntry[] = [];
      for (const playerId of ids) {
        const player = state.players.find((item) => item.id === playerId);
        if (!player) continue;
        roster.push({ playerId: player.id, name: player.name, role: player.role });
      }
      if (roster.length < 2) return fail(state, 'Select at least two players for the match.');

      let matches = state.matches;
      if (state.liveMatch && action.mode === 'save') {
        matches = [finishMatch(state.liveMatch, action.now), ...matches];
      }
      const fallback = `Match ${matches.length + 1}`;
      const title = normalizeName(action.title).slice(0, 48) || fallback;
      const match: Match = {
        id: action.id,
        title,
        status: 'live',
        startedAt: action.now,
        completedAt: null,
        roster,
        strikerId: roster[0].playerId,
        bowlerId: null,
        events: [],
      };
      return ok({
        ...state,
        matches,
        liveMatch: match,
        squadIds: roster.map((entry) => entry.playerId),
      });
    }
    case 'SET_STRIKER': {
      const match = state.liveMatch;
      if (!match) return fail(state, 'Start a match before scoring.');
      if (!match.roster.some((entry) => entry.playerId === action.playerId)) {
        return fail(state, 'That player is not in this match.');
      }
      if (dismissedIds(match.events).has(action.playerId)) return fail(state, 'That batsman is out.');
      if (action.playerId === match.strikerId) return ok(state);
      return ok({ ...state, liveMatch: { ...match, strikerId: action.playerId } });
    }
    case 'RECORD_RUNS': {
      const crease = requireBatsman(state);
      if ('error' in crease) return fail(state, crease.error);
      if (!isRunsValue(action.runs)) return fail(state, 'Runs must be a whole number from 0 to 6.');
      const event: ScoreEvent = {
        id: action.id,
        kind: 'runs',
        runs: action.runs,
        batsmanId: crease.strikerId,
        bowlerId: '',
        catcherId: null,
        at: action.now,
      };
      const events = [...crease.match.events, event];
      const after: Match = { ...crease.match, events };
      const flashes = pointsFlashes(crease.match.events, events, involvedIds(event), rosterNames(after), event.id);
      return ok({ ...state, liveMatch: after }, flashes);
    }
    case 'RECORD_WICKET': {
      const crease = requireBatsman(state);
      if ('error' in crease) return fail(state, crease.error);
      const { match, strikerId } = crease;
      if (!match.roster.some((entry) => entry.playerId === action.bowlerId)) {
        return fail(state, 'Choose the bowler.');
      }
      if (action.bowlerId === strikerId) return fail(state, 'The batsman cannot also be the bowler.');
      if (action.catcherId && !match.roster.some((entry) => entry.playerId === action.catcherId)) {
        return fail(state, 'Choose a catcher from this match.');
      }
      if (action.catcherId === strikerId) return fail(state, 'The batsman cannot take the catch.');
      const event: ScoreEvent = {
        id: action.id,
        kind: 'wicket',
        runs: 0,
        batsmanId: strikerId,
        bowlerId: action.bowlerId,
        catcherId: action.catcherId,
        at: action.now,
      };
      const events = [...match.events, event];
      const inningsOver = dismissedIds(events).size >= match.roster.length - 1;
      const after: Match = {
        ...match,
        events,
        strikerId: inningsOver ? null : nextStriker(match, events),
      };
      const flashes = pointsFlashes(match.events, events, involvedIds(event), rosterNames(after), event.id);
      return ok({ ...state, liveMatch: after }, flashes);
    }
    case 'UNDO': {
      const match = state.liveMatch;
      if (!match || match.events.length === 0) return fail(state, 'Nothing to undo.');
      const event = match.events[match.events.length - 1];
      const events = match.events.slice(0, -1);
      const strikerId = event.kind === 'wicket' ? event.batsmanId : match.strikerId;
      const after: Match = { ...match, events, strikerId };
      const flashes = pointsFlashes(match.events, events, involvedIds(event), rosterNames(after), `undo-${event.id}`);
      return ok({ ...state, liveMatch: after }, flashes);
    }
    case 'DELETE_EVENT': {
      const match = state.liveMatch;
      if (!match) return fail(state, 'Start a match before scoring.');
      const event = match.events.find((item) => item.id === action.eventId);
      if (!event) return fail(state, 'That ball is no longer on the scorecard.');
      const events = match.events.filter((item) => item.id !== event.id);
      let strikerId = match.strikerId;
      const wasLast = match.events[match.events.length - 1]?.id === event.id;
      if (event.kind === 'wicket' && wasLast) strikerId = event.batsmanId;
      if (strikerId && dismissedIds(events).has(strikerId)) strikerId = nextStriker(match, events);
      const after: Match = { ...match, events, strikerId };
      const flashes = pointsFlashes(match.events, events, involvedIds(event), rosterNames(after), `delete-${event.id}`);
      return ok({ ...state, liveMatch: after }, flashes);
    }
    case 'EDIT_RUNS': {
      const match = state.liveMatch;
      if (!match) return fail(state, 'Start a match before scoring.');
      const current = match.events.find((item) => item.id === action.eventId);
      if (!current) return fail(state, 'That ball is no longer on the scorecard.');
      if (current.kind !== 'runs') return fail(state, 'Only run events can be edited. Remove the event to reverse it.');
      if (!isRunsValue(action.runs)) return fail(state, 'Runs must be a whole number from 0 to 6.');
      if (current.runs === action.runs) return ok(state);
      const events = match.events.map((item) => (item.id === current.id ? { ...item, runs: action.runs } : item));
      const after: Match = { ...match, events };
      const flashes = pointsFlashes(
        match.events,
        events,
        involvedIds(current),
        rosterNames(after),
        `edit-${current.id}-${action.runs}`,
      );
      return ok({ ...state, liveMatch: after }, flashes);
    }
    case 'RESET_LIVE': {
      const match = state.liveMatch;
      if (!match) return fail(state, 'There is no live match to reset.');
      if (match.events.length === 0) return ok(state);
      const flashes = match.roster.flatMap((entry) => {
        const before = breakdown(tallyEvents(match.events, entry.playerId));
        const after = inningsBreakdown([], entry.playerId);
        const amount = after.total - before.total;
        if (amount === 0) return [];
        return [
          {
            id: `reset-${entry.playerId}`,
            playerName: entry.name,
            amount,
            detail: describeDelta(before, after),
          },
        ];
      });
      const strikerId = match.strikerId ?? match.roster[0]?.playerId ?? null;
      return ok({ ...state, liveMatch: { ...match, events: [], strikerId, bowlerId: null } }, flashes);
    }
    case 'END_MATCH': {
      const match = state.liveMatch;
      if (!match) return fail(state, 'There is no live match to save.');
      return ok({
        ...state,
        liveMatch: null,
        matches: [finishMatch(match, action.now), ...state.matches],
      });
    }
    case 'DELETE_MATCH': {
      if (!state.matches.some((match) => match.id === action.matchId)) return fail(state, 'Match not found.');
      return ok({ ...state, matches: state.matches.filter((match) => match.id !== action.matchId) });
    }
    default: {
      const neverAction: never = action;
      return fail(state, `Unknown action ${String(neverAction)}`);
    }
  }
}
