/**
 * Metronome Tower's five floors, bottom to top (v1: TOWER_FLOORS, legacy/src/09_story.js:215).
 * `towerFloor` in the save indexes this list.
 */
import type { EnemyId } from '@core/ids/enemies';

/** One floor of the climb. */
export interface TowerFloorDef {
  /** Shown as the screen title. */
  name: string;
  /** Narrated the first time (every time on a boss floor). */
  intro: string;
  /** Fights in order, each a group of enemies (the Lobby, the Server Floors). */
  fights?: readonly (readonly EnemyId[])[];
  /** The Studio Floor's vending machine: snacks, a save point, one rest. */
  vending?: true;
  /** The boss at the top of the floor. */
  boss?: 'conductor' | 'the_click';
}

export const TOWER_FLOORS: readonly TowerFloorDef[] = [
  {
    name: 'The Lobby',
    fights: [
      ['hush_elite', 'quantizer'],
      ['hush_elite', 'hush_elite', 'sentinel'],
    ],
    intro: 'Marble, chrome, a fountain that ticks. Hush Elites in gold armor. They are not writing tickets.',
  },
  {
    name: 'The Server Floors',
    fights: [
      ['quantizer', 'quantizer', 'session_clone'],
      ['sentinel', 'session_clone', 'hush_elite'],
    ],
    intro:
      'Floors of servers humming the Click. Quantizers snap everything to the grid. And in the aisles, Session Clones: corporate copies of musicians who play your instrument.',
  },
  {
    name: 'The Studio Floor',
    vending: true,
    intro:
      'A recording studio the size of a city block. In the hallway, a busted vending machine with a hand-lettered sign: WORKS IF YOU HIT IT.',
  },
  {
    name: 'The Booth',
    boss: 'conductor',
    intro:
      'The control booth. Glass on all sides. The city below, every light blinking on the beat. And at the console, baton raised, the Conductor.',
  },
  {
    name: 'The Crown',
    boss: 'the_click',
    intro:
      'The top of the Tower. A colossal chrome metronome fills the crown, pendulum swinging. The Click. It does not speak. It ticks.',
  },
];
