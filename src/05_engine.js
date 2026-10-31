/* ============================================================
   CYBER FUNK — engine: state, stats, progression, combat (no DOM)
   ============================================================ */
'use strict';

const rnd = (a, b) => a + Math.random() * (b - a);
const irnd = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
const deepClone = o => JSON.parse(JSON.stringify(o));

/* ---------- State ---------- */
function defaultSettings() {
  return { textSpeed: 'normal', rhythm: 'manual', difficulty: 'local', sound: true, reduceMotion: false, textSize: 'M' };
}
function newState(name, roots, cls, settings, ngPlus) {
  const r = ROOTS[roots];
  const s = {
    v: 1, name: name || 'Lagniappe', roots, cls, level: 1, xp: 0,
    hp: 0, fp: 0, doubloons: 80 + (r.doubloons || 0), day: 1,
    bag: Object.assign({}, r.items), keyItems: ['umbrella_pending'],
    gear: { instrument: `inst_${cls}_pawnshop`, threads: null, charm: null, mod: null },
    gearBag: [],
    sheet: [], blessings: 0, perm: { heart: 0, funk: 0, chops: 0, grit: 0, tempo: 0, mojo: 0 },
    band: { recruited: [], active: [] },
    notes: [], flags: {}, quests: {}, counters: {},
    main: { act: 'treme', step: 0 },
    district: 'treme', unlocked: ['treme'],
    book: {}, lexicon: [], bounty: null, bountiesDone: [],
    mealBuff: null, dreamBuff: null, nextFight: null, pendingBattle: null,
    sitInDay: 0, pralineLady: 0, lastRest: 0,
    settings: settings || defaultSettings(), ngPlus: ngPlus || 0,
    secondLine: null, inTower: false, towerFloor: 0, playTime: 0,
  };
  s.keyItems = [];
  (r.gear || []).forEach(g => { s.gearBag.push(g); const slot = GEAR[g].slot; if (!s.gear[slot]) s.gear[slot] = g; });
  const st = derivedStats(s);
  s.hp = st.maxHp; s.fp = st.maxFp;
  return s;
}

/* ---------- Stats ---------- */
function classBase(s) {
  const c = CLASSES[s.cls];
  const out = {};
  STAT_KEYS.forEach((k, i) => { out[k] = c.base[i] + c.growth[i] * (s.level - 1); });
  return out;
}
function gearList(s) {
  return ['instrument', 'threads', 'charm', 'mod'].map(k => s.gear[k] && GEAR[s.gear[k]]).filter(Boolean);
}
function secondLineSize(s) { return (s.secondLine || []).length; }
function derivedStats(s) {
  const b = classBase(s);
  const r = ROOTS[s.roots];
  const out = { heart: b.heart, funk: b.funk, chops: b.chops, grit: b.grit, tempo: b.tempo, mojo: b.mojo };
  STAT_KEYS.forEach(k => { out[k] += (r.bonus[k] || 0) + (s.perm[k] || 0); });
  gearList(s).forEach(g => { Object.keys(g.stats || {}).forEach(k => { out[k] += g.stats[k]; }); });
  let mult = { chops: 1, grit: 1, tempo: 1, mojo: 1 };
  if (s.mealBuff && s.mealBuff.fights > 0) { mult.chops += s.mealBuff.chops; mult.grit += s.mealBuff.grit; }
  if (s.dreamBuff && s.dreamBuff.fights > 0) { mult.chops += 0.1; mult.grit += 0.1; mult.mojo += 0.2; }
  if (s.inTower) { const bonus = Math.min(0.25, 0.02 * secondLineSize(s)); Object.keys(mult).forEach(k => { mult[k] += bonus; }); out.heart *= 1 + bonus; out.funk *= 1 + bonus; }
  out.chops *= mult.chops; out.grit *= mult.grit; out.tempo *= mult.tempo; out.mojo *= mult.mojo;
  const st = { chops: out.chops, grit: out.grit, tempo: out.tempo, mojo: out.mojo, maxHp: Math.round(out.heart), maxFp: Math.round(out.funk) };
  st.oneZone = 1; st.critBonus = 0; st.statusResist = 0; st.dodgeBonus = 0; st.toneBonus = {}; st.doubloonBonus = 0;
  gearList(s).forEach(g => { if (g.oneZone) st.oneZone += g.oneZone; if (g.critBonus) st.critBonus += g.critBonus; if (g.statusResist) st.statusResist = Math.max(st.statusResist, g.statusResist); if (g.toneBonus) Object.assign(st.toneBonus, g.toneBonus); if (g.doubloonBonus) st.doubloonBonus += g.doubloonBonus; });
  if (s.sheet.includes('sm_swing')) st.oneZone += 0.3;
  if (s.sheet.includes('sm_rubato')) st.dodgeBonus += 0.08;
  if (s.band.active.includes('remy')) st.dodgeBonus += 0.05;
  if (s.band.active.includes('static')) st.doubloonBonus += 0.1;
  return st;
}
function displayStats(s) {
  const st = derivedStats(s);
  return { heart: st.maxHp, funk: st.maxFp, chops: Math.round(st.chops), grit: Math.round(st.grit), tempo: Math.round(st.tempo), mojo: Math.round(st.mojo) };
}
function clampVitals(s) { const st = derivedStats(s); s.hp = clamp(Math.round(s.hp), 0, st.maxHp); s.fp = clamp(Math.round(s.fp), 0, st.maxFp); }
function healPct(s, p) { const st = derivedStats(s); s.hp = Math.min(st.maxHp, s.hp + Math.round(st.maxHp * p)); }
function funkPct(s, p) { const st = derivedStats(s); s.fp = Math.min(st.maxFp, s.fp + Math.round(st.maxFp * p)); }
function fullRest(s) { const st = derivedStats(s); s.hp = st.maxHp; s.fp = st.maxFp; }
function unlockedSkills(s) { const c = CLASSES[s.cls]; return c.skills.filter((id, i) => s.level >= SKILL_LEVELS[i]); }

/* ---------- Progression ---------- */
function xpToNext(L) { return Math.round(25 * Math.pow(L, 1.5)); }
function gainXp(s, n) {
  const ups = [];
  if (s.level >= LEVEL_CAP) return ups;
  s.xp += n;
  while (s.level < LEVEL_CAP && s.xp >= xpToNext(s.level)) {
    const before = displayStats(s);
    s.xp -= xpToNext(s.level); s.level += 1;
    const after = displayStats(s);
    const gains = {}; STAT_KEYS.forEach(k => { gains[k] = after[k] - before[k]; });
    const idx = SKILL_LEVELS.indexOf(s.level);
    const newSkill = idx >= 0 ? CLASSES[s.cls].skills[idx] : null;
    healPct(s, 0.3); funkPct(s, 0.3);
    ups.push({ level: s.level, gains, newSkill });
  }
  if (s.level >= LEVEL_CAP) s.xp = 0;
  return ups;
}
function addItem(s, id, n) { s.bag[id] = (s.bag[id] || 0) + (n || 1); if (ITEMS[id] && ITEMS[id].max) s.bag[id] = Math.min(ITEMS[id].max, s.bag[id]); }
function removeItem(s, id, n) { if (!s.bag[id]) return false; s.bag[id] -= (n || 1); if (s.bag[id] <= 0) delete s.bag[id]; return true; }
function countItem(s, id) { return s.bag[id] || 0; }
function priceFor(s, basePrice, district) {
  let p = basePrice;
  if (s.roots === 'creole' && (district === 'treme' || district === 'quarter')) p *= 0.95;
  if (s.roots === 'cajun' && district === 'bayou') p *= 0.95;
  return Math.round(p);
}

/* ---------- Enemy factory ---------- */
const BALANCE = { hpBase: 16, hpPerL: 8, chopsBase: 4, chopsPerL: 1.3, bossHp: 4.5, bossHpPerL: 0.22, bossChops: 1.25, bossChopsPerL: 0.08, bossGrit: 1.2 };
function enemyBaseStats(L) { return { hp: BALANCE.hpBase + BALANCE.hpPerL * L, chops: BALANCE.chopsBase + BALANCE.chopsPerL * L, grit: 4 + 1.6 * L, tempo: 6 + 1.6 * L, mojo: L }; }
function difficultyMods(s) {
  const d = s.settings.difficulty;
  return { dmg: d === 'tourist' ? 0.75 : d === 'grand' ? 1.25 : 1, hp: d === 'grand' ? 1.2 : 1 };
}
let ACTOR_SEQ = 0;
function makeActor(base) {
  return Object.assign({ id: 'a' + (++ACTOR_SEQ), statuses: [], flags: {}, turnCount: 0, guard: null, charged: null, chopsStack: 0, extraActions: 0, dodgeBonus: 0, onceUsed: {}, alive: true, groove: 0, beat: 1 }, base);
}
function makeEnemy(s, defId, level, opts) {
  opts = opts || {};
  const d = ENEMIES[defId] || BOSSES[defId];
  const isBoss = !!BOSSES[defId];
  const L = level || (isBoss ? d.lvl : irnd(d.lvl[0], d.lvl[1]));
  const bs = enemyBaseStats(L);
  const diff = difficultyMods(s);
  const ng = 1 + 0.3 * (s.ngPlus || 0);
  let hp = bs.hp, chops = bs.chops, grit = bs.grit;
  if (isBoss) { hp *= BALANCE.bossHp + BALANCE.bossHpPerL * Math.max(0, L - 3); chops *= BALANCE.bossChops + BALANCE.bossChopsPerL * Math.max(0, L - 3); grit *= BALANCE.bossGrit; }
  if (d.elite) { hp *= 1.6; chops *= 1.15; }
  if (d.hpMult) hp *= d.hpMult;
  if (d.gritMult) grit *= d.gritMult;
  hp = Math.round(hp * diff.hp * ng); chops *= ng;
  const a = makeActor({
    side: 'enemy', defId, name: d.name, level: L, boss: isBoss, elite: !!d.elite, machine: !!d.machine, hologram: !!d.hologram,
    stats: { chops, grit, tempo: bs.tempo, mojo: bs.mojo }, maxHp: hp, hp, maxFp: 0, fp: 0,
    tone: d.tone, weak: d.weak, resist: d.resist || null, dodgeBonus: d.dodgeBonus || 0,
    special: d.special, specialChance: d.specialChance || 0.3, dmgMult: diff.dmg, rival: d.rival || null, summoned: !!opts.summoned,
    skills: [], riff: null, solo: null,
  });
  if (d.rival) { const c = CLASSES[d.rival]; a.riff = c.riff; a.skills = c.skills.filter((id, i) => L >= SKILL_LEVELS[i]); a.cls = d.rival; a.maxFp = 999; a.fp = 999; }
  if (d.special === 'clone') { const c = CLASSES[s.cls]; a.riff = c.riff; a.cls = s.cls; const dmgSkills = c.skills.filter((id, i) => s.level >= SKILL_LEVELS[i] && SKILLS[id].fx.some(f => f.k === 'dmg')); a.skills = [pick(dmgSkills.length ? dmgSkills : [c.skills[0]])]; a.name = `Session Clone (${c.name})`; a.tone = SKILLS[c.riff].fx[0].tone; a.maxFp = 999; a.fp = 999; }
  return a;
}
function makePlayerActor(s) {
  const st = derivedStats(s);
  const c = CLASSES[s.cls];
  const a = makeActor({
    side: 'player', defId: 'player', name: s.name, level: s.level, cls: s.cls,
    stats: { chops: st.chops, grit: st.grit, tempo: st.tempo, mojo: st.mojo }, maxHp: st.maxHp, hp: Math.min(s.hp, st.maxHp), maxFp: st.maxFp, fp: Math.min(s.fp, st.maxFp),
    tone: SKILLS[c.riff].fx[0].tone, weak: null, resist: null, riff: c.riff, solo: c.solo, skills: unlockedSkills(s),
    oneZone: st.oneZone, critBonus: st.critBonus, statusResist: st.statusResist, dodgeBonus: st.dodgeBonus, toneBonus: st.toneBonus,
    bigFour: !!c.bigFour, sheet: s.sheet.slice(), secondWind: s.sheet.includes('sm_secondwind'), grisgris: countItem(s, 'grisgris') > 0,
    healBonus: s.band.active.includes('sugar') ? 0.1 : 0, funkRegen: (s.sheet.includes('sm_circular') ? 1 : 0) + (s.band.active.includes('moses') ? 1 : 0),
    critDmg: s.sheet.includes('sm_ghost') ? 2.0 : 1.75,
  });
  return a;
}

/* ---------- Battle ---------- */
function createBattle(s, enemyActors, opts) {
  opts = opts || {};
  const b = {
    state: s, player: makePlayerActor(s), enemies: enemyActors, round: 0, order: [], idx: -1, events: [], log: null,
    over: false, result: null, boss: opts.boss || null, context: opts.context || 'street', flee: false, lastPlayerSkill: null,
    stolen: 0, ambush: !!opts.ambush, waiting: false, noFlee: !!opts.noFlee, assistsRound: 0, clickPhase: !!opts.clickPhase, bluesFree: !!opts.clickPhase,
    discoveries: [], summonCount: 0, turnsTaken: 0,
  };
  b.log = (text, cls) => { b.events.push({ t: 'log', text, cls: cls || '' }); };
  b.helpers = makeHelpers(b);
  // pre-fight mods
  const nf = s.nextFight; s.nextFight = null;
  const p = b.player;
  if (nf) {
    if (nf.groove) p.groove = clamp(p.groove + nf.groove, 0, 100);
    if (nf.mojo) p.stats.mojo = Math.max(0, p.stats.mojo + nf.mojo);
    if (nf.hyped) applyStatusRaw(b, p, 'hyped', 3);
    if (nf.pocket) applyStatusRaw(b, p, 'pocket', 3);
    if (nf.status) applyStatusRaw(b, p, nf.status, 3);
  }
  if (b.clickPhase) { const click = enemyActors[0]; applyStatusRaw(b, click, 'silence', 99); }
  enemyActors.forEach(e => { recordSeen(s, e.defId); });
  if (b.boss) { const bd = BOSSES[b.boss]; b.log(`${bd.name}: "${bd.lines.intro}"`, 'boss'); }
  return b;
}
function recordSeen(s, defId) { if (!s.book[defId]) s.book[defId] = { seen: true, weak: false }; }
function livingEnemies(b) { return b.enemies.filter(e => e.alive); }
function effStat(a, k) {
  let v = a.stats[k];
  let mult = 1;
  a.statuses.forEach(st => { const d = STATUSES[st.id]; if (d.mod && d.mod[k]) mult += d.mod[k]; });
  if (k === 'chops' && a.chopsStack) mult += a.chopsStack;
  return Math.max(0.1, v * mult);
}
function hasStatus(a, id) { return a.statuses.some(s => s.id === id); }
function getStatus(a, id) { return a.statuses.find(s => s.id === id); }
function removeStatus(b, a, id) { const i = a.statuses.findIndex(s => s.id === id); if (i >= 0) { a.statuses.splice(i, 1); b.events.push({ t: 'status', target: a.id, id, add: false }); } }
function applyStatusRaw(b, target, id, turns) {
  const d = STATUSES[id];
  if (!d) return false;
  if (!target.alive) return false;
  turns = turns || d.turns;
  const ex = getStatus(target, id);
  if (ex) { ex.turns = Math.max(ex.turns, turns); ex.fresh = true; return true; }
  target.statuses.push({ id, turns, fresh: true });
  b.events.push({ t: 'status', target: target.id, id, add: true });
  return true;
}
function applyStatus(c, target, id, turns, chanceVal, bossAlt) {
  const b = c.battle;
  const d = STATUSES[id];
  if (!d || !target.alive) return false;
  if (chanceVal !== undefined && !chance(chanceVal)) return false;
  if (target.boss && id === 'swooned') { if (bossAlt) id = bossAlt; else return false; }
  if (d.kind === 'bad' && target.side === 'player' && target.statusResist && chance(target.statusResist)) { b.log(`${target.name}'s charm shrugs off ${d.name}.`); return false; }
  if (applyStatusRaw(b, target, id, turns)) { b.log(`${target.name} is ${STATUSES[id].name}.`, d.kind); return true; }
  return false;
}
function cleanse(b, a, kind, only) {
  const before = a.statuses.length;
  a.statuses = a.statuses.filter(st => {
    if (only) return st.id !== only;
    const d = STATUSES[st.id];
    return d.kind !== kind;
  });
  if (a.statuses.length !== before) b.events.push({ t: 'status', target: a.id, id: null, add: false });
  return before - a.statuses.length;
}
function stripBuffs(b, a, count) {
  const good = a.statuses.filter(st => STATUSES[st.id].kind === 'good' && st.id !== 'silence' && st.id !== 'pitchshield');
  if (!good.length) return 0;
  const toRemove = count ? good.slice(-count) : good;
  a.statuses = a.statuses.filter(st => !toRemove.includes(st));
  b.events.push({ t: 'status', target: a.id, id: null, add: false });
  b.log(`${a.name} loses ${toRemove.map(st => STATUSES[st.id].name).join(', ')}.`);
  return toRemove.length;
}
function makeHelpers(b) {
  return {
    applyStatus: (c, target, id, turns) => applyStatus(c, target, id, turns),
    steal(c, lo, hi) { const n = Math.min(b.state.doubloons, irnd(lo, hi)); if (n > 0) { b.state.doubloons -= n; b.stolen += n; b.log(`${c.actor.name} lifts Ð${n} off you!`); } },
    stealFunk(c, n) { const p = b.player; const took = Math.min(p.fp, n); p.fp -= took; b.log(`${c.actor.name} claims ${took} Funk in royalties.`); },
    copyBuff(c) { const p = b.player; const good = p.statuses.filter(st => STATUSES[st.id].kind === 'good'); if (good.length) { const st = pick(good); applyStatusRaw(b, c.actor, st.id, st.turns); b.log(`${c.actor.name} records your ${STATUSES[st.id].name}.`); } },
    charge(c, releaseSkill, line) { c.actor.charged = releaseSkill; applyStatusRaw(b, c.actor, 'charging', 1); b.log(line, 'telegraph'); },
    summon(c, defId, level, line) { if (b.summonCount >= 6) return; const a = makeEnemy(b.state, defId, level, { summoned: true }); b.enemies.push(a); b.summonCount++; recordSeen(b.state, defId); b.events.push({ t: 'summon', actor: a.id }); b.log(line); },
    sample(c) { const id = b.lastPlayerSkill; if (!id || !SKILLS[id]) { resolveSkill(b, c.actor, SKILLS.en_basic, b.player, null); return; } b.log(`Vox Perfecta samples your ${SKILLS[id].name} and plays it back.`); resolveSkill(b, c.actor, SKILLS[id], b.player, rollAutoTiming(), { scale: 0.7, sampled: true }); },
    pitchShield(c) { c.actor.shield = { hits: 3 }; applyStatusRaw(b, c.actor, 'pitchshield', 99); b.log('PERFECT PITCH SHIELD. The next 3 hits deal 25% unless one lands ON THE ONE or is a SOLO.', 'boss'); },
    fermata(c) { b.player.flags.loseTurn = true; b.log('Fermata. Your next turn is held.'); },
    permStat(c, k, n) { b.state.perm[k] = (b.state.perm[k] || 0) + n; b.player.stats[k] += n; },
    cutLooseReady(c) { const a = c.actor; return (a.flags.dirgeTurn !== undefined && b.round - a.flags.dirgeTurn <= 1) || livingEnemies(b).some(e => hasStatus(e, 'blues')); },
  };
}
function rollAutoTiming() { const r = Math.random(); return r < 0.2 ? TIMING.one : r < 0.7 ? TIMING.pocket : r < 0.95 ? TIMING.loose : TIMING.clams; }

function critChance(a, fx) { let c = 0.05 + 0.004 * effStat(a, 'mojo'); c = Math.min(0.35, c); c += (a.critBonus || 0) + (fx.critBonus || 0); if (hasStatus(a, 'pocket')) c += 0.25; return c; }
function dodgeChance(att, def, fx) { if (fx.noDodge) return 0; let d = 0.05 + 0.01 * (effStat(def, 'tempo') - effStat(att, 'tempo')); d = clamp(d, 0, 0.25); d += def.dodgeBonus || 0; return clamp(d, 0, 0.5); }

/* Damage one hit. Returns {dmg, crit, weak, resisted, dodge} */
function dealHit(b, att, def, fx, timing, ctx) {
  ctx = ctx || {};
  const c = { battle: b, actor: att, target: def };
  if (!def.alive) return null;
  if (chance(dodgeChance(att, def, fx))) { b.events.push({ t: 'dodge', target: def.id }); b.log(`${def.name} dodges!`); return { dmg: 0, dodge: true }; }
  let tone = fx.tone || att.tone || 'HOT';
  let mult = typeof fx.mult === 'function' ? fx.mult(c) : (fx.mult || 1);
  if (ctx.scale) mult *= ctx.scale;
  let toneMult = 1;
  if (att.side === 'player' && att.nextTone) { tone = att.nextTone; mult *= 1.2; att.nextTone = null; }
  if (att.side === 'player' && att.toneBonus && att.toneBonus[tone]) mult *= 1 + att.toneBonus[tone];
  if (att.side === 'player' && att.flags.dirgeNext && ctx.isSkill) { mult *= 1.5; att.flags.dirgeNext = false; }
  if (att.side === 'player' && att.bigFour && (ctx.beat4 || fx.forceBeat4)) mult *= 1.6;
  if (fx.machineBonus && def.machine) mult *= fx.machineBonus;
  let weak = false, resisted = false;
  if (def.weak === tone) { toneMult = 1.5; weak = true; if (def.side === 'enemy') { const bk = b.state.book[def.defId]; if (bk && !bk.weak) { bk.weak = true; b.discoveries.push(def.defId); } } }
  else if (def.resist === tone && !fx.ignoreResist) { toneMult = 0.5; resisted = true; }
  const timingMult = timing ? timing.mult : 1;
  const crit = chance(critChance(att, fx));
  const critMult = crit ? (att.critDmg || 1.75) : 1;
  let grit = effStat(def, 'grit');
  if (fx.ignoreGrit) grit *= (1 - fx.ignoreGrit);
  let dmg = effStat(att, 'chops') * mult * 50 / (50 + grit) * toneMult * timingMult * critMult * rnd(0.9, 1.1);
  if (att.side === 'enemy') dmg *= att.dmgMult || 1;
  // guard
  if (def.guard) { const blocked = dmg * (1 - def.guard.pct); dmg *= def.guard.pct; if (def.guard.reflect && blocked > 0 && att.alive) { const ref = Math.max(1, Math.round(blocked * def.guard.reflect)); att.hp -= ref; b.events.push({ t: 'dmg', target: att.id, amount: ref, tone: 'LOW' }); b.log(`${def.name}'s Bell Wall reflects ${ref} back.`); checkDeath(b, att, def); } }
  // countermelody
  let counter = false;
  if (hasStatus(def, 'countermelody')) { dmg *= 0.7; removeStatus(b, def, 'countermelody'); counter = true; }
  // pitch shield
  if (def.shield && def.shield.hits > 0) {
    if ((timing && timing.id === 'one') || ctx.isSolo) { def.shield = null; removeStatus(b, def, 'pitchshield'); b.log('The Perfect Pitch Shield SHATTERS!', 'good'); b.events.push({ t: 'shatter', target: def.id }); }
    else { dmg *= 0.25; def.shield.hits--; if (def.shield.hits <= 0) { def.shield = null; removeStatus(b, def, 'pitchshield'); } }
  }
  if (hasStatus(def, 'silence')) { dmg = 0; b.log('Perfect Silence. The Click takes no damage.'); b.events.push({ t: 'dmg', target: def.id, amount: 0, tone, silent: true }); return { dmg: 0 }; }
  dmg = Math.max(1, Math.round(dmg));
  def.hp -= dmg;
  b.events.push({ t: 'dmg', target: def.id, amount: dmg, tone, crit, weak, resisted });
  const tag = (crit ? ' CRIT!' : '') + (weak ? ' WEAK!' : '') + (resisted ? ' (resisted)' : '');
  b.log(`${att.name} hits ${def.name} for ${dmg}.${tag}`, crit ? 'crit' : '');
  if (def.side === 'player') def.groove = clamp(def.groove + 5, 0, 100);
  if (att.side === 'player' && weak) att.groove = clamp(att.groove + 10, 0, 100);
  if (fx.drain && att.alive) { const h = Math.round(dmg * fx.drain); healActor(b, att, h); }
  checkDeath(b, def, att);
  if (counter && def.alive && att.alive) { b.log(`${def.name} answers with a Countermelody!`); dealHit(b, def, att, { tone: 'HOT', mult: 1.5 }, null, {}); }
  if (def.boss && def.alive) bossHpHooks(b, def);
  return { dmg, crit, weak, resisted };
}
function healActor(b, a, amount) {
  if (!a.alive) return 0;
  if (a.side === 'player' && a.healBonus) amount = Math.round(amount * (1 + a.healBonus));
  const real = Math.min(amount, a.maxHp - a.hp);
  a.hp += real;
  if (real > 0) { b.events.push({ t: 'heal', target: a.id, amount: real }); b.log(`${a.name} regains ${real} Heart.`, 'heal'); }
  return real;
}
function checkDeath(b, a, killer) {
  if (a.hp > 0 || !a.alive) return;
  if (a.side === 'player') {
    if (a.secondWind && !a.onceUsed.secondWind) { a.onceUsed.secondWind = true; a.hp = 1; b.log('SECOND WIND. You stay on your feet with 1 Heart.', 'good'); return; }
    if (a.grisgris && !a.onceUsed.grisgris) { a.onceUsed.grisgris = true; a.hp = Math.round(a.maxHp * 0.3); removeItem(b.state, 'grisgris', 1); a.grisgris = false; b.log('Your Gris-Gris Bag burns up and pulls you back. 30% Heart.', 'good'); return; }
    a.hp = 0; a.alive = false; b.events.push({ t: 'death', target: a.id }); b.log('You got cut.', 'bad');
    endBattle(b, 'lose');
    return;
  }
  a.hp = 0; a.alive = false; a.statuses = [];
  b.events.push({ t: 'death', target: a.id });
  if (a.boss) { const bd = BOSSES[a.defId]; b.log(`${a.name}: "${bd.lines.defeat}"`, 'boss'); }
  else b.log(`${a.name} is cut.`);
  if (!livingEnemies(b).length) endBattle(b, 'win');
}
function bossHpHooks(b, a) {
  const bd = BOSSES[a.defId]; if (!bd) return;
  if (!a.flags.halfLine && a.hp <= a.maxHp * 0.5) { a.flags.halfLine = true; b.log(`${a.name}: "${bd.lines.half}"`, 'boss'); if (bd.onHalf) bd.onHalf(b, a); }
  if (bd.onHp) bd.onHp(b, a);
}
function endBattle(b, result) { if (b.over) return; b.over = true; b.result = result; b.events.push({ t: 'end', result }); }

function pickTargets(b, actor, fx, chosen) {
  const foes = actor.side === 'player' ? livingEnemies(b) : [b.player].filter(p => p.alive);
  const mode = fx.target || 'one';
  if (mode === 'self') return [actor];
  if (mode === 'player') return [b.player];
  if (mode === 'all') return foes.slice();
  if (mode === 'rand') return foes.length ? [pick(foes)] : [];
  if (mode === 'ally') { const allies = (actor.side === 'enemy' ? livingEnemies(b) : [b.player]).filter(x => x !== actor); return allies.length ? [pick(allies)] : [actor]; }
  if (mode === 'allies') return actor.side === 'enemy' ? livingEnemies(b) : [b.player];
  if (chosen && chosen.alive && foes.includes(chosen)) return [chosen];
  return foes.length ? [foes[0]] : [];
}

/* The one generic effect resolver. */
function resolveSkill(b, actor, skill, chosen, timing, ctx) {
  ctx = ctx || {};
  ctx.isSkill = !skill.riff && !skill.solo && !ctx.item;
  ctx.isSolo = !!skill.solo;
  const c = { battle: b, actor, skill, target: chosen };
  let lastTarget = chosen;
  for (const fx of skill.fx) {
    if (b.over) break;
    if (fx.cond && !fx.cond(c)) continue;
    if (fx.k === 'dmg') {
      const hits = Array.isArray(fx.hits) ? irnd(fx.hits[0], fx.hits[1]) : (fx.hits || 1);
      for (let h = 0; h < hits; h++) {
        if (b.over) break;
        let targets = fx.sameTarget && lastTarget && lastTarget.alive ? [lastTarget] : pickTargets(b, actor, fx, chosen);
        if (fx.target === 'rand') targets = pickTargets(b, actor, fx, chosen);
        if (!targets.length) break;
        for (const t of targets) {
          if (!t.alive) continue;
          lastTarget = t;
          const r = dealHit(b, actor, t, fx, timing, ctx);
          if (r && !r.dodge && r.dmg > 0 && fx.status && t.alive) { const sc = { battle: b, actor, target: t }; applyStatus(sc, t, fx.status.id, fx.status.turns, fx.status.chance, fx.status.bossAlt); }
        }
      }
      if (fx.recoil && actor.alive) { const r = Math.max(1, Math.round(actor.maxHp * fx.recoil)); actor.hp = Math.max(1, actor.hp - r); b.events.push({ t: 'dmg', target: actor.id, amount: r, tone: 'HOT' }); b.log(`${actor.name} takes ${r} recoil.`); }
    } else if (fx.k === 'status') {
      const targets = pickTargets(b, actor, fx, chosen);
      targets.forEach(t => applyStatus({ battle: b, actor, target: t }, t, fx.id, fx.turns, fx.chance, fx.bossAlt));
    } else if (fx.k === 'heal') {
      const targets = fx.target ? pickTargets(b, actor, fx, chosen) : [actor];
      targets.forEach(t => { let amt = fx.flat || Math.round(t.maxHp * (fx.pct || 0)); if (ctx.scale) amt = Math.round(amt * ctx.scale); healActor(b, t, amt); });
    } else if (fx.k === 'funk') {
      const t = fx.target === 'player' ? b.player : actor;
      const amt = fx.flat || Math.round(t.maxFp * (fx.pct || 0));
      const real = Math.min(amt, t.maxFp - t.fp); t.fp += real; if (real > 0) b.log(`${t.name} regains ${real} Funk.`, 'heal');
    } else if (fx.k === 'cleanse') {
      const t = fx.target === 'one' ? (chosen || actor) : actor;
      const n = cleanse(b, t, 'bad', fx.only); if (n) b.log(`${t.name} shakes off ${n} status${n > 1 ? 'es' : ''}.`, 'good');
    } else if (fx.k === 'strip') {
      const targets = fx.target === 'self' ? [actor] : pickTargets(b, actor, fx, chosen);
      targets.forEach(t => stripBuffs(b, t, fx.count));
    } else if (fx.k === 'guard') {
      actor.guard = { pct: fx.pct, reflect: fx.reflect || 0 }; b.log(`${actor.name} raises a Bell Wall.`, 'good');
    } else if (fx.k === 'groove') {
      const t = fx.target === 'one' ? b.player : actor;
      if (t.side === 'player') { t.groove = clamp(t.groove + fx.amt, 0, 100); b.log(`${t.name}'s Groove ${fx.amt > 0 ? '+' : ''}${fx.amt}.`); }
    } else if (fx.k === 'fn') {
      fx.run(c);
    }
  }
}

/* ---------- Turn machinery ---------- */
function startRound(b) {
  b.round++;
  const actors = [b.player, ...livingEnemies(b)];
  actors.sort((x, y) => effStat(y, 'tempo') - effStat(x, 'tempo') + (Math.random() - 0.5) * 0.01);
  if (b.ambush && b.round === 1) { const i = actors.indexOf(b.player); actors.splice(i, 1); actors.push(b.player); }
  b.order = actors.map(a => a.id);
  // extra actions
  actors.forEach(a => { if (a.extraActions) for (let i = 0; i < a.extraActions; i++) b.order.push(a.id); });
  b.idx = -1;
  b.events.push({ t: 'round', round: b.round });
  if (b.round % 3 === 0) runAssists(b);
}
function runAssists(b) {
  const s = b.state;
  s.band.active.forEach(id => {
    if (b.over) return;
    const bm = BANDMATES[id]; if (!bm) return;
    const helper = makeActor({ side: 'player', name: bm.name, level: s.level, stats: { chops: 8 + 3 * s.level, grit: 10, tempo: 10, mojo: 5 }, maxHp: 1, hp: 1, maxFp: 0, fp: 0, tone: 'FUNK', assist: true });
    b.log(`${bm.name} assists: ${SKILLS[bm.assist].name}!`, 'assist');
    b.events.push({ t: 'assist', who: id });
    resolveSkill(b, helper, SKILLS[bm.assist], null, TIMING.loose, { assist: true });
  });
}
function actorById(b, id) { return id === b.player.id ? b.player : b.enemies.find(e => e.id === id); }
function beginTurn(b, a) {
  a.guard = null;
  a.turnCount++;
  // per-turn ticks
  if (hasStatus(a, 'scorched')) { const d = Math.max(1, Math.round(a.maxHp * 0.06)); a.hp -= d; b.events.push({ t: 'dmg', target: a.id, amount: d, tone: 'HOT' }); b.log(`${a.name} burns for ${d} (Scorched).`); checkDeath(b, a, null); if (b.over || !a.alive) return false; }
  if (hasStatus(a, 'encore')) healActor(b, a, Math.round(a.maxHp * 0.08));
  if (a.side === 'player' && a.funkRegen) { a.fp = Math.min(a.maxFp, a.fp + a.funkRegen); }
  if (a.boss && BOSSES[a.defId].onTurnStart) BOSSES[a.defId].onTurnStart(b, a);
  if (a.charged) return true;
  if (a.flags.loseTurn) { a.flags.loseTurn = false; b.log(`${a.name} is held by the fermata and loses the turn.`); return false; }
  if (hasStatus(a, 'swooned')) { removeStatus(b, a, 'swooned'); b.log(`${a.name} is Swooned and skips the turn.`); return false; }
  if (hasStatus(a, 'offbeat') && chance(a.boss ? 0.25 : 0.5)) { b.log(`${a.name} stumbles Off-Beat and loses the turn.`); return false; }
  return true;
}
function endTurn(b, a) {
  a.statuses = a.statuses.filter(st => { if (st.fresh) { st.fresh = false; return true; } const d = STATUSES[st.id]; if (d.untilTriggered) return true; st.turns--; if (st.turns <= 0) { b.events.push({ t: 'status', target: a.id, id: st.id, add: false }); return false; } return true; });
  if (a.charged === null && hasStatus(a, 'charging')) removeStatus(b, a, 'charging');
}
function enemyAct(b, a) {
  if (!a.alive || b.over) return;
  if (a.charged) { const sk = SKILLS[a.charged]; a.charged = null; removeStatus(b, a, 'charging'); b.log(`${a.name} unleashes ${sk.name}!`, 'boss'); resolveSkill(b, a, sk, b.player, null); return; }
  let skillId = 'en_basic', telegraph = null, timing = null;
  if (a.boss) { const r = BOSSES[a.defId].ai(b, a); skillId = r.skill; telegraph = r.telegraph || null; }
  else if (a.rival || a.defId === 'session_clone') { if (chance(a.rival ? 0.6 : 0.5) && a.skills.length) skillId = pick(a.skills); else skillId = a.riff; timing = rollAutoTiming(); }
  else if (a.special && chance(a.specialChance)) skillId = a.special;
  const sk = SKILLS[skillId] || SKILLS.en_basic;
  if (telegraph) b.log(telegraph, 'telegraph');
  if (skillId !== 'en_basic' && !sk.riff) b.log(`${a.name} uses ${sk.name}!`, a.boss ? 'boss' : '');
  resolveSkill(b, a, sk, b.player, timing);
}
/* Advance until the player's turn or the end. Returns true when waiting for the player. */
function runUntilPlayer(b) {
  let guard = 0;
  while (!b.over && guard++ < 200) {
    if (b.idx < 0 || b.idx >= b.order.length - 1) { if (b.idx >= 0) {/* round ended */} startRound(b); if (b.over) break; }
    b.idx++;
    const a = actorById(b, b.order[b.idx]);
    if (!a || !a.alive) continue;
    b.events.push({ t: 'turn', actor: a.id });
    const canAct = beginTurn(b, a);
    if (b.over) break;
    if (a.side === 'player') {
      if (!canAct) { endTurn(b, a); continue; }
      b.waiting = true; return true;
    }
    if (canAct) enemyAct(b, a);
    if (!b.over) endTurn(b, a);
  }
  return false;
}
/* Player actions */
function playerCanSolo(b) { return b.player.groove >= 100 && !hasStatus(b.player, 'muted'); }
function playerAction(b, action, timing) {
  const p = b.player; b.waiting = false;
  const beat4 = p.bigFour && p.beat === 4;
  if (action.type === 'riff') {
    const sk = SKILLS[p.riff]; resolveSkill(b, p, sk, actorById(b, action.targetId), timing, { beat4 });
    p.fp = Math.min(p.maxFp, p.fp + 2); p.groove = clamp(p.groove + 20 + (timing && timing.groove || 0), 0, 100);
  } else if (action.type === 'play') {
    const sk = SKILLS[action.skillId];
    if (hasStatus(p, 'muted')) { b.log("You're Muted. You can't PLAY."); return finishPlayerTurn(b, false); }
    if (sk.once && p.onceUsed[sk.id]) { b.log(`${sk.name} is once per battle.`); return finishPlayerTurn(b, false); }
    if (p.fp < sk.fp) { b.log('Not enough Funk.'); return finishPlayerTurn(b, false); }
    p.fp -= sk.fp; if (sk.once) p.onceUsed[sk.id] = true;
    b.lastPlayerSkill = sk.id;
    b.log(`${p.name} plays ${sk.name}!`, 'you');
    resolveSkill(b, p, sk, actorById(b, action.targetId), timing, { beat4 });
    p.groove = clamp(p.groove + 10 + (timing && timing.groove || 0), 0, 100);
  } else if (action.type === 'solo') {
    if (!playerCanSolo(b)) { b.log("Can't SOLO right now."); return finishPlayerTurn(b, false); }
    const sk = SKILLS[p.solo]; p.groove = 0;
    b.log(`SOLO! ${p.name} tears into ${sk.name}!`, 'solo');
    resolveSkill(b, p, sk, actorById(b, action.targetId), timing, { beat4 });
    if (timing && timing.groove) p.groove = clamp(p.groove + timing.groove, 0, 100);
  } else if (action.type === 'vamp') {
    p.guard = { pct: 0.5, reflect: 0 }; p.fp = Math.min(p.maxFp, p.fp + Math.round(p.maxFp * 0.15)); p.groove = clamp(p.groove + 10, 0, 100);
    b.log(`${p.name} vamps, holding the groove. (Half damage until your next turn, +15% Funk.)`, 'you');
  } else if (action.type === 'bag') {
    const it = ITEMS[action.itemId];
    if (!it || !countItem(b.state, it.id)) { b.log('You don\'t have that.'); return finishPlayerTurn(b, false); }
    removeItem(b.state, it.id, 1);
    b.log(`${p.name} uses ${it.name}.`, 'you');
    resolveSkill(b, p, { id: it.id, name: it.name, fx: it.use }, p, null, { item: true });
    if (b.flee) { b.log('Second Line Smoke! You slip away in the crowd.', 'good'); endBattle(b, 'fled'); return; }
  } else if (action.type === 'split') {
    if (b.noFlee || b.enemies.some(e => e.alive && (e.boss || e.elite))) { b.log("You can't SPLIT from this one."); return finishPlayerTurn(b, false); }
    const avg = livingEnemies(b).reduce((t, e) => t + effStat(e, 'tempo'), 0) / Math.max(1, livingEnemies(b).length);
    const ch = clamp(0.5 + 0.02 * (effStat(p, 'tempo') - avg), 0.25, 0.9);
    if (chance(ch)) { b.log('You SPLIT. Gone before the downbeat.', 'good'); endBattle(b, 'fled'); return; }
    b.log(`You try to SPLIT (${Math.round(ch * 100)}%) and trip over a go-cup.`);
  } else if (action.type === 'blues') {
    return playTheBlues(b, action.accuracy || 0);
  }
  finishPlayerTurn(b, true);
}
function finishPlayerTurn(b, acted) {
  const p = b.player;
  if (acted && p.bigFour) { p.beat = p.beat % 4 + 1; if (p.flags.setBeat) { p.beat = p.flags.setBeat; p.flags.setBeat = 0; } }
  if (!b.over) endTurn(b, p);
}
function playTheBlues(b, accuracy) {
  const p = b.player; const click = b.enemies.find(e => e.defId === 'the_click');
  if (!click || !click.alive) { b.log('There is nothing to play the blues at.'); return finishPlayerTurn(b, false); }
  if (!b.bluesFree && p.groove < 100) { b.log('You need 100 Groove to Play the Blues.'); return finishPlayerTurn(b, false); }
  if (b.bluesFree) b.bluesFree = false; else p.groove = 0;
  b.log(`${p.name} PLAYS THE BLUES. C... E♭... F... G♭... G... B♭.`, 'solo');
  b.events.push({ t: 'blues', accuracy });
  if (hasStatus(click, 'silence')) { removeStatus(b, click, 'silence'); b.log('PERFECT SILENCE SHATTERS. The Click can be hurt.', 'good'); b.events.push({ t: 'shatter', target: click.id }); }
  const line = b.state.secondLine || [];
  line.forEach(m => { if (!click.alive) return; const d = Math.max(1, Math.round(click.maxHp * 0.03)); click.hp -= d; b.events.push({ t: 'dmg', target: click.id, amount: d, tone: 'FUNK' }); b.log(`${m.name} strikes for ${d}!`, 'assist'); checkDeath(b, click, p); if (click.alive) bossHpHooks(b, click); });
  if (click.alive) { const fx = { tone: 'FUNK', mult: 2.0 * (1 + accuracy), ignoreResist: true }; b.log(`Your own note lands at ${Math.round(accuracy * 100)}% accuracy.`); dealHit(b, p, click, fx, TIMING.one, { isSolo: true }); }
  finishPlayerTurn(b, true);
}

/* ---------- Rewards ---------- */
function battleRewards(b) {
  const s = b.state; const st = derivedStats(s);
  let xp = 0, gold = 0; const drops = [];
  b.enemies.forEach(e => {
    const L = e.level; let ex = 5 + 4 * L; let g = (3 + 3 * L) * rnd(0.75, 1.25);
    if (e.boss) { ex *= 10; g *= 10; } else if (e.elite) { ex *= 2.5; g *= 3; } else if (e.summoned) { ex *= 0.5; g *= 0.5; }
    xp += ex; gold += g;
    if (!e.boss && !e.summoned) {
      if (e.defId === 'enforcer' && s.main.act === 'storyville' && s.main.step === 1 && countItem(s, 'ledgerpage') < 3 && chance(0.5)) drops.push('ledgerpage');
      if ((e.defId === 'data_wraith' || e.defId === 'haint') && s.main.act === 'cemetery' && s.main.step === 1 && countItem(s, 'cryptkey') < 3 && chance(0.5)) drops.push('cryptkey');
      if (chance(0.03)) drops.push('kingcake');
      else if (chance(0.18)) drops.push(pick(['beignet', 'cafe', 'snoball', 'pralines', 'poboy', 'yakamein', 'abita']));
    }
  });
  const mojoBonus = 1 + 0.01 * effStat(b.player, 'mojo') + st.doubloonBonus;
  gold = Math.round(gold * mojoBonus) + b.stolen;
  return { xp: Math.round(xp), gold, drops };
}
function applyBattleResult(b) {
  const s = b.state; const p = b.player;
  s.hp = Math.max(1, p.hp); s.fp = p.fp;
  if (s.mealBuff) { s.mealBuff.fights--; if (s.mealBuff.fights <= 0) s.mealBuff = null; }
  if (s.dreamBuff) { s.dreamBuff.fights--; if (s.dreamBuff.fights <= 0) s.dreamBuff = null; }
  if (b.result === 'win') { healPct(s, 0.1); funkPct(s, 0.2); }
  clampVitals(s);
}
