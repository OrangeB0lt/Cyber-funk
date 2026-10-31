/** Sheet music: techniques bought once and always on. Their effects are data (`passive`). */
import type { SheetMusicId } from '@core/ids/items';
import type { SheetMusicDef, Table } from '@core/types';

export const SHEET_MUSIC: Table<SheetMusicId, SheetMusicDef> = {
  sm_circular: {
    id: 'sm_circular',
    name: 'Circular Breathing',
    price: 200,
    desc: '+1 Funk per turn in battle.',
    passive: { funkRegen: 1 },
  },
  sm_secondwind: {
    id: 'sm_secondwind',
    name: 'Second Wind',
    price: 400,
    desc: 'Once per battle, survive a lethal hit with 1 Heart.',
    passive: { secondWind: true },
  },
  sm_swing: {
    id: 'sm_swing',
    name: 'Swing Feel',
    price: 300,
    desc: 'Wider ONE zone (+30%).',
    passive: { oneZone: 0.3 },
  },
  sm_rubato: {
    id: 'sm_rubato',
    name: 'Rubato',
    price: 250,
    desc: '+8% dodge.',
    passive: { dodgeBonus: 0.08 },
  },
  sm_ghost: {
    id: 'sm_ghost',
    name: 'Ghost Notes',
    price: 350,
    desc: '+25% crit damage.',
    passive: { critDmg: 2 },
  },
};
