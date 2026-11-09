/**
 * Forming the second line at the Lagniappe club, the Tower act's first step (v1: secondLineScene,
 * legacy/src/09_story.js:200-213). Everyone who'll march is listed, the line forms, and the parade
 * takes Claiborne to Canal to Poydras: the Tower district opens.
 */
import type { Scene } from '@narrative/types';
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
