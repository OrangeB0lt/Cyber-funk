/**
 * The save format, v2: an envelope `{format, version, savedAt, rng, game}`, validated with Zod on every
 * load, import and upload. This module is DOM-free because the server validates uploads with the same
 * `decodeSave` (see docs/adr/0006-server-and-cloud-saves.md). Where saves are kept is storage.ts and
 * slots.ts; the v1 localStorage key is ignored and left in place (v2 starts fresh).
 *
 * The Zod schema mirrors core/types/state.ts. A compile-time check below fails if GameState gains a
 * field the schema doesn't know about. To change the save format:
 *   1. change GameState (and newGame),
 *   2. change the schema here,
 *   3. if old saves need the field filled in, bump SAVE_VERSION and add a migration to MIGRATIONS.
 */
import { z } from 'zod';
import { BANDMATE_IDS, SECOND_LINE_IDS } from '@core/ids/band';
import { CLASS_IDS, ROOTS_IDS } from '@core/ids/characters';
import { STATUS_IDS } from '@core/ids/combat';
import { BOSS_IDS, ENEMY_IDS, NOTE_IDS } from '@core/ids/enemies';
import { FLAG_IDS } from '@core/ids/flags';
import {
  CHARM_IDS,
  ITEM_IDS,
  MOD_IDS,
  SHEET_MUSIC_IDS,
  THREADS_IDS,
  INSTRUMENT_TIER_IDS,
} from '@core/ids/items';
import { ACT_ORDER, ACT_STEPS, type ActId, type StoryPosition } from '@core/ids/story';
import { DISTRICT_IDS, GLOSSARY_IDS, QUEST_IDS } from '@core/ids/world';
import type { RngState } from '@core/rng';
import type { GearId } from '@core/ids/items';
import type { ClassId } from '@core/ids/characters';
import type { DistrictId } from '@core/ids/world';
import type { GameState } from '@core/types';

/** The current save format. */
export const SAVE_VERSION = 2;
/** Prefix of exported save codes. */
export const CODE_PREFIX = 'CF2:';

const instrumentIds = CLASS_IDS.flatMap(c => INSTRUMENT_TIER_IDS.map(t => `inst_${c}_${t}` as const));
const gearId = z.enum([...instrumentIds, ...THREADS_IDS, ...CHARM_IDS, ...MOD_IDS] as unknown as [
  GearId,
  ...GearId[],
]);
const itemId = z.enum(ITEM_IDS);
const districtId = z.enum(DISTRICT_IDS);
const opponentId = z.enum([...ENEMY_IDS, ...BOSS_IDS]);
const count = z.number().int().min(0);

const story = z
  .object({ act: z.enum(ACT_ORDER as [ActId, ...ActId[]]), step: z.string() })
  .refine(p => (ACT_STEPS[p.act] as readonly string[]).includes(p.step), 'unknown story step')
  .transform(p => p as StoryPosition);

const settings = z.object({
  textSpeed: z.enum(['slow', 'normal', 'fast', 'instant']),
  rhythm: z.enum(['manual', 'auto']),
  difficulty: z.enum(['tourist', 'local', 'grand']),
  sound: z.boolean(),
  reduceMotion: z.boolean(),
  textSize: z.enum(['S', 'M', 'L']),
});

const stats = z.object({
  heart: z.number(),
  funk: z.number(),
  chops: z.number(),
  grit: z.number(),
  tempo: z.number(),
  mojo: z.number(),
});

const resume = z.union([
  z.object({ kind: z.literal('tutorial'), step: z.union([z.literal(1), z.literal(2)]) }),
  z.object({
    kind: z.literal('battle'),
    context: z.enum(['quest', 'boss', 'bounty', 'cutting', 'spar', 'street', 'tower', 'tutorial']),
  }),
]);

/** The save schema. */
export const gameStateSchema = z.object({
  name: z.string().min(1).max(32),
  roots: z.enum(ROOTS_IDS),
  cls: z.enum(CLASS_IDS),
  level: z.number().int().min(1).max(15),
  xp: z.number().min(0),
  hp: z.number().min(0),
  fp: z.number().min(0),
  doubloons: z.number().min(0),
  day: z.number().int().min(1),
  bag: z.partialRecord(itemId, count),
  keyItems: z.array(itemId),
  gear: z.object({
    instrument: gearId,
    threads: gearId.nullable(),
    charm: gearId.nullable(),
    mod: gearId.nullable(),
  }),
  gearBag: z.array(gearId),
  sheet: z.array(z.enum(SHEET_MUSIC_IDS)),
  blessings: count,
  perm: stats,
  band: z.object({ recruited: z.array(z.enum(BANDMATE_IDS)), active: z.array(z.enum(BANDMATE_IDS)) }),
  notes: z.array(z.enum(NOTE_IDS)),
  story,
  quests: z.partialRecord(z.enum(QUEST_IDS), z.enum(['active', 'done'])),
  bossesDefeated: z.array(z.enum(BOSS_IDS)),
  bossIntros: z.array(z.enum(BOSS_IDS)),
  districtIntros: z.array(districtId),
  choices: z.object({
    vox: z.enum(['reprogrammed', 'shutdown']).optional(),
    contracts: z.enum(['burned', 'kept']).optional(),
    lucien: z.enum(['spared', 'finished']).optional(),
  }),
  flags: z.partialRecord(z.enum(FLAG_IDS), z.literal(true)),
  counters: z.record(z.string(), z.number()),
  district: districtId,
  unlocked: z.array(districtId),
  book: z.partialRecord(
    opponentId,
    z.object({ seen: z.boolean(), weak: z.boolean(), hint: z.boolean().optional() }),
  ),
  lexicon: z.array(z.enum(GLOSSARY_IDS)),
  bounty: districtId.nullable(),
  bountiesDone: z.array(districtId),
  mealBuff: z.object({ fights: z.number(), chops: z.number(), grit: z.number() }).nullable(),
  dreamBuff: z.object({ fights: z.number() }).nullable(),
  nextFight: z
    .object({
      groove: z.number().optional(),
      mojo: z.number().optional(),
      hyped: z.boolean().optional(),
      pocket: z.boolean().optional(),
      status: z.enum(STATUS_IDS).optional(),
    })
    .nullable(),
  sitInDay: z.number(),
  settings,
  ngPlus: count,
  secondLine: z.array(z.object({ id: z.enum(SECOND_LINE_IDS).or(z.string()), name: z.string() })).nullable(),
  inTower: z.boolean(),
  resume: resume.nullable(),
});

// Compile-time drift check: every GameState field must be in the schema with a compatible type.
const _schemaCoversState = (x: z.infer<typeof gameStateSchema>): GameState => x;
void _schemaCoversState;

const envelopeSchema = z.object({
  format: z.literal('cyberfunk'),
  version: z.number().int(),
  savedAt: z.string(),
  rng: z.object({ s: z.number().int(), draws: z.number().int().min(0) }),
  game: z.unknown(),
});

/** A loaded save. */
export interface LoadedSave {
  /** The game. */
  game: GameState;
  /** The random stream to resume. */
  rng: RngState;
  /** When it was written (ISO time, from the envelope). */
  savedAt: string;
}

/** Migrations from older v2+ formats, keyed by the version they upgrade *from*. */
const MIGRATIONS: Record<number, (game: Record<string, unknown>) => Record<string, unknown>> = {};

/** Why a save couldn't be read. */
export type LoadError = 'empty' | 'corrupt' | 'too-new' | 'invalid';

/** Encode a save. */
export function encodeSave(game: GameState, rng: RngState, now = new Date()): string {
  return JSON.stringify({
    format: 'cyberfunk',
    version: SAVE_VERSION,
    savedAt: now.toISOString(),
    rng,
    game,
  });
}

/** Decode and validate a save. */
export function decodeSave(raw: string | null): LoadedSave | LoadError {
  if (!raw) return 'empty';
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return 'corrupt';
  }
  const env = envelopeSchema.safeParse(data);
  if (!env.success) return 'corrupt';
  if (env.data.version > SAVE_VERSION) return 'too-new';
  let game = env.data.game as Record<string, unknown>;
  for (let v = env.data.version; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) return 'invalid';
    game = m(game);
  }
  const parsed = gameStateSchema.safeParse(game);
  if (!parsed.success) return 'invalid';
  return { game: parsed.data as GameState, rng: env.data.rng, savedAt: env.data.savedAt };
}

/** A save as a shareable text code (CF2:…). */
export function exportCode(raw: string): string {
  const bytes = new TextEncoder().encode(raw);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return CODE_PREFIX + btoa(bin);
}

/** Read a CF2: code back into raw save text (null if it isn't one). */
export function importCode(code: string): string | null {
  const c = code.trim();
  if (!c.startsWith(CODE_PREFIX)) return null;
  try {
    const bin = atob(c.slice(CODE_PREFIX.length));
    return new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
  } catch {
    return null;
  }
}

/** What a save slot shows without loading the game: who, how far, where. */
export interface SaveSummary {
  /** Character name. */
  name: string;
  /** Instrument class. */
  cls: ClassId;
  /** Level. */
  level: number;
  /** Story act. */
  act: ActId;
  /** Story step within the act. */
  step: string;
  /** Where the character is. */
  district: DistrictId;
  /** New Game+ count. */
  ngPlus: number;
}

/** The summary of a game (slot pickers on the client, summary columns on the server). */
export function summarize(game: GameState): SaveSummary {
  return {
    name: game.name,
    cls: game.cls,
    level: game.level,
    act: game.story.act,
    step: game.story.step,
    district: game.district,
    ngPlus: game.ngPlus,
  };
}
