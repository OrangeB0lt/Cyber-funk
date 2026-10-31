/**
 * Status effects on actors: effective stats, applying, removing, cleansing, stripping.
 * Turn-by-turn ticking lives in turns.ts (beginTurn/endTurn).
 */
import type { CombatStatKey, StatusId } from '@core/ids/combat';
import { getStatus } from '@core/helpers';
import type { Actor, Battle } from '@core/types';
import { STATUSES } from '@content/data';
import { logLine } from './events';

/** A stat after status modifiers (and Mr. Ledger's compounding Chops). Never below 0.1. */
export function effStat(a: Actor, k: CombatStatKey): number {
  const v = a.stats[k];
  let mult = 1;
  a.statuses.forEach(st => {
    const d = STATUSES[st.id];
    if (d.mod && d.mod[k]) mult += d.mod[k]!;
  });
  if (k === 'chops' && a.chopsStack) mult += a.chopsStack;
  return Math.max(0.1, v * mult);
}

/** Remove a status (with an event). */
export function removeStatus(b: Battle, a: Actor, id: StatusId): void {
  const i = a.statuses.findIndex(s => s.id === id);
  if (i >= 0) {
    a.statuses.splice(i, 1);
    b.events.push({ type: 'status', target: a.id, id, add: false });
  }
}

/**
 * Put a status on an actor with no roll, resistance or log. Re-applying refreshes the duration
 * (the longer of the two) without a new event.
 */
export function applyStatusRaw(b: Battle, target: Actor, id: StatusId, turns?: number): boolean {
  const d = STATUSES[id];
  if (!d) return false;
  if (!target.alive) return false;
  turns = turns || d.turns;
  const ex = getStatus(target, id);
  if (ex) {
    ex.turns = Math.max(ex.turns, turns);
    ex.fresh = true;
    return true;
  }
  target.statuses.push({ id, turns, fresh: true });
  b.events.push({ type: 'status', target: target.id, id, add: true });
  return true;
}

/**
 * Apply a status the way skills do: optional chance roll, boss Swooned immunity (or `bossAlt`),
 * the player's charm resistance, then a log line.
 */
export function applyStatus(
  b: Battle,
  target: Actor,
  id: StatusId,
  turns?: number,
  chanceVal?: number,
  bossAlt?: StatusId,
): boolean {
  const d = STATUSES[id];
  if (!d || !target.alive) return false;
  if (chanceVal !== undefined && !b.rng.chance(chanceVal)) return false;
  if (target.boss && id === 'swooned') {
    if (bossAlt) id = bossAlt;
    else return false;
  }
  // PARITY: `d` stays the originally requested status (Swooned) even when `bossAlt` replaced the id,
  // so the resist check and the log class use Swooned's kind. v1 behaves this way.
  if (
    d.kind === 'bad' &&
    target.side === 'player' &&
    target.statusResist &&
    b.rng.chance(target.statusResist)
  ) {
    logLine(b, `${target.name}'s charm shrugs off ${d.name}.`);
    return false;
  }
  if (applyStatusRaw(b, target, id, turns)) {
    logLine(b, `${target.name} is ${STATUSES[id].name}.`, d.kind);
    return true;
  }
  return false;
}

/** Remove statuses of a kind (or only one id). Returns how many were removed. */
export function cleanse(b: Battle, a: Actor, kind: 'good' | 'bad', only?: StatusId): number {
  const before = a.statuses.length;
  a.statuses = a.statuses.filter(st => {
    if (only) return st.id !== only;
    const d = STATUSES[st.id];
    return d.kind !== kind;
  });
  if (a.statuses.length !== before) b.events.push({ type: 'status', target: a.id, id: null, add: false });
  return before - a.statuses.length;
}

/** Remove buffs (all, or the most recent `count`). Silence and Pitch Shield can't be stripped. */
export function stripBuffs(b: Battle, a: Actor, count?: number): number {
  const good = a.statuses.filter(
    st => STATUSES[st.id].kind === 'good' && st.id !== 'silence' && st.id !== 'pitchshield',
  );
  if (!good.length) return 0;
  const toRemove = count ? good.slice(-count) : good;
  a.statuses = a.statuses.filter(st => !toRemove.includes(st));
  b.events.push({ type: 'status', target: a.id, id: null, add: false });
  logLine(b, `${a.name} loses ${toRemove.map(st => STATUSES[st.id].name).join(', ')}.`);
  return toRemove.length;
}
