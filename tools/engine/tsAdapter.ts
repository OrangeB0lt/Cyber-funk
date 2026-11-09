/**
 * The EngineAdapter over the engine: builds saves from StateSpecs and plays the driver's fights. The
 * rules baseline (rules.ts) and the engine's property tests use it. Until cutover a v1 adapter sat
 * beside it, and the parity oracle compared the two field for field.
 */
import { createRng, type Rng } from '@core/rng';
import { ACT_STEPS, type ActId, type StoryPosition } from '@core/ids/story';
import type { BandmateId } from '@core/ids/band';
import type { ClassId, RootsId } from '@core/ids/characters';
import type { OpponentId } from '@core/ids/enemies';
import type { SheetMusicId } from '@core/ids/items';
import type { QuestId } from '@core/ids/world';
import type { Battle, BattleEvent, GameState, PlayerIntent } from '@core/types';
import type { StoryChoices } from '@core/ids/flags';
import { SKILLS, TIMING } from '@content/data';
import {
  applyBattleResult,
  battleRewards,
  createBattle,
  defaultSettings,
  derivedStats,
  gainXp,
  makeEnemy,
  newGame,
  playerAction,
  runUntilPlayer,
} from '@engine/index';
import type { BattleView, EngineAdapter, StateSpec } from './driver';

/** A spec's story is v1's `{act, step: index}`; this is the position it names. */
function storyAt(act: ActId, index: number): StoryPosition {
  const steps = ACT_STEPS[act] as readonly string[];
  return { act, step: steps[Math.min(index, steps.length - 1)] } as StoryPosition;
}

/** An event as the trace records it: v1's event shape, which the traces kept (presentation-only fields dropped). */
export function traceShape(e: BattleEvent, role: (id: string) => string): Record<string, unknown> | null {
  // Presentation-only events stay out of the trace.
  if (e.type === 'revive') return null;
  const { type, ...rest } = e as BattleEvent & Record<string, unknown>;
  const out: Record<string, unknown> = { t: type, ...rest };
  delete out.hpAfter;
  if (type === 'assist') {
    out.who = out.bandmate;
    delete out.bandmate;
  }
  if (typeof out.target === 'string') out.target = role(out.target);
  if (typeof out.actor === 'string') out.actor = role(out.actor);
  return out;
}

export function tsAdapter(): EngineAdapter {
  let rng: Rng = createRng(1);
  return {
    name: 'ts',
    seed(n) {
      rng = createRng(n);
    },
    draws: () => rng.draws,
    buildState(spec: StateSpec) {
      const s = newGame(
        'Tester',
        spec.roots as RootsId,
        spec.cls as ClassId,
        { ...defaultSettings(), difficulty: spec.difficulty },
        spec.ngPlus,
      );
      s.level = spec.level;
      s.gear = { ...spec.gear } as GameState['gear'];
      s.sheet = [...spec.sheet] as SheetMusicId[];
      s.band = {
        recruited: [...spec.bandRecruited] as BandmateId[],
        active: [...spec.bandActive] as BandmateId[],
      };
      s.bag = { ...spec.bag } as GameState['bag'];
      s.nextFight = spec.nextFight
        ? (JSON.parse(JSON.stringify(spec.nextFight)) as GameState['nextFight'])
        : null;
      s.mealBuff = spec.mealBuff ? { ...spec.mealBuff } : null;
      s.dreamBuff = spec.dreamBuff ? { ...spec.dreamBuff } : null;
      s.inTower = spec.inTower;
      s.secondLine = spec.secondLineSize
        ? Array.from({ length: spec.secondLineSize }, (_, k) => ({ id: `m${k}`, name: `M${k}` }))
        : null;
      Object.assign(s.perm, spec.perm);
      s.doubloons = spec.doubloons;
      s.story = storyAt(spec.story.act as ActId, spec.story.step);
      const pr = spec.progress;
      if (pr.gusFreed) s.flags.gusFreed = true;
      s.choices = { contracts: pr.contracts, vox: pr.vox, lucien: pr.lucien } as StoryChoices;
      for (const q of pr.questsDone) s.quests[q as QuestId] = 'done';
      const st = derivedStats(s);
      s.hp = Math.max(1, Math.round(st.maxHp * spec.hpFrac));
      s.fp = Math.round(st.maxFp * spec.fpFrac);
      return s;
    },
    makeEnemy: (s, e) => makeEnemy(rng, s, e.id as OpponentId, e.level),
    createBattle: (s, enemies, opts) => createBattle(rng, s, enemies, opts as never),
    runUntilPlayer: b => runUntilPlayer(b),
    playerAction: (b, intent, timing) =>
      playerAction(b, { ...intent } as PlayerIntent, timing ? TIMING[timing] : null),
    battleRewards: b => battleRewards(b),
    applyBattleResult: b => applyBattleResult(b),
    gainXp: (s, n) => gainXp(s, n),
    events: (b: Battle) => b.events,
    normalizeEvent: (e, role) => traceShape(e, role),
    view: (b: Battle) => b as unknown as BattleView,
    projectState: (s: GameState) => ({
      hp: s.hp,
      fp: s.fp,
      xp: s.xp,
      level: s.level,
      doubloons: s.doubloons,
      bag: s.bag,
      book: s.book,
      perm: s.perm,
      mealBuff: s.mealBuff,
      dreamBuff: s.dreamBuff,
      nextFight: s.nextFight,
    }),
    skill(id) {
      const sk = SKILLS[id as keyof typeof SKILLS];
      return { fp: sk.fp, once: !!sk.once, damaging: sk.effects.some(f => f.kind === 'dmg') };
    },
  };
}
