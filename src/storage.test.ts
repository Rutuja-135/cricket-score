import { expect, test } from 'vitest';
import { createEmptyState, reduce } from './reducer';
import { inningsBreakdown } from './scoring';
import { loadState, saveState, STORAGE_KEY } from './storage';

test('a refresh restores players and the live scorecard', () => {
  let state = createEmptyState();
  state = reduce(state, { type: 'ADD_PLAYER', id: 'asha', name: 'Asha', role: 'batsman', now: 1 }).state;
  state = reduce(state, { type: 'ADD_PLAYER', id: 'dev', name: 'Dev', role: 'bowler', now: 2 }).state;
  state = reduce(state, {
    type: 'START_MATCH',
    id: 'm1',
    title: 'Match 1',
    playerIds: ['asha', 'dev'],
    mode: 'fresh',
    now: 3,
  }).state;
  state = reduce(state, { type: 'RECORD_RUNS', id: 'e1', runs: 4, now: 4 }).state;

  saveState(state);
  const loaded = loadState();
  expect(loaded.players.map((player) => player.name)).toEqual(['Asha', 'Dev']);
  expect(loaded.liveMatch?.title).toBe('Match 1');
  expect(inningsBreakdown(loaded.liveMatch?.events ?? [], 'asha').total).toBe(3);
});

test('corrupt storage falls back to an empty scorebook', () => {
  localStorage.setItem(STORAGE_KEY, '{');
  expect(loadState().players).toEqual([]);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state: { players: [{ id: 5 }] } }));
  expect(loadState()).toEqual(createEmptyState());
});
