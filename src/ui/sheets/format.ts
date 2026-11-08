/** Display strings shared by several sheets. */
import type { GearDef } from '@core/types';
import { STAT_NAMES } from '@content/index';

/** "Chops +3, ONE zone +5%…" for a gear piece. */
export function gearStats(g: GearDef): string {
  const parts = (Object.keys(g.stats || {}) as (keyof typeof STAT_NAMES)[]).map(
    k => `${STAT_NAMES[k]} +${g.stats[k]}`,
  );
  if (g.oneZone) parts.push(`ONE zone +${Math.round(g.oneZone * 100)}%`);
  if (g.critBonus) parts.push(`crit +${Math.round(g.critBonus * 100)}%`);
  if (g.statusResist) parts.push(`status resist ${Math.round(g.statusResist * 100)}%`);
  if (g.toneBonus)
    parts.push(
      Object.entries(g.toneBonus)
        .map(([t, v]) => `${t} +${Math.round((v ?? 0) * 100)}%`)
        .join(' '),
    );
  if (g.doubloonBonus) parts.push(`Ð +${Math.round(g.doubloonBonus * 100)}%`);
  return parts.join(', ') || 'no bonus';
}
