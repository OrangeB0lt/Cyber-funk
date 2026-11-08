/**
 * Scenes and helpers more than one district uses: instrument stock for shops, bar rumors (the
 * Pelican, the Fais Do-Do, the Silver Tuxedo, Zinnia's tarot), and the invitation to the Vane ball
 * (Céleste, Static or the valet). (v1: legacy/src/08_world.js rumor, getInvitation.)
 */
import type { BossId } from '@core/ids/enemies';
import type { InstrumentTierId } from '@core/ids/items';
import { ACT_ORDER } from '@core/ids/story';
import type { DistrictId } from '@core/ids/world';
import type { Scene, SceneContext, ShopStock } from '@narrative/types';
import type { CLASSES } from '../classes';
import { DISTRICTS } from '../districts';

/** Instruments a shop stocks for the player's class: street, neon, chrome, up to `maxTier` of them. */
export const instrumentStock = (cls: keyof typeof CLASSES, maxTier: number): ShopStock[] =>
  (['street', 'neon', 'chrome'] as InstrumentTierId[])
    .slice(0, maxTier)
    .map(t => ({ id: `inst_${cls}_${t}` as const }));

/** What the bars know about each boss (v1: rumor's lines). */
const BOSS_RUMORS: Partial<Record<BossId, string>> = {
  captain_hush:
    "Captain Hush can't stand FUNK. Every fourth turn he raises that dampener, and you'll be Muted for two. Save your Funk for the turns in between.",
  vox_perfecta:
    "Vox Perfecta resists HOT and can't feel BLUE. She samples whatever you play last and throws it back at seventy percent, so don't end a turn on your best skill if she's about to go.",
  mr_ledger:
    "Mr. Ledger's Chops compound every single turn. Eight percent, stacking. FUNK scrambles his arithmetic. Kill him fast or don't bother.",
  rougarou:
    'The rougarou is weak to HOT and resists LOW. At half Heart it overclocks and attacks twice a round. Bring something that heals.',
  archivist:
    "The Archivist resists FUNK and breaks on BLUE. It summons Ghost Tracks, two at a time. Static's Scratch hits machines double.",
  isolde:
    'Isolde Vane raises a Perfect Pitch Shield every three turns. Only an ON THE ONE hit or a SOLO shatters it. When she telegraphs her Cadenza, VAMP.',
  conductor:
    'The Conductor counts down a Crescendo. VAMP when you hear "3... 2... 1." FUNK is the only thing he can\'t conduct.',
};

/** A tip about the next boss you haven't beaten (recorded in the Blue Book), and a bit of gossip. */
export const rumor: Scene = async s => {
  const g = s.game;
  const nextBoss =
    ACT_ORDER.map(a => (a in DISTRICTS ? DISTRICTS[a as DistrictId].boss : undefined))
      .filter((b): b is BossId => !!b)
      .find(b => !g.bossesDefeated.includes(b)) ?? 'conductor';
  s.bookHint(nextBoss);
  const who =
    g.district === 'bayou'
      ? 'A man at the bar with a frottoir scar on his chest'
      : g.district === 'garden'
        ? 'The valet, pretending to polish a glass'
        : 'A woman at the end of the bar with three empty go-cups';
  await s.narrate(
    `${who} leans in. "${BOSS_RUMORS[nextBoss]}" ${s.rng.pick(['She taps the bar twice. On the two and four.', 'He goes back to his drink.', 'You buy the next round.'])}`,
  );
  await s.narrate(
    s.rng.pick([
      'Also: "The Praline Lady wanders. If you see her, buy the King Cake. The baby\'s real."',
      'Also: "Ti-Jacques will build you a legendary horn when you hold five Blue Notes. Don\'t let him say he won\'t."',
      "Also: \"Madame Zinnia's data-tarot is right more than it's wrong. That's better than the weather.\"",
      'Also: "Every elite in this city has a bounty on the Pelican\'s board. Hunting\'s good money."',
    ]),
  );
};

/** The invitation to the Vane ball, from Céleste, Static or the valet: the key item, and the Ball opens. */
export async function getInvitation(s: SceneContext, how: 'celeste' | 'static' | 'valet'): Promise<void> {
  s.keyItem('invitation');
  if (s.story.is({ act: 'garden', step: 'get_invitation' }))
    s.story.set({ act: 'garden', step: 'attend_ball' });
  await s.narrate(
    how === 'static'
      ? 'Static hands you a cream card still warm from the printer. "Numbered 212. There is no 212. There is now."'
      : how === 'celeste'
        ? 'A courier brings a cream card with gold leaf. "Miss Isolde Vane requests your presence." Céleste\'s handwriting on the back: "You owe me nothing. She owes me plenty."'
        : 'The valet produces a cream card from his sleeve like a magician who hates his job. "Miss Isolde Vane requests your presence."',
  );
  s.toast('Got the Ball Invitation. Vane Manor is open.');
}
