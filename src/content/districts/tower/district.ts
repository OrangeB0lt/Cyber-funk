/** Central Business District. */
import type { DistrictDef } from '@core/types';

export const tower = {
  id: 'tower',
  name: 'Central Business District',
  levels: [13, 15],
  groups: [2, 4],
  pool: ['hush_elite', 'quantizer', 'session_clone', 'sentinel'],
  elite: 'warden',
  boss: 'conductor',
  places: ['towerlobby'],
  intro:
    'Glass canyons and a sky the color of a dead CRT. Metronome Tower rises out of the middle of it, a chrome needle with a pendulum in its crown, and the whole city ticks to it.',
  ambient: [
    'The Tower ticks. You can feel it in your teeth.',
    "A Hush Elite in gold chrome watches the plaza. No citation pad. They're past tickets now.",
    'Every screen on every building shows the same thing: a metronome, swinging.',
    'The second line is waiting on Poydras. You can hear the drums from here.',
    "A Quantizer snaps a pigeon's flight path to a grid. The pigeon seems offended.",
  ],
  bountyGold: 650,
} as const satisfies DistrictDef;
