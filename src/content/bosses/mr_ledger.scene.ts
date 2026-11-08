/** Mr. Ledger: down the coal chute into his vault, and the second big choice. (v1: 09_story.js BOSS_PRE/BOSS_POST.) */
import type { Scene } from '@narrative/types';

export const pre: Scene = async s => {
  await s.narrate(
    'Down the coal chute, two flights, through a door with no handle. The vault: steel shelves of contracts floor to ceiling, every one a life, and at a brass desk in the middle, Mr. Ledger, reading.',
  );
  await s.say(
    'ledger',
    '"Every song in this district has a lienholder, and the lienholder is me. Let\'s discuss your balance."',
  );
  await s.narrate("He closes the book. His Chops compound every turn he's alive. Don't give him turns.");
};

export const post: Scene = async s => {
  await s.narrate(
    'Mr. Ledger slumps over his desk. The vault is quiet except for the hum of a thousand contracts, and under it, a note.',
  );
  await s.giveNote('F');
  await s.narrate(
    "On the desk: the contracts. All of them. Every musician, every dancer, every flower seller on Basin Street. And a ledger of what they're worth, which is a great deal of money.",
  );
  const pick = await s.choose({
    burn: 'Burn the contracts. Free Storyville.',
    keep: 'Keep the money (+Ð1,000).',
  });
  if (pick === 'burn') {
    s.choice('contracts', 'burned');
    await s.narrate(
      "You strike a match. It takes a while. The smoke goes up the coal chute and all over Basin Street, and people come out on their balconies to breathe it. Storyville is free. Madame Céleste's deluxe rooms are yours forever, and she will march with the second line.",
    );
  } else {
    s.choice('contracts', 'kept');
    s.game.doubloons += 1000;
    await s.narrate(
      "You take the ledger and the account codes. Ð1,000, and the paper on every life in Storyville, now yours. You tell yourself you'll do right by them. Madame Céleste says nothing when you come up the chute. She won't march.",
    );
  }
  await s.say(
    'celeste',
    pick === 'burn'
      ? '"You could have been rich. You chose to be good. In this house that\'s rarer than the other thing." She hands you an airboat key. "Manchac. Grand-mère Clothilde. She knows what the pylons are doing out there."'
      : '"The airboat key. Manchac Swamp. Grand-mère Clothilde knows what the pylons are doing out there." She doesn\'t look at you. "Go."',
  );
};
