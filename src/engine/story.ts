/**
 * Main-quest position helpers. Steps are compared by name and by their order within the act
 * (core/ids/story.ts), never by raw index in game code.
 */
import { ACT_ORDER, ACT_STEPS, type ActId, type StoryPosition } from '@core/ids/story';
import type { ItemId } from '@core/ids/items';
import type { GameState, QuestDef, StepDef } from '@core/types';
import { ACTS } from '@content/data';
import { countItem } from './inventory';

/** The step's position within its act. */
export function stepIndex(p: StoryPosition): number {
  return (ACT_STEPS[p.act] as readonly string[]).indexOf(p.step);
}

/** Is the player exactly at this act and step? */
export function storyIs(s: Readonly<GameState>, p: StoryPosition): boolean {
  return s.story.act === p.act && s.story.step === p.step;
}

/** Has the player reached (or passed) this act and step? */
export function storyReached(s: Readonly<GameState>, p: StoryPosition): boolean {
  const a = ACT_ORDER.indexOf(s.story.act);
  const b = ACT_ORDER.indexOf(p.act);
  return a > b || (a === b && stepIndex(s.story) >= stepIndex(p));
}

/** The story position for a legacy `{act, step: index}` pair. Migration and parity tooling only. */
export function storyFromIndex(act: ActId, index: number): StoryPosition {
  const steps = ACT_STEPS[act] as readonly string[];
  return { act, step: steps[Math.min(index, steps.length - 1)] } as StoryPosition;
}

/** The current main-quest step as the journal shows it: its definition plus a "(n/goal)" suffix. */
export function currentStep(s: Readonly<GameState>): { def: StepDef; text: string } {
  const def = (ACTS[s.story.act] as Record<string, StepDef>)[s.story.step]!;
  let suffix = '';
  if (def.progress) {
    const p = def.progress;
    const n = p.kind === 'item' ? countItem(s, p.item) : (s.counters[p.counter] ?? 0);
    suffix = ` (${Math.min(n, p.goal)}/${p.goal})`;
  }
  return { def, text: def.journal + suffix };
}

/** A side quest's "(n/goal)" suffix while active ('' otherwise). */
export function questProgress(s: Readonly<GameState>, q: QuestDef): string {
  if (!q.progress || s.quests[q.id] !== 'active') return '';
  const n = q.item ? countItem(s, q.progress as ItemId) : (s.counters[q.progress] ?? 0);
  return ` (${Math.min(n, q.goal ?? 0)}/${q.goal})`;
}
