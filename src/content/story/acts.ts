/**
 * The main quest, step by step: what the journal says, which place gets the "!" hint, and how a
 * step completes on its own after battles. Step names and their order live in core/ids/story.ts.
 * Steps without `progress` are advanced by scenes (`s.story.advance(...)`).
 */
import type { ActId, StepOf } from '@core/ids/story';
import type { StepDef } from '@core/types';

/** Every step of every act. The compiler checks that each step name has an entry. */
export const ACTS: { readonly [A in ActId]: { readonly [S in StepOf<A>]: StepDef } } = {
  treme: {
    meet_roux: { journal: 'Talk to Mama Roux at the Lagniappe club.', where: 'Tremé', hintPlace: 'club' },
    win_street_fights: {
      journal: "Break the Hush's grip on Tremé: win 3 fights on the streets.",
      where: 'Tremé (Hit the Streets)',
      progress: { kind: 'streetWins', counter: 'tremeFights', goal: 3, district: 'treme' },
      completeToast: 'The Hush are thinning out. Congo Square is next.',
    },
    congo_square: {
      journal: 'Drive Captain Hush out of Congo Square.',
      where: 'Tremé: Congo Square',
      hintPlace: 'congo',
    },
  },
  quarter: {
    meet_odette: {
      journal: 'Meet Miss Odette at Club Feu Follet.',
      where: 'French Quarter: Club Feu Follet',
      hintPlace: 'feufollet',
    },
    sabotage_broadcaster: {
      journal: 'Sabotage the Metronome licensing broadcaster in Jackson Square.',
      where: 'French Quarter: Jackson Square',
      hintPlace: 'jackson',
    },
    main_stage: {
      journal: 'Take the main stage on the Bourbon Strip.',
      where: 'French Quarter: The Bourbon Strip',
      hintPlace: 'strip',
    },
  },
  storyville: {
    meet_celeste: {
      journal: 'Meet Madame Céleste at the Velvet Lantern.',
      where: 'Storyville: The Velvet Lantern',
      hintPlace: 'lantern',
    },
    collect_ledger_pages: {
      journal: 'Collect 3 Ledger Pages from Contract Enforcers.',
      where: 'Storyville (Hit the Streets)',
      progress: { kind: 'item', item: 'ledgerpage', goal: 3 },
    },
    buy_whispers: {
      journal: "Buy the vault's location with Whispers at the Velvet Lantern.",
      where: 'Storyville: The Velvet Lantern',
      hintPlace: 'lantern',
    },
    enter_vault: {
      journal: 'Enter the vault beneath Ledger & Sons.',
      where: 'Storyville: Ledger & Sons Counting House',
      hintPlace: 'counting',
    },
  },
  bayou: {
    take_airboat: { journal: 'Take the airboat to Manchac Swamp.', where: 'Travel: Airboat' },
    visit_clothilde: {
      journal: "Visit Grand-mère Clothilde's cabin.",
      where: "The Bayou: Grand-mère Clothilde's Cabin",
      hintPlace: 'cabin',
    },
    hunt_pups: {
      journal: "Follow the Chrome Wolves' trail: defeat 3 Rougarou Pups.",
      where: 'The Bayou (Hit the Streets)',
      progress: { kind: 'kills', counter: 'pups', goal: 3, enemies: ['rougarou_pup'] },
      completeToast: "The wolves' trail leads to Pump Station 13.",
    },
    pump_station: {
      journal: 'Face Le Rougarou Chromé at Pump Station 13.',
      where: 'The Bayou: Pump Station 13',
      hintPlace: 'pump',
    },
  },
  cemetery: {
    meet_rosalie: {
      journal: 'Meet Mambo Rosalie at her temple.',
      where: "Cities of the Dead: Mambo Rosalie's Temple",
      hintPlace: 'temple',
    },
    collect_crypt_keys: {
      journal: 'Recover 3 Crypt Keys from Data Wraiths and Wandering Haints.',
      where: 'Cities of the Dead (Hit the Streets)',
      progress: { kind: 'item', item: 'cryptkey', goal: 3 },
    },
    enter_mausoleum: {
      journal: 'Descend into the Data Mausoleum.',
      where: 'Cities of the Dead: The Data Mausoleum',
      hintPlace: 'mausoleum',
    },
  },
  garden: {
    get_invitation: {
      journal: 'Get an invitation to the Vane debutante ball.',
      where: "Garden District (Static, Madame Céleste, or the Silver Tuxedo's valet)",
    },
    attend_ball: {
      journal: 'Attend the ball at Vane Manor.',
      where: 'Garden District: Vane Manor',
      hintPlace: 'manor',
    },
    duel_isolde: {
      journal: 'Duel Isolde Vane in the ballroom.',
      where: 'Garden District: Vane Manor',
      hintPlace: 'manor',
    },
  },
  tower: {
    form_second_line: {
      journal: 'Form the second line at the Lagniappe club.',
      where: 'Tremé: Lagniappe Club',
      hintPlace: 'club',
    },
    climb_tower: {
      journal: 'March on Metronome Tower and climb the floors.',
      where: 'Central Business District: Metronome Tower',
      hintPlace: 'towerlobby',
    },
    face_conductor: {
      journal: 'The Booth: face the Conductor.',
      where: 'Metronome Tower',
      hintPlace: 'towerlobby',
    },
    break_the_click: {
      journal: 'The Crown: break the Click.',
      where: 'Metronome Tower',
      hintPlace: 'towerlobby',
    },
  },
  done: {
    finale: {
      journal: 'The Click is broken. The city is dancing. (Credits & New Game+ at the Lagniappe club.)',
      where: 'Anywhere',
    },
  },
};
