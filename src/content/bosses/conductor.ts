/**
 * The Conductor (Maestro Aurelius Quant), Act 7 (Metronome Tower, the Booth).
 * Pattern: a charged Crescendo on turn 3 and every 5 turns after (VAMP halves it), a telegraphed
 * Fermata that steals your turn, Tempo Lock when your Groove is high, Ritardando, Downbeat.
 */
import type { BossDef } from '@core/types';

export const conductor = {
  id: 'conductor',
  name: 'The Conductor',
  level: 15,
  district: 'tower',
  tone: 'LOW',
  weak: 'FUNK',
  resist: 'BLUE',
  note: null,
  lines: {
    intro:
      'Maestro Aurelius Quant. Jazz is just error, repeated until someone mistook it for culture. I have corrected the recording.',
    half: 'The orchestra is restless. I will fix that. I fix everything.',
    defeat: 'The baton... slips. Who... who is keeping time?',
  },
  book: 'Maestro Aurelius Quant, CEO of Metronome, conducting from the Booth. His Crescendo is telegraphed; VAMP halves it. Fermata steals your turn.',
  ai({ battle, self }) {
    const t = self.turnCount;
    if (t >= 3 && (t - 3) % 5 === 0) return { skill: 'b_crescendo_charge' };
    if (t - (self.flags.lastFermata ?? -10) >= 4 && t % 4 === 2) {
      self.flags.lastFermata = t;
      return { skill: 'b_fermata', telegraph: 'The Conductor holds his baton flat. A fermata...' };
    }
    if (battle.player.groove >= 70 && t % 3 === 1) return { skill: 'b_tempolock' };
    if (t % 4 === 3) return { skill: 'b_ritardando' };
    return { skill: 'b_downbeat' };
  },
} satisfies BossDef;
