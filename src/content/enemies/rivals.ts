/** Cutting Contest rivals at Club Feu Follet. They fight with real class skills. */
import type { EnemyId } from '@core/ids/enemies';
import type { EnemyDef, Table } from '@core/types';

export const RIVALS = {
  rival_hotrod: {
    id: 'rival_hotrod',
    name: '"Hot Rod" Broussard',
    district: 'quarter',
    levels: [4, 4],
    rival: 'trumpet',
    tone: 'HOT',
    weak: 'LOW',
    resist: 'HOT',
    book: "Trumpet. Plays high, plays loud, plays like the bell is on fire. Lost once, in 2081, and won't talk about it.",
  },
  rival_bigmae: {
    id: 'rival_bigmae',
    name: 'Big Mae Boudreaux',
    district: 'quarter',
    levels: [5, 5],
    rival: 'sousaphone',
    tone: 'LOW',
    weak: 'HOT',
    resist: 'LOW',
    gritMult: 1.3,
    book: 'Sousaphone. Holds down the low end of three bands and the whole Feu Follet bar when she leans on it.',
  },
  rival_twotone: {
    id: 'rival_twotone',
    name: 'Henri "Two-Tone" LeBlanc',
    district: 'quarter',
    levels: [5, 5],
    rival: 'saxophone',
    tone: 'FUNK',
    weak: 'HOT',
    resist: 'FUNK',
    book: "Saxophone. Honks and ballads, one for each shoe. Sweetest player on Frenchmen when he isn't cutting you.",
  },
} satisfies Partial<Table<EnemyId, EnemyDef>>;
