/** Ids for the people who march with you. */

/** Recruitable bandmates (two can be active at a time). */
export const BANDMATE_IDS = ['sugar', 'static', 'remy', 'moses'] as const;
/** A bandmate. */
export type BandmateId = (typeof BANDMATE_IDS)[number];

/** Everyone who can join the second line on the Tower, in marching order. */
export const SECOND_LINE_IDS = [
  'gus',
  'mamaroux',
  'tijacques',
  'odette',
  'sugar',
  'static',
  'remy',
  'moses',
  'celeste',
  'vox',
  'lucien',
  'zinnia',
  'clothilde',
  'rosalie',
  'theo',
] as const;
/** A second-line marcher. */
export type SecondLineId = (typeof SECOND_LINE_IDS)[number];
