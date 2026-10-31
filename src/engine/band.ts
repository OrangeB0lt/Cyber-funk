/** Bandmates and gear: the loadout rules the menus enforce. */
import type { BandmateId } from '@core/ids/band';
import type { GearId, GearSlot } from '@core/ids/items';
import type { GameState } from '@core/types';
import { ACTIVE_BAND_SIZE, GEAR } from '@content/data';
import { clampVitals } from './stats';

/** Bring or bench a bandmate. Returns a message when refused. */
export function toggleBandmate(s: GameState, id: BandmateId): { ok: boolean; message?: string } {
  const i = s.band.active.indexOf(id);
  if (i >= 0) s.band.active.splice(i, 1);
  else {
    if (s.band.active.length >= ACTIVE_BAND_SIZE)
      return { ok: false, message: 'Only two can fit in the streetcar.' };
    s.band.active.push(id);
  }
  clampVitals(s);
  return { ok: true };
}

/** Owned gear that fits a slot (instruments only for your class). */
export function gearForSlot(s: GameState, slot: GearSlot): GearId[] {
  return s.gearBag.filter(
    id => GEAR[id] && GEAR[id].slot === slot && (slot !== 'instrument' || GEAR[id].cls === s.cls),
  );
}

/** Equip a piece of owned gear in its slot. */
export function equip(s: GameState, id: GearId): void {
  s.gear[GEAR[id].slot] = id;
  clampVitals(s);
}

/** Empty a slot (instruments can't be unequipped). */
export function unequip(s: GameState, slot: Exclude<GearSlot, 'instrument'>): void {
  s.gear[slot] = null;
  clampVitals(s);
}
