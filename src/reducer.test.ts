import { expect, test } from 'vitest';
import { createEmptyState, reduce, type Action } from './reducer';
import { inningsBreakdown } from './scoring';
import { careerFor, leaderboard } from './stats';
import type { AppState, Role, RunsValue } from './types';

let clock = 10;

function apply(state: AppState, action: Action): AppState {
  const result = reduce(state, action);
  expect(result.error).toBeNull();
  return result.state;
}

function add(state: AppState, id: string, name: string, role: Role = 'batsman'): AppState {
  clock += 1;
  return apply(state, { type: 'ADD_PLAYER', id, name, role, now: clock });
}

function start(state: AppState, ids: string[]): AppState {
  clock += 1;
  return apply(state, {
    type: 'START_MATCH',
    id: `match-${clock}`,
    title: '',
    playerIds: ids,
    mode: state.liveMatch ? 'save' : 'fresh',
    now: clock,
  });
}

function runs(state: AppState, value: RunsValue): AppState {
  clock += 1;
  return apply(state, { type: 'RECORD_RUNS', id: `run-${clock}`, runs: value, now: clock });
}

function points(state: AppState, playerId: string): number {
  return inningsBreakdown(state.liveMatch?.events ?? [], playerId).total;
}

test('the live match credits runs, wickets, catches, and milestones to the right players', () => {
  let state = createEmptyState();
  state = add(state, 'asha', 'Asha');
  state = add(state, 'dev', 'Dev', 'bowler');
  state = add(state, 'kabir', 'Kabir');
  state = add(state, 'meera', 'Meera');
  state = add(state, 'rohan', 'Rohan', 'all-rounder');
  expect(state.players).toHaveLength(5);

  state = start(state, ['asha', 'dev', 'kabir', 'meera', 'rohan']);
  expect(state.liveMatch?.strikerId).toBe('asha');
  expect(state.liveMatch?.bowlerId).toBeNull();

  state = runs(state, 4);
  expect(inningsBreakdown(state.liveMatch!.events, 'asha')).toMatchObject({ fourPoints: 3, runPoints: 0, total: 3 });
  expect(points(state, 'dev')).toBe(0);

  state = runs(state, 6);
  expect(inningsBreakdown(state.liveMatch!.events, 'asha').sixPoints).toBe(5);

  state = runs(state, 4);
  state = runs(state, 6);
  state = runs(state, 5);
  expect(inningsBreakdown(state.liveMatch!.events, 'asha')).toMatchObject({
    runPoints: 5,
    fourPoints: 6,
    sixPoints: 10,
    milestonePoints: 10,
    total: 31,
  });

  state = apply(state, { type: 'SET_STRIKER', playerId: 'kabir' });
  state = runs(state, 1);
  expect(inningsBreakdown(state.liveMatch!.events, 'kabir').total).toBe(0);
  expect(inningsBreakdown(state.liveMatch!.events, 'asha').total).toBe(31);

  state = apply(state, {
    type: 'RECORD_WICKET',
    id: 'wkt',
    bowlerId: 'dev',
    catcherId: 'meera',
    now: (clock += 1),
  });
  expect(inningsBreakdown(state.liveMatch!.events, 'dev')).toMatchObject({ wicketPoints: 10, catchPoints: 0, total: 10 });
  expect(inningsBreakdown(state.liveMatch!.events, 'asha').total).toBe(31);
  expect(inningsBreakdown(state.liveMatch!.events, 'kabir').wicketPoints).toBe(0);
  expect(inningsBreakdown(state.liveMatch!.events, 'meera').total).toBe(10);
  expect(inningsBreakdown(state.liveMatch!.events, 'dev').total).toBe(10);
  expect(inningsBreakdown(state.liveMatch!.events, 'asha').total).toBe(31);

  const board = leaderboard(state, 'career');
  expect(board.map((row) => row.name)).toEqual(['Asha', 'Dev', 'Meera', 'Kabir', 'Rohan']);
  expect(board[0]).toMatchObject({ rank: 1, points: 31 });
  expect(board[1]).toMatchObject({ rank: 2, points: 10 });
  expect(board[2]).toMatchObject({ rank: 3, points: 10 });
});

test('editing and undoing a ball recalculates points instead of stacking them', () => {
  let state = createEmptyState();
  state = add(state, 'asha', 'Asha');
  state = add(state, 'dev', 'Dev');
  state = start(state, ['asha', 'dev']);
  state = runs(state, 4);
  const fourId = state.liveMatch!.events[0].id;
  expect(points(state, 'asha')).toBe(3);

  state = apply(state, { type: 'EDIT_RUNS', eventId: fourId, runs: 6 });
  expect(inningsBreakdown(state.liveMatch!.events, 'asha')).toMatchObject({ fourPoints: 0, sixPoints: 5, total: 6 });

  state = apply(state, { type: 'EDIT_RUNS', eventId: fourId, runs: 4 });
  expect(points(state, 'asha')).toBe(3);

  for (let index = 0; index < 4; index += 1) state = runs(state, 5);
  state = runs(state, 1);
  expect(inningsBreakdown(state.liveMatch!.events, 'asha')).toMatchObject({
    runPoints: 5,
    fourPoints: 3,
    milestonePoints: 10,
    total: 18,
  });
  state = apply(state, { type: 'UNDO' });
  expect(inningsBreakdown(state.liveMatch!.events, 'asha').milestonePoints).toBe(0);
  expect(points(state, 'asha')).toBe(7);
  state = runs(state, 1);
  expect(points(state, 'asha')).toBe(18);

  state = apply(state, { type: 'RESET_LIVE' });
  expect(points(state, 'asha')).toBe(0);
  expect(state.players).toHaveLength(2);
});

test('milestone bonuses are once per innings and career points add those innings', () => {
  let state = createEmptyState();
  state = add(state, 'asha', 'Asha');
  state = add(state, 'dev', 'Dev');
  state = start(state, ['asha', 'dev']);
  for (let index = 0; index < 6; index += 1) state = runs(state, 6);
  state = runs(state, 4);
  expect(inningsBreakdown(state.liveMatch!.events, 'asha').milestonePoints).toBe(10);
  state = apply(state, { type: 'END_MATCH', now: (clock += 1) });

  state = start(state, ['asha', 'dev']);
  state = runs(state, 5);
  state = runs(state, 5);
  const career = careerFor(state, 'asha');
  expect(career.runs).toBe(50);
  expect(career.milestoneCounts).toMatchObject({ 25: 1, 50: 0 });
  expect(career.points).toBe(53);
});

test('a saved match is not counted twice and a reset does not delete profiles', () => {
  let state = createEmptyState();
  state = add(state, 'asha', 'Asha');
  state = add(state, 'dev', 'Dev');
  state = start(state, ['asha', 'dev']);
  state = runs(state, 4);
  state = apply(state, { type: 'END_MATCH', now: (clock += 1) });
  expect(careerFor(state, 'asha').points).toBe(3);

  state = start(state, ['asha', 'dev']);
  state = runs(state, 4);
  expect(careerFor(state, 'asha').points).toBe(6);
  state = apply(state, { type: 'RESET_LIVE' });
  expect(careerFor(state, 'asha').points).toBe(3);
  expect(state.players.map((player) => player.name)).toEqual(['Asha', 'Dev']);
  expect(state.matches).toHaveLength(1);
});
