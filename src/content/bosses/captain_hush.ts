/**
 * Captain Hush, Act 1 (Tremé, Congo Square). Guards the Root (C).
 * Pattern: every 4th turn a telegraphed Baton Strike; the turn after, Noise Cancel (Muted 2 turns).
 * At half Heart a Hush Patrolman joins.
 */
import type { BossDef } from '@core/types';

export const captainHush = {
  id: 'captain_hush',
  name: 'Captain Hush',
  level: 3,
  district: 'treme',
  tone: 'LOW',
  weak: 'FUNK',
  resist: 'BLUE',
  note: 'C',
  lines: {
    intro:
      'By order of Metronome, this square is now a Quiet Zone. Unlicensed syncopation detected. Cease all swing.',
    half: 'Backup. BACKUP. Someone turn down this city!',
    defeat: "This... isn't... regulation...",
  },
  book: "Metronome's man in Tremé. Declared Congo Square a Quiet Zone and found out why the drums never stopped.",
  ai({ self, rng }) {
    const t = self.turnCount;
    if (t % 4 === 3) return { skill: 'b_baton', telegraph: 'Captain Hush raises his dampener...' };
    if (t % 4 === 0 && t > 0) return { skill: 'b_noisecancel' };
    return { skill: rng.next() < 0.7 ? 'b_baton' : 'en_basic' };
  },
  onHalf({ ops }) {
    ops.summon('hush_patrol', 3, 'A Hush Patrolman jogs in from Rampart Street.');
  },
} satisfies BossDef;
