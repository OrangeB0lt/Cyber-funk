/** Starting a battle. */
import { clamp } from '@core/helpers';
import type { Rng } from '@core/rng';
import type { Actor, Battle, BattleOptions, GameState } from '@core/types';
import { BOSSES } from '@content/data';
import { makePlayerActor } from './actors';
import { logLine, recordSeen } from './events';
import { applyStatusRaw } from './statuses';

/**
 * Create a battle against already-built enemy actors. Consumes the save's next-fight bonuses,
 * raises the Click's Perfect Silence in its final phase, and records every enemy in the Blue Book.
 * The battle draws all of its randomness from `rng`.
 */
export function createBattle(rng: Rng, s: GameState, enemyActors: Actor[], opts?: BattleOptions): Battle {
  opts = opts || {};
  const b: Battle = {
    rng,
    state: s,
    player: makePlayerActor(s),
    enemies: enemyActors,
    round: 0,
    order: [],
    idx: -1,
    events: [],
    over: false,
    result: null,
    boss: opts.boss || null,
    context: opts.context || 'street',
    flee: false,
    lastPlayerSkill: null,
    stolen: 0,
    ambush: !!opts.ambush,
    waiting: false,
    noFlee: !!opts.noFlee,
    clickPhase: !!opts.clickPhase,
    bluesFree: !!opts.clickPhase,
    discoveries: [],
    summonCount: 0,
  };
  const nf = s.nextFight;
  s.nextFight = null;
  const p = b.player;
  if (nf) {
    if (nf.groove) p.groove = clamp(p.groove + nf.groove, 0, 100);
    if (nf.mojo) p.stats.mojo = Math.max(0, p.stats.mojo + nf.mojo);
    if (nf.hyped) applyStatusRaw(b, p, 'hyped', 3);
    if (nf.pocket) applyStatusRaw(b, p, 'pocket', 3);
    if (nf.status) applyStatusRaw(b, p, nf.status, 3);
  }
  if (b.clickPhase) {
    const click = enemyActors[0]!;
    applyStatusRaw(b, click, 'silence', 99);
  }
  enemyActors.forEach(e => {
    if (e.defId && e.defId !== 'player') recordSeen(s, e.defId);
  });
  if (b.boss) {
    const bd = BOSSES[b.boss];
    logLine(b, `${bd.name}: "${bd.lines.intro}"`, 'boss');
  }
  return b;
}
