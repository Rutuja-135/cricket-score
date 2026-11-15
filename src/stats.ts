import { inningsBreakdown, matchScore, MILESTONES, tallyEvents, type Milestone } from './scoring';
import type { AppState, Match, Player } from './types';

export interface Career {
  runs: number;
  fours: number;
  sixes: number;
  wickets: number;
  catches: number;
  balls: number;
  points: number;
  milestoneCounts: Record<Milestone, number>;
  matches: number;
}

export interface BoardRow {
  playerId: string;
  name: string;
  role: Player['role'];
  runs: number;
  fours: number;
  sixes: number;
  wickets: number;
  catches: number;
  points: number;
  milestoneCounts: Record<Milestone, number>;
  rank: number;
}

export type BoardScope = 'career' | 'match';

export function emptyMilestoneCounts(): Record<Milestone, number> {
  return { 25: 0, 50: 0, 75: 0, 100: 0 };
}

export function matchesForStats(state: AppState): Match[] {
  return state.liveMatch ? [...state.matches, state.liveMatch] : [...state.matches];
}

export function careerFor(state: AppState, playerId: string): Career {
  const career: Career = {
    runs: 0,
    fours: 0,
    sixes: 0,
    wickets: 0,
    catches: 0,
    balls: 0,
    points: 0,
    milestoneCounts: emptyMilestoneCounts(),
    matches: 0,
  };

  for (const match of matchesForStats(state)) {
    if (!match.roster.some((entry) => entry.playerId === playerId)) continue;
    const tally = tallyEvents(match.events, playerId);
    const points = inningsBreakdown(match.events, playerId);
    career.matches += 1;
    career.runs += tally.runs;
    career.fours += tally.fours;
    career.sixes += tally.sixes;
    career.wickets += tally.wickets;
    career.catches += tally.catches;
    career.balls += tally.balls;
    career.points += points.total;
    for (const mark of points.milestones) career.milestoneCounts[mark] += 1;
  }

  return career;
}

export function playerName(state: AppState, playerId: string, match?: Match): string {
  if (match?.status === 'completed') {
    return match.roster.find((entry) => entry.playerId === playerId)?.name ?? 'Removed player';
  }
  return (
    state.players.find((player) => player.id === playerId)?.name ??
    match?.roster.find((entry) => entry.playerId === playerId)?.name ??
    'Removed player'
  );
}

function compareRows(a: BoardRow, b: BoardRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.runs !== a.runs) return b.runs - a.runs;
  if (b.wickets !== a.wickets) return b.wickets - a.wickets;
  if (b.catches !== a.catches) return b.catches - a.catches;
  return a.name.localeCompare(b.name);
}

export function leaderboard(state: AppState, scope: BoardScope): BoardRow[] {
  if (scope === 'match') {
    const match = state.liveMatch;
    if (!match) return [];
    const rows = match.roster.map((entry) => {
      const tally = tallyEvents(match.events, entry.playerId);
      const points = inningsBreakdown(match.events, entry.playerId);
      const player = state.players.find((item) => item.id === entry.playerId);
      const milestoneCounts = emptyMilestoneCounts();
      for (const mark of points.milestones) milestoneCounts[mark] += 1;
      return {
        playerId: entry.playerId,
        name: player?.name ?? entry.name,
        role: player?.role ?? entry.role,
        runs: tally.runs,
        fours: tally.fours,
        sixes: tally.sixes,
        wickets: tally.wickets,
        catches: tally.catches,
        points: points.total,
        milestoneCounts,
        rank: 0,
      };
    });
    rows.sort(compareRows);
    rows.forEach((row, index) => {
      row.rank = index + 1;
    });
    return rows;
  }

  const rows = state.players.map((player) => {
    const career = careerFor(state, player.id);
    return {
      playerId: player.id,
      name: player.name,
      role: player.role,
      runs: career.runs,
      fours: career.fours,
      sixes: career.sixes,
      wickets: career.wickets,
      catches: career.catches,
      points: career.points,
      milestoneCounts: career.milestoneCounts,
      rank: 0,
    };
  });
  rows.sort(compareRows);
  rows.forEach((row, index) => {
    row.rank = index + 1;
  });
  return rows;
}

export interface Highlights {
  totalPlayers: number;
  totalMatches: number;
  highestScorer: { name: string; runs: number } | null;
  highestPoints: { name: string; points: number } | null;
}

export function highlights(state: AppState): Highlights {
  const board = leaderboard(state, 'career');
  const scorer = [...board].sort((a, b) => b.runs - a.runs || b.points - a.points || a.name.localeCompare(b.name))[0];
  const leader = board[0];
  return {
    totalPlayers: state.players.length,
    totalMatches: state.matches.length + (state.liveMatch ? 1 : 0),
    highestScorer: scorer && scorer.runs > 0 ? { name: scorer.name, runs: scorer.runs } : null,
    highestPoints: leader && leader.points > 0 ? { name: leader.name, points: leader.points } : null,
  };
}

export interface LiveSnapshot {
  title: string;
  runs: number;
  wickets: number;
  strikerName: string | null;
  strikerRuns: number;
  strikerPoints: number;
}

export function liveSnapshot(state: AppState): LiveSnapshot | null {
  const match = state.liveMatch;
  if (!match) return null;
  const score = matchScore(match.events);
  const strikerId = match.strikerId;
  const strikerTally = strikerId ? tallyEvents(match.events, strikerId) : null;
  return {
    title: match.title,
    runs: score.runs,
    wickets: score.wickets,
    strikerName: strikerId ? playerName(state, strikerId, match) : null,
    strikerRuns: strikerTally?.runs ?? 0,
    strikerPoints: strikerId ? inningsBreakdown(match.events, strikerId).total : 0,
  };
}

export function milestoneList(): readonly Milestone[] {
  return MILESTONES;
}
