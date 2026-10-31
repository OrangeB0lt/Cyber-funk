/**
 * Lady Concertmaster Isolde Vane, Act 6 (Garden District, the Vane Manor ballroom). Guards the blue
 * note itself (G♭).
 * Pattern: a telegraphed Perfect Pitch Shield every third turn (only ON THE ONE or a SOLO shatters
 * it), Pizzicato Barrages and Bow Blades. Below 40% Heart she charges a Cadenza (VAMP through it),
 * then again every sixth turn.
 */
import type { BossDef } from '@core/types';

export const isolde = {
  id: 'isolde',
  name: 'Lady Concertmaster Isolde Vane',
  level: 13,
  district: 'garden',
  tone: 'BLUE',
  weak: 'FUNK',
  resist: 'BLUE',
  note: 'Gb',
  lines: {
    intro:
      'A duel? In my ballroom? How quaint. Very well. I will show you what a note sounds like when it is exactly where it belongs.',
    half: 'You are... early. On every beat. How are you early on every beat?',
    defeat: 'Flat. I was... flat. Father never let me be flat.',
  },
  book: "Metronome's First Chair, keeper of the Blue Note. Her Perfect Pitch Shield only shatters when you land ON THE ONE or SOLO. VAMP through her Cadenza.",
  ai({ self }) {
    const t = self.turnCount;
    if (!self.flags.cadenzaDone && self.hp <= self.maxHp * 0.4) {
      self.flags.cadenzaDone = true;
      return { skill: 'b_cadenza_charge' };
    }
    if (self.flags.cadenzaDone && t % 6 === 5) return { skill: 'b_cadenza_charge' };
    if (t % 3 === 0 && t > 0)
      return { skill: 'b_shield', telegraph: 'Isolde tunes to a perfect A. The air crystallizes.' };
    if (t % 3 === 2) return { skill: 'b_pizzicato' };
    return { skill: 'b_bowblade' };
  },
} satisfies BossDef;
