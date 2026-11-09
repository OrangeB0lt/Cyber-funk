/**
 * The ending, the credits and New Game+ (v1: ending, creditsAndNewGamePlus, startNewGamePlus,
 * legacy/src/09_story.js:271-319). The Click's post-fight scene is the ending; the club's "March
 * again" option is the credits.
 */
import type { Scene } from '@narrative/types';
import { CLASSES } from '../classes';
import { prologue } from './prologue.scene';

/** After the Click: the second line comes down the Tower, the epilogue, THE END, the credits. */
export const ending: Scene = async s => {
  s.title('Second Line');
  await s.narrate(
    'The pendulum stops mid-swing. The Click shatters, not loud, more like a held breath finally let go, and every screen in the city goes dark, and then comes back on showing nothing at all, and the city, for the first time in a year, hears itself.',
  );
  await s.narrate(
    'You come down the Tower stairs with the whole second line behind you and out into the Central Business District at dawn. Poydras Street. Canal. The streetcar bell rings, late, and sweet.',
  );
  await s.narrate(
    'Trumpet. Trombone. Sousaphone. Snare and bass drum, the Big Four cracking off the glass buildings. Sugar on top of it all. The city falls in: every stoop, every balcony, every go-cup. Umbrellas up. Handkerchiefs out.',
  );
  await s.say(
    'gus',
    '"That\'s how we do." He tips his hat. He\'s already getting hard to see in the daylight. "Dance on the way back, baby. I\'ll be out front."',
  );
  await s.narrate(
    "And the dirge turns to joy, the way it always has, and Gus Thibodeaux, Grand Marshal, lifts the umbrella one more time and walks on ahead of the band into the sun, and is gone, and the song isn't.",
  );
  const c = s.game.choices;
  s.cards('epilogue', [
    {
      title: 'Vox Perfecta',
      // PARITY: a choice never made (a dev jump) reads as the other branch, as in v1.
      text:
        c.vox === 'reprogrammed'
          ? 'Sings three nights a week at Club Feu Follet, a little flat on purpose. The crowds are enormous. The Barkers are confused.'
          : 'The main stage on Bourbon went dark and stayed dark. Then somebody put a real band on it. The Perfect Pitch Chip hums in your pocket, remembering her set.',
    },
    {
      title: 'Storyville',
      text:
        c.contracts === 'burned'
          ? "Free. Madame Céleste marched at the front, and the Velvet Lantern's deluxe rooms are yours forever, and the piano never stops."
          : "Still runs on your paper, and the money was good. Madame Céleste watched the second line from the balcony. She didn't march. She remembers.",
    },
    {
      title: 'Lucien',
      text:
        c.lucien === 'spared'
          ? 'Runs the Chrome Wolves through the swamp with the implant gone, howling in swing. Grand-mère Clothilde says he fixed her steps.'
          : 'The pack scattered. The swamp hums its own tune. The Chrome Fang in your charm slot still hums at the full moon.',
    },
    {
      title: 'The Second Line',
      // PARITY: v1 throws here if the second line never formed (only a dev jump can get here so).
      text: `${s.game.secondLine!.length} strong on the night the Click broke. Everyone in it got a hat.`,
    },
  ]);
  s.flags.set('ending');
  s.story.set({ act: 'done', step: 'finale' });
  s.game.counters.endingCount = (s.game.counters.endingCount || 0) + 1;
  await s.xp(500);
  // The Click's post-fight checkpoint ends here: a reload from now on doesn't replay the ending
  // (and pay the XP again).
  if (s.game.resume?.kind === 'afterBoss') s.game.resume = null;
  s.save();
  await s.narrate('THE END. The city that care forgot never forgot how to play.');
  await creditsAndNewGamePlus(s);
};

/** The credits, then New Game+ or back to the city. */
export const creditsAndNewGamePlus: Scene = async s => {
  const g = s.game;
  s.title('Credits');
  s.cards('credits', [
    { title: 'CYBER FUNK', text: 'A Neon Orleans Jazz-Punk RPG' },
    { text: `Grand Marshal: ${g.name} · ${CLASSES[g.cls].name} · Level ${g.level}` },
    {
      text: `Second line: ${g.secondLine ? g.secondLine.length : 0} strong · Day ${g.day}${g.ngPlus ? ' · New Game+' + g.ngPlus : ''}`,
    },
    {
      text: 'For Gus, and every Grand Marshal who ever lifted an umbrella.\nFor the Social Aid & Pleasure Clubs, who remember how to play.\nFor Congo Square, where it started.',
      dim: true,
    },
    {
      text: 'Trumpet, trombone, sousaphone, saxophone, clarinet, snare, bass drum.\nDirge on the way there. Dance on the way back.',
      dim: true,
    },
    { text: 'Mimes, tourists, and Metronome Corporation were harmed in the making of this game.', dim: true },
  ]);
  const pick = await s.choose({
    ngplus: `New Game+ (keep level & gear; enemies +${30 * (g.ngPlus + 1)}%)`,
    stay: 'Keep playing this city',
  });
  if (pick === 'ngplus') {
    const ok = await s.confirm(
      'Start New Game+?',
      `You keep your level, gear, sheet music, blessings, bag, and half your Doubloons. The story, notes, and quests reset. Enemies are +${30 * (g.ngPlus + 1)}% stronger.`,
      'March again',
      'Not yet',
    );
    if (ok) {
      await startNewGamePlus(s);
      return;
    }
  }
  await s.goto('treme');
};

/** New Game+: the city resets, the character doesn't, and the prologue starts over. */
const startNewGamePlus: Scene = async s => {
  s.newGamePlus();
  s.title('New Game+');
  await s.narrate(
    `The city resets like a tape rewound. Enemies are ${30 * s.game.ngPlus}% stronger. You are exactly as strong as you were. Dirge on the way there.`,
  );
  await prologue(s);
};
