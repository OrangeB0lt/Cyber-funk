/**
 * Manchac Swamp's places: Grand-mère Clothilde's cabin, the Fais Do-Do dancehall, Boudreaux's Boudin
 * Shack and Pump Station 13. (v1: legacy/src/08_world.js PLACE_FLOWS cabin/faisdodo/boudin/pump,
 * clothildeTalk, remyQuest, herbsQuest.)
 */
import { STAT_KEYS, type StatKey } from '@core/ids/combat';
import { definePlace } from '@narrative/define';
import type { Scene } from '@narrative/types';
import { PLACES } from '../../places';
import { QUESTS } from '../../quests';
import { STAT_NAMES } from '../../stats';
import { rumor } from '../../world/shared.scene';

/* ------------------------------------------------------------------ */
/* Grand-mère Clothilde's Cabin                                         */
/* ------------------------------------------------------------------ */

/** Talking to Grand-mère Clothilde: the first time explains the rougarou and asks for herbs. */
export const clothildeTalk: Scene = async s => {
  const g = s.game;
  if (!s.flags.has('metClothilde')) {
    s.flags.set('metClothilde');
    await s.say(
      'clothilde',
      g.roots === 'cajun'
        ? '"Mais, come here, mon \'tit. Lafourche? I knew your people. Your grand-père could call a fais do-do out of a dead swamp with that accordion. Sit, sit. Comment ça va?"'
        : "\"Come here, mon 'tit. Traiteur don't take money. But if you got some boudin, I won't say no.\"",
    );
    await s.say(
      'clothilde',
      "\"You hear that hum? That's Pump Station 13. Metronome's been testing their Click out here where they think nobody's listening. The Chrome Wolves were listening. Their alpha, Lucien, the boy with the implant, the signal got in him and turned him into something the old folks got a name for. Rougarou.\"",
    );
    if (s.story.is({ act: 'bayou', step: 'visit_clothilde' }))
      s.story.set({ act: 'bayou', step: 'hunt_pups' });
    await s.say(
      'clothilde',
      '"The pups are out on the trails, feral. Put three of them down gentle and follow the tracks to the station. And mon \'tit: the rougarou runs hot already. Heat is how you reach him."',
    );
    s.bookHint('rougarou');
    s.setQuest('herbs', 'active');
    await s.say(
      'clothilde',
      '"One more thing. I need elderberry, mamou root, and the leaf I never say the name of. Three herbs, out by the cypress. Bring them and I\'ll bless you proper."',
    );
    return;
  }
  const bits = [
    g.choices.lucien === 'spared'
      ? '"Lucien came by. Sat on my porch all night and didn\'t say a word. In the morning he fixed my steps. He\'s coming back to himself."'
      : g.choices.lucien === 'finished'
        ? '"I prayed for Lucien. I\'m praying for you too. Both of you needed it."'
        : '"The rougarou only has power over those who are afraid. Don\'t be afraid. Be hot."',
    g.roots === 'cajun'
      ? '"Your grand-père\'s accordion is still in my back room. Metronome never found it. When this is over, come get it."'
      : '"The swamp keeps its own time. Listen to the frogs. They never did learn 4/4."',
  ];
  await s.say('clothilde', s.rng.pick(bits));
};

/** The traiteur's herbs: bring three swamp herbs and she blesses one stat, permanently. */
export const herbsQuest: Scene = async s => {
  s.title("Grand-mère Clothilde's Cabin");
  if (s.quest('herbs') === undefined) {
    s.setQuest('herbs', 'active');
    await s.say(
      'clothilde',
      '"Elderberry, mamou root, and the leaf I never name. Three herbs. Out by the cypress, on the trails. Bring them and I\'ll bless you proper."',
    );
    return;
  }
  if (s.quest('herbs') === 'active' && s.count('swampherb') >= 3) {
    s.take('swampherb', 3);
    s.setQuest('herbs', 'done');
    await s.say(
      'clothilde',
      '"Ça c\'est bon. All three, and you didn\'t crush the leaf." She grinds them, says a prayer older than the parish, and presses a thumb to your forehead. "One point, mon \'tit. Where you want it?"',
    );
    const k = await s.choose<StatKey>(
      Object.fromEntries(STAT_KEYS.map(st => [st, `+1 ${STAT_NAMES[st]}`])) as Record<StatKey, string>,
    );
    s.permStat(k, 1);
    await s.narrate(
      `+1 ${STAT_NAMES[k]}, permanently. Grand-mère Clothilde will march with the second line.`,
    );
    await s.xp(QUESTS.herbs.xp);
    s.gold(QUESTS.herbs.gold);
  }
};

export const cabin = definePlace('cabin', {
  options: (g, h) => [
    {
      key: 'talk',
      label: 'Talk to Grand-mère Clothilde',
      hint: h.is({ act: 'bayou', step: 'visit_clothilde' }),
      run: async s => {
        s.title(PLACES.cabin.name);
        await clothildeTalk(s);
      },
    },
    {
      key: 'treat',
      label: 'Be treated (free)',
      sub: "Full Heart. Traiteurs don't take money.",
      run: async s => {
        s.rest();
        s.title(PLACES.cabin.name);
        await s.say(
          'clothilde',
          s.rng.pick([
            "She puts a hand on your forehead and says something soft in French that isn't a spell, exactly. The ache goes out of you.",
            '"Sit. Hush. No, not that Hush, the regular kind." Prayer, a cool cloth, and you\'re whole.',
          ]),
        );
        if (s.count('boudin') > 0) {
          const c = await s.choose({ give: 'Give her a Boudin Link', keep: 'Keep it' });
          if (c === 'give') {
            s.take('boudin', 1);
            // PARITY: v1 also counted S.flags.boudinGiven here, a number nothing ever read
            // (docs/known-issues.md "Dead fields and flags"). Flags are on/off in 2.0, so it's dropped.
            await s.say(
              'clothilde',
              "\"Mais, you didn't have to. But I won't say no.\" She eats it standing up, like a person who's been on her feet since 1998. (+5 Mojo next fight.)",
            );
            s.nextFight({ mojo: 5 });
          }
        }
      },
    },
    ...(g.quests.herbs === undefined || (g.quests.herbs === 'active' && (g.bag.swampherb ?? 0) >= 3)
      ? [
          {
            key: 'herbs',
            label: "Traiteur's Herbs",
            hint: true,
            sub: g.quests.herbs === 'active' ? 'Bring her the three herbs.' : 'She needs something gathered.',
            run: herbsQuest,
          },
        ]
      : []),
  ],
});

/* ------------------------------------------------------------------ */
/* The Fais Do-Do Dancehall                                             */
/* ------------------------------------------------------------------ */

/** Remy at the frottoir: hold the dancehall against two waves of Chrome Gators and he's yours. */
export const remyQuest: Scene = async s => {
  s.title('The Fais Do-Do');
  const g = s.game;
  if (g.band.recruited.includes('remy')) {
    await s.say(
      'remy',
      s.rng.pick([
        '"Mais, the gators don\'t come around no more. They heard the frottoir."',
        g.roots === 'cajun'
          ? "\"Lafourche and Manchac, in the same band. My grand-père would've said it couldn't be done. Then he'd have danced.\""
          : '"You ever had cracklins at Boudreaux\'s? No? Cher. Go."',
      ]),
    );
    return;
  }
  if (s.quest('faisdodo') === undefined) {
    s.setQuest('faisdodo', 'active');
    await s.say(
      'remy',
      g.roots === 'cajun'
        ? '"Mais, Lafourche! I can hear it. Listen, cher, Metronome\'s tagged gators been coming up through the dock every night. Two waves, like clockwork, because of course. Help me hold the floor and I\'ll play frottoir behind you till the Tower falls."'
        : '"Remy. Frottoir. You see the dock? Metronome\'s Chrome Gators come up through it every night, two waves, like clockwork, because of course. Help me hold the dancehall and I\'m in your band, yeah."',
    );
    const c = await s.choose({ hold: '"Let\'s hold the floor."', later: '"Let me get ready first."' });
    if (c === 'later') return;
  } else await s.say('remy', '"Ready? They come at midnight. It\'s midnight."');
  const r1 = await s.fight({
    enemies: ['chrome_gator', 'chrome_gator'],
    context: 'quest',
    intro: 'First wave. Two Chrome Gators come up through the dock boards.',
  });
  if (r1 !== 'win') return;
  await s.narrate(
    'The first wave slides back into the water, dented. Remy hands you a beer without stopping playing. "Second wave\'s the big one."',
  );
  s.heal(0.15);
  const r2 = await s.fight({
    enemies: ['chrome_gator', 'chrome_gator', 'skeeter'],
    context: 'quest',
    intro: 'Second wave. Two gators and a Skeeter Swarm riding in on their backs.',
  });
  if (r2 !== 'win') return;
  s.setQuest('faisdodo', 'done');
  s.recruit('remy');
  await s.say(
    'remy',
    '"The floor holds." The whole dancehall cheers. Remy straps the frottoir tighter. "Where we going, cher? I got spoons for days." (Remy joins your band.)',
  );
  await s.xp(QUESTS.faisdodo.xp);
  s.gold(QUESTS.faisdodo.gold);
};

export const faisdodo = definePlace('faisdodo', {
  options: g => [
    {
      key: 'drinks',
      label: 'Drinks',
      run: s =>
        s.sheet({
          kind: 'shop',
          title: 'The Fais Do-Do',
          keeper: 'faisdodo_bartender',
          stock: [{ id: 'abita' }, { id: 'hurricane' }, { id: 'boudin' }, { id: 'gumbo' }],
        }),
    },
    {
      key: 'rumors',
      label: 'Rumors',
      run: async s => {
        s.title(PLACES.faisdodo.name);
        await rumor(s);
      },
    },
    { key: 'remy', label: 'Remy at the frottoir', hint: !g.band.recruited.includes('remy'), run: remyQuest },
    {
      key: 'dance',
      label: 'Dance',
      run: async s => {
        s.title(PLACES.faisdodo.name);
        await s.narrate(
          'Accordion, fiddle, frottoir. Somebody grabs your hand and you two-step until the fog comes in under the door. Pass a good time, cher. (+30 Groove next fight, +10% Heart.)',
        );
        s.nextFight({ groove: 30 });
        s.heal(0.1);
      },
    },
  ],
});

/* ------------------------------------------------------------------ */
/* Boudreaux's Boudin Shack                                             */
/* ------------------------------------------------------------------ */

export const boudin = definePlace('boudin', {
  options: () => [
    {
      key: 'food',
      label: 'Buy food',
      run: s =>
        s.sheet({
          kind: 'shop',
          title: "Boudreaux's Boudin Shack",
          keeper: 'boudreaux',
          stock: [{ id: 'boudin' }, { id: 'gumbo' }, { id: 'poboy' }, { id: 'abita' }, { id: 'yakamein' }],
        }),
    },
    {
      key: 'joke',
      label: 'Hear a joke',
      run: async s => {
        s.title(PLACES.boudin.name);
        await s.say(
          'boudreaux',
          s.rng.pick([
            "\"So Thibodeaux buys an airboat with a MoodSync speaker built in. Perfect time, no swing. He gets ten feet out and the whole swamp goes quiet. Frogs, gators, everything. Boudreaux hollers, 'Mais, what happened?' Thibodeaux says, 'I think they're waiting for the two and four.'\"",
            "\"Boudreaux and Thibodeaux go to Metronome Tower for a job. The man says, 'Can you keep perfect time?' Boudreaux says, 'Yeah.' Thibodeaux says, 'For how long?' Man says, 'Forever.' Thibodeaux says, 'Then what's the job for?'\"",
            "\"Thibodeaux gets a Hush helmet. Noise-cancelling. Can't hear a thing. Boudreaux asks him how he likes it. Thibodeaux says, 'Like what?' Boudreaux says, 'The helmet.' Thibodeaux says, 'WHAT HELMET?'\"",
            "\"Boudreaux tells Thibodeaux, 'Gus Thibodeaux is your cousin?' Thibodeaux says, 'Every Thibodeaux is my cousin.' Boudreaux says, 'That's a lotta funerals.' Thibodeaux says, 'That's a lotta second lines.'\"",
          ]),
        );
        await s.narrate(
          'Boudreaux laughs harder than you do. Gus always swore he was the Thibodeaux in these. (+5 Mojo next fight.)',
        );
        s.nextFight({ mojo: 5 });
      },
    },
  ],
});

/* ------------------------------------------------------------------ */
/* Pump Station 13                                                      */
/* ------------------------------------------------------------------ */

export const pump = definePlace('pump', {
  intro: g =>
    g.bossesDefeated.includes('rougarou')
      ? {
          text:
            g.choices.lucien === 'spared'
              ? "The pump station is silent. Lucien's pack sleeps on the pilings, implants dark. He raises a hand as you pass."
              : 'The pump station is silent. The wolves are gone. The swamp hums its own tune again.',
        }
      : null,
  options: (g, h) => {
    if (!g.bossesDefeated.includes('rougarou')) {
      return h.is({ act: 'bayou', step: 'pump_station' })
        ? [
            {
              key: 'boss',
              label: 'Enter Pump Station 13',
              hint: true,
              run: async s => void (await s.boss('rougarou')),
            },
          ]
        : [
            {
              key: 'fence',
              label: 'Circle the fence',
              run: async s => {
                s.title(PLACES.pump.name);
                await s.narrate(
                  'The pump station squats on pilings, chrome and concrete, broadcasting a test tone that makes your teeth itch. Wolf tracks everywhere. The pack guards every approach. Thin the pups first, and follow the trail to the alpha.',
                );
              },
            },
          ];
    }
    return [
      {
        key: 'listen',
        label: 'Listen to the swamp',
        run: async s => {
          s.title(PLACES.pump.name);
          await s.narrate(
            'Frogs. Wind in the moss. An airboat far off, somebody on deck playing accordion. Nothing in 4/4. (+20 Groove next fight.)',
          );
          s.nextFight({ groove: 20 });
        },
      },
    ];
  },
});
