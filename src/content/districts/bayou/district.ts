/** Manchac Swamp. */
import type { DistrictDef } from '@core/types';

export const bayou = {
  id: 'bayou',
  name: 'Manchac Swamp',
  levels: [7, 9],
  groups: [2, 3],
  pool: ['chrome_gator', 'feu_follet', 'grunch', 'skeeter', 'rougarou_pup'],
  elite: 'big_grunch',
  boss: 'rougarou',
  airboat: true,
  places: ['cabin', 'faisdodo', 'boudin', 'pump'],
  intro:
    'Cypress knees in black water, fog thick enough to lean on, jet-turbine airboats screaming past, and Metronome pylons humming a test tone deep in the dark.',
  ambient: [
    'A Metronome pylon pulses in the fog. Every frog within a mile croaks on the beat.',
    'An airboat tears past with a Cajun band on the deck, playing fast enough to outrun the Hush.',
    'Something big slides off a log into the water. Something chrome.',
    'A feu follet bobs over the channel, bluish and patient.',
    'Spanish moss hangs off the pylons now. The swamp is taking them back, slowly.',
    'From the Fais Do-Do, an accordion and a frottoir. Then a howl, far off, on the two and four.',
  ],
  bountyGold: 340,
} as const satisfies DistrictDef;
