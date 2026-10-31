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
