/**
 * The Garden District's places: Maison Chrome, the Silver Tuxedo Supper Club (and its valet) and Vane
 * Manor, with the Ball. (v1: legacy/src/08_world.js PLACE_FLOWS maison/tuxedo/manor and
 * legacy/src/09_story.js ballScene.)
 */
import { definePlace } from '@narrative/define';
import type { Scene } from '@narrative/types';
import { PLACES } from '../../places';
import { getInvitation, instrumentStock, rumor } from '../../world/shared.scene';

/* ------------------------------------------------------------------ */
/* Maison Chrome                                                        */
/* ------------------------------------------------------------------ */

export const maison = definePlace('maison', {
  options: g => [
    {
      key: 'gear',
      label: 'Top-tier gear',
      run: s =>
        s.sheet({
          kind: 'shop',
          title: 'Maison Chrome',
          keeper: 'maison_clerk',
          stock: [
            ...instrumentStock(g.cls, 3),
            { id: 'thr_duster' },
            { id: 'thr_kevlar' },
            { id: 'ch_haintblue' },
            { id: 'ch_medallion' },
            { id: 'mod_titanjaw' },
            { id: 'mod_overdrive' },
            { id: 'mod_swing' },
          ],
        }),
    },
    {
      key: 'browse',
      label: 'Browse without buying',
      run: async s => {
        s.title(PLACES.maison.name);
        await s.narrate(
          'The clerk looks at your shoes, then your horn, then decides you might be an eccentric. "Our Kevlar Zoot Suit stops a Hush baton and a dinner invitation with equal grace."',
        );
      },
    },
  ],
});

/* ------------------------------------------------------------------ */
/* The Silver Tuxedo Supper Club                                        */
/* ------------------------------------------------------------------ */

export const tuxedo = definePlace('tuxedo', {
  options: (_g, h) => {
    const invite = h.is({ act: 'garden', step: 'get_invitation' });
    return [
      {
        key: 'buffs',
        label: 'Pricey buffs',
        run: s =>
          s.sheet({
            kind: 'shop',
            title: 'The Silver Tuxedo',
            keeper: 'tuxedo_maitre',
            stock: [
              { id: 'sazerac', price: 60 },
              { id: 'hurricane', price: 60 },
              { id: 'muffuletta', price: 140 },
              { id: 'chicory', price: 60 },
            ],
          }),
      },
      {
        key: 'rumors',
        label: 'Rumors',
        run: async s => {
          s.title(PLACES.tuxedo.name);
          await rumor(s);
        },
      },
      ...(invite
        ? [
            {
              key: 'valet',
              label: 'The valet (invitation, Ð300)',
              hint: true,
              run: (async s => {
                s.title(PLACES.tuxedo.name);
                await s.say(
                  'valet',
                  '"Miss Vane\'s ball. Of course. The invitations are numbered, but numbers can be... re-issued. Three hundred Doubloons, and I never saw you."',
                );
                const c = await s.choose({ pay: 'Pay Ð300', later: 'Not tonight' });
                if (c === 'pay') {
                  if (s.game.doubloons < 300) {
                    await s.say('valet', '"Then I never saw you for free. Come back with the money."');
                  } else {
                    s.game.doubloons -= 300;
                    await getInvitation(s, 'valet');
                  }
                }
              }) as Scene,
            },
          ]
        : []),
      {
        key: 'quartet',
        label: 'Listen to the quartet bots',
        run: async s => {
          s.title(PLACES.tuxedo.name);
          await s.narrate(
            s.rng.pick([
              'Four String Quartet Drones saw through a licensed minuet. A diner claps between movements. A Butler Unit removes him.',
              'The quartet plays a waltz so exact you can feel your pulse trying to argue with it. You win the argument. (+10 Groove next fight.)',
            ]),
          );
          s.nextFight({ groove: 10 });
        },
      },
    ];
  },
});

/* ------------------------------------------------------------------ */
/* Vane Manor                                                           */
/* ------------------------------------------------------------------ */

/** The Vane ball: cross the floor (dance, bluff, your roots, or fight), then the duel if you're ready. */
export const ballScene: Scene = async s => {
  s.title('Vane Manor');
  const g = s.game;
  await s.narrate(
    'Gold gates. A Butler Unit takes your invitation, scans it twice, and lets you through into a house the size of a parish. The ball is in full swing, if swing is the word for a waltz played to a click track.',
  );
  await s.narrate(
    'Lady Isolde Vane is in the ballroom. Between you and the ballroom: the receiving line, the debutantes, and a floor you have to cross without being thrown out.',
  );
  const c = await s.choose({
    dance: 'Dance your way across (Tempo)',
    bluff: 'Bluff the receiving line (Mojo)',
    roots: {
      creole: '"My family\'s been on Krewe rolls since 1872." (Creole)',
      cajun: '"I\'m the Lafourche delegation." (Cajun)',
      yat: '"Where y\'at? I\'m with the band." (Yat)',
    }[g.roots],
    fight: 'Fight your way in',
  });
  let ok = false;
  if (c === 'dance') {
    ok = s.check('tempo', 0.4);
    await s.narrate(
      ok
        ? "You take a Debutante Droid by the hand and waltz her the length of the floor, a hair ahead of the click, and nobody notices you've crossed the room until you're at the ballroom door. She curtsies. You bow."
        : "You step on a Debutante Droid's foot on the two. The quartet stops. Every head turns.",
    );
  } else if (c === 'bluff') {
    ok = s.check('mojo', 0.4, true);
    await s.narrate(
      ok
        ? '"Baron de Marigny\'s nephew. By marriage. Twice." The receiving line waves you through without checking. Nobody in the Garden District has ever admitted to not knowing a Marigny.'
        : '"Baron de Marigny\'s nephew." "Which one?" "...The tall one." The Butler Unit\'s eyes narrow. Butler Units can\'t narrow their eyes. This one has learned.',
    );
  } else if (c === 'roots') {
    ok = s.check('mojo', 0.6, true);
    await s.narrate(
      ok
        ? g.roots === 'creole'
          ? 'A dowager droid lights up. "The Seventh Ward Dupres? I was at your grandmother\'s debut. Go on, cher, go on." You go on.'
          : g.roots === 'cajun'
            ? '"Lafourche? We have a Lafourche delegation?" "You do now." The host unit, programmed to never admit ignorance, nods you through.'
            : '"The band." The valet-droid looks at your case. "...Of course. The band. Through the kitchen." You go through the kitchen. It\'s faster.'
        : "The line stares. Somebody's programming decides you're a problem.",
    );
  }
  if (!ok) {
    const res = await s.fight({
      enemies: ['debutante', 'debutante', 'butler'],
      level: 12,
      context: 'quest',
      intro: 'Two Debutante Droids and a Butler Unit. The quartet keeps playing.',
    });
    if (res !== 'win') return;
    await s.narrate(
      'The last droid folds up in a pile of tulle. The quartet keeps playing. The ballroom doors are right there.',
    );
  }
  s.story.set({ act: 'garden', step: 'duel_isolde' });
  await s.xp(70);
  const c2 = await s.choose({ now: 'Enter the ballroom now', later: 'Step outside and get ready first' });
  if (c2 === 'now') await s.boss('isolde');
};

export const manor = definePlace('manor', {
  intro: g =>
    g.bossesDefeated.includes('isolde')
      ? {
          text: 'The ball is over. The chandeliers are out. Somewhere in the house, a violin plays something slightly, deliberately flat.',
        }
      : null,
  options: (g, h) => {
    if (!g.bossesDefeated.includes('isolde')) {
      const garden = g.story.act === 'garden';
      return [
        ...(h.is({ act: 'garden', step: 'attend_ball' })
          ? [{ key: 'ball', label: 'Present your invitation', hint: true, run: ballScene }]
          : []),
        ...(h.is({ act: 'garden', step: 'duel_isolde' })
          ? [
              {
                key: 'boss',
                label: 'Enter the ballroom',
                hint: true,
                run: (async s => void (await s.boss('isolde'))) as Scene,
              },
            ]
          : []),
        ...(!garden || h.is({ act: 'garden', step: 'get_invitation' })
          ? [
              {
                key: 'gate',
                label: 'The gate',
                run: (async s => {
                  s.title(PLACES.manor.name);
                  await s.narrate(
                    "Gold gates, a security dome, a Butler Unit checking cream-colored cards. No card, no ball. Static could forge one. Céleste could call in a favor, if you earned one. The Silver Tuxedo's valet sells them, if you have the money.",
                  );
                }) as Scene,
              },
            ]
          : []),
      ];
    }
    return [
      {
        key: 'grounds',
        label: 'Walk the grounds',
        run: async s => {
          s.title(PLACES.manor.name);
          await s.narrate(
            'Topiary soldiers stand at ease. A Debutante Droid, powered down, holds a punch cup forever. (+15 Groove next fight.)',
          );
          s.nextFight({ groove: 15 });
        },
      },
    ];
  },
});
