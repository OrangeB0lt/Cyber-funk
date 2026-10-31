/** XP and levelling. */
import { STAT_KEYS, type StatKey } from '@core/ids/combat';
import type { GameState, LevelUp } from '@core/types';

import { CLASSES, LEVEL_CAP, SKILL_LEVELS } from '@content/data';
import { xpToNext } from './balance';
import { displayStats, funkPct, healPct } from './stats';

/**
 * Add XP and apply every level-up it pays for. Each level-up restores 30% Heart and Funk.
 * At the level cap XP is discarded.
 */
export function gainXp(s: GameState, n: number): LevelUp[] {
  const ups: LevelUp[] = [];
  if (s.level >= LEVEL_CAP) return ups;
  s.xp += n;
  while (s.level < LEVEL_CAP && s.xp >= xpToNext(s.level)) {
    const before = displayStats(s);
    s.xp -= xpToNext(s.level);
    s.level += 1;
    const after = displayStats(s);
    const gains = {} as Record<StatKey, number>;
    STAT_KEYS.forEach(k => {
      gains[k] = after[k] - before[k];
    });
    const idx = (SKILL_LEVELS as readonly number[]).indexOf(s.level);
    const newSkill = idx >= 0 ? CLASSES[s.cls].skills[idx]! : null;
    healPct(s, 0.3);
    funkPct(s, 0.3);
    ups.push({ level: s.level, gains, newSkill });
  }
  if (s.level >= LEVEL_CAP) s.xp = 0;
  return ups;
}

export type { LevelUp };
