/**
 * The main quest as named steps.
 *
 * v1 tracked progress as `{act, step: number}` and compared step indexes in ~45 places, so inserting
 * one step silently shifted journal text, hints, combat counters, drops and tests. Steps now have
 * names; their order within an act is this list's order. To add a step, insert its name here and
 * add its journal entry in content/story/acts.ts. Code that refers to steps by name keeps working.
 */
export const ACT_STEPS = {
  treme: ['meet_roux', 'win_street_fights', 'congo_square'],
  quarter: ['meet_odette', 'sabotage_broadcaster', 'main_stage'],
  storyville: ['meet_celeste', 'collect_ledger_pages', 'buy_whispers', 'enter_vault'],
  bayou: ['take_airboat', 'visit_clothilde', 'hunt_pups', 'pump_station'],
  cemetery: ['meet_rosalie', 'collect_crypt_keys', 'enter_mausoleum'],
  garden: ['get_invitation', 'attend_ball', 'duel_isolde'],
  tower: ['form_second_line', 'climb_tower', 'face_conductor', 'break_the_click'],
  done: ['finale'],
} as const;

/** An act of the main quest. Acts are named after the district where they mostly happen. */
export type ActId = keyof typeof ACT_STEPS;

/** The acts in story order. */
export const ACT_ORDER: readonly ActId[] = [
  'treme',
  'quarter',
  'storyville',
  'bayou',
  'cemetery',
  'garden',
  'tower',
  'done',
];

/** A step name within act `A`. */
export type StepOf<A extends ActId> = (typeof ACT_STEPS)[A][number];

/** The player's position in the main quest: an act plus one of that act's steps. */
export type StoryPosition = { [A in ActId]: { act: A; step: StepOf<A> } }[ActId];
