/**
 * Shortcuts that put a save at a point in the story: the start of an act, or the step a boss is
 * fought at. The dev menu uses them, and so do the tests that crawl every district.
 */
import type { BossId } from '@core/ids/enemies';
import { ACT_ORDER, ACT_STEPS, type ActId, type StoryPosition } from '@core/ids/story';
import type { DistrictId } from '@core/ids/world';
import type { GameState, StepDef } from '@core/types';
import { ACTS, BOSSES, DISTRICTS, PLACES } from '@content/data';
import { fullRest } from '@engine/index';

/**
 * Jump to the start of an act, as if every earlier boss were beaten: unlock the districts so far,
 * set the story, record earlier bosses and their Blue Notes, and raise the level to the act's floor.
 * Returns the district the act happens in (the Tower for the finale).
 */
export function setupAct(g: GameState, act: ActId): DistrictId {
  const idx = ACT_ORDER.indexOf(act);
  g.unlocked = ACT_ORDER.slice(0, idx + 1).filter((x): x is DistrictId => x in DISTRICTS);
  g.story = { act, step: ACT_STEPS[act][0] } as StoryPosition;
  g.flags.metRoux = true;
  for (const prev of ACT_ORDER.slice(0, idx)) {
    const boss = prev in DISTRICTS ? DISTRICTS[prev as DistrictId].boss : null;
    if (boss && !g.bossesDefeated.includes(boss)) {
      g.bossesDefeated.push(boss);
      const note = BOSSES[boss].note;
      if (note && !g.notes.includes(note)) g.notes.push(note);
    }
  }
  if (idx >= 5) g.flags.gusFreed = true;
  const lv = act in DISTRICTS ? DISTRICTS[act as DistrictId].levels[0] : 13;
  if (g.level < lv) {
    g.level = lv;
    fullRest(g);
  }
  return act in DISTRICTS ? (act as DistrictId) : 'tower';
}

/**
 * The story step a boss is fought at: the last step whose hint place is the boss's place (Isolde's
 * manor hosts both the Ball and the duel; the duel is the later step, as in v1's dev menu).
 */
export function bossStep(id: BossId): StoryPosition {
  const place = Object.values(PLACES).find(p => p.boss === id);
  const act = BOSSES[id].district as ActId;
  const steps = ACT_STEPS[act] as readonly string[];
  const step =
    steps.findLast(s => place && (ACTS[act] as Record<string, StepDef>)[s]?.hintPlace === place.id) ??
    (act === 'tower' ? 'climb_tower' : steps[steps.length - 1]!);
  return { act, step } as StoryPosition;
}
