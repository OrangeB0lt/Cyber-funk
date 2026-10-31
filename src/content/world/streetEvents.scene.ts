/**
 * Street events: the non-fight encounters of Hit the Streets. Order matters (the weighted pick walks
 * this list), so add new events at the end. (v1: legacy/src/04_data_world.js EVENTS.)
 */
import { defineEvent, type StreetEventDef } from '@narrative/define';
import { ITEMS } from '../items';

export const STREET_EVENTS: readonly StreetEventDef[] = [
  defineEvent({
    id: 'checkpoint',
    name: 'Hush Checkpoint',
    districts: null,
    weight: 3,
    text: 'A Hush checkpoint on the [[neutral ground]]. Two patrolmen, a scanner, and a sign: ALL INSTRUMENTS SUBJECT TO INSPECTION.',
    options: [
      {
        key: 'bribe',
        label: 'Bribe them (Ð30)',
        run: async s => {
          if (!s.gold(-30)) {
            await s.narrate('You turn out your pockets. Lint. They wave you through anyway, out of pity.');
            return;
          }
          await s.narrate(
            'Thirty Doubloons disappear into a chrome glove. "Nothing to see here." Nothing ever is.',
          );
        },
      },
      {
        key: 'bluff',
        label: 'Bluff (Mojo check)',
        run: async s => {
          if (s.check('mojo', 0.45, true)) {
            await s.narrate(
              '"This? This is a ceremonial... plumbing fixture." They scan it. The scanner, being Metronome-made, agrees. You stroll through.',
            );
            await s.xp(s.scaleXp(10));
          } else {
            await s.narrate('"Ceremonial plumbing fixture." The scanner beeps red. So does the patrolman.');
            await s.fight({ enemies: ['hush_patrol', 'hush_patrol'], context: 'street' });
          }
        },
      },
      {
        key: 'fight',
        label: 'Fight',
        run: async s => {
          await s.narrate('You put the horn to your lips. The patrolmen reach for their batons. Fine.');
          await s.fight({ enemies: ['hush_patrol', 'hush_patrol'], context: 'street' });
        },
      },
    ],
  }),
  defineEvent({
    id: 'tipjar',
    name: 'Tip Jar',
    districts: null,
    weight: 3,
    text: "A busker's tip jar gets kicked over by a passing Hush. Doubloons roll across the [[banquette]]. The busker, an old man with a battered cornet, just sighs.",
    options: [
      {
        key: 'help',
        label: 'Help him pick them up',
        run: async s => {
          await s.say(
            'busker',
            'Much obliged, [[cher]]. Here, let me show you a lick. Old one. Older than Metronome.',
          );
          await s.xp(s.scaleXp(18));
          await s.narrate("He plays four bars that go somewhere you didn't expect. You'll use that.");
        },
      },
      {
        key: 'pocket',
        label: 'Pocket a few',
        run: async s => {
          s.gold(12);
          s.nextFight({ mojo: -4 });
          await s.narrate(
            "You palm a dozen Doubloons while he's not looking. He looks. He says nothing. That's worse. (Bad Juju: −4 Mojo next fight.)",
          );
        },
      },
    ],
  }),
  defineEvent({
    id: 'boil',
    name: 'Crawfish Boil',
    districts: ['treme', 'quarter', 'bayou'],
    weight: 3,
    text: "A crawfish boil in somebody's backyard. Propane burner roaring, a table covered in newspaper, a cooler of beer, and a radio somebody's rigged to skip the licensed stations.",
    options: [
      {
        key: 'join',
        label: 'Join in',
        run: async s => {
          s.heal(0.3);
          s.funk(0.15);
          await s.narrate(
            '"Grab a tray, baby, they just came out." Corn, potatoes, and three pounds of mudbugs later, you feel like a person again. (+30% Heart, +15% Funk.)',
          );
        },
      },
      {
        key: 'walk',
        label: 'Keep walking',
        run: async s => {
          await s.narrate('You keep walking. The smell follows you for two blocks. Cruel.');
        },
      },
    ],
  }),
  defineEvent({
    id: 'float',
    name: 'Rogue Float',
    districts: null,
    weight: 2,
    text: 'A rogue parade float rolls by, unlicensed and unbothered, a papier-mâché pelican with a crew on top. "[[Throw me something, mister]]!" you yell, out of reflex.',
    options: [
      {
        key: 'catch',
        label: 'Catch what they throw',
        run: async s => {
          const it = s.rng.pick([
            'beignet',
            'pralines',
            'snoball',
            'boudin',
            'cafe',
            'discobead',
            'cayenne',
            'kingcake',
          ] as const);
          s.give(it, 1);
          await s.narrate(
            `A ${ITEMS[it].name} sails out of the dark and lands in your hands. [[Lagniappe]].`,
          );
        },
      },
      {
        key: 'wave',
        label: 'Wave them on',
        run: async s => {
          await s.narrate("You wave. They wave. The pelican's head falls off. Everybody cheers.");
        },
      },
    ],
  }),
  defineEvent({
    id: 'blackout',
    name: 'Blackout',
    districts: null,
    weight: 2,
    text: 'The neon dies all at once. Total black. Somewhere a transformer pops. In the dark you hear either footsteps or a loose shutter.',
    options: [
      {
        key: 'feel',
        label: 'Feel along the wall',
        run: async s => {
          if (s.rng.next() < 0.55) {
            const n = s.scaleGold(25);
            s.gold(n);
            await s.narrate(
              `Your hand finds a loose brick, and behind it, a stash. Ð${n} and somebody's secret. You keep the Doubloons.`,
            );
          } else {
            await s.narrate('Your hand finds a chrome gauntlet. The lights come back on. Ambush.');
            await s.fight({ enemies: 'random', context: 'street', ambush: true });
          }
        },
      },
      {
        key: 'match',
        label: 'Light a match and move',
        run: async s => {
          await s.narrate(
            'The match shows two shapes crouched in a doorway. They see you see them. Everybody draws.',
          );
          await s.fight({ enemies: 'random', context: 'street' });
        },
      },
    ],
  }),
  defineEvent({
    id: 'oldtimer',
    name: 'Old-Timer on a Stoop',
    districts: null,
    weight: 3,
    text: 'An old-timer on a stoop, hat pushed back, a horn case at his feet he hasn\'t opened in years. He watches you walk past and says, "You holding that thing wrong."',
    options: [
      {
        key: 'ask',
        label: 'Ask him to show you',
        run: async s => {
          await s.say(
            'stranger',
            '"Mais, come here. No, like this. Relax your hand. The note\'s gonna come anyway, you don\'t gotta squeeze it." He hums a phrase. You play it back. He nods once.',
          );
          await s.xp(s.scaleXp(22));
          await s.narrate("That one's yours now. (XP gained.)");
        },
      },
      {
        key: 'walk',
        label: 'Keep walking',
        run: async s => {
          await s.narrate('"Suit yourself." He goes back to not opening the case.');
        },
      },
    ],
  }),
  defineEvent({
    id: 'preacher',
    name: 'Street Preacher of the Silence',
    districts: null,
    weight: 2,
    text: 'A Metronome street preacher on a crate, white robe, white helmet, bullhorn tuned to exactly 440 Hz. "SILENCE IS ORDER. ORDER IS PEACE. SWING IS SIN."',
    options: [
      {
        key: 'argue',
        label: 'Argue',
        run: async s => {
          const r = s.game.roots;
          if (r === 'creole')
            await s.narrate(
              '"My grandmother sang in Congo Square before your company had a logo. Peace? Baby, you don\'t know peace. Peace is the second verse." The crowd laughs. The preacher doesn\'t have a response coded for that.',
            );
          else if (r === 'cajun')
            await s.narrate(
              '"Mais, cher, on the bayou we got a word for a man who thinks quiet is the same as safe. Couillon." The crowd howls. The preacher\'s bullhorn feeds back.',
            );
          else
            await s.narrate(
              "\"Where y'at, padre. Y'all got a permit for that crate? Ninth Ward ordinance says no bullhorns after six.\" He checks. There is no such ordinance. The crowd doesn't care. They're laughing.",
            );
          await s.xp(s.scaleXp(15));
        },
      },
      {
        key: 'drown',
        label: 'Drown him out',
        run: async s => {
          await s.narrate(
            'You play over the bullhorn. The crowd claps on two and four. The preacher calls it in.',
          );
          await s.fight({ enemies: ['hush_patrol', 'click_drone'], context: 'street' });
        },
      },
    ],
  }),
  defineEvent({
    id: 'secondline',
    name: 'A Second Line Passes',
    districts: ['treme', 'quarter', 'storyville'],
    weight: 2,
    text: 'A [[second line]] comes around the corner, unlicensed and unstoppable. Umbrellas up, handkerchiefs out, a tuba you can feel in your shoes.',
    options: [
      {
        key: 'join',
        label: 'Join it',
        run: async s => {
          s.nextFight({ groove: 40 });
          s.heal(0.1);
          await s.narrate(
            'You fall in for three blocks. Somebody hands you a handkerchief. You give it back sweaty. Next fight starts with +40 Groove.',
          );
        },
      },
      {
        key: 'watch',
        label: 'Watch it go',
        run: async s => {
          await s.narrate("You watch it turn the corner and take the whole street's heartbeat with it.");
        },
      },
    ],
  }),
  defineEvent({
    id: 'wisp',
    name: 'Feu Follet',
    districts: ['bayou'],
    weight: 3,
    text: 'A [[feu follet]] bobs over the black water, bluish, patient, waiting for you to follow.',
    options: [
      {
        key: 'follow',
        label: 'Follow it',
        run: async s => {
          if (s.rng.next() < 0.5) {
            const it = s.rng.pick(['gumbo', 'muffuletta', 'kingcake', 'pralines'] as const);
            s.give(it, 1);
            const n = s.scaleGold(30);
            s.gold(n);
            await s.narrate(
              `It leads you to a sunken pirogue with a dry box inside. A ${ITEMS[it].name} and Ð${n}. The light winks out, satisfied.`,
            );
          } else {
            await s.narrate('It leads you into a clearing full of eyes. Chrome eyes.');
            await s.fight({ enemies: 'random', context: 'street', ambush: true });
          }
        },
      },
      {
        key: 'stay',
        label: "Don't follow lights",
        run: async s => {
          await s.narrate(
            "Grand-mère always said: don't follow lights. You don't. It sulks off across the water.",
          );
        },
      },
    ],
  }),
  defineEvent({
    id: 'riddle',
    name: "A Haint's Riddle",
    districts: ['cemetery'],
    weight: 3,
    text: 'A [[haint]] sits on a tomb, swinging its legs. "Answer me this and I\'ll give you what I\'m sitting on. What has a bell but never rings, a mouth but never eats, and sings only when somebody else breathes?"',
    options: [
      {
        key: 'horn',
        label: '"A horn."',
        run: async s => {
          const it = s.rng.pick(['kingcake', 'gumbo', 'muffuletta'] as const);
          s.give(it, 1);
          await s.say(
            'haint',
            '"A horn. Took you long enough." It drifts up off the tomb. Underneath, wrapped in oilcloth: a ' +
              ITEMS[it].name +
              '.',
          );
        },
      },
      {
        key: 'church',
        label: '"A church."',
        run: async s => {
          await s.say(
            'haint',
            '"A church? Baby, a church eats plenty." It cackles and fades. The tomb is just a tomb.',
          );
        },
      },
      {
        key: 'levee',
        label: '"A levee."',
        run: async s => {
          await s.say('haint', '"A levee. Hm. Wrong, but that\'s a good one." It tosses you a coin. Ð10.');
          s.gold(10);
        },
      },
    ],
  }),
  defineEvent({
    id: 'drone',
    name: 'Broken Drone',
    districts: null,
    weight: 2,
    text: 'A broken Click-Drone sits in a gutter, one rotor gone, looping a sad four-note phrase over and over. It sounds almost like it means it.',
    options: [
      {
        key: 'reprogram',
        label: 'Reprogram it (needs Static)',
        when: g => g.band.recruited.includes('static'),
        run: async s => {
          await s.say(
            'static',
            '"Oh, that\'s just a bad loop. Hold on." Static pops the panel, scratches two wires together, and the drone plays the phrase again, but swinging. It flies off happy.',
          );
          await s.xp(s.scaleXp(20));
          const n = s.scaleGold(20);
          s.gold(n);
          await s.narrate(`It drops its onboard Doubloons on the way out. Ð${n}.`);
        },
      },
      {
        key: 'smash',
        label: 'Smash it',
        run: async s => {
          await s.narrate('You bring your heel down. It shrieks. Its friends hear.');
          await s.fight({ enemies: ['click_drone', 'click_drone'], context: 'street' });
        },
      },
      {
        key: 'leave',
        label: 'Leave it be',
        run: async s => {
          await s.narrate("You leave it looping. Everybody's got a sad song.");
        },
      },
    ],
  }),
  defineEvent({
    id: 'joke',
    name: 'Streetcar Stop',
    districts: null,
    weight: 3,
    text: 'A stranger at the streetcar stop leans over. "You heard the one about Boudreaux and Thibodeaux and the Hush?"',
    options: [
      {
        key: 'go',
        label: 'Go ahead',
        run: async s => {
          const jokes = [
            "\"So the Hush pull Boudreaux over and say, 'Sir, we detected unlicensed syncopation in this vehicle.' Boudreaux says, 'Mais, that's just Thibodeaux snoring.' Hush says, 'Then he needs a permit.' Thibodeaux wakes up and says, 'For what?' Hush says, 'For the rhythm.' Thibodeaux says, 'Cher, if I had rhythm I wouldn't be sleeping in Boudreaux's truck.'\"",
            "\"Thibodeaux gets a job at Metronome. First day, the boss says, 'Thibodeaux, we need you to make sure everything's in perfect time.' Thibodeaux says, 'No problem.' Lunchtime, the whole Tower's stopped. Boss says, 'What did you do?' Thibodeaux says, 'You said perfect time. It's noon. Everything stops for lunch.'\"",
            "\"Boudreaux buys a MoodSync speaker. Plays it all day, perfect time, no swing. Thibodeaux comes over, listens for an hour, says, 'Boudreaux, this thing broke.' Boudreaux says, 'No it ain't, it's licensed.' Thibodeaux says, 'Then why ain't my foot moving?'\"",
            "\"Thibodeaux tells Boudreaux, 'I'm gonna sneak a horn past the checkpoint.' Boudreaux says, 'How?' Thibodeaux says, 'I'm gonna put it in a gumbo pot.' Checkpoint says, 'What's in the pot?' Thibodeaux says, 'Gumbo.' They look. There's a sousaphone. Thibodeaux says, '...It's a big gumbo.'\"",
          ];
          await s.say('stranger', s.rng.pick(jokes));
          s.nextFight({ mojo: 5 });
          await s.narrate(
            'You laugh harder than it deserves. Gus always swore he was the Thibodeaux in these. (+5 Mojo next fight.)',
          );
        },
      },
      {
        key: 'heard',
        label: '"I\'ve heard it."',
        run: async s => {
          await s.say(
            'stranger',
            '"You ain\'t heard this one." You have. He tells it anyway. It\'s still good.',
          );
          s.nextFight({ mojo: 2 });
        },
      },
    ],
  }),
  defineEvent({
    id: 'tourist',
    name: 'Lost Tourist',
    districts: ['quarter', 'garden'],
    weight: 2,
    text: 'A tourist in a MoodSync visor, lost, holding a map upside down. "Excuse me, is this the way to the, uh, Licensed Cultural Experience Zone?"',
    options: [
      {
        key: 'point',
        label: 'Point them the right way',
        run: async s => {
          const n = s.scaleGold(15);
          s.gold(n);
          await s.narrate(
            `You point. They tip. Ð${n}. "Thank you! Is it true they used to have, like, unlicensed music here?" You say nothing. You smile.`,
          );
        },
      },
      {
        key: 'frenchmen',
        label: 'Send them to Frenchmen Street',
        run: async s => {
          await s.xp(s.scaleXp(12));
          await s.narrate(
            "You send them to Frenchmen Street instead. In an hour they'll hear a real trumpet and take the visor off. That's how it starts.",
          );
        },
      },
    ],
  }),
  defineEvent({
    id: 'mime',
    name: 'Mime Standoff',
    districts: ['quarter'],
    weight: 2,
    text: 'A [[Neon Mime|Neon Mime]] blocks the whole banquette with an invisible wall. It is very committed. People are going around it into traffic.',
    options: [
      {
        key: 'walk',
        label: 'Walk through the wall',
        run: async s => {
          await s.narrate('You walk through it. It looks betrayed. Then it looks violent.');
          await s.fight({ enemies: ['neon_mime'], context: 'street' });
        },
      },
      {
        key: 'tip',
        label: 'Tip it (Ð5)',
        run: async s => {
          if (s.gold(-5)) {
            await s.xp(s.scaleXp(8));
            await s.narrate(
              'You drop five Doubloons in its hat. It opens an invisible door for you and bows. Honestly, pretty good.',
            );
          } else {
            await s.narrate('You have no Doubloons. It mimes a tiny violin. You go around.');
          }
        },
      },
      {
        key: 'wait',
        label: 'Wait it out',
        run: async s => {
          await s.narrate(
            'You wait. It waits. Eventually a Hush patrol gives it a commendation and it leaves.',
          );
        },
      },
    ],
  }),
  defineEvent({
    id: 'crate',
    name: 'A Crate Marked LAVIGNE',
    districts: ['storyville'],
    weight: 3,
    text: 'Behind a parlor, a crate stenciled LAVIGNE - PLAYER ROLLS - DO NOT STACK. Somebody stacked it.',
    options: [
      {
        key: 'open',
        label: 'Open it',
        run: async s => {
          if (s.quest('rolls') === 'active' && s.count('pianoroll') < 3) {
            s.give('pianoroll', 1);
            await s.narrate(
              `Inside, a single player-piano roll, waxed paper and brass. One of the Professor's. (${s.count('pianoroll')}/3)`,
            );
          } else {
            const n = s.scaleGold(18);
            s.gold(n);
            await s.narrate(`Packing straw and Ð${n} in loose change somebody forgot. You take the change.`);
          }
        },
      },
      {
        key: 'leave',
        label: 'Leave it',
        run: async s => {
          await s.narrate('Not your crate. You leave it, stacked.');
        },
      },
    ],
  }),
  defineEvent({
    id: 'herbpatch',
    name: 'Herb Patch',
    districts: ['bayou'],
    weight: 3,
    text: "A patch of something green and sharp-smelling at the base of a cypress. Elderberry, mamou root, and a leaf you don't know.",
    options: [
      {
        key: 'gather',
        label: 'Gather some',
        run: async s => {
          if (s.quest('herbs') === 'active' && s.count('swampherb') < 3) {
            s.give('swampherb', 1);
            await s.narrate(
              `You gather a careful handful. Grand-mère will know what to do with it. (${s.count('swampherb')}/3)`,
            );
          } else {
            s.heal(0.15);
            await s.narrate('You chew a leaf. Bitter, then warm. (+15% Heart.)');
          }
        },
      },
      {
        key: 'leave',
        label: 'Leave it growing',
        run: async s => {
          await s.narrate('You leave it. The swamp needs it more.');
        },
      },
    ],
  }),
  defineEvent({
    id: 'speaker',
    name: 'MoodSync Speaker',
    districts: null,
    weight: 2,
    text: 'A MoodSync speaker on a pole, playing a licensed lullaby at exactly 60 BPM. Three people at the bus stop are asleep standing up.',
    options: [
      {
        key: 'rip',
        label: 'Rip the wires',
        run: async s => {
          await s.narrate('You rip the wires. The sleepers wake up. So does the drone nest inside the pole.');
          await s.fight({ enemies: ['click_drone', 'click_drone'], context: 'street' });
        },
      },
      {
        key: 'tag',
        label: 'Tag it',
        run: async s => {
          await s.xp(s.scaleXp(10));
          await s.narrate(
            "You spray WHERE Y'AT across the grille in purple. Somebody at the bus stop wakes up laughing.",
          );
        },
      },
    ],
  }),
  defineEvent({
    id: 'porchjam',
    name: 'Porch Jam',
    districts: ['treme'],
    weight: 3,
    text: "Three musicians on a porch, playing low so the drones don't hear. A trombone, a guitar, and a man playing a washboard with two spoons. They nod at your case.",
    options: [
      {
        key: 'sit',
        label: 'Sit in',
        run: async s => {
          await s.xp(s.scaleXp(16));
          s.heal(0.15);
          await s.narrate(
            'You sit in for two tunes. Nobody says anything. Nobody has to. (XP and +15% Heart.)',
          );
        },
      },
      {
        key: 'listen',
        label: 'Just listen',
        run: async s => {
          s.nextFight({ groove: 20 });
          await s.narrate(
            "You listen from the steps. By the second tune your foot's going. (+20 Groove next fight.)",
          );
        },
      },
    ],
  }),
  defineEvent({
    id: 'gatorcross',
    name: 'Gator Crossing',
    districts: ['bayou'],
    weight: 2,
    text: 'A Chrome Gator lies across the only dry path, tracking tag blinking. It is either asleep or pretending.',
    options: [
      {
        key: 'around',
        label: 'Go around (Tempo check)',
        run: async s => {
          if (s.check('tempo', 0.5)) {
            await s.narrate('You pick your way through the cypress knees, fast and quiet. It never wakes.');
            await s.xp(s.scaleXp(10));
          } else {
            await s.narrate('A knee cracks. An eye opens. Chrome teeth.');
            await s.fight({ enemies: ['chrome_gator'], context: 'street' });
          }
        },
      },
      {
        key: 'fight',
        label: 'Fight it',
        run: async s => {
          await s.narrate('You kick the tag. It wakes up.');
          await s.fight({ enemies: ['chrome_gator'], context: 'street' });
        },
      },
      {
        key: 'wait',
        label: 'Wait',
        run: async s => {
          await s.narrate('You wait twenty minutes. It slides into the water, bored. You pass.');
        },
      },
    ],
  }),
  defineEvent({
    id: 'tomboffering',
    name: 'Tomb Offering',
    districts: ['cemetery'],
    weight: 3,
    text: 'A tomb with coins on the step, a bottle of rum, and a photo of a man with a cornet. The offerings are fresh.',
    options: [
      {
        key: 'coin',
        label: 'Leave a coin (Ð20)',
        run: async s => {
          if (s.gold(-20)) {
            s.nextFight({ hyped: true });
            await s.narrate(
              "You leave a coin and a few bars, soft. The votive flickers twice. Somebody's pleased. (Hyped at the start of your next fight.)",
            );
          } else {
            await s.narrate('You have nothing to leave but a few bars. You leave those.');
            s.nextFight({ groove: 15 });
          }
        },
      },
      {
        key: 'take',
        label: 'Take the coins',
        run: async s => {
          s.gold(25);
          s.nextFight({ mojo: -5 });
          await s.narrate('You take the coins. The votive goes out. (Bad Juju: −5 Mojo next fight.)');
        },
      },
    ],
  }),
  defineEvent({
    id: 'dancertip',
    name: 'Balcony Tip',
    districts: ['storyville'],
    weight: 2,
    text: 'A dancer on a balcony waves you over. "You the one Céleste\'s been talking about? Come here, [[dawlin\']]."',
    options: [
      {
        key: 'listen',
        label: 'Listen',
        run: async s => {
          await s.say(
            'stranger',
            '"Ledger\'s collectors come through Tuesdays. Enforcers carry the pages on them, in the lining. And Ledger himself? Hates syncopation. Can\'t count past four." (Hint recorded.)',
          );
          s.bookHint('mr_ledger');
          await s.xp(s.scaleXp(8));
        },
      },
      {
        key: 'wave',
        label: 'Wave and move on',
        run: async s => {
          await s.narrate('You wave. She laughs and goes back inside.');
        },
      },
    ],
  }),
  defineEvent({
    id: 'leftovers',
    name: 'Gala Leftovers',
    districts: ['garden'],
    weight: 3,
    text: 'A catering van behind a mansion, back doors open, a Butler Unit powered down beside it. Trays of untouched food.',
    options: [
      {
        key: 'muffuletta',
        label: 'Take a muffuletta',
        run: async s => {
          s.give('muffuletta', 1);
          await s.narrate(
            "A whole muffuletta, olive salad and all. Rich people don't eat at their own parties.",
          );
        },
      },
      {
        key: 'tips',
        label: 'Take the tip jar',
        run: async s => {
          const n = s.scaleGold(30);
          s.gold(n);
          await s.narrate(
            `The caterers' tip jar. Ð${n}. You feel briefly bad, then remember who they cater for.`,
          );
        },
      },
    ],
  }),
  defineEvent({
    id: 'terminal',
    name: 'Tower Terminal',
    districts: ['tower'],
    weight: 3,
    text: 'A Metronome maintenance terminal on the plaza, screen glowing: PAYROLL - AUTHORIZED PERSONNEL ONLY.',
    options: [
      {
        key: 'hack',
        label: 'Hack it (needs Static)',
        when: g => g.band.recruited.includes('static'),
        run: async s => {
          const n = s.scaleGold(60);
          s.gold(n);
          await s.say(
            'static',
            '"Payroll? Oh, we\'re doing this." Four seconds. A drawer opens. "Hazard pay." Ð' + n + '.',
          );
        },
      },
      {
        key: 'smash',
        label: 'Smash it',
        run: async s => {
          await s.narrate('Glass everywhere. An alarm. A Quantizer.');
          await s.fight({ enemies: ['quantizer', 'hush_elite'], context: 'street' });
        },
      },
      {
        key: 'leave',
        label: 'Leave it',
        run: async s => {
          await s.narrate('You leave it. The screen flickers to a metronome, swinging.');
        },
      },
    ],
  }),
];
