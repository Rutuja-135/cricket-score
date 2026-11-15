import { expect, test } from 'vitest';
import { breakdown, describeDelta, inningsBreakdown, type Tally } from './scoring';
import type { ScoreEvent } from './types';

function tally(partial: Partial<Tally> = {}): Tally {
  return { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0, balls: 0, ...partial };
}

test('a four awards 3 boundary points and no run points', () => {
  const points = breakdown(tally({ runs: 4, fours: 1 }));
  expect(points.fourPoints).toBe(3);
  expect(points.runPoints).toBe(0);
  expect(points.total).toBe(3);
});

test('a six awards 5 boundary points plus the run point inside those six', () => {
  const points = breakdown(tally({ runs: 6, sixes: 1 }));
  expect(points.sixPoints).toBe(5);
  expect(points.runPoints).toBe(1);
  expect(points.total).toBe(6);
});

test('25 runs with two fours and two sixes is 31 points', () => {
  const points = breakdown(tally({ runs: 25, fours: 2, sixes: 2 }));
  expect(points.runPoints).toBe(5);
  expect(points.fourPoints).toBe(6);
  expect(points.sixPoints).toBe(10);
  expect(points.milestonePoints).toBe(10);
  expect(points.milestones).toEqual([25]);
  expect(points.total).toBe(31);
});

test('milestones are 10 points each and only once at 25, 50, 75, and 100', () => {
  expect(breakdown(tally({ runs: 24 })).milestonePoints).toBe(0);
  expect(breakdown(tally({ runs: 25 })).milestonePoints).toBe(10);
  expect(breakdown(tally({ runs: 49 })).milestones).toEqual([25]);
  expect(breakdown(tally({ runs: 50 })).milestones).toEqual([25, 50]);
  expect(breakdown(tally({ runs: 75 })).milestonePoints).toBe(30);
  expect(breakdown(tally({ runs: 100 })).milestonePoints).toBe(40);
  expect(breakdown(tally({ runs: 130 })).milestonePoints).toBe(40);
});

test('wickets and catches score independently', () => {
  const points = breakdown(tally({ wickets: 2, catches: 1 }));
  expect(points.wicketPoints).toBe(20);
  expect(points.catchPoints).toBe(10);
  expect(points.total).toBe(30);
});

test('rebuilding a tally never doubles a milestone', () => {
  const before = breakdown(tally({ runs: 20, fours: 2, sixes: 2 }));
  const after = breakdown(tally({ runs: 25, fours: 2, sixes: 2 }));
  expect(after.total - before.total).toBe(11);
  expect(describeDelta(before, after)).toBe('+1 run points · +10 milestone (25)');
  const again = breakdown(tally({ runs: 25, fours: 2, sixes: 2 }));
  expect(again.total).toBe(after.total);
});

test('runs, wickets, and catches are credited only to the right player', () => {
  const events: ScoreEvent[] = [
    { id: 'e1', kind: 'runs', runs: 4, batsmanId: 'bat', bowlerId: '', catcherId: null, at: 1 },
    { id: 'e2', kind: 'wicket', runs: 0, batsmanId: 'bat', bowlerId: 'bowl', catcherId: 'keep', at: 2 },
  ];
  expect(inningsBreakdown(events, 'bat').total).toBe(3);
  expect(inningsBreakdown(events, 'bowl')).toMatchObject({ wicketPoints: 10, catchPoints: 0, total: 10 });
  expect(inningsBreakdown(events, 'keep')).toMatchObject({ catchPoints: 10, wicketPoints: 0, total: 10 });

  const olderCatch: ScoreEvent[] = [
    { id: 'e3', kind: 'catch', runs: 0, batsmanId: 'bat', bowlerId: 'bowl', catcherId: 'keep', at: 3 },
  ];
  expect(inningsBreakdown(olderCatch, 'keep').total).toBe(10);
  expect(inningsBreakdown(olderCatch, 'bowl').total).toBe(0);
});
