/** Cities of the Dead. */
import type { DistrictDef } from '@core/types';

export const cemetery = {
  id: 'cemetery',
  name: 'Cities of the Dead',
  levels: [9, 11],
  groups: [2, 3],
  pool: ['haint', 'data_wraith', 'tomb_crawler', 'archive_drone', 'bone_choir'],
  elite: 'crypt_keeper',
  boss: 'archivist',
  places: ['temple', 'crypts', 'mausoleum'],
  intro:
    'St. Louis Cemetery No. 1. Whitewashed tombs in neat rows, LED votives flickering in the alcoves, and beneath it all a hum: the Data Mausoleum, where Metronome keeps the songs of the dead.',
  ambient: [
    "A haint drifts past a tomb, humming something it can't quite remember. Then it does, and vanishes.",
    'The LED votives flicker on the beat. Somebody down below is keeping time with the dead.',
    'An Archive Drone photographs a tomb inscription, then erases it.',
    "Mambo Rosalie's bell rings from the temple. The tombs answer, softly.",
    'A tomb door stands open an inch. Blue light inside. Cold air out.',
    "Three skeletons in a row sing one perfect chord and hold it. You wish they'd stop.",
  ],
  bountyGold: 420,
} as const satisfies DistrictDef;
