/** Threads: the body slot. */
import type { ThreadsId } from '@core/ids/items';
import type { GearDef, Table } from '@core/types';

export const THREADS: Table<ThreadsId, GearDef> = {
  thr_thrift: {
    id: 'thr_thrift',
    slot: 'threads',
    name: 'Thrift-Store Suit',
    price: 60,
    level: 1,
    stats: { grit: 1, heart: 5 },
    desc: "Grit +1, Heart +5. Somebody's uncle wore this to a wedding in 2071.",
  },
  thr_secondline: {
    id: 'thr_secondline',
    slot: 'threads',
    name: 'Second-Line Suit',
    price: 180,
    level: 4,
    stats: { grit: 3, heart: 15 },
    desc: 'Grit +3, Heart +15. Sash, fan, and matching shoes.',
  },
  thr_duster: {
    id: 'thr_duster',
    slot: 'threads',
    name: 'Mirrorshade Duster',
    price: 450,
    level: 8,
    stats: { grit: 6, heart: 30 },
    desc: 'Grit +6, Heart +30. Long coat, reflective lining, swamp-proof.',
  },
  thr_kevlar: {
    id: 'thr_kevlar',
    slot: 'threads',
    name: 'Kevlar Zoot Suit',
    price: 900,
    level: 11,
    stats: { grit: 10, heart: 50 },
    desc: 'Grit +10, Heart +50. Pleats you could stop a riot with.',
  },
  thr_regalia: {
    id: 'thr_regalia',
    slot: 'threads',
    name: "Grand Marshal's Regalia",
    price: 0,
    level: 1,
    story: true,
    stats: { grit: 12, heart: 60, mojo: 2 },
    desc: "Grit +12, Heart +60, Mojo +2. Gus's sash, his fan, his hat. It still smells like cigar.",
  },
};
