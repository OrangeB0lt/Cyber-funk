/**
 * Le Rougarou Chromé (Lucien), Act 4 (Manchac Swamp, Pump Station 13). Guards the fifth (G).
 * Pattern: Claw Rakes, and a telegraphed Howl of the Click (Muted) at most every four rounds while
 * you aren't already Muted. At half Heart, Full Moon Overclock: Up-Tempo, Hyped, two actions a round.
 */
import { hasStatus } from '@core/helpers';
import type { BossDef } from '@core/types';

export const rougarou = {
  id: 'rougarou',
  name: 'Le Rougarou Chromé',
  level: 9,
  district: 'bayou',
  tone: 'HOT',
  weak: 'HOT',
  resist: 'LOW',
  note: 'G',
  lines: {
    intro:
      "The wolf that was Lucien lifts its chrome muzzle. The pump station's signal screams in its skull. It howls in perfect time.",
    half: "Full moon overclock. The implant whines. Lucien's eyes go white, then red, then faster.",
    defeat: 'The howl breaks in the middle, like a voice cracking. Something human looks out.',
  },
  book: "Lucien, alpha of the Chrome Wolves, overclocked into a rougarou by the Click's test signal. Weak to heat; the implant runs hot already.",
  ai({ battle, self, rng }) {
    const t = self.turnCount;
    const lastHowl = self.flags.lastHowl === undefined ? -9 : self.flags.lastHowl;
    if (t > 1 && battle.round - lastHowl >= 4 && !hasStatus(battle.player, 'muted')) {
      self.flags.lastHowl = battle.round;
      return { skill: 'b_howlclick', telegraph: 'Le Rougarou throws its head back...' };
    }
    return { skill: rng.next() < 0.6 ? 'b_clawrake' : 'en_basic' };
  },
  onHalf({ self, ops }) {
    ops.applyStatus(self, 'uptempo', 3);
    ops.applyStatus(self, 'hyped', 3);
    self.extraActions = 1;
    ops.log('FULL MOON OVERCLOCK. Le Rougarou attacks twice per round now.');
  },
} satisfies BossDef;
