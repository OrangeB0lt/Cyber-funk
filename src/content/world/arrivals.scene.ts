/**
 * What you see the first time you arrive in a district, after its intro text.
 * (v1: legacy/src/09_story.js DISTRICT_ARRIVAL.)
 */
import type { DistrictId } from '@core/ids/world';
import type { Scene } from '@narrative/types';

export const ARRIVALS: Partial<Record<DistrictId, Scene>> = {
  quarter: async s => {
    await s.narrate(
      'Off the streetcar on Canal, into the Quarter. Frenchmen Street is a few blocks down. Club Feu Follet has a green light over the door, and the door is open.',
    );
  },
  storyville: async s => {
    await s.narrate(
      "Basin Street, magenta neon, velvet in every window. The Velvet Lantern is the only parlor with a line out the door, because it's the only one with a live piano.",
    );
  },
  bayou: async s => {
    await s.narrate(
      'The airboat drops you on a dock at the edge of the world. A lantern in a cabin window. Grand-mère Clothilde is already on the porch, like she knew.',
    );
  },
  cemetery: async s => {
    await s.narrate(
      "St. Louis No. 1. The tombs are whitewashed and the votives are LED now, flickering on the beat. Mambo Rosalie's bell rings from a temple at the far wall.",
    );
  },
  garden: async s => {
    await s.narrate(
      'The St. Charles streetcar lets you off under the oaks without a sound. Every mansion is under a dome. Vane Manor is the one with the gold gates and the music coming through them, exact and cold.',
    );
  },
  tower: async s => {
    await s.narrate(
      "The Central Business District. Glass, chrome, and the Tower in the middle ticking. The second line waits on Poydras. When you're ready, march.",
    );
  },
};
