/* Headless balance simulation for Cyber Funk. Loads the data + engine files in a vm context. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const src = ['01_data_core.js', '02_data_enemies.js', '03_data_items.js', '04_data_world.js', '05_engine.js']
  .map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const ctx = { console, Math, JSON, Object, Array };
vm.createContext(ctx);
vm.runInContext(src + '\nthis.__E = { BALANCE, newState, derivedStats, gainXp, makeEnemy, createBattle, runUntilPlayer, playerAction, battleRewards, applyBattleResult, livingEnemies, effStat, hasStatus, SKILLS, CLASSES, ENEMIES, BOSSES, DISTRICTS, ITEMS, GEAR, TIMING, unlockedSkills, xpToNext, addItem, countItem, fullRest, SKILL_LEVELS, rollAutoTiming, healPct, funkPct, STATUSES, playerCanSolo };', ctx);
const E = ctx.__E;

function loadout(s, L) {
  const cls = s.cls;
  s.level = L;
  s.gear.instrument = `inst_${cls}_${L >= 11 ? 'chrome' : L >= 7 ? 'neon' : L >= 3 ? 'street' : 'pawnshop'}`;
  s.gear.threads = L >= 11 ? 'thr_kevlar' : L >= 8 ? 'thr_duster' : L >= 4 ? 'thr_secondline' : L >= 2 ? 'thr_thrift' : null;
  s.gear.charm = L >= 5 ? 'ch_gator' : null;
  s.gear.mod = L >= 7 ? 'mod_jaw' : null;
  if (L >= 13) s.gear.instrument = `inst_${cls}_legend`;
  E.fullRest(s);
}
// Simple player AI
function chooseAction(b, s, opts) {
  const p = b.player;
  const foes = E.livingEnemies(b);
  const target = foes.sort((a, c) => a.hp - c.hp)[0];
  // consumables
  if (p.hp < p.maxHp * (opts.boss ? 0.5 : 0.4) && opts.items > 0) { const it = E.countItem(s, 'gumbo') ? 'gumbo' : E.countItem(s, 'poboy') ? 'poboy' : null; if (it) { opts.items--; opts.used++; return { type: 'bag', itemId: it }; } }
  // telegraphed big hit -> vamp
  if (foes.some(e => e.charged)) return { type: 'vamp' };
  // tone items: if target resists my tone and I have the right bead, use it before a big skill
  const TONEITEM = { HOT: 'cayenne', LOW: 'subtape', BLUE: 'indigo', FUNK: 'discobead' };
  if (!p.nextTone && target.weak && target.resist === p.tone && E.countItem(s, TONEITEM[target.weak]) && p.fp >= 8) { opts.beads = (opts.beads || 0) + 1; return { type: 'bag', itemId: TONEITEM[target.weak] }; }
  if (E.playerCanSolo(b)) return { type: 'solo', targetId: target.id };
  if (!E.hasStatus(p, 'muted')) {
    const skills = p.skills.map(id => E.SKILLS[id]).filter(sk => sk.fp <= p.fp && !(sk.once && p.onceUsed[sk.id]));
    // heal if low and healer
    const heal = skills.find(sk => sk.fx.some(f => f.k === 'heal' && (f.pct || 0) >= 0.25));
    if (heal && p.hp < p.maxHp * 0.45) return { type: 'play', skillId: heal.id, targetId: target.id };
    const dmg = skills.filter(sk => sk.fx.some(f => f.k === 'dmg'));
    const expected = sk => { let t = 0; sk.fx.forEach(f => { if (f.k !== 'dmg') return; const m = typeof f.mult === 'function' ? 1.8 : f.mult; const hits = Array.isArray(f.hits) ? 10 : (f.hits || 1); let tm = 1; const tone = f.tone || p.tone; if (target.weak === tone) tm = 1.5; else if (target.resist === tone && !f.ignoreResist) tm = 0.5; t += m * hits * tm * (f.target === 'all' ? foes.length : 1); }); return t; };
    if (dmg.length) { dmg.sort((a, c) => expected(c) - expected(a)); const best = dmg[0]; const riffExp = (target.weak === p.tone ? 1.5 : target.resist === p.tone ? 0.5 : 1); if (expected(best) > riffExp * 1.15 && (p.fp - best.fp >= 0)) return { type: 'play', skillId: best.id, targetId: target.id }; }
    // buff skills occasionally
    const buff = skills.find(sk => !sk.fx.some(f => f.k === 'dmg') && sk.fx.some(f => f.k === 'status' && f.target === 'self' && f.id === 'hyped'));
    if (buff && !E.hasStatus(p, 'hyped') && b.round <= 2) return { type: 'play', skillId: buff.id, targetId: target.id };
  }
  if (p.fp < 6 && b.round > 1 && Math.random() < 0.3) return { type: 'vamp' };
  return { type: 'riff', targetId: target.id };
}
function timingRoll(manualSkill) { // emulate a decent human: 35% one, 40% pocket, 20% loose, 5% clams
  const r = Math.random(); return r < 0.35 ? E.TIMING.one : r < 0.75 ? E.TIMING.pocket : r < 0.95 ? E.TIMING.loose : E.TIMING.clams;
}
function runFight(s, enemyDefs, opts) {
  opts = Object.assign({ items: 0, used: 0 }, opts || {});
  const enemies = enemyDefs.map(d => E.makeEnemy(s, d.id, d.level));
  const b = E.createBattle(s, enemies, { boss: opts.boss, clickPhase: opts.clickPhase, noFlee: true });
  const hp0 = b.player.hp;
  let guard = 0;
  while (!b.over && guard++ < 80) {
    const waiting = E.runUntilPlayer(b);
    if (b.over) break;
    if (!waiting) break;
    const act = chooseAction(b, s, opts);
    if (act.type === 'blues') E.playerAction(b, act, null);
    else { const needsTiming = act.type === 'riff' || act.type === 'solo' || (act.type === 'play' && E.SKILLS[act.skillId].fx.some(f => f.k === 'dmg')); E.playerAction(b, act, needsTiming ? timingRoll() : null); }
    if (b.clickPhase && E.hasStatus(b.enemies[0], 'silence') && (b.bluesFree || b.player.groove >= 100) && !b.over) { /* play blues next turn */ }
  }
  const lost = (hp0 - Math.max(0, b.player.hp)) / b.player.maxHp;
  E.applyBattleResult(b);
  return { result: b.result, rounds: b.round, lost, used: opts.used, beads: opts.beads || 0, hpLeft: b.player.hp / b.player.maxHp };
}
function pct(x) { return Math.round(x * 100) + '%'; }
function avg(a) { return a.reduce((x, y) => x + y, 0) / a.length; }

const classes = Object.keys(E.CLASSES);
const districts = Object.values(E.DISTRICTS);
const N = 60;
let out = [];
for (const cls of classes) {
  out.push(`\n=== ${cls.toUpperCase()} ===`);
  for (const d of districts) {
    const L = d.lvl[0] + 1; // mid-range recommended level
    const res = [];
    for (let i = 0; i < N; i++) {
      const s = E.newState('Sim', 'yat', cls); loadout(s, L);
      s.band.active = L >= 5 ? ['sugar'] : []; if (L >= 7) s.band.active.push('static');
      const n = Math.max(d.groups[0], Math.min(d.groups[1], Math.round((d.groups[0] + d.groups[1]) / 2)));
      const defs = []; for (let k = 0; k < n; k++) { const id = d.pool[Math.floor(Math.random() * d.pool.length)]; const ed = E.ENEMIES[id]; defs.push({ id, level: Math.max(ed.lvl[0], Math.min(ed.lvl[1], L)) }); }
      res.push(runFight(s, defs));
    }
    const wins = res.filter(r => r.result === 'win');
    out.push(`${d.id.padEnd(10)} L${L} n=${districts.indexOf(d)}: win ${pct(wins.length / N)} rounds ${avg(wins.map(r => r.rounds)).toFixed(1)} hpLost ${pct(avg(wins.map(r => r.lost)))}`);
  }
  // bosses
  for (const bid of Object.keys(E.BOSSES)) {
    const bd = E.BOSSES[bid]; const res = [];
    for (let i = 0; i < 40; i++) {
      const s = E.newState('Sim', 'yat', cls); loadout(s, bd.lvl);
      s.band.active = bd.lvl >= 5 ? ['sugar'] : []; if (bd.lvl >= 7) s.band.active.push('static');
      E.addItem(s, 'gumbo', 3); E.addItem(s, 'poboy', 3); ['cayenne','subtape','indigo','discobead'].forEach(i => E.addItem(s, i, 5));
      if (bid === 'the_click') { s.secondLine = Array.from({ length: 10 }, (_, k) => ({ name: 'M' + k })); s.inTower = true; }
      let r;
      if (bid === 'the_click') r = runClick(s);
      else r = runFight(s, [{ id: bid, level: bd.lvl }], { items: 3, boss: bid });
      res.push(r);
    }
    const wins = res.filter(r => r.result === 'win');
    out.push(`BOSS ${bid.padEnd(13)} L${bd.lvl}: win ${pct(wins.length / res.length)} rounds ${wins.length ? avg(wins.map(r => r.rounds)).toFixed(1) : '-'} items ${wins.length ? avg(wins.map(r => r.used)).toFixed(1) : '-'} beads ${wins.length ? avg(wins.map(r => r.beads || 0)).toFixed(1) : '-'} hpLeft ${wins.length ? pct(avg(wins.map(r => r.hpLeft))) : '-'}`);
  }
}
function runClick(s) {
  const opts = { items: 3, used: 0 };
  const enemies = [E.makeEnemy(s, 'the_click', 15)];
  const b = E.createBattle(s, enemies, { boss: 'the_click', clickPhase: true, noFlee: true });
  let guard = 0;
  while (!b.over && guard++ < 80) {
    const waiting = E.runUntilPlayer(b); if (b.over || !waiting) break;
    const click = b.enemies[0];
    if (E.hasStatus(click, 'silence') && (b.bluesFree || b.player.groove >= 100)) { E.playerAction(b, { type: 'blues', accuracy: 0.7 }, null); continue; }
    if (E.hasStatus(click, 'silence')) { // build groove: riff
      const act = b.player.hp < b.player.maxHp * 0.35 && opts.items > 0 && E.countItem(s, 'gumbo') ? { type: 'bag', itemId: 'gumbo' } : { type: 'riff', targetId: click.id };
      if (act.type === 'bag') { opts.items--; opts.used++; }
      E.playerAction(b, act, act.type === 'riff' ? timingRoll() : null); continue;
    }
    const act = chooseAction(b, s, opts);
    const needsTiming = act.type === 'riff' || act.type === 'solo' || (act.type === 'play' && E.SKILLS[act.skillId].fx.some(f => f.k === 'dmg'));
    E.playerAction(b, act, needsTiming ? timingRoll() : null);
  }
  return { result: b.result, rounds: b.round, used: opts.used, hpLeft: b.player.hp / b.player.maxHp };
}
console.log(out.join('\n'));
