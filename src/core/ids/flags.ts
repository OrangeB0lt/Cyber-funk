/**
 * Story flags and choices.
 *
 * A flag is a one-time story beat ("met Miss Odette", "Gus is freed"). Choices are the three
 * branching boss decisions; they have values, not just on/off. Add a flag here with a line saying
 * what sets it and what reads it.
 *
 * The list grows as scenes are ported (P2–P4).
 */
export const FLAG_IDS = [
  /** Met Mama Roux (prologue end, or first talk in her kitchen). */
  'metRoux',
  /** Got Gus's cassette in the prologue; the club can play it back. */
  'hasCassette',
  /** Ti-Jacques told you Captain Hush's weakness (and maybe gave you Disco Beads). */
  'hushHint',
  /** Ti-Jacques built your legendary instrument. */
  'legendBuilt',
  /** Gus Thibodeaux has been freed from the Data Mausoleum (Archivist). He leads the second line. */
  'gusFreed',
  /** Met Miss Odette at Club Feu Follet (first talk). Opens the Sit In option there. */
  'metOdette',
  /** Miss Odette told you about Vox Perfecta (her Blue Book hint is recorded once). */
  'voxHint',
  /** The Jackson Square licensing broadcaster is down (sabotage scene). Changes its "look" text. */
  'broadcasterDone',
  /** Met Madame Céleste at the Velvet Lantern (first talk). Opens the DJ in the corner booth. */
  'metCeleste',
  /** Céleste told you about Mr. Ledger (her Blue Book hint is recorded once). */
  'ledgerHint',
  /** Céleste called in Isolde Vane's debt for your invitation to the ball (her talk, burned contracts). */
  'celesteInvite',
  /** Met Professor Theo at the Lantern's piano (first talk). */
  'metTheo',
  /** Met Grand-mère Clothilde at her cabin (first talk). */
  'metClothilde',
  /** Met Mambo Rosalie at her temple (first talk). Opens the Restless Haints quest. */
  'metRosalie',
  /** The second line walked into the Tower plaza (the climb's first entry: its two narration lines). */
  'towerEntered',
  /** Each Tower floor's intro has played (towerFlow; boss floors replay theirs regardless). */
  'towerintro_0',
  /** See towerintro_0: the Server Floors. */
  'towerintro_1',
  /** See towerintro_0: the Studio Floor. */
  'towerintro_2',
  /** See towerintro_0: the Booth. */
  'towerintro_3',
  /** See towerintro_0: the Crown. */
  'towerintro_4',
  /** Rested at the Studio Floor vending machine (once per playthrough; hides the option). */
  'towerRested',
  /** Set after the Conductor's +50% rally. Nothing reads it (v1 dead flag, kept for parity; P6 removes it). */
  'towerRested2',
  /** The Click is broken (the ending). The lobby shows Look up; the club offers New Game+. */
  'ending',
] as const;

/** A one-time story beat. */
export type FlagId = (typeof FLAG_IDS)[number];

/** The three branching boss decisions and what the player chose. */
export interface StoryChoices {
  /** Vox Perfecta: reprogrammed (she joins the second line) or shut down (Perfect Pitch Chip). */
  vox?: 'reprogrammed' | 'shutdown';
  /** Mr. Ledger's contracts: burned (Céleste joins, free rest) or kept (+Ð1000). */
  contracts?: 'burned' | 'kept';
  /** Lucien the rougarou: spared (he joins) or finished (Chrome Fang). */
  lucien?: 'spared' | 'finished';
}
