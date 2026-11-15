import type { Role, ScoreEvent } from './types';

export const ROLE_LABEL: Record<Role, string> = {
  batsman: 'Batsman',
  bowler: 'Bowler',
  'all-rounder': 'All-rounder',
};

export function formatWhen(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

export function formatSigned(amount: number): string {
  if (amount > 0) return `+${amount}`;
  return String(amount);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const AVATAR_COLORS = ['#1f8a4c', '#0f766e', '#b45309', '#9f1239', '#1d4ed8', '#4d7c0f', '#7c3aed'];

export function describeEvent(event: ScoreEvent, nameOf: (playerId: string) => string): string {
  if (event.kind === 'runs') {
    const batter = nameOf(event.batsmanId);
    if (event.runs === 4) return `${batter} hits a four`;
    if (event.runs === 6) return `${batter} hits a six`;
    if (event.runs === 0) return `${batter} plays a dot ball`;
    return `${batter} scores ${event.runs}`;
  }
  if (event.kind === 'wicket') {
    const wicket = `${nameOf(event.bowlerId)} takes the wicket of ${nameOf(event.batsmanId)}`;
    return event.catcherId ? `${wicket}, caught by ${nameOf(event.catcherId)}` : wicket;
  }
  return `${nameOf(event.catcherId ?? '')} takes the catch`;
}

export function avatarColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 33 + name.charCodeAt(index)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
