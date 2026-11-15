import { createEmptyState, isRole } from './reducer';
import { isRunsValue } from './scoring';
import type { AppState, EventKind, Match, Player, RosterEntry, ScoreEvent } from './types';

export const STORAGE_KEY = 'cricket-score-tracker-v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEventKind(value: unknown): value is EventKind {
  return value === 'runs' || value === 'wicket' || value === 'catch';
}

function sanitizeEvent(value: unknown): ScoreEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.at !== 'number') return null;
  if (!isEventKind(value.kind)) return null;
  if (typeof value.runs !== 'number' || !isRunsValue(value.runs)) return null;
  if (typeof value.batsmanId !== 'string' || typeof value.bowlerId !== 'string') return null;
  if (value.catcherId !== null && typeof value.catcherId !== 'string') return null;
  return {
    id: value.id,
    kind: value.kind,
    runs: value.runs,
    batsmanId: value.batsmanId,
    bowlerId: value.bowlerId,
    catcherId: value.catcherId,
    at: value.at,
  };
}

function readRole(value: unknown) {
  return typeof value === 'string' && isRole(value) ? value : null;
}

function sanitizeRoster(value: unknown): RosterEntry | null {
  if (!isRecord(value)) return null;
  const role = readRole(value.role);
  if (typeof value.playerId !== 'string' || typeof value.name !== 'string' || !role) return null;
  return { playerId: value.playerId, name: value.name, role };
}

function sanitizeMatch(value: unknown, status: 'live' | 'completed'): Match | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.title !== 'string') return null;
  if (typeof value.startedAt !== 'number') return null;
  if (value.completedAt !== null && typeof value.completedAt !== 'number') return null;
  if (!Array.isArray(value.roster) || !Array.isArray(value.events)) return null;
  const roster = value.roster.map(sanitizeRoster).filter((entry): entry is RosterEntry => entry !== null);
  const events = value.events.map(sanitizeEvent).filter((event): event is ScoreEvent => event !== null);
  const strikerId = typeof value.strikerId === 'string' ? value.strikerId : null;
  const bowlerId = typeof value.bowlerId === 'string' ? value.bowlerId : null;
  if (roster.length < 2) return null;
  return {
    id: value.id,
    title: value.title,
    status,
    startedAt: value.startedAt,
    completedAt: typeof value.completedAt === 'number' ? value.completedAt : null,
    roster,
    strikerId,
    bowlerId,
    events,
  };
}

function sanitizePlayer(value: unknown): Player | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || typeof value.name !== 'string' || typeof value.createdAt !== 'number') return null;
  const role = readRole(value.role);
  if (!role) return null;
  const name = value.name.trim();
  if (!name) return null;
  return { id: value.id, name, role, createdAt: value.createdAt };
}

export function sanitizeState(value: unknown): AppState {
  const empty = createEmptyState();
  if (!isRecord(value)) return empty;
  const source = isRecord(value.state) ? value.state : value;
  if (!isRecord(source)) return empty;
  const players = Array.isArray(source.players)
    ? source.players.map(sanitizePlayer).filter((player): player is Player => player !== null)
    : [];
  const ids = new Set(players.map((player) => player.id));
  const matches = Array.isArray(source.matches)
    ? source.matches
        .map((match) => sanitizeMatch(match, 'completed'))
        .filter((match): match is Match => match !== null)
    : [];
  const liveMatch = source.liveMatch == null ? null : sanitizeMatch(source.liveMatch, 'live');
  const squadIds = Array.isArray(source.squadIds)
    ? source.squadIds.filter((id): id is string => typeof id === 'string' && ids.has(id))
    : [];
  return { players, squadIds, liveMatch, matches };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    return sanitizeState(JSON.parse(raw) as unknown);
  } catch {
    return createEmptyState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state }));
  } catch {
    // Scoring still works for this session if the browser refuses storage.
  }
}
