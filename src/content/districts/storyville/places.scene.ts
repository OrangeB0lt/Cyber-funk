/**
 * Storyville's places: the Velvet Lantern (Madame Céleste, her Whispers, Professor Theo's piano, the
 * DJ in the corner booth), the Basin Street Chop Shop and Ledger & Sons Counting House.
 * (v1: legacy/src/08_world.js PLACE_FLOWS lantern/chopshop/counting, celesteTalk, whispers, theoTalk,
 * staticQuest.)
 */
import type { BossId } from '@core/ids/enemies';
import { SHEET_MUSIC_IDS, type SheetMusicId } from '@core/ids/items';
import { definePlace } from '@narrative/define';
import type { Scene, SceneContext } from '@narrative/types';
import { BOSSES } from '../../bosses';
import { PLACES } from '../../places';
import { QUESTS } from '../../quests';
import { SHEET_MUSIC } from '../../sheetMusic';
import { getInvitation } from '../../world/shared.scene';
import { fmtD } from '../../world/streets.scene';

/* ------------------------------------------------------------------ */
/* The Velvet Lantern                                                   */
/* ------------------------------------------------------------------ */

/** Talking to Madame Céleste: the first time starts the hunt for Ledger's pages. */
export const celesteTalk: Scene = async s => {
  const g = s.game;
  if (!s.flags.has('metCeleste')) {
    s.flags.set('metCeleste');
    await s.say(
      'celeste',
      '"Bienvenue, chéri. In this house the music\'s live and the secrets cost extra. You\'re the one who took the Strip back. Good. Now listen, because Storyville has a worse problem than Metronome."',
    );
    await s.say(
      'celeste',
      '"Mr. Ledger. He bought every contract in the district. Musicians, dancers, dealers, the woman who sells flowers on Basin Street. Bought the paper on all of them, and the paper says the music is his. His collectors carry the pages on them. I want those pages. Three of them, and I can read where his vault is."',
    );
    if (s.story.is({ act: 'storyville', step: 'meet_celeste' }))
      s.story.set({ act: 'storyville', step: 'collect_ledger_pages' });
    await s.say(
      'celeste',
      '"Contract Enforcers. Pinstripes, armor plating. Shake them on the street. And chéri, when you have the pages, come see me. My Whispers will tell you where the vault is, for a small fee. Everything here is for a small fee. That\'s how we stay open."',
    );
    return;
  }
  if (
    s.story.is({ act: 'garden', step: 'get_invitation' }) &&
    g.choices.contracts === 'burned' &&
    !s.flags.has('celesteInvite')
  ) {
    await s.say(
      'celeste',
      '"You want into the Vane ball. Of course you do. Isolde Vane owes this house more than a favor, she owes it a whole winter. I\'ll call it in. Consider it the only thing in the Lantern that\'s ever been free."',
    );
    s.flags.set('celesteInvite');
    await getInvitation(s, 'celeste');
    return;
  }
  const bits = [
    g.choices.contracts === 'burned'
      ? '"The district\'s free. People are singing on Basin Street again. The deluxe rooms are yours whenever you want them, no charge, forever. That\'s the deal and I keep my deals."'
      : g.choices.contracts === 'kept'
        ? '"You kept the money. Mm. I don\'t judge, chéri. I just remember." She remembers. The Lantern is a little colder.'
        : '"Ledger counts everything. Count faster than him. FUNK throws his whole arithmetic off."',
    "\"Theo's been at that piano since before the Silence Ordinance. If you find his rolls, you'll make an old man cry, and he'll hate that, and he'll love it.\"",
    '"Static? Corner booth. Metronome owns his contract, and it\'s the only one in Storyville I couldn\'t buy back. Maybe you can."',
  ];
  if (!s.flags.has('ledgerHint')) {
    s.flags.set('ledgerHint');
    s.bookHint('mr_ledger');
  }
  await s.say('celeste', s.rng.pick(bits));
};

/** Céleste's Whispers: where Ledger's vault is (Ð60 and the three pages), or any boss's weak spot (Ð120). */
export const whispers: Scene = async s => {
  s.title('The Velvet Lantern');
  const g = s.game;
  if (s.story.is({ act: 'storyville', step: 'buy_whispers' })) {
    await s.say(
      'celeste',
      '"Three pages. Let me see." She reads them against the lamp. "Basin and Bienville. Under the Counting House, through the coal chute, down two flights. Sixty Doubloons for the Whisper, chéri. House rules."',
    );
    const c = await s.choose({ pay: 'Pay Ð60', later: 'Not yet' });
    if (c === 'pay') {
      if (g.doubloons < 60) {
        await s.say(
          'celeste',
          '"Then earn it on the street and come back. The vault isn\'t going anywhere. That\'s the whole problem with it."',
        );
      } else {
        g.doubloons -= 60;
        s.take('ledgerpage', 3);
        s.story.set({ act: 'storyville', step: 'enter_vault' });
        await s.say(
          'celeste',
          "\"The coal chute. Go at night. And chéri: Ledger's Chops compound every turn he's alive. Don't give him turns.\"",
        );
        s.bookHint('mr_ledger');
      }
    }
    return;
  }
  const bosses = (Object.keys(BOSSES) as BossId[]).filter(
    id => !g.bossesDefeated.includes(id) && id !== 'the_click',
  );
  if (!bosses.length) {
    await s.say('celeste', '"There\'s nothing left to whisper about. Go finish it."');
    return;
  }
  await s.say('celeste', '"A Whisper is a hundred and twenty. Who do you want to know about?"');
  const who = await s.choose<BossId | 'nobody'>({
    ...(Object.fromEntries(bosses.map(id => [id, BOSSES[id].name])) as Record<BossId, string>),
    nobody: 'Nobody tonight',
  });
  if (who === 'nobody') return;
  if (g.doubloons < 120) {
    await s.say('celeste', '"Come back with the money, chéri."');
    return;
  }
  g.doubloons -= 120;
  const b = BOSSES[who];
  s.bookHint(b.id);
  await s.say(
    'celeste',
    `"${b.name}. Weak to ${b.weak}${b.resist ? ', resists ' + b.resist : ''}. ${b.book}" She folds the money away. "Recorded in your Blue Book."`,
  );
};

/** Professor Theo's piano: sheet music, and the hunt for his player-piano rolls. */
export const theoTalk: Scene = async s => {
  s.title('The Velvet Lantern');
  const g = s.game;
  if (!s.flags.has('metTheo')) {
    s.flags.set('metTheo');
    await s.say(
      'theo',
      '"They call me the Professor because I taught every piano player in this district, and then Metronome taught them to stop. I sell sheet music. Not songs. Techniques. Things you keep."',
    );
    if (s.quest('rolls') === undefined) {
      s.setQuest('rolls', 'active');
      await s.say(
        'theo',
        "\"And if you're out on the streets anyway: Ledger's collectors took my player-piano rolls. Three of them. Sixty years of my hands, punched in paper. They're in crates around Storyville somewhere, stacked wrong. Find them and the first sheet is free.\"",
      );
    }
  } else if (s.quest('rolls') === 'active' && s.count('pianoroll') >= 3) {
    s.take('pianoroll', 3);
    s.setQuest('rolls', 'done');
    await s.say(
      'theo',
      '"All three. Sixty years." He doesn\'t cry. He puts one on the piano and it plays itself, and he puts his hands over the keys without touching them, and the room goes quiet, and then it doesn\'t.',
    );
    await s.say(
      'theo',
      "\"Pick one. Any sheet. It's yours. And when you march on that Tower, I'm pushing my piano down Canal Street behind you, and don't argue.\"",
    );
    await s.xp(QUESTS.rolls.xp);
    s.gold(QUESTS.rolls.gold);
    const avail = SHEET_MUSIC_IDS.filter(id => !g.sheet.includes(id));
    if (avail.length) {
      const pick = await s.choose<SheetMusicId>(
        Object.fromEntries(
          avail.map(id => [id, `${SHEET_MUSIC[id].name}: ${SHEET_MUSIC[id].desc}`]),
        ) as Record<SheetMusicId, string>,
      );
      g.sheet.push(pick);
      s.toast('Learned ' + SHEET_MUSIC[pick].name + '.');
    }
  } else {
    await s.say(
      'theo',
      s.rng.pick([
        '"Circular Breathing isn\'t a trick. It\'s a decision not to stop."',
        '"Second Wind: once a night, the song refuses to end. I\'ve seen it save a man\'s life. His name was Gus."',
        s.quest('rolls') === 'active'
          ? `"${s.count('pianoroll')} of three. Keep looking. They're in crates marked LAVIGNE, if the Enforcers haven't burned them."`
          : '"Play something. Not for me. For the piano."',
      ]),
    );
  }
  await s.sheet({
    kind: 'shop',
    title: "Professor Theo's Sheet Music",
    keeper: 'theo',
    noSell: true,
    stock: SHEET_MUSIC_IDS.map(id => ({ id })),
  });
};

/** The DJ in the corner booth: walk Static two blocks past Metronome's Repo Drones and he's yours. */
export const staticQuest: Scene = async s => {
  s.title('The Velvet Lantern');
  const g = s.game;
  const ballInvite = s.story.is({ act: 'garden', step: 'get_invitation' });
  if (g.band.recruited.includes('static')) {
    await s.say(
      'static',
      s.rng.pick([
        '"Every grid has a seam. I know where I left mine."',
        '"You want to hear something? I scratched the Hush frequency into a breakbeat. They march to it now and don\'t know why."',
        ballInvite
          ? '"The Vane ball? I can forge an invitation in my sleep. Give me four seconds."'
          : '"Corner booth\'s always open."',
      ]),
    );
    if (ballInvite) await getInvitation(s, 'static');
    return;
  }
  if (s.quest('static_contract') === undefined) {
    s.setQuest('static_contract', 'active');
    await s.say(
      'static',
      "\"Static. Cassette deck, mostly. Metronome owns my contract, which means two Repo Drone squads follow me around to make sure I don't play anywhere that isn't theirs. Walk me from here to the Chop Shop. Two blocks. If we make it, I'm out, and I'm yours.\"",
    );
    const c = await s.choose({ walk: '"Let\'s walk."', later: '"Give me a minute to get ready."' });
    if (c === 'later') return;
  } else await s.say('static', '"Ready to walk? Two blocks. Two squads."');
  const r1 = await s.fight({
    enemies: ['repo_drone', 'repo_drone'],
    context: 'quest',
    intro: 'First block. Two Repo Drones drop out of the fog.',
  });
  if (r1 !== 'win') return;
  await s.narrate(
    'One block down. Static scratches a drone\'s wreckage and it plays its own death rattle backwards. "Second squad\'s on Basin."',
  );
  s.heal(0.15);
  const r2 = await s.fight({
    enemies: ['repo_drone', 'repo_drone', 'enforcer'],
    context: 'quest',
    intro: 'Second block. Two more drones and an Enforcer holding the contract itself.',
  });
  if (r2 !== 'win') return;
  s.setQuest('static_contract', 'done');
  s.recruit('static');
  await s.say(
    'static',
    '"That\'s the paper." He feeds the contract into his cassette deck. It comes out the other side as a loop. "I\'m out. I\'m in. Where we going?" (Static joins your band.)',
  );
  await s.xp(QUESTS.static_contract.xp);
  s.gold(QUESTS.static_contract.gold);
};

export const lantern = definePlace('lantern', {
  options: (g, h) => {
    const burned = g.choices.contracts === 'burned';
    return [
      {
        key: 'talk',
        label: 'Talk to Madame Céleste',
        hint: h.is({ act: 'storyville', step: 'meet_celeste' }),
        run: async s => {
          s.title(PLACES.lantern.name);
          await celesteTalk(s);
        },
      },
      {
        key: 'rest',
        label: `Deluxe rest (${burned ? 'free' : fmtD(80)})`,
        sub: 'Full restore and Sweet Dreams for 3 fights.',
        run: async s => {
          if (!burned && s.game.doubloons < 80) {
            s.toast('Not enough Doubloons.');
            return;
          }
          if (!burned) s.game.doubloons -= 80;
          s.rest();
          s.game.dreamBuff = { fights: 3 };
          s.game.day += 1;
          s.title(PLACES.lantern.name);
          await s.narrate(
            "Velvet, lamplight, a piano somewhere below playing something slow. Céleste says goodnight. The rest is yours and nobody else's business. You wake up restored, and the world has a little more swing in it. (Sweet Dreams: +10% Chops & Grit, +20% Mojo for 3 fights.)",
          );
          s.save();
        },
      },
      { key: 'whispers', label: 'Whispers', sub: 'Pay for intel on a boss.', run: whispers },
      {
        key: 'theo',
        label: "Professor Theo's piano",
        sub: 'Sheet Music: permanent passives.',
        run: theoTalk,
      },
      ...(g.flags.metCeleste
        ? [
            {
              key: 'static',
              label: 'The DJ in the corner booth',
              hint: !g.band.recruited.includes('static'),
              run: staticQuest,
            },
          ]
        : []),
    ];
  },
});

/* ------------------------------------------------------------------ */
/* Basin Street Chop Shop                                               */
/* ------------------------------------------------------------------ */

export const chopshop = definePlace('chopshop', {
  options: () => [
    {
      key: 'cyberware',
      label: 'Browse cyberware',
      run: s =>
        s.sheet({
          kind: 'shop',
          title: 'Basin Street Chop Shop',
          keeper: 'chop_surgeon',
          stock: [
            { id: 'mod_lungs' },
            { id: 'mod_jaw' },
            { id: 'mod_tempo' },
            { id: 'mod_ribcage' },
            { id: 'mod_eyes' },
            { id: 'mod_swing' },
          ],
        }),
    },
    {
      key: 'surgeon',
      label: 'Talk to the surgeon',
      run: async s => {
        s.title(PLACES.chopshop.name);
        await s.narrate(
          s.rng.pick([
            '"No anesthesia, no refunds, no Metronome parts. Pick two." The surgeon has a cigarette and three arms.',
            '"Bellows Lungs are popular with horn players. Chrome Jaw too. I don\'t ask what the Swing Unit does. I just install it and the customers come back smiling."',
            "\"I did Lucien's implant, before. Didn't know what the signal would do to it. If you see him out there... I'm sorry.\"",
          ]),
        );
      },
    },
  ],
});

/* ------------------------------------------------------------------ */
/* Ledger & Sons Counting House                                         */
/* ------------------------------------------------------------------ */

export const counting = definePlace('counting', {
  intro: g =>
    g.bossesDefeated.includes('mr_ledger')
      ? {
          text:
            g.choices.contracts === 'burned'
              ? 'Ledger & Sons is a shell. Somebody has painted FREE over the door and nobody has painted over it.'
              : 'Ledger & Sons runs on under new management: yours, technically, on paper. The clerks avoid your eyes. The money was good.',
        }
      : null,
  options: (g, h) => {
    if (!g.bossesDefeated.includes('mr_ledger')) {
      return h.is({ act: 'storyville', step: 'enter_vault' })
        ? [
            {
              key: 'boss',
              label: 'Enter the vault',
              hint: true,
              run: async s => void (await s.boss('mr_ledger')),
            },
          ]
        : [
            {
              key: 'case',
              label: 'Case the building',
              run: async s => {
                s.title(PLACES.counting.name);
                await s.narrate(
                  "Brass teller windows, armed clerks, a portrait of Mr. Ledger over the door smiling like a closed account. The vault is somewhere below, but the stairs are a rumor. Céleste's Whispers know where.",
                );
              },
            },
          ];
    }
    return [
      {
        key: 'look',
        label: 'Look around',
        run: async (s: SceneContext) => {
          s.title(PLACES.counting.name);
          const burned = s.game.choices.contracts === 'burned';
          await s.narrate(
            burned
              ? 'Ash still drifts in the vault. A singer from the Lantern is using the teller counter as a stage. (+20 Groove next fight.)'
              : "The ledgers are still here. You could read them. You don't.",
          );
          if (burned) s.nextFight({ groove: 20 });
        },
      },
    ];
  },
});
