/**
 * Instruments: every class gets one per tier, generated here (not hand-written rows). The legendary
 * tier takes the class's `legendary` name.
 */
import { INSTRUMENT_TIER_IDS, type InstrumentId, type InstrumentTierId } from '@core/ids/items';
import { CLASS_IDS } from '@core/ids/characters';
import type { GearDef, InstrumentTierDef, Table } from '@core/types';
import { CLASSES } from '../classes';

export const INSTRUMENT_TIERS: Table<InstrumentTierId, InstrumentTierDef> = {
  pawnshop: { id: 'pawnshop', label: 'Pawnshop', chops: 0, price: 0, level: 1 },
  street: { id: 'street', label: 'Street-Tuned', chops: 4, price: 120, level: 3 },
  neon: { id: 'neon', label: 'Neon', chops: 9, price: 420, level: 7 },
  chrome: { id: 'chrome', label: 'Chrome', chops: 15, price: 950, level: 11 },
  legend: { id: 'legend', label: 'Legendary', chops: 24, price: 350, legendary: true, level: 1 },
};

function makeInstruments(): Table<InstrumentId, GearDef> {
  const out: Record<string, GearDef> = {};
  for (const clsId of CLASS_IDS) {
    const cls = CLASSES[clsId];
    for (const tierId of INSTRUMENT_TIER_IDS) {
      const t: InstrumentTierDef = INSTRUMENT_TIERS[tierId];
      const id: InstrumentId = `inst_${clsId}_${tierId}`;
      out[id] = {
        id,
        slot: 'instrument',
        cls: clsId,
        tier: tierId,
        name: t.legendary ? cls.legendary : `${t.label} ${cls.name}`,
        price: t.price,
        level: t.level,
        legendary: !!t.legendary,
        stats: { chops: t.chops },
        desc: t.legendary
          ? `${cls.name}'s legendary. Chops +${t.chops}. Built by Ti-Jacques from five Blue Notes' worth of chrome.`
          : `${cls.name}. Chops +${t.chops}.`,
      };
    }
  }
  return out as Table<InstrumentId, GearDef>;
}

/** Every instrument, class-major then tier order (matches v1's generation order). */
export const INSTRUMENTS = makeInstruments();
