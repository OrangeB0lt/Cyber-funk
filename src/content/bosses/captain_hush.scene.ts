/** Captain Hush: before and after the fight in Congo Square. (v1: BOSS_PRE / BOSS_POST.) */
import type { Scene } from '@narrative/types';

export const pre: Scene = async s => {
  await s.narrate(
    'Congo Square. The fence is down where somebody cut it. Inside, the drum circle stones, a Hush command post where the bandstand used to be, and Captain Hush in the middle, white chrome gleaming, dampener on his belt.',
  );
  await s.say('hush', '"By order of Metronome, this square is now a Quiet Zone."');
  await s.narrate(
    'You step onto the stones. Somewhere behind you, in the dark, somebody starts a drum. Then another. The square remembers.',
  );
  await s.narrate(
    s.game.roots === 'creole'
      ? 'Your grandmother danced here. Her grandmother too. You lift the horn.'
      : 'Gus brought you here your first week. "This is where it starts," he said. "Every song. Every one." You lift the horn.',
  );
};

export const post: Scene = async s => {
  await s.narrate(
    "Captain Hush goes down on one knee. The dampener on his belt cracks and the sound comes back into the square all at once: drums, voices, a trombone from a window on Rampart Street. Metronome's man drops something small and blue-white in the dust.",
  );
  await s.giveNote('C');
  await s.say(
    'mamaroux',
    '"Baby. You did it." She\'s at the fence with half of Tremé behind her. "The Quarter\'s next. Miss Odette runs Club Feu Follet on Frenchmen. Tell her Gus sent you. She\'ll know what that means."',
  );
};
