/**
 * Forming the second line at the Lagniappe club, the Tower act's first step (v1: secondLineScene,
 * legacy/src/09_story.js:200-213). Everyone who'll march is listed, the line forms, and the parade
 * takes Claiborne to Canal to Poydras: the Tower district opens.
 */
import type { Scene, SceneContext } from '@narrative/types';
import { SECOND_LINE } from '../band/secondLine';

/** Form the second line and march on the Tower. */
export const secondLineScene: Scene = async s => {
  s.title('Lagniappe Social Aid & Pleasure Club');
  await s.narrate(
    "Six Blue Notes on the trophy wall, humming together. Gus's umbrella against the door. And outside, on Claiborne, a crowd that has been gathering since noon.",
  );
  const roster = SECOND_LINE.filter(m => m.when(s.game));
  // PARITY: v1 stored each marcher's line too; nothing reads it, so the save keeps id and name.
  s.game.secondLine = roster.map(m => ({ id: m.id, name: m.name }));
  s.cards(
    'roster',
    roster.map(m => ({ title: m.name, text: m.line })),
  );
  await s.narrate(
    `Your second line is ${roster.length} strong. Inside the Tower, every one of them makes you stronger (+${Math.min(25, roster.length * 2)}% to all stats), and every one of them strikes when you Play the Blues.`,
  );
  await s.say(
    'gus',
    '"Umbrella up. Everybody in. Dirge on the way there, dance on the way back." He looks at the crowd. "Except this time, baby, we skip the dirge."',
  );
  await s.narrate(
    'The drums start. The crowd steps off. You take Claiborne to Canal, Canal to Poydras, and the Tower comes up out of the glass like a needle, and the whole city falls in behind you.',
  );
  if (!s.game.unlocked.includes('tower')) s.game.unlocked.push('tower');
  s.story.set({ act: 'tower', step: 'climb_tower' });
  s.save();
  await s.goto('tower');
};

/**
 * At the start of every climb, anyone who has joined since the line formed (Gus freed, a bandmate
 * recruited, a quest finished) falls in: a roll call of just the newcomers, then the new count. A P6
 * owner decision; v1 fixed the line when it formed. Nobody who already marched drops out.
 */
export async function recountSecondLine(s: SceneContext): Promise<void> {
  const g = s.game;
  if (!g.secondLine) return;
  const marching = new Set(g.secondLine.map(m => m.id));
  const joined = SECOND_LINE.filter(m => !marching.has(m.id) && m.when(g));
  if (!joined.length) return;
  g.secondLine = SECOND_LINE.filter(m => marching.has(m.id) || joined.includes(m)).map(m => ({
    id: m.id,
    name: m.name,
  }));
  s.cards(
    'roster',
    joined.map(m => ({ title: m.name, text: m.line })),
  );
  const n = g.secondLine.length;
  await s.narrate(
    `${joined.length === 1 ? 'Somebody new falls' : `${joined.length} new faces fall`} in with the second line on the plaza. It's ${n} strong now (+${Math.min(25, n * 2)}% to all stats in the Tower).`,
  );
}
