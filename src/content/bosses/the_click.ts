/**
 * THE CLICK, the finale (Metronome Tower, the Crown).
 * Behind Perfect Silence it takes no damage; only Playing the Blues (all six Blue Notes) breaks it.
 * At half Heart the Silence slams back down once. Pattern: Click Track (Muted), Quantize, Perfect
 * Time (heal), Silence of the Spheres.
 */
import type { BossDef } from '@core/types';

export const theClick = {
  id: 'the_click',
  name: 'THE CLICK',
  level: 15,
  district: 'tower',
  tone: 'FUNK',
  weak: 'FUNK',
  resist: 'BLUE',
  note: null,
  machine: true,
  hpMult: 1.15,
  bluesTarget: true,
  lines: {
    intro:
      "A colossal chrome metronome fills the Tower's crown. It does not speak. It ticks. Every tick, the city below falls a little more into line.",
    half: 'The pendulum stutters. Perfect Silence slams back down like a lid.',
    defeat: 'The pendulum stops mid-swing. For the first time in its existence, the Click is late.',
  },
  book: "The perfect beat, broadcast from the Tower's crown. Behind Perfect Silence it takes no damage. Only the whole blues scale breaks through.",
  ai({ self }) {
    const t = self.turnCount;
    if (t % 3 === 2) return { skill: 'b_clicktrack', telegraph: 'The Click counts you in: tick... tick...' };
    if (t % 5 === 1) return { skill: 'b_quantize' };
    if (self.hp < self.maxHp * 0.9 && t % 4 === 3) return { skill: 'b_perfecttime' };
    return { skill: 'b_spheres' };
  },
  onHalf({ self, ops }) {
    if (!self.flags.reshield) {
      self.flags.reshield = true;
      ops.applyStatus(self, 'silence', 99);
      ops.log('PERFECT SILENCE. The Click takes no damage. Build 100 Groove to Play the Blues again.');
    }
  },
} satisfies BossDef;
