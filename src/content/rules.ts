/**
 * Game rules that are content decisions rather than engine mechanics: level cap, skill unlock
 * levels, the basic enemy attack, loot, and quest-item drops. The engine reads these; tune here.
 * Combat formulas and enemy scaling live in engine/balance.ts.
 */
import type { SkillId } from '@core/ids/combat';
import type { StoryPosition } from '@core/ids/story';
import type { DistrictId } from '@core/ids/world';
import type { EncounterRig, LootTable, QuestDropRule, QuestKillCounter } from '@core/types';

/** Highest player level. */
export const LEVEL_CAP = 15;

/** Levels at which a class's six skills unlock, in order. */
export const SKILL_LEVELS = [1, 3, 5, 7, 10, 13] as const;

/** What an enemy does when it has nothing better (and the fallback for unknown moves). */
export const BASIC_ATTACK: SkillId = 'en_basic';

/** Random drops from defeated non-boss, non-summoned enemies. */
export const LOOT: LootTable = {
  rare: 'kingcake',
  rareChance: 0.03,
  commonChance: 0.18,
  common: ['beignet', 'cafe', 'snoball', 'pralines', 'poboy', 'yakamein', 'abita'],
};

/**
 * Main-quest items collected on the streets. Checked in this order for every defeated enemy,
 * before random loot.
 */
export const QUEST_DROPS: readonly QuestDropRule[] = [
  {
    item: 'ledgerpage',
    enemies: ['enforcer'],
    at: { act: 'storyville', step: 'collect_ledger_pages' },
    max: 3,
    chance: 0.5,
  },
  {
    item: 'cryptkey',
    enemies: ['data_wraith', 'haint'],
    at: { act: 'cemetery', step: 'collect_crypt_keys' },
    max: 3,
    chance: 0.5,
  },
];

/** Side-quest counters bumped by kills while the quest is active. */
export const QUEST_KILL_COUNTERS: readonly QuestKillCounter[] = [
  { quest: 'horn', counter: 'hornFights', enemies: ['hush_patrol', 'hush_sergeant', 'hush_elite'] },
];

/**
 * While the story waits on street drops or kills, random street groups always include a relevant
 * enemy, so the player isn't stuck grinding. Checked in this order.
 */
export const ENCOUNTER_RIGS: readonly EncounterRig[] = [
  { at: { act: 'bayou', step: 'hunt_pups' }, anyOf: ['rougarou_pup'] },
  { at: { act: 'storyville', step: 'collect_ledger_pages' }, anyOf: ['enforcer'] },
  { at: { act: 'cemetery', step: 'collect_crypt_keys' }, anyOf: ['data_wraith', 'haint'] },
];

/** Selling returns this fraction of the base price (at least Ð1). */
export const SELL_RATE = 0.4;

/** Losing a street fight costs this fraction of your Doubloons. */
export const STREET_DEFEAT_DOUBLOON_LOSS = 0.2;

/** How many bandmates can be active in battle. */
export const ACTIVE_BAND_SIZE = 2;

/** Where a new game starts. */
export const NEW_GAME = {
  /** Starting district. */
  district: 'treme',
  /** Starting main-quest position. */
  story: { act: 'treme', step: 'meet_roux' },
  /** Starting Doubloons before roots bonuses. */
  doubloons: 80,
} as const satisfies { district: DistrictId; story: StoryPosition; doubloons: number };
