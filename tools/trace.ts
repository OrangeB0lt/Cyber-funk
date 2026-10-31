/**
 * Print one fight, turn by turn, as the sim's scripted player plays it. Use it to explain a sim
 * outlier or to check a boss pattern.
 *
 *   npm run trace -- <class> <opponent> <level> [--seed N] [--events]
 *   npm run trace -- trumpet captain_hush 3 --seed 42
 */
import { CLASS_IDS, type ClassId } from '@core/ids/characters';
import { BOSS_IDS, ENEMY_IDS, type OpponentId } from '@core/ids/enemies';
import { createRng } from '@core/rng';
import type { BossId } from '@core/ids/enemies';
import { BOSSES } from '@content/data';
import {
  addItem,
  applyBattleResult,
  createBattle,
  makeEnemy,
  newGame,
  playerAction,
  runUntilPlayer,
} from '@engine/index';
import { chooseAction, loadout, needsTiming, timingRoll, type FightOpts } from './sim';

const [cls = 'sousaphone', vs = 'captain_hush', levelArg = '3'] = process.argv
  .slice(2)
  .filter(a => !a.startsWith('--'));
const seedIdx = process.argv.indexOf('--seed');
const seed = seedIdx >= 0 ? Number(process.argv[seedIdx + 1]) : 1;
const showEvents = process.argv.includes('--events');
if (!(CLASS_IDS as readonly string[]).includes(cls))
  throw new Error(`Unknown class ${cls}. Try: ${CLASS_IDS.join(', ')}`);
if (![...ENEMY_IDS, ...BOSS_IDS].includes(vs as OpponentId)) throw new Error(`Unknown opponent ${vs}.`);

const L = Number(levelArg);
const rng = createRng(seed);
const s = newGame('Trace', 'yat', cls as ClassId);
loadout(s, L);
if (L >= 5) s.band.active = ['sugar'];
if (L >= 7) s.band.active.push('static');
addItem(s, 'gumbo', 3);
const isBoss = vs in BOSSES;
const b = createBattle(rng, s, [makeEnemy(rng, s, vs as OpponentId, L)], {
  boss: isBoss ? (vs as BossId) : null,
  noFlee: true,
});
const p = b.player;
const e = b.enemies[0]!;
console.log(
  `seed ${seed}  ${p.name} L${L} ${cls}: ${p.maxHp} Heart, ${p.maxFp} Funk, ${JSON.stringify(p.stats)}`,
);
console.log(`vs ${e.name} L${e.level}: ${e.maxHp} Heart, ${JSON.stringify(e.stats)}\n`);
const opts: FightOpts = { items: 3, used: 0, boss: isBoss ? (vs as OpponentId) : undefined };
const flush = () => {
  for (const ev of b.events) {
    if (ev.type === 'log') console.log(ev.text);
    else if (ev.type === 'round')
      console.log(`--- round ${ev.round} · you ${p.hp}/${p.maxHp} · ${e.name} ${e.hp}/${e.maxHp}`);
    else if (showEvents) console.log('   ', JSON.stringify(ev));
  }
  b.events.length = 0;
};
for (let guard = 0; !b.over && guard < 80; guard++) {
  const waiting = runUntilPlayer(b);
  flush();
  if (b.over || !waiting) break;
  const act = chooseAction(rng, b, s, opts);
  playerAction(b, act, needsTiming(act) ? timingRoll(rng) : null);
  flush();
}
applyBattleResult(b);
console.log(`\nRESULT ${b.result} after ${b.round} rounds, ${p.hp}/${p.maxHp} Heart left`);
