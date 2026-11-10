/**
 * Combat mechanics, one behavior per test. These double as executable documentation of the rules in
 * docs/systems/combat.md. Exact damage numbers are pinned by the baselines (the sim, the rules and the
 * transcripts in tests/fixtures); these assert the mechanics themselves.
 */
import { describe, expect, it } from 'vitest';
import { hasStatus } from '@core/helpers';
import type { ClassId } from '@core/ids/characters';
import type { OpponentId } from '@core/ids/enemies';
import { createRng, restoreRng, type Rng } from '@core/rng';
import type { Battle, BattleEvent, BattleOptions, GameState } from '@core/types';
import { TIMING } from '@content/data';
import {
  addItem,
  battleRewards,
  createBattle,
  fullRest,
  makeEnemy,
  newGame,
  oneZoneFactor,
  playerAction,
  playerTimingSpec,
  rollAutoTiming,
  runUntilPlayer,
} from '../index';
import { applyStatusRaw } from './statuses';
import { endTurn, runAssists } from './turns';

function setup(
  cls: ClassId,
  enemies: { id: OpponentId; level: number }[],
  opts: BattleOptions = {},
  tweak?: (s: GameState) => void,
): Battle {
  const rng = createRng(7);
  const s = newGame('Test', 'yat', cls);
  s.level = 10;
  tweak?.(s);
  fullRest(s);
  const b = createBattle(
    rng,
    s,
    enemies.map(e => makeEnemy(rng, s, e.id, e.level)),
    opts,
  );
  runUntilPlayer(b);
  b.events.length = 0;
  return b;
}

const ofType = <T extends BattleEvent['type']>(b: Battle, type: T) =>
  b.events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);

describe('riffs and skills', () => {
  it('a riff damages the target, reports the new Heart, and builds Groove', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }]);
    const enemy = b.enemies[0]!;
    const before = enemy.hp;
    playerAction(b, { type: 'riff', targetId: enemy.id }, TIMING.one);
    const hit = ofType(b, 'dmg').find(e => e.target === enemy.id);
    if (hit) {
      expect(hit.hpAfter).toBe(Math.max(0, before - hit.amount));
      expect(hit.weak).toBe(true); // Mutant Nutria is weak to HOT
      expect(b.player.groove).toBeGreaterThanOrEqual(20 + 10 + 10); // riff + ON THE ONE + weakness
    } else {
      expect(ofType(b, 'dodge')).toHaveLength(1);
    }
  });

  it('PLAY spends Funk; a once-per-battle skill cannot be repeated', () => {
    const b = setup('saxophone', [{ id: 'nutria', level: 10 }]);
    const p = b.player;
    const fp = p.fp;
    playerAction(b, { type: 'play', skillId: 'sx_s3' }, null); // Circular Breath: once, restores Funk
    expect(p.onceUsed.sx_s3).toBe(true);
    expect(p.fp).toBeGreaterThanOrEqual(fp);
    runUntilPlayer(b);
    b.events.length = 0;
    playerAction(b, { type: 'play', skillId: 'sx_s3' }, null);
    expect(ofType(b, 'log').map(e => e.text)).toContain('Circular Breath is once per battle.');
  });

  it('Muted blocks PLAY and still uses the turn', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }]);
    applyStatusRaw(b, b.player, 'muted', 2);
    playerAction(b, { type: 'play', skillId: 'tr_s1' }, null);
    expect(ofType(b, 'log').map(e => e.text)).toContain("You're Muted. You can't PLAY.");
    expect(b.waiting).toBe(false);
  });

  it('VAMP braces for half damage, regains Funk and builds Groove', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }]);
    b.player.fp = 0;
    playerAction(b, { type: 'vamp' }, null);
    expect(b.player.guard).toEqual({ pct: 0.5, reflect: 0 });
    expect(b.player.fp).toBe(Math.round(b.player.maxFp * 0.15));
    expect(b.player.groove).toBe(10);
  });

  it('SOLO needs 100 Groove and resets it', () => {
    // A Hush Patrolman isn't weak to HOT, so no weakness bonus refills Groove after the solo.
    const b = setup('trumpet', [{ id: 'hush_patrol', level: 10 }]);
    playerAction(b, { type: 'solo' }, null);
    expect(ofType(b, 'log').map(e => e.text)).toContain("Can't SOLO right now.");
    runUntilPlayer(b);
    b.player.groove = 100;
    playerAction(b, { type: 'solo' }, TIMING.loose);
    expect(b.player.groove).toBe(0);
  });
});

describe('statuses', () => {
  it('a fresh status skips one countdown, then counts down and expires with an event', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }]);
    const p = b.player;
    applyStatusRaw(b, p, 'hyped', 2);
    endTurn(b, p); // fresh: no countdown
    expect(p.statuses.find(s => s.id === 'hyped')?.turns).toBe(2);
    endTurn(b, p);
    expect(p.statuses.find(s => s.id === 'hyped')?.turns).toBe(1);
    endTurn(b, p);
    expect(hasStatus(p, 'hyped')).toBe(false);
    expect(ofType(b, 'status').some(e => e.id === 'hyped' && !e.add)).toBe(true);
  });

  it('until-triggered statuses (Countermelody) never count down', () => {
    const b = setup('clarinet', [{ id: 'nutria', level: 10 }]);
    applyStatusRaw(b, b.player, 'countermelody');
    for (let i = 0; i < 5; i++) endTurn(b, b.player);
    expect(hasStatus(b.player, 'countermelody')).toBe(true);
  });

  it('re-applying refreshes to the longer duration without a second event', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }]);
    applyStatusRaw(b, b.player, 'hyped', 1);
    applyStatusRaw(b, b.player, 'hyped', 3);
    expect(b.player.statuses.filter(s => s.id === 'hyped')).toHaveLength(1);
    expect(b.player.statuses[0]!.turns).toBe(3);
    expect(ofType(b, 'status').filter(e => e.add)).toHaveLength(1);
  });
});

describe('items in battle', () => {
  it('Ya-Ka-Mein cleanses negative statuses and keeps buffs', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }], {}, s => addItem(s, 'yakamein'));
    applyStatusRaw(b, b.player, 'shredded', 3);
    applyStatusRaw(b, b.player, 'hyped', 3);
    playerAction(b, { type: 'bag', itemId: 'yakamein' }, null);
    expect(hasStatus(b.player, 'shredded')).toBe(false);
    expect(hasStatus(b.player, 'hyped')).toBe(true);
    expect(b.state.bag.yakamein).toBeUndefined();
  });

  it('a tone bead makes the next hit that tone at +20%', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }], {}, s => addItem(s, 'indigo'));
    playerAction(b, { type: 'bag', itemId: 'indigo' }, null);
    expect(b.player.nextTone).toBe('BLUE');
  });

  it('Second Line Smoke escapes the fight', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }], {}, s => addItem(s, 'smoke'));
    playerAction(b, { type: 'bag', itemId: 'smoke' }, null);
    expect(b.over).toBe(true);
    expect(b.result).toBe('fled');
  });

  it('using an item you do not have wastes the turn', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }]);
    playerAction(b, { type: 'bag', itemId: 'gumbo' }, null);
    expect(ofType(b, 'log').map(e => e.text)).toContain("You don't have that.");
  });
});

describe('bosses', () => {
  it('Captain Hush calls a patrolman once at half Heart', () => {
    const b = setup('trumpet', [{ id: 'captain_hush', level: 3 }], { boss: 'captain_hush', noFlee: true });
    const hush = b.enemies[0]!;
    hush.hp = Math.floor(hush.maxHp * 0.5) + 1;
    b.player.stats.chops = 30;
    for (let i = 0; i < 6 && !b.over && b.enemies.length === 1; i++) {
      playerAction(b, { type: 'riff', targetId: hush.id }, TIMING.one);
      runUntilPlayer(b);
    }
    expect(b.enemies.map(e => e.defId)).toContain('hush_patrol');
    expect(ofType(b, 'summon')).toHaveLength(1);
  });

  it('Play the Blues shatters the Click’s Perfect Silence', () => {
    const b = setup('trumpet', [{ id: 'the_click', level: 15 }], {
      boss: 'the_click',
      clickPhase: true,
      noFlee: true,
    });
    const click = b.enemies[0]!;
    expect(hasStatus(click, 'silence')).toBe(true);
    playerAction(b, { type: 'blues', accuracy: 1 }, null);
    expect(hasStatus(click, 'silence')).toBe(false);
    expect(ofType(b, 'shatter')).toHaveLength(1);
    expect(b.bluesFree).toBe(false);
  });
});

describe('the pull loop', () => {
  it('runUntilPlayer stops on the player’s turn and leaves events for the UI', () => {
    const rng = createRng(3);
    const s = newGame('Test', 'yat', 'snare');
    const b = createBattle(rng, s, [makeEnemy(rng, s, 'hush_patrol', 1)]);
    expect(runUntilPlayer(b)).toBe(true);
    expect(b.waiting).toBe(true);
    expect(b.events.some(e => e.type === 'round')).toBe(true);
    expect(b.events.some(e => e.type === 'turn' && e.actor === b.player.id)).toBe(true);
  });
});

describe('assists', () => {
  it("a bandmate's assist that gets countered and cut doesn't end the battle", () => {
    // The assist helper is a 1-Heart actor on the player's side. A Countermelody answering its hit
    // used to run the player's death path and lose the fight.
    const b = setup('clarinet', [{ id: 'nutria', level: 10 }], {}, s => {
      s.band.recruited = ['remy'];
      s.band.active = ['remy'];
    });
    applyStatusRaw(b, b.enemies[0]!, 'countermelody');
    runAssists(b);
    expect(b.events.some(e => e.type === 'assist')).toBe(true);
    expect(b.over).toBe(false);
    expect(b.player.alive).toBe(true);
    expect(ofType(b, 'death').map(e => e.target)).not.toContain(b.player.id);
  });
});

describe('items in battle', () => {
  it('Second Line Smoke is refused in a boss fight, keeping the item and the turn', () => {
    const b = setup('trumpet', [{ id: 'captain_hush', level: 3 }], { boss: 'captain_hush' }, s =>
      addItem(s, 'smoke', 1),
    );
    playerAction(b, { type: 'bag', itemId: 'smoke' }, null);
    expect(b.over).toBe(false);
    expect(b.state.bag.smoke).toBe(1);
  });

  it('Second Line Smoke still escapes a street fight', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 3 }], {}, s => addItem(s, 'smoke', 1));
    playerAction(b, { type: 'bag', itemId: 'smoke' }, null);
    expect(b.result).toBe('fled');
  });
});

describe('the loop guard', () => {
  it("a fight that never reaches the player's turn is called off, not lost", () => {
    // Ambushed, the player acts last in round 1, so 201 enemies against a player they can't cut in
    // time trip runUntilPlayer's 200-turn guard before the player's turn comes.
    const rng = createRng(7);
    const s = newGame('Test', 'yat', 'trumpet');
    s.level = 10;
    fullRest(s);
    const crowd = Array.from({ length: 201 }, () => makeEnemy(rng, s, 'nutria', 1));
    const b = createBattle(rng, s, crowd, { ambush: true });
    b.player.maxHp = b.player.hp = 1_000_000;
    expect(runUntilPlayer(b)).toBe(false);
    expect(b.over).toBe(true);
    expect(b.result).toBe('fled');
    expect(b.stalled).toBe(true);
  });
});

describe('rewards', () => {
  it('a spar pays half the Doubloons of the same fight on the street, and the same XP', () => {
    const b = setup('trumpet', [
      { id: 'nutria', level: 8 },
      { id: 'hustler', level: 8 },
    ]);
    const at = b.rng.save();
    const street = battleRewards(b);
    b.rng = restoreRng(at);
    b.context = 'spar';
    const spar = battleRewards(b);
    expect(spar.xp).toBe(street.xp);
    expect(spar.gold).toBe(Math.round(street.gold * 0.5));
  });
});

describe('auto rhythm', () => {
  const drawing = (r: number) => ({ next: () => r }) as unknown as Rng;

  it('scales the ON THE ONE chance by the same zone factor as the manual bar', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }]);
    expect(oneZoneFactor(b.player)).toBe(1);
    expect(rollAutoTiming(drawing(0.25), oneZoneFactor(b.player)).id).toBe('pocket');
    applyStatusRaw(b, b.player, 'pocket', 3);
    expect(oneZoneFactor(b.player)).toBeCloseTo(1.3);
    expect(playerTimingSpec(b.player, 1, 0.5).one).toBeCloseTo(0.06 * 1.3);
    expect(rollAutoTiming(drawing(0.25), oneZoneFactor(b.player)).id).toBe('one');
  });

  it('Quantized narrows it, and the chance never eats past the pocket', () => {
    const b = setup('trumpet', [{ id: 'nutria', level: 10 }]);
    applyStatusRaw(b, b.player, 'quantized', 2);
    expect(rollAutoTiming(drawing(0.15), oneZoneFactor(b.player)).id).toBe('pocket');
    expect(rollAutoTiming(drawing(0.15)).id).toBe('one');
    expect(rollAutoTiming(drawing(0.72), 10).id).toBe('loose');
  });
});
