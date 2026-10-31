/**
 * Loads the legacy engine (legacy/src/01–05) into a Node vm context with a seeded Math.random,
 * so the parity oracles can replay any fight draw-for-draw against the TypeScript engine.
 *
 * Each file runs as its own vm.Script with its real path as filename, so coverage tools can attribute
 * lines to legacy/src/*.js. Top-level `const`s are not properties of the context object, so a final
 * script copies the names we need onto `this.__E` (the same trick legacy/sim/sim.js uses).
 *
 * Deleted at cutover together with legacy/.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRng, type Rng } from '@core/rng';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LEGACY_SRC = path.join(ROOT, 'legacy', 'src');
export const ENGINE_FILES = [
  '01_data_core.js',
  '02_data_enemies.js',
  '03_data_items.js',
  '04_data_world.js',
  '05_engine.js',
];

const EXPORTS = [
  // tables
  'VERSION',
  'LEVEL_CAP',
  'TONES',
  'STATUSES',
  'ROOTS',
  'SKILLS',
  'CLASSES',
  'STAT_KEYS',
  'STAT_NAMES',
  'SKILL_LEVELS',
  'TIMING',
  'ENEMIES',
  'BOSSES',
  'BLUE_NOTES',
  'SCALE_ORDER',
  'NOTE_FREQ',
  'ITEMS',
  'INSTRUMENT_TIERS',
  'GEAR',
  'SHEET_MUSIC',
  'BANDMATES',
  'SECOND_LINE',
  'DISTRICTS',
  'PLACES',
  'NPCS',
  'MAIN_STEPS',
  'ACT_ORDER',
  'QUESTS',
  'BOUNTIES',
  'EVENTS',
  'GLOSSARY',
  'BALANCE',
  // engine
  'defaultSettings',
  'newState',
  'classBase',
  'gearList',
  'derivedStats',
  'displayStats',
  'clampVitals',
  'healPct',
  'funkPct',
  'fullRest',
  'unlockedSkills',
  'xpToNext',
  'gainXp',
  'addItem',
  'removeItem',
  'countItem',
  'priceFor',
  'enemyBaseStats',
  'difficultyMods',
  'makeEnemy',
  'makePlayerActor',
  'createBattle',
  'livingEnemies',
  'effStat',
  'hasStatus',
  'applyStatus',
  'rollAutoTiming',
  'runUntilPlayer',
  'playerCanSolo',
  'playerAction',
  'battleRewards',
  'applyBattleResult',
];

/** The legacy engine's globals, untyped (they are plain JS objects from the vm). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LegacyEngine = Record<string, any>;

export interface LegacyRuntime {
  E: LegacyEngine;
  /** Restart the injected Math.random stream from a seed. */
  seed(seed: number): void;
  /** Draws consumed from the current stream. */
  draws(): number;
}

/** Load a fresh legacy engine. Cheap enough (~10 ms) to call once per test file. */
export function loadLegacy(seed = 1): LegacyRuntime {
  let rng: Rng = createRng(seed);
  const SeededMath = Object.create(Math) as Math;
  Object.defineProperty(SeededMath, 'random', { value: () => rng.next() });
  const ctx = vm.createContext({ console, Math: SeededMath, JSON, Object, Array });
  for (const file of ENGINE_FILES) {
    const filename = path.join(LEGACY_SRC, file);
    new vm.Script(fs.readFileSync(filename, 'utf8'), { filename }).runInContext(ctx);
  }
  new vm.Script(`this.__E = { ${EXPORTS.join(', ')} };`, { filename: 'legacy-exports.js' }).runInContext(ctx);
  const E = (ctx as { __E: LegacyEngine }).__E;
  return {
    E,
    seed(s: number) {
      rng = createRng(s);
    },
    draws: () => rng.draws,
  };
}
