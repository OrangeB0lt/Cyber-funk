/** Garden District. */
import type { DistrictDef } from '@core/types';

export const garden = {
  id: 'garden',
  name: 'Garden District',
  levels: [11, 13],
  groups: [2, 3],
  pool: ['debutante', 'butler', 'topiary', 'quartet', 'valet'],
  elite: 'beaumont',
  boss: 'isolde',
  places: ['maison', 'tuxedo', 'manor'],
  intro:
    'Oak-lined St. Charles Avenue. Mansions under security domes, topiary trimmed into soldiers, and a streetcar that runs in perfect silence past gates that never open.',
  ambient: [
    'The St. Charles streetcar glides past without a sound. The passengers do not look up.',
    'A Butler Unit sweeps a banquette that is already clean, in 3/4 time.',
    'From behind a security dome, a string quartet plays something licensed and exact.',
    'A Debutante Droid curtsies to nothing and holds it.',
    "Vane Manor's gates are lit gold tonight. There's a ball. There's always a ball.",
    'An oak older than Metronome drops an acorn on a Topiary Mech. It does not notice.',
  ],
  bountyGold: 520,
} as const satisfies DistrictDef;
