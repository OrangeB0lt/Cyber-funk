/** Tremé. */
import type { DistrictDef } from '@core/types';

export const treme = {
  id: 'treme',
  name: 'Tremé',
  levels: [1, 3],
  groups: [1, 2],
  pool: ['hush_patrol', 'click_drone', 'nutria', 'hustler'],
  elite: 'hush_sergeant',
  boss: 'captain_hush',
  places: ['club', 'kitchen', 'pawn', 'congo'],
  intro:
    'Home turf. Shotgun houses wrapped in neon, iron balconies dripping pink light, and a brass band always practicing somewhere behind a shutter.',
  ambient: [
    'Somewhere down Claiborne, a trombone warms up under the overpass and stops the second a Click-Drone passes.',
    'A MoodSync speaker on the corner plays a perfect, swingless march. Nobody is marching.',
    'Two kids on a stoop tap out a street beat on a bucket, then freeze and look innocent. Good kids.',
    "The neon on Mama Roux's sign buzzes a half-step flat. It always has.",
    "A Hush patrol rolls past in white chrome. One of them is humming. He doesn't know it.",
    "The smell of red beans comes through somebody's window. It's Monday somewhere.",
  ],
  bountyGold: 120,
} as const satisfies DistrictDef;
