import type { Match, PointsFlash, RunsValue, ScoreEvent } from './types';

/**
 * Points are derived from an innings tally. They are never stored on an event.
 * Editing or undoing a ball rebuilds the tally, so a four, a six, a wicket,
 * a catch, or a milestone cannot be awarded twice for the same innings.
 * Career points add each innings separately: a 25, 50, 75, or 100 is earned
 * once per innings, not once against the career run total.
 */
export const MILESTONES = [25, 50, 75, 100] as const;

export type Milestone = (typeof MILESTONES)[number];

export interface Tally {
  runs: number;
  fours: number;
  sixes: number;
  wickets: number;
  catches: number;
  balls: number;
}

export interface PointsBreakdown {
  runPoints: number;
  fourPoints: number;
  sixPoints: number;
  wicketPoints: number;
  catchPoints: number;
  milestonePoints: number;
  milestones: Milestone[];
  total: number;
}

export function emptyTally(): Tally {
  return { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0, balls: 0 };
}

export function isRunsValue(value: number): value is RunsValue {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6;
}

export function breakdown(tally: Tally): PointsBreakdown {
  const runPoints = Math.floor(tally.runs / 5);
  const fourPoints = tally.fours * 3;
  const sixPoints = tally.sixes * 5;
  const wicketPoints = tally.wickets * 10;
  const catchPoints = tally.catches * 10;
  const milestones = MILESTONES.filter((mark) => tally.runs >= mark);
  const milestonePoints = milestones.length * 10;
  const total = runPoints + fourPoints + sixPoints + wicketPoints + catchPoints + milestonePoints;
  return {
    runPoints,
    fourPoints,
    sixPoints,
    wicketPoints,
    catchPoints,
    milestonePoints,
    milestones,
    total,
  };
}

export function describeDelta(before: PointsBreakdown, after: PointsBreakdown): string {
  const parts: string[] = [];
  const push = (delta: number, label: string) => {
    if (delta === 0) return;
    parts.push(`${delta > 0 ? '+' : ''}${delta} ${label}`);
  };
  push(after.fourPoints - before.fourPoints, 'boundary');
  push(after.sixPoints - before.sixPoints, 'six');
  push(after.runPoints - before.runPoints, 'run points');
  push(after.wicketPoints - before.wicketPoints, 'wicket');
  push(after.catchPoints - before.catchPoints, 'catch');
  const gained = after.milestones.filter((mark) => !before.milestones.includes(mark));
  const lost = before.milestones.filter((mark) => !after.milestones.includes(mark));
  for (const mark of gained) parts.push(`+10 milestone (${mark})`);
  for (const mark of lost) parts.push(`-10 milestone (${mark})`);
  return parts.join(' · ');
}

export function dismissedIds(events: ScoreEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const event of events) {
    if (event.kind === 'wicket') ids.add(event.batsmanId);
  }
  return ids;
}

export function tallyEvents(events: ScoreEvent[], playerId: string): Tally {
  const tally = emptyTally();
  for (const event of events) {
    if (event.kind === 'runs' && event.batsmanId === playerId) {
      tally.runs += event.runs;
      tally.balls += 1;
      if (event.runs === 4) tally.fours += 1;
      if (event.runs === 6) tally.sixes += 1;
    } else if (event.kind === 'wicket') {
      if (event.batsmanId === playerId) tally.balls += 1;
      if (event.bowlerId === playerId) tally.wickets += 1;
      if (event.catcherId === playerId) tally.catches += 1;
    } else if (event.kind === 'catch' && event.catcherId === playerId) {
      tally.catches += 1;
    }
  }
  return tally;
}

export function inningsBreakdown(events: ScoreEvent[], playerId: string): PointsBreakdown {
  return breakdown(tallyEvents(events, playerId));
}

export interface MatchScore {
  runs: number;
  wickets: number;
  balls: number;
}

export function matchScore(events: ScoreEvent[]): MatchScore {
  let runs = 0;
  let wickets = 0;
  let balls = 0;
  for (const event of events) {
    if (event.kind === 'runs') {
      runs += event.runs;
      balls += 1;
    } else if (event.kind === 'wicket') {
      wickets += 1;
      balls += 1;
    }
  }
  return { runs, wickets, balls };
}

export function isInningsComplete(match: Match): boolean {
  if (match.roster.length < 2) return false;
  return dismissedIds(match.events).size >= match.roster.length - 1;
}

export function pointsFlashes(
  beforeEvents: ScoreEvent[],
  afterEvents: ScoreEvent[],
  playerIds: string[],
  names: Map<string, string>,
  flashId: string,
): PointsFlash[] {
  const flashes: PointsFlash[] = [];
  for (const playerId of playerIds) {
    const before = inningsBreakdown(beforeEvents, playerId);
    const after = inningsBreakdown(afterEvents, playerId);
    const amount = after.total - before.total;
    if (amount === 0) continue;
    flashes.push({
      id: `${flashId}-${playerId}`,
      playerName: names.get(playerId) ?? 'Player',
      amount,
      detail: describeDelta(before, after),
    });
  }
  return flashes;
}
