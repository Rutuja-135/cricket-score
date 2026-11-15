import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

const emptyScorebook = JSON.stringify({
  version: 1,
  state: { players: [], squadIds: [], liveMatch: null, matches: [] },
});

beforeEach(() => {
  (globalThis as { __scorebook?: string }).__scorebook = '';
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (!url.includes('/api/state')) return Promise.resolve(new Response('Not found', { status: 404 }));
    const method = (init?.method ?? 'GET').toUpperCase();
    if (method === 'PUT') {
      (globalThis as { __scorebook?: string }).__scorebook = String(init?.body ?? '');
      return Promise.resolve(new Response('{"ok":true}', { status: 200 }));
    }
    const body = (globalThis as { __scorebook?: string }).__scorebook || emptyScorebook;
    return Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': 'application/json' } }));
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});
