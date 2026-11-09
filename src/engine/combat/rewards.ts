/**
 * What a battle pays out, and writing the battle's results back to the save.
 */
import type { ItemId } from '@core/ids/items';
import type { Battle, BattleRewards } from '@core/types';

import { LOOT, QUEST_DROPS, SPAR_DOUBLOON_RATE } from '@content/data';
import { countItem } from '../inventory';
import { derivedStats, funkPct, healPct, clampVitals } from '../stats';
import { storyIs } from '../story';
import { effStat } from './statuses';

/**
 * Per enemy: XP 5 + 4L and Doubloons (3 + 3L) × 0.75–1.25, ×10 for bosses, ×2.5/×3 for elites, half
 * for summons. Non-boss, non-summoned enemies roll quest drops, then loot. Doubloons scale with Mojo
 * and Doubloon bonuses.
 */
export function battleRewards(b: Battle): BattleRewards {
  const s = b.state;
  const st = derivedStats(s);
  let xp = 0,
    gold = 0;
  const drops: ItemId[] = [];
  b.enemies.forEach(e => {
    const L = e.level;
    let ex = 5 + 4 * L;
    let g = (3 + 3 * L) * b.rng.float(0.75, 1.25);
    if (e.boss) {
      ex *= 10;
      g *= 10;
    } else if (e.elite) {
      ex *= 2.5;
      g *= 3;
    } else if (e.summoned) {
      ex *= 0.5;
      g *= 0.5;
    }
    xp += ex;
    gold += g;
    if (!e.boss && !e.summoned) {
      // PARITY: condition order matters; the chance roll (a draw) happens only if the rest hold.
      for (const rule of QUEST_DROPS) {
        if (
          rule.enemies.some(id => id === e.defId) &&
          storyIs(s, rule.at) &&
          countItem(s, rule.item) < rule.max &&
          b.rng.chance(rule.chance)
        )
          drops.push(rule.item);
      }
      if (b.rng.chance(LOOT.rareChance)) drops.push(LOOT.rare);
      else if (b.rng.chance(LOOT.commonChance)) drops.push(b.rng.pick(LOOT.common));
    }
  });
  const mojoBonus = 1 + 0.01 * effStat(b.player, 'mojo') + st.doubloonBonus;
  gold = Math.round(gold * mojoBonus);
  if (b.context === 'spar') gold = Math.round(gold * SPAR_DOUBLOON_RATE);
  gold += b.stolen;
  return { xp: Math.round(xp), gold, drops };
}

/**
 * Write Heart and Funk back to the save (never below 1 Heart), count down meal and dream buffs, and
 * on a win recover 10% Heart and 20% Funk.
 */
export function applyBattleResult(b: Battle): void {
  const s = b.state;
  const p = b.player;
  s.hp = Math.max(1, p.hp);
  s.fp = p.fp;
  if (s.mealBuff) {
    s.mealBuff.fights--;
    if (s.mealBuff.fights <= 0) s.mealBuff = null;
  }
  if (s.dreamBuff) {
    s.dreamBuff.fights--;
    if (s.dreamBuff.fights <= 0) s.dreamBuff = null;
  }
  if (b.result === 'win') {
    healPct(s, 0.1);
    funkPct(s, 0.2);
  }
  clampVitals(s);
}

export type { BattleRewards };
