/** French Quarter & Frenchmen. */
import type { DistrictDef } from '@core/types';

export const quarter = {
  id: 'quarter',
  name: 'French Quarter & Frenchmen',
  levels: [3, 5],
  groups: [1, 3],
  pool: ['gocup_golem', 'neon_mime', 'busker_bot', 'barker'],
  elite: 'hooligan',
  boss: 'vox_perfecta',
  places: ['strip', 'pelican', 'feufollet', 'market', 'jackson'],
  intro:
    'The Vieux Carré under holographic billboards. Wrought iron, go-cups, licensed jingles leaking from every doorway, and the river breathing fog over it all.',
  ambient: [
    'A hologram of Vox Perfecta forty feet tall winks from the top of a Bourbon Street hotel.',
    'A Licensed Busker-Bot plays the same eight bars outside the cathedral. A pigeon has learned to leave on the downbeat.',
    'A Neon Mime holds an invisible door open for a tourist. The tourist walks into the actual door.',
    'From a Frenchmen Street window, three real notes escape before a shutter slams. People on the banquette smile and keep walking.',
    'The streetcar bell on Canal rings in perfect quarter notes. Metronome fixed that too.',
    'A go-cup rolls down Royal Street in the wind, in 4/4.',
  ],
  bountyGold: 180,
} as const satisfies DistrictDef;
