/** Enemies that only appear when a boss calls them in. */
import type { EnemyId } from '@core/ids/enemies';
import type { EnemyDef, Table } from '@core/types';

export const SUMMONS = {
  ghost_track: {
    id: 'ghost_track',
    name: 'Ghost Track',
    district: 'cemetery',
    levels: [11, 11],
    tone: 'BLUE',
    weak: 'BLUE',
    resist: 'FUNK',
    hpMult: 0.5,
    special: 'en_ghosttrack',
    specialChance: 0.5,
    book: 'The captured echo of a dead musician, replayed by the Archivist. It wants to rest.',
  },
} satisfies Partial<Table<EnemyId, EnemyDef>>;
