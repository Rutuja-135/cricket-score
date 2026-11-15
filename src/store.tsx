import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createEmptyState, reduce, type Action, type StartMode } from './reducer';
import { sanitizeState } from './storage';
import type { AppState, PointsFlash, Role, RunsValue } from './types';

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface StoreApi {
  state: AppState;
  ready: boolean;
  loadError: string | null;
  notice: string | null;
  flashes: PointsFlash[];
  reload: () => void;
  dismissNotice: () => void;
  addPlayer: (name: string, role: Role) => boolean;
  updatePlayer: (id: string, name: string, role: Role) => boolean;
  deletePlayer: (id: string) => boolean;
  toggleSquad: (playerId: string) => boolean;
  startMatch: (title: string, playerIds: string[], mode: StartMode) => boolean;
  setStriker: (playerId: string) => boolean;
  recordRuns: (runs: RunsValue) => boolean;
  recordWicket: (bowlerId: string, catcherId: string | null) => boolean;
  undo: () => boolean;
  deleteEvent: (eventId: string) => boolean;
  editRuns: (eventId: string, runs: RunsValue) => boolean;
  resetLive: () => boolean;
  endMatch: () => boolean;
  deleteMatch: (matchId: string) => boolean;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({
  children,
  initial,
  persist = true,
}: {
  children: ReactNode;
  initial?: AppState;
  persist?: boolean;
}) {
  const [state, setState] = useState<AppState>(() => initial ?? createEmptyState());
  const [ready, setReady] = useState(initial != null || !persist);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [flashes, setFlashes] = useState<PointsFlash[]>([]);
  const stateRef = useRef(state);
  const saveQueue = useRef(Promise.resolve());
  const mounted = useRef(true);
  stateRef.current = state;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (initial || !persist) return;
    let cancelled = false;
    setReady(false);
    setLoadError(null);
    fetch('/api/state')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load the scorebook.');
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (cancelled) return;
        const next = sanitizeState(payload);
        stateRef.current = next;
        setState(next);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the saved scores. Check the connection and try again.');
      });
    return () => {
      cancelled = true;
    };
  }, [initial, loadAttempt, persist]);

  useEffect(() => {
    if (!persist || !ready) return;
    const snapshot = state;
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch('/api/state', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: 1, state: snapshot }),
        });
        if (!response.ok && mounted.current) setNotice('The last change was not saved to the database.');
      })
      .catch(() => {
        if (mounted.current) setNotice('The last change was not saved to the database.');
      });
  }, [persist, ready, state]);

  useEffect(() => {
    if (flashes.length === 0) return;
    const timeout = window.setTimeout(() => setFlashes([]), 3200);
    return () => window.clearTimeout(timeout);
  }, [flashes]);

  const dispatch = useCallback((action: Action) => {
    const result = reduce(stateRef.current, action);
    if (result.error) {
      setNotice(result.error);
      return false;
    }
    stateRef.current = result.state;
    setState(result.state);
    setNotice(null);
    if (result.flashes.length > 0) setFlashes(result.flashes);
    return true;
  }, []);

  const api = useMemo<StoreApi>(
    () => ({
      state,
      ready,
      loadError,
      notice,
      flashes,
      reload: () => setLoadAttempt((attempt) => attempt + 1),
      dismissNotice: () => setNotice(null),
      addPlayer: (name, role) => dispatch({ type: 'ADD_PLAYER', id: createId(), name, role, now: Date.now() }),
      updatePlayer: (id, name, role) => dispatch({ type: 'UPDATE_PLAYER', id, name, role }),
      deletePlayer: (id) => dispatch({ type: 'DELETE_PLAYER', id }),
      toggleSquad: (playerId) => dispatch({ type: 'TOGGLE_SQUAD', playerId }),
      startMatch: (title, playerIds, mode) =>
        dispatch({ type: 'START_MATCH', id: createId(), title, playerIds, mode, now: Date.now() }),
      setStriker: (playerId) => dispatch({ type: 'SET_STRIKER', playerId }),
      recordRuns: (runs) => dispatch({ type: 'RECORD_RUNS', id: createId(), runs, now: Date.now() }),
      recordWicket: (bowlerId, catcherId) =>
        dispatch({ type: 'RECORD_WICKET', id: createId(), bowlerId, catcherId, now: Date.now() }),
      undo: () => dispatch({ type: 'UNDO' }),
      deleteEvent: (eventId) => dispatch({ type: 'DELETE_EVENT', eventId }),
      editRuns: (eventId, runs) => dispatch({ type: 'EDIT_RUNS', eventId, runs }),
      resetLive: () => dispatch({ type: 'RESET_LIVE' }),
      endMatch: () => dispatch({ type: 'END_MATCH', now: Date.now() }),
      deleteMatch: (matchId) => dispatch({ type: 'DELETE_MATCH', matchId }),
    }),
    [dispatch, flashes, loadError, notice, ready, state],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used within StoreProvider');
  return store;
}
