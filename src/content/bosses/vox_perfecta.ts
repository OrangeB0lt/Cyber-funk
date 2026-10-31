/**
 * Vox Perfecta, Act 2 (French Quarter, the Bourbon Strip main stage). Guards the flat third (E♭).
 * Pattern: Samples your last skill back at you, Pitch Correction for Foundation, and a telegraphed
 * Perfect Pitch (Muted). Hyped at half Heart.
 */
import type { BossDef } from '@core/types';

export const voxPerfecta = {
  id: 'vox_perfecta',
  name: 'Vox Perfecta',
  level: 5,
  district: 'quarter',
  tone: 'HOT',
  weak: 'BLUE',
  resist: 'HOT',
  note: 'Eb',
  hologram: true,
  lines: {
    intro:
      "Welcome to the Licensed Entertainment Strip. Tonight's performance is brought to you by Metronome. Please remain in perfect time.",
    half: 'Encore mode engaged. I do not tire. I do not stray. I do not... feel that.',
    defeat: 'Skipping... skipping... why does that note hurt?',
  },
  book: 'The holographic android diva headlining the Bourbon Strip. Perfect pitch, perfect time, and one note she cannot feel.',
  ai({ battle, self }) {
    const t = self.turnCount;
    const last = battle.lastPlayerSkill;
    if (last && t % 3 === 2) return { skill: 'b_sample' };
    if (t % 4 === 1) return { skill: 'b_pitchcorrect' };
    if (t % 5 === 4)
      return { skill: 'b_perfectpitch', telegraph: 'Vox Perfecta takes a breath she does not need...' };
    return { skill: 'en_basic' };
  },
  onHalf({ self, ops }) {
    ops.applyStatus(self, 'hyped', 3);
  },
} satisfies BossDef;
