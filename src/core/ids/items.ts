/** Ids for things the player carries: items, gear, sheet music. */
import type { ClassId } from './characters';

/** Consumables and key items. */
export const ITEM_IDS = [
  'beignet',
  'cafe',
  'poboy',
  'muffuletta',
  'chicory',
  'gumbo',
  'yakamein',
  'snoball',
  'pralines',
  'boudin',
  'cayenne',
  'subtape',
  'indigo',
  'discobead',
  'smoke',
  'grisgris',
  'kingcake',
  'hurricane',
  'sazerac',
  'abita',
  'redbeans',
  'pianoroll',
  'swampherb',
  'ledgerpage',
  'cryptkey',
  'invitation',
  'umbrella',
  'cassette',
  'pralinelady_king',
] as const;
/** An item in the bag. */
export type ItemId = (typeof ITEM_IDS)[number];

/** Instrument quality tiers. Every class has one instrument per tier (generated). */
export const INSTRUMENT_TIER_IDS = ['pawnshop', 'street', 'neon', 'chrome', 'legend'] as const;
/** An instrument quality tier. */
export type InstrumentTierId = (typeof INSTRUMENT_TIER_IDS)[number];

/** Threads (body slot). */
export const THREADS_IDS = [
  'thr_thrift',
  'thr_secondline',
  'thr_duster',
  'thr_kevlar',
  'thr_regalia',
] as const;
/** Charms. */
export const CHARM_IDS = [
  'ch_beads',
  'ch_gator',
  'ch_claw',
  'ch_medal',
  'ch_pouch',
  'ch_fang',
  'ch_mouthpiece',
  'ch_haintblue',
  'ch_medallion',
  'ch_evileye',
] as const;
/** Cyber mods. */
export const MOD_IDS = [
  'mod_lungs',
  'mod_jaw',
  'mod_tempo',
  'mod_ribcage',
  'mod_eyes',
  'mod_swing',
  'mod_pitch',
  'mod_titanjaw',
  'mod_overdrive',
] as const;

/** Threads id. */
export type ThreadsId = (typeof THREADS_IDS)[number];
/** Charm id. */
export type CharmId = (typeof CHARM_IDS)[number];
/** Mod id. */
export type ModId = (typeof MOD_IDS)[number];
/** An instrument id: one per class per tier, generated in content/gear/instruments.ts. */
export type InstrumentId = `inst_${ClassId}_${InstrumentTierId}`;
/** Any gear. */
export type GearId = InstrumentId | ThreadsId | CharmId | ModId;

/** Gear slots, in display order. */
export const GEAR_SLOTS = ['instrument', 'threads', 'charm', 'mod'] as const;
/** A gear slot. */
export type GearSlot = (typeof GEAR_SLOTS)[number];

/** Sheet music: permanent passive techniques. */
export const SHEET_MUSIC_IDS = ['sm_circular', 'sm_secondwind', 'sm_swing', 'sm_rubato', 'sm_ghost'] as const;
/** A sheet music technique. */
export type SheetMusicId = (typeof SHEET_MUSIC_IDS)[number];
