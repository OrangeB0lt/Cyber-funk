/** The five tones. Every enemy is weak to one and may resist one; SWEET is healing-only. */
import type { ToneId } from '@core/ids/combat';
import type { Table, ToneDef } from '@core/types';

export const TONES: Table<ToneId, ToneDef> = {
  HOT: { id: 'HOT', name: 'HOT', color: '#ff5a2b', desc: 'High, fast, and fiery.' },
  LOW: { id: 'LOW', name: 'LOW', color: '#9b5cff', desc: 'Bass that shakes armor loose.' },
  BLUE: { id: 'BLUE', name: 'BLUE', color: '#3fb6ff', desc: 'The blue note, a sorrow that saps strength.' },
  FUNK: {
    id: 'FUNK',
    name: 'FUNK',
    color: '#39ff88',
    desc: 'Syncopation that scrambles anything keeping strict time.',
  },
  SWEET: { id: 'SWEET', name: 'SWEET', color: '#ff6ad5', desc: 'Healing tones; never deals damage.' },
};
