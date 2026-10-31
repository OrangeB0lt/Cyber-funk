/** Storyville. */
import type { DistrictDef } from '@core/types';

export const storyville = {
  id: 'storyville',
  name: 'Storyville',
  levels: [5, 7],
  groups: [2, 3],
  pool: ['enforcer', 'bouncer', 'absinthe', 'repo_drone'],
  elite: 'bagman',
  boss: 'mr_ledger',
  places: ['lantern', 'chopshop', 'counting'],
  intro:
    'The old red-light district, revived in neon and velvet. Basin Street glows magenta. Every parlor has a piano, a bouncer, and a contract nailed above the bar.',
  ambient: [
    'A Contract Enforcer tapes a notice to a parlor door: ALL PERFORMANCES PROPERTY OF LEDGER & SONS.',
    "Piano from the Velvet Lantern drifts across the street. Live, and nobody's stopping it. Yet.",
    'A dancer on a balcony blows a kiss at a Repo Drone. It hovers, confused, and drifts off.',
    'Green fog pours out of an absinthe bar and tries to tip its hat.',
    'A sign flickers: VELVET LANTERN. LIVE MUSIC. SECRETS EXTRA.',
    "Somebody's singing in a window over the Counting House. Softly, so the books don't hear.",
  ],
  bountyGold: 260,
} as const satisfies DistrictDef;
