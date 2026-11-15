import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { expect, test } from 'vitest';
import App from './App';

async function open(user: UserEvent, name: string) {
  const button = await screen.findByRole('button', { name: new RegExp(`^${name}$`, 'i') });
  await user.click(button);
}

async function addPlayer(user: UserEvent, name: string) {
  await user.type(screen.getByRole('textbox', { name: 'Player name' }), name);
  await user.click(screen.getByRole('button', { name: 'Add player' }));
}

async function textOf(testId: string) {
  return screen.getByTestId(testId).textContent;
}

test('rejects an empty or duplicate player name', async () => {
  const user = userEvent.setup();
  render(<App />);
  await open(user, 'Players');
  await user.click(screen.getByRole('button', { name: 'Add player' }));
  expect(screen.getByRole('alert').textContent).toContain('Enter a player name.');
  await user.type(screen.getByRole('textbox', { name: 'Player name' }), 'Asha');
  await user.click(screen.getByRole('button', { name: 'Add player' }));
  await user.type(screen.getByRole('textbox', { name: 'Player name' }), 'asha');
  await user.click(screen.getByRole('button', { name: 'Add player' }));
  expect(screen.getByRole('alert').textContent).toContain('already on the list');
  expect(screen.getAllByRole('article')).toHaveLength(1);
});

test('plays a full match, keeps points honest, and restores them after refresh', async () => {
  const user = userEvent.setup();
  const first = render(<App />);

  await open(user, 'Players');
  for (const name of ['Asha', 'Dev', 'Kabir', 'Meera', 'Rohan']) {
    await addPlayer(user, name);
  }
  expect(screen.getAllByRole('article')).toHaveLength(5);
  for (const name of ['Asha', 'Dev', 'Kabir', 'Meera', 'Rohan']) {
    expect(screen.getByRole('heading', { name })).toBeTruthy();
  }

  await open(user, 'Live Match');
  await user.click(screen.getByRole('button', { name: 'Start match' }));
  await user.click(screen.getByRole('button', { name: 'Begin scoring' }));
  expect(screen.getByTestId('attribution').textContent).toContain('Runs to Asha');

  await user.click(screen.getByRole('button', { name: 'Score 4 runs' }));
  expect(await textOf('striker-four-points')).toBe('3');
  expect(await textOf('striker-run-points')).toBe('0');
  expect(await textOf('striker-total-points')).toBe('3');
  expect(await textOf('innings-points-Dev')).toBe('0');

  await user.click(screen.getByRole('button', { name: 'Score 6 runs' }));
  expect(await textOf('striker-six-points')).toBe('5');

  await user.click(screen.getByRole('button', { name: 'Score 4 runs' }));
  await user.click(screen.getByRole('button', { name: 'Score 6 runs' }));
  await user.click(screen.getByRole('button', { name: 'Score 5 runs' }));
  expect(await textOf('striker-runs')).toBe('25');
  expect(await textOf('striker-run-points')).toBe('5');
  expect(await textOf('striker-four-points')).toBe('6');
  expect(await textOf('striker-six-points')).toBe('10');
  expect(await textOf('striker-milestone-points')).toBe('10');
  expect(await textOf('striker-total-points')).toBe('31');

  await user.click(screen.getByRole('button', { name: 'Set Kabir as batsman' }));
  expect(screen.getByTestId('attribution').textContent).toContain('Runs to Kabir');
  await user.click(screen.getByRole('button', { name: 'Score 1 runs' }));
  expect(await textOf('innings-runs-Kabir')).toBe('1');
  expect(await textOf('innings-runs-Asha')).toBe('25');
  expect(await textOf('innings-points-Asha')).toBe('31');

  await user.click(screen.getByRole('button', { name: 'Record wicket' }));
  await user.click(screen.getByRole('button', { name: 'Bowler Dev' }));
  await user.click(screen.getByRole('button', { name: 'Catcher Meera' }));
  await user.click(screen.getByRole('button', { name: 'Confirm wicket' }));
  expect(await textOf('innings-wickets-Dev')).toBe('1');
  expect(await textOf('innings-points-Dev')).toBe('10');
  expect(await textOf('innings-points-Asha')).toBe('31');
  expect(await textOf('innings-catches-Meera')).toBe('1');
  expect(await textOf('innings-points-Meera')).toBe('10');
  expect(await textOf('innings-points-Dev')).toBe('10');
  expect(await textOf('innings-points-Asha')).toBe('31');

  await open(user, 'Leaderboard');
  expect(await textOf('rank-Asha')).toBe('1');
  expect(await textOf('points-Asha')).toBe('31');
  expect(await textOf('rank-Dev')).toBe('2');
  expect(await textOf('rank-Meera')).toBe('3');
  expect(screen.getByTestId('row-Asha').className).toContain('medal-1');
  expect(screen.getByTestId('row-Dev').className).toContain('medal-2');
  expect(screen.getByTestId('row-Meera').className).toContain('medal-3');

  await waitFor(() => {
    expect((globalThis as { __scorebook?: string }).__scorebook).toContain('"kind":"wicket"');
  });
  first.unmount();
  render(<App />);

  await open(user, 'Leaderboard');
  expect(await textOf('points-Asha')).toBe('31');
  expect(await textOf('points-Dev')).toBe('10');
  expect(await textOf('points-Meera')).toBe('10');

  await open(user, 'Live Match');
  expect(await textOf('match-runs')).toBe('26');
  expect(await textOf('match-wickets')).toBe('1');
  expect(await textOf('innings-points-Asha')).toBe('31');

  await user.selectOptions(screen.getByRole('combobox', { name: /^Edit event 1$/ }), '1');
  expect(await textOf('innings-points-Asha')).toBe('17');
  expect(await textOf('innings-runs-Asha')).toBe('22');
  await user.selectOptions(screen.getByRole('combobox', { name: /^Edit event 1$/ }), '4');
  expect(await textOf('innings-points-Asha')).toBe('31');
  expect(await textOf('striker-milestone-points')).toBe('10');

  await user.click(screen.getByRole('button', { name: 'Undo last event' }));
  expect(await textOf('innings-points-Meera')).toBe('0');
  expect(await textOf('innings-points-Dev')).toBe('0');
  await user.click(screen.getByRole('button', { name: 'Record wicket' }));
  await user.click(screen.getByRole('button', { name: 'Bowler Dev' }));
  await user.click(screen.getByRole('button', { name: 'Catcher Meera' }));
  await user.click(screen.getByRole('button', { name: 'Confirm wicket' }));
  expect(await textOf('innings-points-Meera')).toBe('10');
  expect(await textOf('innings-points-Dev')).toBe('10');

  await user.click(screen.getByRole('button', { name: 'Save match' }));
  await user.click(screen.getByRole('button', { name: 'Confirm save' }));
  await open(user, 'Leaderboard');
  expect(await textOf('points-Asha')).toBe('31');

  await open(user, 'Match History');
  expect(await textOf('history-0-runs-Asha')).toBe('25');
  expect(await textOf('history-0-points-Asha')).toBe('31');
  expect(await textOf('history-0-wickets-Dev')).toBe('1');
  expect(await textOf('history-0-catches-Meera')).toBe('1');

  await open(user, 'Dashboard');
  expect(await textOf('total-matches')).toBe('1');

  await open(user, 'Live Match');
  await user.click(screen.getByRole('button', { name: 'Start match' }));
  await user.click(screen.getByRole('button', { name: 'Begin scoring' }));
  await user.click(screen.getByRole('button', { name: 'Score 4 runs' }));
  await open(user, 'Leaderboard');
  expect(await textOf('points-Asha')).toBe('34');

  await open(user, 'Live Match');
  await user.click(screen.getByRole('button', { name: 'Reset match scores' }));
  await user.click(screen.getByRole('button', { name: 'Confirm reset' }));
  expect(await textOf('striker-total-points')).toBe('0');
  await open(user, 'Leaderboard');
  expect(await textOf('points-Asha')).toBe('31');
  await open(user, 'Players');
  expect(screen.getAllByRole('article')).toHaveLength(5);

  expect(within(screen.getByRole('article', { name: 'Asha' })).getByText('31')).toBeTruthy();
});
