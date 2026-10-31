/** Ids for character creation: instrument classes and roots. */

/** The seven brass-band instrument classes. */
export const CLASS_IDS = [
  'trumpet',
  'trombone',
  'sousaphone',
  'saxophone',
  'clarinet',
  'snare',
  'bassdrum',
] as const;
/** A playable instrument class. */
export type ClassId = (typeof CLASS_IDS)[number];

/** Where the character is from. Each gives a stat bonus, starting kit and local discounts. */
export const ROOTS_IDS = ['creole', 'cajun', 'yat'] as const;
/** A character's roots. */
export type RootsId = (typeof ROOTS_IDS)[number];
