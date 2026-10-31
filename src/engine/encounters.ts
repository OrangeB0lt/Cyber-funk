/**
 * Who you fight on the streets. (Moved from v1's UI: legacy/src/07_ui_combat.js buildEnemies.)
 */
import type { EnemyId } from '@core/ids/enemies';
import type { DistrictId } from '@core/ids/world';
import type { Rng } from '@core/rng';
import type { Actor, GameState } from '@core/types';
import { DISTRICTS, ENCOUNTER_RIGS, ENEMIES } from '@content/data';
import { makeEnemy } from './combat/actors';
import { storyIs } from './story';

/** A random street group for a district: group size, pack enemies, then story rigging. */
export function randomStreetGroup(rng: Rng, s: GameState, district: DistrictId): EnemyId[] {
  const d = DISTRICTS[district];
  const pool = d.pool.slice();
  const n = rng.int(d.groups[0], d.groups[1]);
  let ids: EnemyId[] = [];
  const first = rng.pick(pool);
  const pack = ENEMIES[first].pack;
  if (pack) ids = new Array<EnemyId>(pack).fill(first);
  else {
    ids.push(first);
    for (let i = 1; i < n; i++) ids.push(rng.pick(pool.filter(x => !ENEMIES[x].pack)));
  }
  for (const rig of ENCOUNTER_RIGS) {
    if (storyIs(s, rig.at) && !ids.some(x => rig.anyOf.includes(x))) {
      // PARITY: a single-enemy rig assigns directly (no draw); only a choice of several draws.
      ids[0] = rig.anyOf.length === 1 ? rig.anyOf[0]! : rng.pick(rig.anyOf);
    }
  }
  return ids;
}

/**
 * Build enemy actors. `ids: 'random'` rolls a street group for the district. Without an explicit
 * level, each enemy rolls one in the overlap of its own range and the district's.
 */
export function buildEnemies(
  rng: Rng,
  s: GameState,
  ids: readonly EnemyId[] | 'random',
  opts?: { district?: DistrictId; level?: number },
): Actor[] {
  opts = opts || {};
  const district = opts.district || s.district;
  const d = DISTRICTS[district];
  const list = ids === 'random' ? randomStreetGroup(rng, s, district) : ids;
  return list.map(id => {
    const def = ENEMIES[id];
    let L = opts.level;
    if (!L) {
      const lo = Math.max(def.levels[0], d.levels[0]),
        hi = Math.min(def.levels[1], d.levels[1]);
      L = rng.int(Math.min(lo, hi), Math.max(lo, hi));
    }
    return makeEnemy(rng, s, id, L);
  });
}
