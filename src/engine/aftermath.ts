/**
 * What happens to the save after a battle: rewards, story and quest progress, bounties, and the
 * cost of losing. (Moved from v1's UI: legacy/src/07_ui_combat.js runBattle / victoryScreen.)
 */
import type { BossId, EnemyId } from '@core/ids/enemies';
import { ACT_STEPS, type StoryPosition } from '@core/ids/story';
import type { Battle, GameState, StepDef, VictorySummary } from '@core/types';

import {
  ACTS,
  BOSSES,
  DISTRICTS,
  ENEMIES,
  QUEST_KILL_COUNTERS,
  STREET_DEFEAT_DOUBLOON_LOSS,
} from '@content/data';
import { battleRewards } from './combat/rewards';
import { addItem, countItem } from './inventory';
import { derivedStats } from './stats';

/** Move the main quest to the next step of the current act. */
export function advanceStep(s: GameState): void {
  const steps = ACT_STEPS[s.story.act] as readonly string[];
  const i = steps.indexOf(s.story.step);
  if (i >= 0 && i < steps.length - 1) s.story = { act: s.story.act, step: steps[i + 1] } as StoryPosition;
}

/**
 * Apply a won battle to the save: Doubloons and drops, then story-step progress (street wins,
 * kills, items), side-quest kill counters, and the bounty. XP is returned, not applied, so the UI
 * can show the victory screen before level-ups.
 */
export function resolveVictory(b: Battle): VictorySummary {
  const s = b.state;
  const rewards = battleRewards(b);
  s.doubloons += rewards.gold;
  rewards.drops.forEach(id => addItem(s, id, 1));
  const defeated = b.enemies.filter(e => !e.alive);
  const killsOf = (ids: readonly EnemyId[]) => defeated.filter(e => ids.some(id => id === e.defId)).length;

  let completedStep: StoryPosition | null = null;
  const at = s.story;
  const step = (ACTS[at.act] as Record<string, StepDef>)[at.step]!;
  const pr = step.progress;
  if (pr) {
    let done = false;
    if (pr.kind === 'streetWins' && s.district === pr.district && b.context === 'street') {
      s.counters[pr.counter] = (s.counters[pr.counter] || 0) + 1;
      done = s.counters[pr.counter]! >= pr.goal;
    } else if (pr.kind === 'kills') {
      const n = killsOf(pr.enemies);
      if (n) {
        s.counters[pr.counter] = (s.counters[pr.counter] || 0) + n;
        done = s.counters[pr.counter]! >= pr.goal;
      }
    } else if (pr.kind === 'item') {
      done = countItem(s, pr.item) >= pr.goal;
    }
    if (done) {
      completedStep = at;
      advanceStep(s);
    }
  }

  for (const q of QUEST_KILL_COUNTERS) {
    if (s.quests[q.quest] !== 'active') continue;
    const n = killsOf(q.enemies);
    if (n) s.counters[q.counter] = (s.counters[q.counter] || 0) + n;
  }

  let bountyGold = 0;
  if (s.bounty && b.context === 'bounty' && defeated.some(e => e.defId === DISTRICTS[s.bounty!].elite)) {
    bountyGold = DISTRICTS[s.bounty].bountyGold;
    s.doubloons += bountyGold;
    s.bountiesDone.push(s.bounty);
    s.bounty = null;
  }

  const discoveries = b.discoveries
    .filter((v, i, a) => a.indexOf(v) === i)
    .map(id => (id in BOSSES ? BOSSES[id as BossId] : ENEMIES[id as EnemyId]).name);
  return { rewards, bountyGold, discoveries, completedStep };
}

/** The parts of the save a lost boss fight puts back (a boss loss costs nothing; you retry). */
export interface DefeatSnapshot {
  /** Heart. */
  hp: number;
  /** Funk. */
  fp: number;
  /** The bag. */
  bag: GameState['bag'];
  /** Doubloons. */
  doubloons: number;
  /** Meal buff. */
  mealBuff: GameState['mealBuff'];
  /** Dream buff. */
  dreamBuff: GameState['dreamBuff'];
  /** Next-fight bonuses. */
  nextFight: GameState['nextFight'];
}

/** Snapshot before a boss fight. */
export function takeSnapshot(s: GameState): DefeatSnapshot {
  return JSON.parse(
    JSON.stringify({
      hp: s.hp,
      fp: s.fp,
      bag: s.bag,
      doubloons: s.doubloons,
      mealBuff: s.mealBuff,
      dreamBuff: s.dreamBuff,
      nextFight: s.nextFight,
    }),
  ) as DefeatSnapshot;
}

/** Undo a lost boss fight. */
export function restoreSnapshot(s: GameState, snap: DefeatSnapshot): void {
  Object.assign(s, snap);
}

/** Losing on the streets: wake up at the club with full Heart, 20% fewer Doubloons, buffs gone. */
export function applyStreetDefeat(s: GameState): void {
  const st = derivedStats(s);
  s.hp = st.maxHp;
  s.fp = st.maxFp;
  s.doubloons = Math.round(s.doubloons * (1 - STREET_DEFEAT_DOUBLOON_LOSS));
  s.mealBuff = null;
  s.dreamBuff = null;
  s.nextFight = null;
}

export type { VictorySummary };
