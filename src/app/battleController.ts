/**
 * Runs one battle: the engine's pull loop wired to the presenter. (v1: legacy/src/07_ui_combat.js
 * runBattle.)
 *
 *   runUntilPlayer → play the events → ask for an action → timing (or Blues) → playerAction → play
 *
 * Then the aftermath: victory (rewards, level-ups), escape, or defeat (a boss fight offers a retry
 * and puts your state back; a street loss sends you to the club via SceneInterrupt('cut')).
 */
import type { BossId } from '@core/ids/enemies';
import type { Battle, BattleEvent, TimingGradeDef } from '@core/types';
import { ACTS, TEXT } from '@content/index';
import {
  announceTiming,
  applyBattleResult,
  applyStreetDefeat,
  buildEnemies,
  createBattle,
  gainXp,
  gradeTiming,
  logLine,
  makeEnemy,
  needsTiming,
  playerAction,
  resolveVictory,
  restoreSnapshot,
  rollAutoTiming,
  runUntilPlayer,
  scoreBlues,
  takeSnapshot,
  timingSpec,
} from '@engine/index';
import { SceneInterrupt, type FightSpec } from '@narrative/types';
import type { StepDef } from '@core/types';
import type { BattleOutcome, SessionPort } from './sessionPort';

export type { BattleOutcome };

/** Take the battle's queued events. */
const drain = (b: Battle): BattleEvent[] => b.events.splice(0);

/** Run a battle to its end. */
export async function runBattle(
  session: SessionPort,
  spec: FightSpec,
  signal: AbortSignal,
  opts: { boss?: BossId; clickPhase?: boolean } = {},
): Promise<BattleOutcome> {
  const g = session.game;
  const P = session.deps.presenter;
  const rng = session.rng;
  const snapshot = takeSnapshot(g);

  const enemies = opts.boss
    ? [makeEnemy(rng, g, opts.boss)]
    : spec.levels === 'own' && spec.enemies !== 'random'
      ? spec.enemies.map(id => makeEnemy(rng, g, id, spec.level))
      : buildEnemies(rng, g, spec.enemies, { district: spec.district, level: spec.level });
  const b = createBattle(rng, g, enemies, {
    boss: opts.boss ?? null,
    context: spec.context ?? 'street',
    ambush: spec.ambush,
    noFlee: spec.noFlee,
    clickPhase: opts.clickPhase,
  });
  if (!g.resume) g.resume = { kind: 'battle', context: b.context };
  session.save();
  P.battle.open(b);
  P.sound({ kind: 'stab', cls: g.cls });
  if (spec.intro) logLine(b, spec.intro, 'narr');

  for (let safety = 0; !b.over && safety < 400; safety++) {
    const waiting = runUntilPlayer(b);
    await P.battle.play(drain(b), b, signal);
    if (b.over || !waiting) break;
    const intent = await P.battle.intent(b, signal);
    let timing: TimingGradeDef | null = null;
    if (intent.type === 'blues') {
      intent.accuracy = scoreBlues(await P.battle.blues(signal)).accuracy;
    } else if (needsTiming(intent)) {
      if (g.settings.rhythm === 'auto') {
        timing = rollAutoTiming(rng);
        await P.battle.autoTiming(timing, signal);
      } else {
        const t = timingSpec(b, 0.5 + session.cosmetic.next() * 0.3);
        timing = gradeTiming(t, await P.battle.timing(t, signal));
        await P.battle.timingResult(timing, signal);
      }
      announceTiming(b, timing);
    }
    playerAction(b, intent, timing);
    await P.battle.play(drain(b), b, signal);
  }
  await P.battle.play(drain(b), b, signal);
  g.resume = null;
  const result = b.result || 'lose';

  if (result === 'win') {
    applyBattleResult(b);
    const v = resolveVictory(b);
    await P.battle.victory(v, !!opts.boss, signal);
    P.battle.close();
    const ups = gainXp(g, v.rewards.xp);
    if (ups.length) await P.levelUps(ups, signal);
    if (v.completedStep) {
      const step = (ACTS[v.completedStep.act] as Record<string, StepDef>)[v.completedStep.step];
      if (step?.completeToast) P.toast(step.completeToast);
    }
    session.save();
    return 'win';
  }
  if (result === 'fled') {
    applyBattleResult(b);
    P.battle.close();
    session.save();
    P.story(null);
    await P.line({ who: null, text: TEXT.fled(b.stolen) }, signal);
    return 'fled';
  }
  if (opts.boss) {
    const choice = await P.battle.defeat(true, signal);
    restoreSnapshot(g, snapshot);
    P.battle.close();
    session.save();
    return choice === 'retry' ? 'retry' : 'lose';
  }
  await P.battle.defeat(false, signal);
  applyStreetDefeat(g);
  P.battle.close();
  session.save();
  throw new SceneInterrupt('cut');
}
