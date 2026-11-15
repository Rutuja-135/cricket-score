export type Role = 'batsman' | 'bowler' | 'all-rounder';

export type RunsValue = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type EventKind = 'runs' | 'wicket' | 'catch';

export type AppView = 'dashboard' | 'players' | 'live' | 'leaderboard' | 'history';

export interface Player {
  id: string;
  name: string;
  role: Role;
  createdAt: number;
}

export interface RosterEntry {
  playerId: string;
  name: string;
  role: Role;
}

export interface ScoreEvent {
  id: string;
  kind: EventKind;
  runs: RunsValue;
  batsmanId: string;
  bowlerId: string;
  catcherId: string | null;
  at: number;
}

export interface Match {
  id: string;
  title: string;
  status: 'live' | 'completed';
  startedAt: number;
  completedAt: number | null;
  roster: RosterEntry[];
  strikerId: string | null;
  bowlerId: string | null;
  events: ScoreEvent[];
}

export interface AppState {
  players: Player[];
  squadIds: string[];
  liveMatch: Match | null;
  matches: Match[];
}

export interface PointsFlash {
  id: string;
  playerName: string;
  amount: number;
  detail: string;
}
