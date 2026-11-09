/**
 * The Central Business District's one place: the Metronome Tower lobby (v1: PLACE_FLOWS.towerlobby,
 * legacy/src/08_world.js:371). March on the Tower, or continue the climb; after the ending, look up.
 */
import { definePlace } from '@narrative/define';
import { PLACES } from '../../places';
import { TOWER_FLOORS } from '../../world/tower';
import { towerFlow } from './climb.scene';

export const towerlobby = definePlace('towerlobby', {
  intro: g =>
    g.flags.ending
      ? { text: 'The pendulum in the crown has stopped. Somebody has hung a second-line umbrella from it.' }
      : null,
  options: (g, h) =>
    g.flags.ending
      ? [
          {
            key: 'look',
            label: 'Look up',
            run: async s => {
              s.title(PLACES.towerlobby.name);
              await s.narrate(
                'From the plaza you can see the umbrella turning in the wind, purple, green, and gold. The city keeps its own time now.',
              );
            },
          },
        ]
      : g.story.act === 'tower' && h.reached({ act: 'tower', step: 'climb_tower' })
        ? [
            {
              key: 'march',
              label:
                g.towerFloor > 0
                  ? `Continue the climb (${TOWER_FLOORS[Math.min(g.towerFloor, TOWER_FLOORS.length - 1)]!.name})`
                  : 'March on the Tower',
              hint: true,
              run: towerFlow,
            },
          ]
        : [],
});
