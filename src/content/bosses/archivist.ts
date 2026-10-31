/**
 * The Archivist, Act 5 (Cities of the Dead, the Data Mausoleum). Guards the flat seventh (B♭).
 * Pattern: telegraphed Playback summons Ghost Tracks (two at a time at most), Erase strips buffs,
 * Overdub heals when below 70%.
 */
import type { BossDef } from '@core/types';

export const archivist = {
  id: 'archivist',
  name: 'The Archivist',
  level: 11,
  district: 'cemetery',
  tone: 'FUNK',
  weak: 'BLUE',
  resist: 'FUNK',
  note: 'Bb',
  machine: true,
  lines: {
    intro:
      'Every song ever played in this city is catalogued below. The dead do not improvise. Soon, neither will you.',
    half: 'Index corruption. The archive is... grieving? That is not a supported state.',
    defeat: 'Release... all... records...',
  },
  book: 'Curator of the Data Mausoleum, where Metronome stores the stolen songs of the dead to train the Click. Grief breaks through its filters.',
  ai({ battle, self }) {
    const t = self.turnCount;
    const ghosts = battle.enemies.filter(e => e.alive && e.defId === 'ghost_track').length;
    // PARITY: turnCount is incremented before ai() runs, so `t === 0` never holds. Kept as in v1.
    if (ghosts < 2 && (t === 0 || t % 3 === 0))
      return { skill: 'b_playback', telegraph: 'The Archivist queues a Playback...' };
    if (t % 4 === 2) return { skill: 'b_erase' };
    if (self.hp < self.maxHp * 0.7 && t % 3 === 1) return { skill: 'b_overdub' };
    return { skill: 'en_basic' };
  },
} satisfies BossDef;
