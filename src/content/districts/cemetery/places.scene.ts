/**
 * St. Louis No. 1's places: Mambo Rosalie's temple, the Crypt Rows and the Data Mausoleum, with her
 * blessings and the Restless Haints. (v1: legacy/src/08_world.js PLACE_FLOWS temple/crypts/mausoleum,
 * rosalieTalk, blessing, haintsQuest.)
 */
import { STAT_KEYS, type StatKey } from '@core/ids/combat';
import type { EnemyId } from '@core/ids/enemies';
import { definePlace } from '@narrative/define';
import type { Scene } from '@narrative/types';
import { PLACES } from '../../places';
import { QUESTS } from '../../quests';
import { STAT_NAMES } from '../../stats';
import { fmtD, runEvent } from '../../world/streets.scene';

/** The haints' name colour (v1 drew them in the Blue Note's blue). */
const HAINT_BLUE = '#3fb6ff';

/* ------------------------------------------------------------------ */
/* Mambo Rosalie's Temple                                               */
/* ------------------------------------------------------------------ */

/** Talking to Mambo Rosalie: the first time explains the Data Mausoleum and asks about the haints. */
export const rosalieTalk: Scene = async s => {
  if (!s.flags.has('metRosalie')) {
    s.flags.set('metRosalie');
    await s.say(
      'rosalie',
      '"Come in. Mind the candles. I know who you are. The dead have been talking about you for a month."',
    );
    await s.say(
      'rosalie',
      '"Under the oldest tomb, Metronome built what they call the Data Mausoleum. They captured the songs of every musician they ever Muted, and they keep them down there, and they feed them to the Click so it can learn what to erase. Gus is down there. His song, I mean. The rest of him is restless, and I can\'t settle him until it\'s free."',
    );
    if (s.story.is({ act: 'cemetery', step: 'meet_rosalie' }))
      s.story.set({ act: 'cemetery', step: 'collect_crypt_keys' });
    await s.say(
      'rosalie',
      '"The door takes three Crypt Keys. The Data Wraiths carry them. So do some of the wandering haints, poor things. And when you get down there: the Archivist is a machine that catalogs grief. Give it some. BLUE tones break through its filters."',
    );
    s.bookHint('archivist');
    await s.say(
      'rosalie',
      '"And if you have time for the living and the dead both: three haints out in the rows can\'t rest. Hear their stories. Play them a dirge. Fight what\'s left of their pain. Brother Moses has been trying alone, with that banjo, for a year."',
    );
    s.setQuest('haints', 'active');
    return;
  }
  const bits = [
    s.flags.has('gusFreed')
      ? "\"Gus is settled. He's not resting, mind you. He's got a line to lead. But he's settled.\""
      : '"Grief is a frequency. The Archivist doesn\'t have a filter for it."',
    '"A blessing is a small thing. One point. But the dead gave it to me to give to you, and the dead don\'t give small."',
    s.quest('haints') === 'done'
      ? '"Brother Moses is sleeping through the night for the first time in a year. So am I."'
      : '"Three haints. One under the oak, one by the wall, one who won\'t stop singing. Moses knows the way."',
  ];
  await s.say('rosalie', s.rng.pick(bits));
};

/** A blessing: Ð150 for a permanent +1 to the stat of your choice, three times at most. */
export const blessing: Scene = async s => {
  const g = s.game;
  if (g.doubloons < 150) {
    s.toast('The offering is Ð150.');
    return;
  }
  s.title("Mambo Rosalie's Temple");
  await s.say(
    'rosalie',
    '"Choose. The dead will give you one point, and they\'ll give it in the one place you ask."',
  );
  const k = await s.choose<StatKey>(
    Object.fromEntries(STAT_KEYS.map(st => [st, `+1 ${STAT_NAMES[st]}`])) as Record<StatKey, string>,
  );
  g.doubloons -= 150;
  g.blessings += 1;
  s.permStat(k, 1);
  await s.narrate(`Rosalie shakes the asson. The candles lean toward you. +1 ${STAT_NAMES[k]}, permanently.`);
};

interface HaintStory {
  /** Who speaks. */
  who: string;
  /** What they tell you. */
  tale: string;
  /** What's left of their pain. */
  fight: EnemyId[];
  /** When it's laid to rest. */
  after: string;
}

const HAINTS: readonly HaintStory[] = [
  {
    who: 'A haint under the oak',
    tale: '"I played cornet in the Eureka Brass Band. The Hush took my horn in \'82 and I died in \'83 and nobody played me out. No dirge. No second line. Just a van." It looks at your case. "Play me out. Please."',
    fight: ['haint', 'haint'],
    after:
      'The haint listens to your dirge with its eyes closed. When the last note goes, it says, "That\'s the one," and walks off between the tombs, swinging its arms like a Grand Marshal.',
  },
  {
    who: 'A haint by the wall',
    tale: '"I sang at the Lantern. Ledger bought my contract and the Click took my song and I don\'t remember the words anymore. Just the shape of it." She hums something with no notes in it. "Give me the shape back."',
    fight: ['bone_choir', 'haint'],
    after:
      "You play the dirge slow. Halfway through, she starts to sing, words and all. By the end she's laughing. \"Oh, that's how it went. That's all it was.\" She fades mid-verse, happy.",
  },
  {
    who: "A haint who won't stop singing",
    tale: 'It sings one note, perfect, forever. "They played me back," it says between breaths. "The Archivist. Played my last note on a loop until it was the only one I had. Make it stop. Make it move."',
    fight: ['data_wraith', 'archive_drone'],
    after:
      'You play the dirge against its one note until the note bends, and breaks, and becomes two notes, then a phrase, then a song. It stops singing. It says "thank you" in a speaking voice it had forgotten, and goes.',
  },
];

/** The Restless Haints: hear each one, play the dirge, fight what's left of the pain. Three, and Moses joins. */
export const haintsQuest: Scene = async s => {
  s.title('The Crypt Rows');
  const n = s.counter('haints');
  if (n >= 3) {
    s.setQuest('haints', 'done');
    s.recruit('moses');
    await s.say(
      'moses',
      '"Three." Brother Moses sets the banjo across his knees. "A year I\'ve been out here. You did it in a week. Dead folks got good ears, friend, and they\'re telling me to follow you." (Brother Moses joins your band. Mambo Rosalie will march with the second line.)',
    );
    await s.xp(QUESTS.haints.xp);
    s.gold(QUESTS.haints.gold);
    return;
  }
  const st = HAINTS[n]!;
  await s.say(
    'moses',
    n === 0
      ? "\"Brother Moses. Banjo. Rosalie sent you? Good. Come on, the first one's under the oak. Don't play until it's done talking. They need to be heard first.\""
      : s.rng.pick(['"Next one. Mind the roots."', '"This one\'s harder. They all are."']),
  );
  await s.speak(st.who, HAINT_BLUE, st.tale, 'haint');
  const c = await s.choose({ dirge: 'Play the dirge', later: 'Not yet' });
  if (c === 'later') return;
  await s.narrate(
    "You play the dirge. Slow. The way Gus taught you: dirge on the way there. Something in the air tears, and what's left of the pain comes out of the ground.",
  );
  const res = await s.fight({ enemies: st.fight, context: 'quest', intro: "What's left of the pain." });
  if (res !== 'win') return;
  s.game.counters.haints = n + 1;
  await s.narrate(st.after);
  if (n + 1 >= 3) await haintsQuest(s);
};

export const temple = definePlace('temple', {
  options: (g, h) => [
    {
      key: 'talk',
      label: 'Talk to Mambo Rosalie',
      hint: h.is({ act: 'cemetery', step: 'meet_rosalie' }),
      run: async s => {
        s.title(PLACES.temple.name);
        await rosalieTalk(s);
      },
    },
    ...(g.blessings < 3
      ? [
          {
            key: 'blessing',
            label: `Blessing (${fmtD(150)}, ${3 - g.blessings} left)`,
            sub: 'A permanent +1 to a stat of your choice.',
            run: blessing,
          },
        ]
      : []),
    {
      key: 'altar',
      label: 'Gris-Gris Bags',
      run: s =>
        s.sheet({
          kind: 'shop',
          title: "Mambo Rosalie's Altar",
          keeper: 'rosalie',
          stock: [{ id: 'grisgris' }, { id: 'yakamein' }, { id: 'indigo' }],
        }),
    },
    ...(g.flags.metRosalie && g.quests.haints !== 'done'
      ? [
          {
            key: 'haints',
            label: 'Restless Haints',
            hint: true,
            sub:
              g.quests.haints === 'active'
                ? `${g.counters.haints || 0}/3 laid to rest.`
                : 'Three haints need hearing.',
            run: haintsQuest,
          },
        ]
      : []),
  ],
});

/* ------------------------------------------------------------------ */
/* The Crypt Rows                                                       */
/* ------------------------------------------------------------------ */

export const crypts = definePlace('crypts', {
  options: () => [
    {
      key: 'walk',
      label: 'Walk the rows',
      sub: 'A fight or a story. The keys are out here.',
      run: async s => {
        s.title(PLACES.crypts.name);
        const r = s.rng.next();
        if (r < 0.65) {
          await s.narrate(
            s.rng.pick([
              'Blue light between the tombs. It has eyes.',
              'A tomb door opens an inch. Then all the way.',
              'The votives go out one by one, down the row, toward you.',
            ]),
          );
          await s.fight({ enemies: 'random', context: 'street' });
        } else await runEvent(s);
      },
    },
    {
      key: 'inscriptions',
      label: 'Read the inscriptions',
      run: async s => {
        s.title(PLACES.crypts.name);
        await s.narrate(
          s.rng.pick([
            '"AUGUSTE THIBODEAUX, GRAND MARSHAL. He led. We followed. We still do." Fresh flowers. A cornet mouthpiece on the step.',
            '"HERE LIES A TROMBONE PLAYER WHO NEVER MISSED A SECOND LINE. He is not here. He is in the second line."',
            'A tomb with no name, only a bass clef. Somebody has left a drumstick.',
          ]),
        );
        s.nextFight({ groove: 15 });
      },
    },
  ],
});

/* ------------------------------------------------------------------ */
/* The Data Mausoleum                                                   */
/* ------------------------------------------------------------------ */

export const mausoleum = definePlace('mausoleum', {
  intro: g =>
    g.bossesDefeated.includes('archivist')
      ? {
          text: 'The servers are dark. The dead have their songs back. Somebody plays one, faintly, from a tomb that should be empty.',
        }
      : null,
  options: (g, h) => {
    if (!g.bossesDefeated.includes('archivist')) {
      return h.is({ act: 'cemetery', step: 'enter_mausoleum' })
        ? [
            {
              key: 'boss',
              label: 'Unlock the mausoleum',
              hint: true,
              run: async s => void (await s.boss('archivist')),
            },
          ]
        : [
            {
              key: 'door',
              label: 'Try the door',
              run: async s => {
                s.title(PLACES.mausoleum.name);
                await s.narrate(
                  'The oldest tomb in the row, and under its slab, a steel door with three keyholes and a Metronome seal. Three Crypt Keys. The haints and the wraiths carry them.',
                );
              },
            },
          ];
    }
    return [
      {
        key: 'listen',
        label: 'Listen',
        run: async s => {
          s.title(PLACES.mausoleum.name);
          await s.narrate(
            'A cornet, far down the rows. It plays four bars you know from a cassette. (+20 Groove next fight.)',
          );
          s.nextFight({ groove: 20 });
        },
      },
    ];
  },
});
