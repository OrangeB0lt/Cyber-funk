/**
 * The game's system copy: lines the app shows around scenes and battles (recovering a Blue Note,
 * unlocking a district, escaping, victory and defeat screens). Writers own these like any prose.
 */
import { fmtDoubloons } from './format';

export const TEXT = {
  /** A Blue Note is recovered. */
  noteFound: (name: string, quote: string, count: number) =>
    `A sound like a struck glass. The ${name} hangs in the air, blue-white, and settles into your horn. "${quote}" (${count}/6 Blue Notes.)`,
  /** Toast at five notes. */
  fiveNotes: 'Five notes. Ti-Jacques can build your legendary.',
  /** Toast when a boss unlocks a district. */
  districtUnlocked: (name: string) => `${name} unlocked. Check Travel.`,
  /** Going back into a boss you already met. */
  goBackIn: 'You go back in.',
  /** Retrying a lost boss fight. */
  runItBack: 'You catch your breath on the steps outside, count yourself in, and go back for round two.',
  /** After escaping a fight. */
  fled: (stolen: number) =>
    'You slip off into the neon. Nobody follows. ' +
    (stolen ? `The hustler keeps the ${fmtDoubloons(stolen)}, though.` : ''),
  /** After a fight the engine called off (its turn guard tripped): no winner, no penalty. */
  stalled: 'The song stalls out and the crowd drifts off. Nobody won, nobody lost, and the night goes on.',
  /** Victory screen titles. */
  victoryTitle: (boss: boolean) => (boss ? 'CUT THE BODY LOOSE' : 'YOU WON'),
  /** Under the victory numbers. */
  victoryRecover: 'You catch your breath. +10% Heart, +20% Funk.',
  /** Defeat screen. */
  defeatTitle: 'YOU GOT CUT',
  defeatBoss: 'The song falls apart in the middle. But a song is just error, repeated. Run it back.',
  defeatStreet:
    'The neon swims. Somebody drags you back to the Lagniappe club. You wake up on the folding chairs with a wet rag on your head and lighter pockets.',
  defeatStreetCost: 'Full Heart, −20% Doubloons.',
  /** After a reload into a district while a non-street fight was pending. */
  fightRestarts: 'Your last fight restarts when you go back in.',
  /** When a scene breaks unexpectedly. */
  somethingBroke: 'Something skipped a beat. Back to the street.',
} as const;
