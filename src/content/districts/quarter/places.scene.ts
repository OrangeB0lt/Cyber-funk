/**
 * The French Quarter's places: the Bourbon Strip, the Thirsty Pelican, Club Feu Follet, the French
 * Market and Jackson Square, with Miss Odette, Madame Zinnia, the busker, the broadcaster, the sit-in
 * and the crawfish races. (v1: legacy/src/08_world.js PLACE_FLOWS strip/pelican/feufollet/market/
 * jackson, odetteTalk, zinniaTarot, lostEyeQuest, hornQuest, sitIn, crawfishRaces, and
 * legacy/src/09_story.js broadcasterScene.)
 */
import { definePlace } from '@narrative/define';
import type { Scene, SceneContext } from '@narrative/types';
import { PLACES } from '../../places';
import { QUESTS } from '../../quests';
import { rumor } from '../../world/shared.scene';
import { fmtD } from '../../world/streets.scene';
import { cuttingContest } from './cutting.scene';

/* ------------------------------------------------------------------ */
/* Club Feu Follet                                                      */
/* ------------------------------------------------------------------ */

/** Talking to Miss Odette: the first time sets the act in motion; after that, the talk of Frenchmen. */
export const odetteTalk: Scene = async s => {
  if (!s.flags.has('metOdette')) {
    s.flags.set('metOdette');
    await s.say(
      'odette',
      "\"So you're the one from Tremé. Gus talked about you. Sit down, the first drink's on the house and the second one's on Metronome because I'm not paying their license.\"",
    );
    await s.say(
      'odette',
      '"Here\'s the shape of it. Bourbon is the Licensed Entertainment Strip now. Vox Perfecta, android diva, forty feet tall, perfect pitch, zero feeling. Every club on the Strip is wired to a licensing broadcaster in Jackson Square. Kill that signal and the Strip\'s doors open. Then take the main stage and put something real on it."',
    );
    if (s.story.is({ act: 'quarter', step: 'meet_odette' }))
      s.story.set({ act: 'quarter', step: 'sabotage_broadcaster' });
    await s.say(
      'odette',
      '"And when you\'re done with that: my back room runs a Cutting Contest. Three rivals, one after the other, real players. Win it and Sugar sings for you. She\'s been waiting for a band worth following."',
    );
    s.setQuest('cutting', 'active');
    await s.say(
      'odette',
      '"Oh, and if you need Doubloons, sit in with the house band once a day. We pay by how many clams you don\'t play."',
    );
    return;
  }
  const g = s.game;
  const bits = [
    '"Frenchmen Street was the last place in the city with a real downbeat. I intend to keep it that way."',
    g.bossesDefeated.includes('vox_perfecta')
      ? g.choices.vox === 'reprogrammed'
        ? '"Vox came by. Sang a ballad, flat as a flounder, and the whole room cried. You did a good thing, cher."'
        : "\"The Strip's dark without Vox. Honestly? It's quieter. I'll take quiet over licensed.\""
      : '"Vox Perfecta can\'t feel a blue note. That\'s not a figure of speech. BLUE tones go right through her."',
    s.quest('cutting') === 'done'
      ? '"Sugar says you\'re the real thing. Sugar doesn\'t say that."'
      : '"The Cutting Contest is waiting. Hot Rod plays HOT. Big Mae is all LOW end. Two-Tone honks FUNK with a BLUE chaser."',
  ];
  if (!s.flags.has('voxHint')) {
    s.flags.set('voxHint');
    s.bookHint('vox_perfecta');
  }
  await s.say('odette', s.rng.pick(bits));
};

/** Sitting in with the house band: eight bars On the One, paid by accuracy, once a day. */
export const sitIn: Scene = async s => {
  s.title('Club Feu Follet');
  await s.say('odette', '"House band\'s on. Eight bars. Hit the ONE and the tip jar fills."');
  const g = s.game;
  g.sitInDay = g.day;
  let total = 0;
  const results: string[] = [];
  for (let i = 0; i < 8; i++) {
    const r = await s.timing();
    results.push(r.id);
    total += r.id === 'one' ? 3 : r.id === 'pocket' ? 2 : r.id === 'loose' ? 1 : 0;
  }
  const pay = Math.round((((8 + g.level * 3) * total) / 24) * 4);
  g.doubloons += pay;
  const ones = results.filter(r => r === 'one').length;
  const clams = results.filter(r => r === 'clams').length;
  await s.narrate(
    `${ones} on the ONE, ${clams} clams. ${pay ? `The tip jar comes back with ${fmtD(pay)}.` : 'The tip jar comes back with a button and a note that says "practice."'} ${ones >= 6 ? 'Miss Odette raises her glass.' : ones >= 3 ? 'Not bad for a Tuesday.' : 'The house band is polite about it.'}`,
  );
  await s.xp(Math.round(10 + g.level * 2));
};

export const feufollet = definePlace('feufollet', {
  options: (g, h) => [
    {
      key: 'talk',
      label: 'Talk to Miss Odette',
      hint: h.is({ act: 'quarter', step: 'meet_odette' }),
      run: async s => {
        s.title(PLACES.feufollet.name);
        await odetteTalk(s);
      },
    },
    ...(g.quests.cutting !== undefined
      ? [
          {
            key: 'cutting',
            label: 'Cutting Contest',
            sub:
              g.quests.cutting === 'done'
                ? 'Exhibition rounds for Doubloons.'
                : 'Beat three rivals in a row. Win Sugar.',
            run: cuttingContest,
          },
        ]
      : []),
    ...(g.flags.metOdette
      ? [
          {
            key: 'sitin',
            label: 'Sit In (paid gig)',
            sub:
              g.sitInDay === g.day
                ? 'Already played today. Rest at the club to turn the day.'
                : 'An 8-tap rhythm set. Pays by accuracy.',
            run: async (s: SceneContext) => {
              if (s.game.sitInDay === s.game.day) {
                s.toast('You already sat in today.');
                return;
              }
              await sitIn(s);
            },
          },
        ]
      : []),
  ],
});

/* ------------------------------------------------------------------ */
/* The Thirsty Pelican                                                  */
/* ------------------------------------------------------------------ */

const CRAWFISH = ['Mudbug Mary', 'Big Chief', "Lil' Pincher", 'The Senator'] as const;

/** Crawfish races behind the pool table: bet, watch the track, collect triple (or don't). */
export const crawfishRaces: Scene = async s => {
  s.title('The Thirsty Pelican');
  const g = s.game;
  await s.narrate(
    'Four crawfish on a wet table, a chalk line, and a bartender with a whistle. "Place your bets, people, the Senator looks sleepy tonight."',
  );
  const bet = await s.choose({ bet10: 'Bet Ð10', bet25: 'Bet Ð25', bet50: 'Bet Ð50', watch: 'Just watch' });
  const amt = { bet10: 10, bet25: 25, bet50: 50, watch: 0 }[bet];
  if (amt && g.doubloons < amt) await s.narrate("You don't have it. The bartender lets you watch anyway.");
  const wager = amt && g.doubloons >= amt ? amt : 0;
  let choice = -1;
  if (wager) {
    const pick = await s.choose({
      mary: CRAWFISH[0],
      chief: CRAWFISH[1],
      pincher: CRAWFISH[2],
      senator: CRAWFISH[3],
    });
    choice = ['mary', 'chief', 'pincher', 'senator'].indexOf(pick);
    g.doubloons -= wager;
  }
  const pos = [0, 0, 0, 0];
  const row = () => CRAWFISH.map((n, i) => `${n.padEnd(12, ' ')} ${'·'.repeat(pos[i]!)}🦐`).join('\n');
  let winner = -1;
  for (let t = 0; t < 14 && winner < 0; t++) {
    // PARITY: every crawfish rolls every tick, even after one crosses the line (one draw each).
    for (let i = 0; i < 4; i++) {
      if (s.rng.chance(0.55 + (i === 3 ? -0.1 : 0))) pos[i]!++;
      if (pos[i]! >= 10 && winner < 0) winner = i;
    }
    s.board(row());
    await s.wait(g.settings.reduceMotion ? 90 : 220);
  }
  if (winner < 0) winner = pos.indexOf(Math.max(...pos));
  s.board(row() + `\n\n${CRAWFISH[winner]} WINS`);
  if (wager) {
    if (choice === winner) {
      g.doubloons += wager * 3;
      await s.narrate(
        `${CRAWFISH[winner]} by a claw! You win ${fmtD(wager * 3)}. The bartender blows the whistle at you, personally.`,
      );
    } else
      await s.narrate(
        `${CRAWFISH[winner]} takes it. Your crawfish wandered off the table. "Happens," the bartender says. "They're crawfish."`,
      );
  } else await s.narrate(`${CRAWFISH[winner]} takes it. The Senator falls asleep at the line.`);
};

export const pelican = definePlace('pelican', {
  options: () => [
    {
      key: 'drinks',
      label: 'Drinks',
      sub: 'Temporary buffs for the next fight.',
      run: s =>
        s.sheet({
          kind: 'shop',
          title: 'The Thirsty Pelican',
          keeper: 'pelican_bartender',
          stock: [{ id: 'hurricane' }, { id: 'sazerac' }, { id: 'abita' }, { id: 'yakamein' }],
        }),
    },
    {
      key: 'rumors',
      label: 'Rumors',
      sub: "Hints about what's ahead.",
      run: async s => {
        s.title(PLACES.pelican.name);
        await rumor(s);
      },
    },
    { key: 'bounties', label: 'Bounty board', run: s => s.sheet({ kind: 'bounties' }) },
    { key: 'crawfish', label: 'Crawfish Races', run: crawfishRaces },
  ],
});

/* ------------------------------------------------------------------ */
/* The French Market                                                    */
/* ------------------------------------------------------------------ */

export const market = definePlace('market', {
  options: g => [
    {
      key: 'stalls',
      label: 'Browse the stalls',
      run: s =>
        s.sheet({
          kind: 'shop',
          title: 'The French Market',
          keeper: 'market_vendor',
          stock: [
            { id: 'beignet' },
            { id: 'cafe' },
            { id: 'poboy' },
            { id: 'muffuletta' },
            { id: 'chicory' },
            { id: 'gumbo' },
            { id: 'yakamein' },
            { id: 'snoball' },
            { id: 'pralines' },
            { id: 'boudin' },
            { id: 'cayenne' },
            { id: 'subtape' },
            { id: 'indigo' },
            { id: 'discobead' },
            { id: 'smoke' },
            { id: 'redbeans', when: g.quests.redbeans === 'active' },
          ],
        }),
    },
    {
      key: 'vendors',
      label: 'Listen to the vendors',
      run: async s => {
        s.title(PLACES.market.name);
        await s.narrate(
          s.rng.pick([
            '"Pralines, pralines, get your pralines, licensed by nobody!" A Hush patrol pretends not to hear.',
            'A sno-ball man shaves ice in 7/8 time just to annoy the drone over his stall.',
            'An old woman selling hot sauce tells you Metronome tried to license cayenne. "Cayenne," she says, "licenses you."',
          ]),
        );
      },
    },
  ],
});

/* ------------------------------------------------------------------ */
/* Jackson Square                                                       */
/* ------------------------------------------------------------------ */

/** Madame Zinnia's data-tarot: Ð30 for a card that sets up your next fight (or a rumor). */
export const zinniaTarot: Scene = async s => {
  s.title('Jackson Square');
  if (s.game.doubloons < 30) {
    await s.say('zinnia', '"Thirty Doubloons, cher. The cards don\'t read for free. Neither do I."');
    return;
  }
  s.game.doubloons -= 30;
  const r = s.rng.next();
  if (r < 0.25) {
    s.nextFight({ hyped: true });
    await s.say(
      'zinnia',
      '"The Tower, reversed. Your next fight, you walk in already hot." (Hyped at the start of your next fight.)',
    );
  } else if (r < 0.5) {
    s.nextFight({ pocket: true });
    await s.say(
      'zinnia',
      '"The Drummer. You\'re in the pocket before the count-off." (In the Pocket at the start of your next fight.)',
    );
  } else if (r < 0.7) {
    s.nextFight({ groove: 30 });
    await s.say('zinnia', '"The Second Line. You start already moving." (+30 Groove next fight.)');
  } else if (r < 0.85) {
    s.nextFight({ mojo: 6 });
    await s.say('zinnia', '"The Lucky Bead. Something falls your way." (+6 Mojo next fight.)');
  } else await rumor(s);
};

/** The Lost Eye: a Neon Mime walked off with Zinnia's eye. */
export const lostEyeQuest: Scene = async s => {
  s.title('Jackson Square');
  if (s.quest('lost_eye') === undefined) {
    s.setQuest('lost_eye', 'active');
    await s.say(
      'zinnia',
      '"A Neon Mime took my eye. My EYE, cher. Walked up, mimed a hand on my face, and walked away with it in his invisible pocket. The cards say he\'s still in the Quarter. Shake him down and I\'ll march for you when the time comes."',
    );
    return;
  }
  if (s.quest('lost_eye') === 'active') {
    await s.narrate(
      'You ask around the square. A sno-ball vendor points down Royal Street. "The one with the shiny pocket."',
    );
    const res = await s.fight({
      enemies: ['neon_mime', 'neon_mime'],
      context: 'quest',
      intro: 'Two Neon Mimes. One of them has a pocket that glows.',
    });
    if (res !== 'win') return;
    s.setQuest('lost_eye', 'done');
    s.gainGear('ch_evileye');
    await s.say(
      'zinnia',
      '"There she is." She pops the eye back in and it whirs and focuses on you. "I have a spare. Take it. It sees things a minute early, which is the only kind of seeing worth doing." (Zinnia\'s Spare Eye: a charm. She joins the second line.)',
    );
    await s.xp(QUESTS.lost_eye.xp);
    s.gold(QUESTS.lost_eye.gold);
  }
};

/** The busker on the bench: the Hush took his trumpet; beat three Patrolmen to get it back. */
export const hornQuest: Scene = async s => {
  s.title('Jackson Square');
  if (s.quest('horn') === undefined) {
    s.setQuest('horn', 'active');
    await s.say(
      'busker',
      '"The Hush took my trumpet. Forty years on this bench, and some kid in a helmet writes me a citation and walks off with it. They keep what they confiscate on them, in those packs. Beat three Patrolmen and you\'ll find it, or something like it."',
    );
    return;
  }
  if (s.counter('hornFights') >= 3) {
    s.setQuest('horn', 'done');
    s.gainGear('ch_mouthpiece');
    await s.say(
      'busker',
      '"That\'s her." He takes the trumpet like it\'s a baby and plays one note that stops the pigeons. "Keep the mouthpiece. I\'ve got the one I was born with." (Busker\'s Mouthpiece: a charm.)',
    );
    await s.xp(QUESTS.horn.xp);
    s.gold(QUESTS.horn.gold);
  } else
    await s.say(
      'busker',
      `"${3 - s.counter('hornFights')} more Patrolmen. They're not hard to find. They find you."`,
    );
};

/** Killing the licensing broadcaster's signal: the drones, then one of three ways to do it. */
export const broadcasterScene: Scene = async s => {
  s.title('Jackson Square');
  await s.narrate(
    'The licensing broadcaster: a chrome spire across from the cathedral, humming, guarded by a pack of Click-Drones that circle it in perfect formation.',
  );
  const res = await s.fight({
    enemies: ['click_drone', 'click_drone', 'click_drone'],
    level: 4,
    context: 'quest',
    intro: 'Three Click-Drones peel off the spire. Machines. FUNK goes right through them.',
  });
  if (res !== 'win') return;
  await s.narrate(
    "The drones are scrap. The spire is still humming. Its access panel is open and there's a cassette deck inside, because of course there is. Three ways to kill the signal.",
  );
  const c = await s.choose({
    cassette: "Wire in Gus's cassette. Broadcast him.",
    smash: 'Smash it. Fast and loud.',
    horn: 'Patch in your own horn. Play the Strip a riff.',
  });
  if (c === 'cassette') {
    await s.narrate(
      'Gus\'s voice goes out over every licensed speaker on Bourbon Street. "Dirge on the way there, dance on the way back." For four seconds the whole Strip stops. Then somebody, somewhere, starts to dance. (+40 Groove next fight.)',
    );
    s.nextFight({ groove: 40 });
  } else if (c === 'smash') {
    await s.narrate(
      'You put the bell of your horn through the panel. Sparks, smoke, silence. A Hush squad comes running.',
    );
    const r2 = await s.fight({ enemies: ['hush_patrol', 'hush_patrol'], level: 4, context: 'quest' });
    if (r2 !== 'win') {
      // Got away from the squad: they hold the square, and the signal is back by morning.
      await s.narrate(
        'You run. Over your shoulder, the Hush are already bolting a new panel onto the spire, and the hum comes back. It will need doing again.',
      );
      return;
    }
  } else {
    await s.narrate(
      'You play into the panel and the whole Strip hears it: one riff, yours, raw. A Barker hologram glitches and tries to dance. The cathedral pigeons take off on the two. (+1 Mojo, permanently.)',
    );
    s.game.perm.mojo += 1;
  }
  s.flags.set('broadcasterDone');
  s.story.set({ act: 'quarter', step: 'main_stage' });
  await s.xp(60);
  await s.narrate(
    'The spire goes dark. Down Bourbon, the club doors unlock one by one. The main stage is open. Vox Perfecta is waiting on it.',
  );
};

export const jackson = definePlace('jackson', {
  options: (g, h) => {
    const atBroadcaster = h.is({ act: 'quarter', step: 'sabotage_broadcaster' });
    return [
      { key: 'tarot', label: "Madame Zinnia's data-tarot (Ð30)", run: zinniaTarot },
      {
        key: 'charms',
        label: "Zinnia's charms",
        run: s =>
          s.sheet({
            kind: 'shop',
            title: "Madame Zinnia's Charms",
            keeper: 'zinnia',
            stock: [{ id: 'ch_beads' }, { id: 'ch_medal' }, { id: 'ch_pouch' }, { id: 'ch_medallion' }],
          }),
      },
      ...(!g.quests.lost_eye || g.quests.lost_eye === 'active'
        ? [
            {
              key: 'losteye',
              label: 'The Lost Eye',
              hint: true,
              sub: g.quests.lost_eye === 'active' ? 'Find the mime that took it.' : 'Zinnia wants a word.',
              run: lostEyeQuest,
            },
          ]
        : []),
      ...(g.quests.horn !== 'done'
        ? [
            {
              key: 'busker',
              label: 'The busker on the bench',
              hint: g.quests.horn === 'active' && (g.counters.hornFights ?? 0) >= 3,
              run: hornQuest,
            },
          ]
        : []),
      ...(atBroadcaster
        ? [{ key: 'broadcaster', label: 'The licensing broadcaster', hint: true, run: broadcasterScene }]
        : [
            {
              key: 'look',
              label: 'Look at the broadcaster',
              run: async (s: SceneContext) => {
                s.title(PLACES.jackson.name);
                await s.narrate(
                  s.flags.has('broadcasterDone')
                    ? 'The broadcaster tower is dark. Somebody has hung a second-line umbrella on it. The cathedral bells, unlicensed, ring a little late and a little sweet.'
                    : 'A chrome spire across the square from the cathedral, humming. Every licensed jingle on Bourbon routes through it. Not your problem yet. Miss Odette first.',
                );
              },
            },
          ]),
    ];
  },
});

/* ------------------------------------------------------------------ */
/* The Bourbon Strip                                                    */
/* ------------------------------------------------------------------ */

export const strip = definePlace('strip', {
  intro: g =>
    g.bossesDefeated.includes('vox_perfecta')
      ? {
          text:
            g.choices.vox === 'reprogrammed'
              ? 'The main stage has a real band on it now, and Vox sings with them, a little flat on purpose. The Barkers are confused. The crowd is not.'
              : 'The main stage is dark. The Barkers still say "two-for-one" to nobody. Somewhere down Frenchmen, the real music is leaking back.',
        }
      : null,
  options: (g, h) => {
    if (!g.bossesDefeated.includes('vox_perfecta')) {
      return h.is({ act: 'quarter', step: 'main_stage' })
        ? [
            {
              key: 'boss',
              label: 'Take the main stage',
              hint: true,
              run: async s => void (await s.boss('vox_perfecta')),
            },
          ]
        : [
            {
              key: 'walk',
              label: 'Walk the Strip',
              run: async s => {
                s.title(PLACES.strip.name);
                await s.narrate(
                  'Bourbon Street, licensed. Every club has a Barker hologram and a Busker-Bot and the same eight bars. At the far end, the main stage, and Vox Perfecta forty feet tall on every screen. The licensing broadcaster in Jackson Square keeps the whole Strip locked. Kill the signal first.',
                );
              },
            },
          ];
    }
    return [
      {
        key: 'listen',
        label: 'Listen a while',
        run: async s => {
          s.title(PLACES.strip.name);
          await s.narrate(
            s.game.choices.vox === 'reprogrammed'
              ? "Vox catches your eye from the stage and bends a note just for you. It's not perfect. That's the point. (+20 Groove next fight.)"
              : "A kid with a cornet plays four bars from a balcony. A Hush patrol looks up, and then, for reasons they couldn't explain, looks away. (+20 Groove next fight.)",
          );
          s.nextFight({ groove: 20 });
        },
      },
    ];
  },
});
