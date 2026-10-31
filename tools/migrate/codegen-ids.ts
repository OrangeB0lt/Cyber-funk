/**
 * One-time migration: writes src/core/ids/*.ts from the legacy tables, preserving legacy key
 * order (which the engine relies on for iteration). After generation these files are hand-owned.
 *
 *   npx tsx tools/migrate/codegen-ids.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadLegacy } from '../parity/legacy';
import { idList } from './serialize';

const { E } = loadLegacy();
const OUT = path.resolve('src/core/ids');
const keys = (t: object) => Object.keys(t);
const write = (file: string, body: string) => fs.writeFileSync(path.join(OUT, file), body.trimStart());

const skills = keys(E.SKILLS);
const classSkills = skills.filter(id => /^(tr|tb|su|sx|cl|sn|bd)_/.test(id));
const enemySkills = skills.filter(id => id.startsWith('en_'));
const bossSkills = skills.filter(id => id.startsWith('b_'));
const assistSkills = skills.filter(id => id.startsWith('as_'));
if (classSkills.length + enemySkills.length + bossSkills.length + assistSkills.length !== skills.length) {
  throw new Error('unclassified skill ids');
}

write(
  'combat.ts',
  `
/**
 * Ids for combat content: tones, statuses, timing grades, skills.
 * Each list is the canonical order; the union type is derived from it. Adding an id here
 * without a table row (or the reverse) is a compile error.
 */

/** The five musical damage types. */
export const TONE_IDS = ${idList(keys(E.TONES))};
/** A musical damage type. */
export type ToneId = (typeof TONE_IDS)[number];

/** Every status effect, in table order. */
export const STATUS_IDS = ${idList(keys(E.STATUSES))};
/** A status effect. */
export type StatusId = (typeof STATUS_IDS)[number];

/** On the One timing grades, best to worst. */
export const TIMING_IDS = ${idList(keys(E.TIMING))};
/** An On the One timing grade. */
export type TimingId = (typeof TIMING_IDS)[number];

/** Player class skills: riff, six unlockable skills and a solo per class. */
export const CLASS_SKILL_IDS = ${idList(classSkills)};
/** Normal-enemy moves (en_*). */
export const ENEMY_SKILL_IDS = ${idList(enemySkills)};
/** Boss moves (b_*). */
export const BOSS_SKILL_IDS = ${idList(bossSkills)};
/** Bandmate assist moves (as_*). */
export const ASSIST_SKILL_IDS = ${idList(assistSkills)};
/** Any skill: player, enemy, boss or assist. One resolver runs them all. */
export type SkillId =
  | (typeof CLASS_SKILL_IDS)[number]
  | (typeof ENEMY_SKILL_IDS)[number]
  | (typeof BOSS_SKILL_IDS)[number]
  | (typeof ASSIST_SKILL_IDS)[number];

/** The six character stats. Order matches ClassDef.base and ClassDef.growth. */
export const STAT_KEYS = ${idList(E.STAT_KEYS)};
/** A character stat. heart = max HP, funk = max FP. */
export type StatKey = (typeof STAT_KEYS)[number];
/** The four stats an actor carries into battle (heart and funk become hp/fp pools). */
export type CombatStatKey = 'chops' | 'grit' | 'tempo' | 'mojo';
`,
);

write(
  'characters.ts',
  `
/** Ids for character creation: instrument classes and roots. */

/** The seven brass-band instrument classes. */
export const CLASS_IDS = ${idList(keys(E.CLASSES))};
/** A playable instrument class. */
export type ClassId = (typeof CLASS_IDS)[number];

/** Where the character is from. Each gives a stat bonus, starting kit and local discounts. */
export const ROOTS_IDS = ${idList(keys(E.ROOTS))};
/** A character's roots. */
export type RootsId = (typeof ROOTS_IDS)[number];
`,
);

write(
  'enemies.ts',
  `
/** Ids for opponents and the Blue Notes they guard. */

/** Every non-boss enemy (district enemies, elites, summons, Cutting Contest rivals). */
export const ENEMY_IDS = ${idList(keys(E.ENEMIES))};
/** A non-boss enemy. */
export type EnemyId = (typeof ENEMY_IDS)[number];

/** Every boss, in story order. */
export const BOSS_IDS = ${idList(keys(E.BOSSES))};
/** A boss. */
export type BossId = (typeof BOSS_IDS)[number];

/** Anything the player can fight; also the key of the Blue Book (bestiary). */
export type OpponentId = EnemyId | BossId;

/** The six Blue Notes of the blues scale, in scale order. */
export const NOTE_IDS = ${idList(E.SCALE_ORDER)};
/** A Blue Note. */
export type NoteId = (typeof NOTE_IDS)[number];
`,
);

const gearOf = (slot: string) =>
  Object.values<{ id: string; slot: string }>(E.GEAR)
    .filter(g => g.slot === slot)
    .map(g => g.id);
write(
  'items.ts',
  `
/** Ids for things the player carries: items, gear, sheet music. */

/** Consumables and key items. */
export const ITEM_IDS = ${idList(keys(E.ITEMS))};
/** An item in the bag. */
export type ItemId = (typeof ITEM_IDS)[number];

/** Instrument quality tiers. Every class has one instrument per tier (generated). */
export const INSTRUMENT_TIER_IDS = ${idList((E.INSTRUMENT_TIERS as { tier: string }[]).map(t => t.tier))};
/** An instrument quality tier. */
export type InstrumentTierId = (typeof INSTRUMENT_TIER_IDS)[number];

/** Threads (body slot). */
export const THREADS_IDS = ${idList(gearOf('threads'))};
/** Charms. */
export const CHARM_IDS = ${idList(gearOf('charm'))};
/** Cyber mods. */
export const MOD_IDS = ${idList(gearOf('mod'))};

/** Gear slots, in display order. */
export const GEAR_SLOTS = ['instrument', 'threads', 'charm', 'mod'] as const;
/** A gear slot. */
export type GearSlot = (typeof GEAR_SLOTS)[number];

/** Sheet music: permanent passive techniques. */
export const SHEET_MUSIC_IDS = ${idList(keys(E.SHEET_MUSIC))};
/** A sheet music technique. */
export type SheetMusicId = (typeof SHEET_MUSIC_IDS)[number];
`,
);

write(
  'band.ts',
  `
/** Ids for the people who march with you. */

/** Recruitable bandmates (two can be active at a time). */
export const BANDMATE_IDS = ${idList(keys(E.BANDMATES))};
/** A bandmate. */
export type BandmateId = (typeof BANDMATE_IDS)[number];

/** Everyone who can join the second line on the Tower, in marching order. */
export const SECOND_LINE_IDS = ${idList((E.SECOND_LINE as { id: string }[]).map(m => m.id))};
/** A second-line marcher. */
export type SecondLineId = (typeof SECOND_LINE_IDS)[number];
`,
);

write(
  'world.ts',
  `
/** Ids for the map: districts, places, NPCs, quests. */

/** Districts in travel and story order. */
export const DISTRICT_IDS = ${idList(keys(E.DISTRICTS))};
/** A district. */
export type DistrictId = (typeof DISTRICT_IDS)[number];

/** Places you can enter inside a district. */
export const PLACE_IDS = ${idList(keys(E.PLACES))};
/** A place. */
export type PlaceId = (typeof PLACE_IDS)[number];

/** Speakers in dialogue. */
export const NPC_IDS = ${idList(keys(E.NPCS))};
/** A speaker. */
export type NpcId = (typeof NPC_IDS)[number];

/** Side quests. */
export const QUEST_IDS = ${idList(keys(E.QUESTS))};
/** A side quest. */
export type QuestId = (typeof QUEST_IDS)[number];
`,
);
console.log('wrote src/core/ids/*.ts');
