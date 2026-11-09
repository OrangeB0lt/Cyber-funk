/**
 * Tremé's places: the Lagniappe club, Mama Roux's kitchen, Ti-Jacques' pawn shop, Congo Square.
 * (v1: legacy/src/08_world.js PLACE_FLOWS club/kitchen/pawn/congo and mamaRouxTalk.)
 */
import { definePlace } from '@narrative/define';
import type { Scene, SceneContext } from '@narrative/types';
import { CLASSES } from '../../classes';
import { ENEMIES } from '../../enemies';
import { PLACES } from '../../places';
import { QUESTS } from '../../quests';
import { creditsAndNewGamePlus } from '../../story/finale.scene';
import { secondLineScene } from '../../story/secondLine.scene';
import { instrumentStock } from '../../world/shared.scene';
import { fmtD } from '../../world/streets.scene';

/* ------------------------------------------------------------------ */
/* Lagniappe Social Aid & Pleasure Club                                 */
/* ------------------------------------------------------------------ */

export const club = definePlace('club', {
  intro: g => ({ notes: true, text: `${g.notes.length}/6 Blue Notes on the trophy wall.` }),
  options: (g, h) => [
    {
      key: 'rest',
      label: 'Rest (free)',
      sub: 'Full Heart and Funk. The day turns over.',
      run: async s => {
        s.rest();
        s.game.day += 1;
        s.toast('You sleep on the folding chairs. Day ' + s.game.day + '.');
        s.save();
      },
    },
    {
      key: 'save',
      label: 'Save game',
      run: async s => {
        if (s.save(true)) s.toast('Saved to the club ledger.');
      },
    },
    { key: 'band', label: 'Swap bandmates', run: s => s.sheet({ kind: 'band' }) },
    { key: 'board', label: 'Quest board', run: s => s.sheet({ kind: 'journal' }) },
    ...(h.is({ act: 'tower', step: 'form_second_line' })
      ? [{ key: 'secondline', label: 'Form the Second Line', hint: true, run: secondLineScene }]
      : []),
    ...(g.flags.ending
      ? [{ key: 'ngplus', label: 'March again (New Game+)', hint: true, run: creditsAndNewGamePlus }]
      : []),
    ...(g.flags.hasCassette
      ? [
          {
            key: 'cassette',
            label: "Gus's cassette",
            run: async (s: SceneContext) => {
              s.title(null);
              await s.say(
                'gus',
                "Don't you cry too long for me, now. Dirge on the way there, dance on the way back. That's how we do.",
              );
              await s.say(
                'gus',
                s.rng.pick([
                  '"And listen. Every song starts at the root. So does this city. Play it like you mean it."',
                  '"When you get to the Tower, you walk in like it\'s your block. Because it is."',
                  '"If Mama Roux says eat, you eat. That\'s not advice, that\'s the law."',
                ]),
              );
            },
          },
        ]
      : []),
  ],
});

/* ------------------------------------------------------------------ */
/* Mama Roux's Kitchen                                                  */
/* ------------------------------------------------------------------ */

/** Talking to Mama Roux. */
export const mamaRouxTalk: Scene = async s => {
  if (!s.flags.has('metRoux')) s.flags.set('metRoux');
  const greet = {
    creole:
      "\"Where y'at, baby? Your mama still making groceries at the Circle Food? Tell her I said hey. Sit down, you lookin' thin as a po'boy wrapper.\"",
    cajun: '"There\'s my bayou baby. Mais, you want some gumbo? Of course you do. Sit."',
    yat: '"Where y\'at, dawlin\'! Irish Channel in my kitchen. Sit down before you fall down."',
  };
  await s.say('mamaroux', greet[s.game.roots]);
  if (s.story.is({ act: 'treme', step: 'meet_roux' })) {
    s.story.set({ act: 'treme', step: 'win_street_fights' });
    await s.say(
      'mamaroux',
      '"Now listen. The Hush got every corner in Tremé. You can\'t get near Congo Square with them thick like that. Go thin them out. Three good fights on the streets and Captain Hush\'ll come see about you himself."',
    );
    return;
  }
  if (s.quest('redbeans') === undefined) {
    const c = await s.choose({ need: '"You need anything, Mama?"', passing: '"Just passing through."' });
    if (c === 'need') {
      s.setQuest('redbeans', 'active');
      await s.say(
        'mamaroux',
        "\"Red beans. Camellia brand, the dry ones. The French Market still carries them if the Hush haven't licensed beans yet. Bring me a bag and I'll cook you something that'll carry you to the Tower and back.\"",
      );
    } else await s.say('mamaroux', '"Mm-hm. Passing through. Eat something on your way."');
    return;
  }
  const bits = [
    '"Gus used to sit right there. Same stool. Said my gumbo was the only thing in the city with more layers than his solos."',
    '"Ti-Jacques fixed that boy\'s horn more times than I can count. Never charged him once. Don\'t tell Ti-Jacques I told you."',
    "\"You tired, baby? The club's got chairs. They ain't comfortable but they're free.\"",
    s.game.notes.length >= 3
      ? '"Half the scale. I can feel it in the walls. Keep going."'
      : '"The Blue Notes. Six of them. Gus said the whole city was just those six notes played different every night."',
    s.flags.has('gusFreed')
      ? "\"You saw him. Gus. Did he... was he alright? Don't answer that. He's leading the line. He's alright.\""
      : null,
  ].filter((x): x is string => !!x);
  await s.say('mamaroux', s.rng.pick(bits));
};

export const kitchen = definePlace('kitchen', {
  options: (g, h) => {
    const mealPrice = h.price(40, 'treme');
    const better = g.quests.redbeans === 'done';
    return [
      {
        key: 'talk',
        label: 'Talk to Mama Roux',
        run: async s => {
          s.title(PLACES.kitchen.name);
          await mamaRouxTalk(s);
        },
      },
      {
        key: 'food',
        label: 'Buy food',
        sub: 'Cheap healing.',
        run: s =>
          s.sheet({
            kind: 'shop',
            title: "Mama Roux's Kitchen",
            keeper: 'mamaroux',
            stock: [
              { id: 'beignet' },
              { id: 'cafe' },
              { id: 'poboy' },
              { id: 'gumbo' },
              { id: 'yakamein' },
              { id: 'abita' },
            ],
          }),
      },
      {
        key: 'meal',
        label: `Sit-down meal (${fmtD(mealPrice)})`,
        sub: `+${better ? 20 : 10}% Chops & Grit for 3 fights.`,
        run: async s => {
          const price = mealPrice;
          if (s.game.doubloons < price) {
            s.toast('Not enough Doubloons.');
            return;
          }
          s.game.doubloons -= price;
          const amt = better ? 0.2 : 0.1;
          s.game.mealBuff = { fights: 3, chops: amt, grit: amt };
          s.rest();
          s.title(PLACES.kitchen.name);
          await s.say(
            'mamaroux',
            better
              ? '"Red beans, rice, smoked sausage, and a piece of cornbread. That\'s Monday food. You can carry a city on Monday food."'
              : '"Sit. Eat. Don\'t talk with your mouth full, Gus never learned and look what happened." Red beans and a piece of fried chicken. Full restore, and you feel it in your Chops.',
          );
        },
      },
      ...(g.quests.redbeans === 'active' && (g.bag.redbeans ?? 0) > 0
        ? [
            {
              key: 'beans',
              label: 'Give her the red beans',
              hint: true,
              run: async (s: SceneContext) => {
                s.take('redbeans', 1);
                s.setQuest('redbeans', 'done');
                s.title(PLACES.kitchen.name);
                await s.say(
                  'mamaroux',
                  '"Camellia brand. Baby, you did good. Now get out my kitchen, I got a pot to start." Her meals get stronger from here on.',
                );
                await s.xp(QUESTS.redbeans.xp);
                s.gold(QUESTS.redbeans.gold);
              },
            },
          ]
        : []),
    ];
  },
});

/* ------------------------------------------------------------------ */
/* Ti-Jacques' Pawn & Horn                                              */
/* ------------------------------------------------------------------ */

export const pawn = definePlace('pawn', {
  options: g => {
    const cls = CLASSES[g.cls];
    const legendReady = g.notes.length >= 5 && !g.flags.legendBuilt;
    return [
      {
        key: 'talk',
        label: 'Talk to Ti-Jacques',
        run: async s => {
          s.title(PLACES.pawn.name);
          await s.say(
            'tijacques',
            s.rng.pick([
              "Mais, cher, that horn's got more dents than a mailbox down the bayou, yeah. Twenty doubloons and I'll make her sing.",
              '"Metronome wanted to license my shop. I told them my shop\'s been licensed since 1952. By me."',
              '"Every horn in this window got a story. Most of them end with the Hush. Yours don\'t have to."',
              s.game.roots === 'creole'
                ? '"Your cousin Dede was in here Tuesday. Still owes me for a mouthpiece. Family discount, anyway."'
                : s.game.roots === 'cajun'
                  ? '"Lafourche, huh? My mama was from Golden Meadow. Comment ça va, cher?"'
                  : '"Irish Channel. I can hear it. Dat\'s alright, so\'s half my customers."',
            ]),
          );
          if (
            s.story.reached({ act: 'treme', step: 'win_street_fights' }) &&
            s.game.story.act === 'treme' &&
            !s.flags.has('hushHint')
          ) {
            s.flags.set('hushHint');
            await s.say(
              'tijacques',
              '"Captain Hush? Can\'t stand a syncopated beat. FUNK goes right through that helmet. If your horn don\'t play funk, I sell Disco Beads. One attack, funk tone, plus twenty percent."',
            );
            s.bookHint('captain_hush');
            if (!(cls.tones as readonly string[]).includes('FUNK')) {
              s.give('discobead', 3, { silent: true });
              await s.say(
                'tijacques',
                `"And since that ${cls.name} of yours don't speak funk, here. Three Disco Beads, on the house. Gus would've done the same." (Got 3 Disco Beads. Use one from the BAG in battle: your next attack becomes FUNK at +20%.)`,
              );
            }
          }
        },
      },
      {
        key: 'gear',
        label: 'Instruments & threads',
        run: s =>
          s.sheet({
            kind: 'shop',
            title: "Ti-Jacques' Pawn & Horn",
            keeper: 'tijacques',
            stock: [
              ...instrumentStock(g.cls, 2),
              { id: 'thr_thrift' },
              { id: 'thr_secondline' },
              { id: 'thr_duster' },
              { id: 'ch_pouch' },
              { id: 'ch_gator' },
              { id: 'ch_claw' },
            ],
          }),
      },
      {
        key: 'accessories',
        label: 'Accessories',
        sub: "Tone tapes and beads: change your next attack's tone.",
        run: s =>
          s.sheet({
            kind: 'shop',
            title: "Ti-Jacques' Accessories",
            keeper: 'tijacques',
            stock: [
              { id: 'discobead' },
              { id: 'cayenne' },
              { id: 'subtape' },
              { id: 'indigo' },
              { id: 'pralines' },
              { id: 'smoke' },
            ],
          }),
      },
      ...(legendReady
        ? [
            {
              key: 'legend',
              label: `Build the legendary ${cls.legendary} (${fmtD(350)})`,
              hint: true,
              run: async (s: SceneContext) => {
                if (s.game.doubloons < 350) {
                  s.toast('Ti-Jacques needs Ð350 for the chrome.');
                  return;
                }
                s.game.doubloons -= 350;
                s.flags.set('legendBuilt');
                s.gainGear(`inst_${g.cls}_legend`, { equip: true });
                s.title(PLACES.pawn.name);
                await s.say(
                  'tijacques',
                  `"Five Blue Notes. I can hear 'em from here, cher. Give me that horn." He works all night. In the morning there's a ${cls.legendary} on the counter, and it hums before you touch it.`,
                );
                await s.narrate(`${cls.legendary} equipped. Chops +24.`);
              },
            },
          ]
        : []),
    ];
  },
});

/* ------------------------------------------------------------------ */
/* Congo Square                                                         */
/* ------------------------------------------------------------------ */

/** The sparring circle: two random enemies at your level (or +2). */
function spar(bonus: number): Scene {
  return async s => {
    s.title('Congo Square');
    await s.narrate('The sparring circle. Nobody gets hurt here. Much.');
    const lvl = Math.max(1, Math.min(15, s.game.level + bonus));
    const pool = Object.values(ENEMIES).filter(
      e => !e.elite && !e.rival && e.district !== 'tower' && e.id !== 'ghost_track',
    );
    const ids = [s.rng.pick(pool).id, s.rng.pick(pool).id];
    await s.fight({
      enemies: ids,
      level: lvl,
      context: 'spar',
      intro: 'Sparring partners step into the circle. The drummers keep time.',
    });
  };
}

export const congo = definePlace('congo', {
  intro: g =>
    g.bossesDefeated.includes('captain_hush')
      ? {
          text: "The fence is down. Somebody's already set up a drum circle on the stones, and the Hush give the square a wide berth now. A sparring circle runs most nights: practice fights, real XP, half the Doubloons.",
        }
      : null,
  options: (g, h) => {
    if (!g.bossesDefeated.includes('captain_hush')) {
      return h.is({ act: 'treme', step: 'congo_square' })
        ? [
            {
              key: 'boss',
              label: 'Face Captain Hush',
              hint: true,
              run: async s => void (await s.boss('captain_hush')),
            },
          ]
        : [
            {
              key: 'look',
              label: 'Look through the fence',
              run: async s => {
                s.title(PLACES.congo.name);
                await s.narrate(
                  'Through the humming fence: the old square, the drum circle stones, a Hush command post where the bandstand was. Captain Hush himself paces the center. Too many patrolmen on the streets to reach him. Thin them out first.',
                );
              },
            },
          ];
    }
    return [
      { key: 'spar', label: 'Spar (your level)', run: spar(0) },
      { key: 'spar2', label: 'Spar (harder, +2 levels)', run: spar(2) },
      {
        key: 'drums',
        label: 'Sit with the drums',
        run: async s => {
          s.title(PLACES.congo.name);
          await s.narrate(
            "You sit on the stones and the drummers make room. Nobody says anything. The beat is older than the city. For a while you're part of it. (+20 Groove next fight.)",
          );
          s.nextFight({ groove: 20 });
        },
      },
    ];
  },
});
