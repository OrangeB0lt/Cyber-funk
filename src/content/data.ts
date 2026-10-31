/**
 * The game's data and rules, as the engine and the sim see them. No scenes, no prose scripts: the
 * engine may import this file, never content/index.ts (see docs/adr/0002-layering.md).
 */
export { TONES } from './combat/tones';
export { STATUSES } from './combat/statuses';
export { TIMING } from './combat/timing';
export { SKILLS } from './combat/skills';
export { CLASSES } from './classes';
export { ROOTS } from './roots';
export { ENEMIES } from './enemies';
export { BOSSES } from './bosses';
export { NOTES } from './notes';
export { ITEMS } from './items';
export { GEAR } from './gear';
export { INSTRUMENT_TIERS } from './gear/instruments';
export { SHEET_MUSIC } from './sheetMusic';
export { BANDMATES } from './band/bandmates';
export { SECOND_LINE } from './band/secondLine';
export { DISTRICTS } from './districts';
export { ACTS } from './story/acts';
export {
  LEVEL_CAP,
  SKILL_LEVELS,
  BASIC_ATTACK,
  LOOT,
  QUEST_DROPS,
  QUEST_KILL_COUNTERS,
  ENCOUNTER_RIGS,
  SELL_RATE,
  STREET_DEFEAT_DOUBLOON_LOSS,
  ACTIVE_BAND_SIZE,
  NEW_GAME,
} from './rules';
