/**
 * The streets: what happens when you Hit the Streets, the Praline Lady, bounty hunts, travel, and
 * waking up at the club after getting cut. (v1: legacy/src/08_world.js hitTheStreets and friends.)
 */
import type { DistrictId } from '@core/ids/world';
import type { Scene, SceneContext } from '@narrative/types';
import { DISTRICTS } from '../districts';
import { ENEMIES } from '../enemies';
import { ITEMS } from '../items';
import { STREET_EVENTS } from './streetEvents.scene';

import { fmtDoubloons } from '../format';

/** Doubloons as the game prints them: Ð1,250. */
export const fmtD = fmtDoubloons;

/** Run a random street event for the current district (or a specific one). */
export async function runEvent(s: SceneContext, forceId?: string): Promise<void> {
  const district = s.game.district;
  const pool = STREET_EVENTS.filter(
    e => (!e.districts || e.districts.includes(district)) && (!forceId || e.id === forceId),
  );
  const weighted = pool.flatMap(e => new Array<typeof e>(e.weight || 1).fill(e));
  const ev = s.rng.pick(weighted);
  s.title(ev.name);
  await s.narrate(ev.text);
  const opts = ev.options.filter(o => !o.when || o.when(s.game));
  const key = await s.choose(Object.fromEntries(opts.map(o => [o.key, o.label])));
  await opts.find(o => o.key === key)!.run(s);
}

/** Hit the Streets: 60% a fight, 20% an event, 15% something found, 5% the elite or the Praline Lady. */
export const hitTheStreets: Scene = async s => {
  const d = DISTRICTS[s.game.district];
  const r = s.rng.next();
  s.title(null);
  if (r < 0.6) {
    await s.narrate(
      s.rng.pick([
        'You turn a corner and the neon goes sour.',
        "Footsteps behind you, in perfect time. That's never good.",
        'A shadow peels off a wall. Then another.',
        'The MoodSync speaker on the corner cuts out. Something heard you coming.',
      ]),
    );
    await s.fight({ enemies: 'random', context: 'street' });
    return;
  }
  if (r < 0.8) {
    await runEvent(s);
    return;
  }
  if (r < 0.95) {
    if (s.rng.chance(0.6)) {
      const n = s.scaleGold(s.rng.int(12, 30));
      s.game.doubloons += n;
      await s.narrate(
        s.rng.pick([
          `A go-cup full of Doubloons, abandoned on a stoop. ${fmtD(n)}. Lagniappe.`,
          `A busted Click-Drone in the gutter, still clutching its parking-fine money. ${fmtD(n)}.`,
          `Somebody dropped a wad of Doubloons running from the Hush. ${fmtD(n)}. You'd give it back if you knew who.`,
        ]),
      );
    } else {
      const it = s.rng.pick([
        'beignet',
        'cafe',
        'poboy',
        'pralines',
        'snoball',
        'yakamein',
        'boudin',
        'discobead',
        'cayenne',
        'indigo',
        'subtape',
      ] as const);
      s.give(it, 1, { silent: true });
      await s.narrate(
        s.rng.pick([
          `On a windowsill, wrapped in wax paper: a ${ITEMS[it].name}. Somebody's lagniappe, now yours.`,
          `A float crew tosses you a ${ITEMS[it].name} as they roll past. "Throw me something, mister!"`,
        ]),
      );
    }
    return;
  }
  if (s.rng.chance(0.5)) {
    await s.narrate(`The street goes quiet. Too quiet. The ${ENEMIES[d.elite].name} steps out of the fog.`);
    await s.fight({ enemies: [d.elite], context: 'street', noFlee: true });
    return;
  }
  await pralineLady(s);
};

/** The Praline Lady: a rare cart with lucky things. */
export const pralineLady: Scene = async s => {
  s.title('The Praline Lady');
  await s.say(
    'pralinelady',
    s.rng.pick([
      '"Pralines, baby. And a few things I don\'t keep on the cart." She lifts the cloth.',
      '"You look like you need something sweet and something lucky. I got both."',
    ]),
  );
  await s.sheet({
    kind: 'shop',
    title: 'The Praline Lady',
    keeper: 'pralinelady',
    noSell: true,
    stock: [
      { id: 'kingcake', price: 80 },
      { id: 'pralines', price: 25 },
      { id: 'grisgris', price: 180 },
      { id: 'muffuletta', price: 90 },
      { id: 'ch_beads', price: 110 },
      { id: 'ch_haintblue', price: 480 },
    ],
  });
};

/** Hunt the district's bounty elite. */
export const trackBounty: Scene = async s => {
  const d = DISTRICTS[s.game.district];
  s.title('Bounty');
  await s.narrate(
    `You follow the bounty board's directions to a ${s.rng.pick(['dead-end alley', 'loading dock', 'shuttered bar', 'flooded underpass'])}. The ${ENEMIES[d.elite].name} is waiting, like it knew.`,
  );
  const res = await s.fight({ enemies: [d.elite], context: 'bounty', noFlee: true });
  if (res === 'win') {
    await s.narrate(`Bounty collected. The Pelican pays ${fmtD(d.bountyGold)} and buys the first round.`);
  }
};

/** Ride to another district (streetcar, or the airboat to and from the Bayou). */
export function travel(to: DistrictId): Scene {
  return async s => {
    s.title(null);
    if (to === 'bayou' || s.game.district === 'bayou') {
      await s.narrate(
        "The airboat's turbine spools up and the city falls away behind you in a smear of neon and fog.",
      );
    } else {
      await s.narrate(
        s.rng.pick([
          'The streetcar hums along in perfect quarter notes. You tap a different rhythm on the window.',
          'Chrome streetcar, cracked leather seats, a MoodSync jingle you refuse to learn.',
          'The conductor nods at your case. Says nothing. Taps his foot, once, off the beat.',
        ]),
      );
    }
    if (to === 'bayou' && s.story.is({ act: 'bayou', step: 'take_airboat' })) {
      s.story.set({ act: 'bayou', step: 'visit_clothilde' });
    }
    await s.goto(to);
  };
}

/** After getting cut on the streets: Mama Roux patches you up at the club. */
export const wakeUpAtClub: Scene = async s => {
  s.title('Lagniappe Social Aid & Pleasure Club');
  await s.say(
    'mamaroux',
    s.rng.pick([
      "Lord. Look at you. Drink this, it's mostly coffee.",
      "You got cut, baby. Happens to everybody once. Don't let it happen twice.",
      'Gus got cut forty times before he was Grand Marshal. Eat something.',
    ]),
  );
};
