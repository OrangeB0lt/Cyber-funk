/**
 * Main-quest position helpers. Steps are compared by name and by their order within the act
 * (core/ids/story.ts), never by raw index in game code.
 */
import { ACT_ORDER, ACT_STEPS, type ActId, type StoryPosition } from '@core/ids/story';
import type { GameState } from '@core/types';

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
