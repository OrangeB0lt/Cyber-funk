/**
 * Pure helpers over battle objects that need no content tables. Content (boss AI, custom effects)
 * and the engine both use them, which is why they live in core.
 */
import type { StatusId } from './ids/combat';
import type { Actor, Battle, StatusInstance } from './types/battle';

/** Clamp `v` into [lo, hi]. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Does the actor currently have this status? */
export function hasStatus(a: Actor, id: StatusId): boolean {
  return a.statuses.some(s => s.id === id);
}

/** The actor's instance of a status, if any. */
export function getStatus(a: Actor, id: StatusId): StatusInstance | undefined {
  return a.statuses.find(s => s.id === id);
}

/** Enemies still standing, in battle order. */
export function livingEnemies(b: Battle): Actor[] {
  return b.enemies.filter(e => e.alive);
}
