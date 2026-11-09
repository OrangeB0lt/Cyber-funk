/**
 * EngineAdapter over the TypeScript engine, mirroring legacyAdapter.ts field for field so the
 * shared driver can compare traces. Deleted at cutover.
 */
import { createRng, type Rng } from '@core/rng';
import type { ActId } from '@core/ids/story';
import type { BandmateId } from '@core/ids/band';
import type { ClassId, RootsId } from '@core/ids/characters';
import type { OpponentId } from '@core/ids/enemies';
import type { ItemId, SheetMusicId } from '@core/ids/items';
import type { DistrictId, QuestId } from '@core/ids/world';
import type { Battle, BattleEvent, GameState, PlayerIntent } from '@core/types';
import type { StoryChoices } from '@core/ids/flags';
import { SECOND_LINE, SKILLS, TIMING } from '@content/data';
import {
  addItem,
  applyBattleResult,
  battleRewards,
  createBattle,
  defaultSettings,
  derivedStats,
  displayStats,
  fullRest,
  gainXp,
  makeEnemy,
  newGame,
  playerAction,
  priceFor,
  removeItem,
  runUntilPlayer,
  storyFromIndex,
  unlockedSkills,
  xpToNext,
} from '@engine/index';
import type { BattleView, EngineAdapter, StateSpec } from './driver';

/** Rename a TS event back to the legacy event shape (and drop TS-only fields). */
export function legacyShape(e: BattleEvent, role: (id: string) => string): Record<string, unknown> | null {
  // TS-only presentation events have no v1 counterpart.
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
        'Parity',
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
      s.story = storyFromIndex(spec.story.act as ActId, spec.story.step);
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
    normalizeEvent: (e, role) => legacyShape(e, role),
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
    misc: (s: GameState) => ({
      derived: derivedStats(s),
      display: displayStats(s),
      unlocked: unlockedSkills(s),
      xpToNext: xpToNext(s.level),
      secondLine: SECOND_LINE.filter(m => m.when(s)).map(m => m.id),
      inventory: (() => {
        addItem(s, 'grisgris', 2);
        addItem(s, 'beignet');
        const removedMissing = removeItem(s, 'muffuletta_none' as ItemId);
        const removed = removeItem(s, 'beignet');
        fullRest(s);
        return { bag: { ...s.bag }, hp: s.hp, fp: s.fp, removedMissing, removed };
      })(),
    }),
    priceFor: (s, base, district) => priceFor(s, base, district as DistrictId),
  };
}
