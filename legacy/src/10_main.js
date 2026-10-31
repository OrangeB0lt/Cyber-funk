/* ============================================================
   CYBER FUNK — save/load, audio, title, character creation, dev menu, boot
   ============================================================ */
'use strict';

/* ---------- Save ---------- */
function saveGame(manual) {
  if (!S) return false;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; } catch (e) { if (manual) toast('Storage is unavailable here. Use Export Save in Settings.'); return false; }
}
function loadRaw() { try { return localStorage.getItem(SAVE_KEY); } catch (e) { return null; } }
function hasSave() { return !!loadRaw(); }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* unavailable */ } }
function migrate(s) {
  if (!s || typeof s !== 'object' || !CLASSES[s.cls] || !ROOTS[s.roots]) return null;
  const fresh = newState(s.name, s.roots, s.cls, s.settings, s.ngPlus);
  Object.keys(fresh).forEach(k => { if (s[k] === undefined) s[k] = fresh[k]; });
  s.settings = Object.assign(defaultSettings(), s.settings || {});
  if (!s.gear.instrument || !GEAR[s.gear.instrument]) s.gear.instrument = `inst_${s.cls}_pawnshop`;
  ['threads', 'charm', 'mod'].forEach(k => { if (s.gear[k] && !GEAR[s.gear[k]]) s.gear[k] = null; });
  s.level = clamp(Math.round(s.level) || 1, 1, LEVEL_CAP);
  clampVitals(s);
  return s;
}
function loadGame() { const raw = loadRaw(); if (!raw) return null; try { return migrate(JSON.parse(raw)); } catch (e) { return null; } }
function exportSave() { if (!S) return null; try { return 'CF1:' + btoa(unescape(encodeURIComponent(JSON.stringify(S)))); } catch (e) { return null; } }
function importSave(code) {
  if (!code || !code.startsWith('CF1:')) return false;
  try { const s = migrate(JSON.parse(decodeURIComponent(escape(atob(code.slice(4)))))); if (!s) return false; S = s; saveGame(false); return true; } catch (e) { return false; }
}

/* ---------- Audio (optional, synthesized) ---------- */
const SFX = {
  ctx: null, ok: true,
  unlock() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; } const AC = window.AudioContext || window.webkitAudioContext; if (!AC) { this.ok = false; return; } this.ctx = new AC(); },
  on() { return this.ok && this.ctx && (!S || S.settings.sound); },
  tone(freq, dur, type, vol, when, slide) {
    if (!this.on()) return; const c = this.ctx; const t = when || c.currentTime;
    const o = c.createOscillator(); const g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol) { if (!this.on()) return; const c = this.ctx; const n = c.sampleRate * dur; const buf = c.createBuffer(1, n, c.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const src = c.createBufferSource(); src.buffer = buf; const g = c.createGain(); g.gain.value = vol || 0.15; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800; src.connect(f); f.connect(g); g.connect(c.destination); src.start(); },
  stab(cls) {
    const m = { trumpet: [523, 'sawtooth', 0.09], trombone: [196, 'sawtooth', 0.1, 233], sousaphone: [87, 'triangle', 0.16], saxophone: [311, 'square', 0.06], clarinet: [587, 'triangle', 0.1], snare: null, bassdrum: null }[cls];
    if (cls === 'snare') { this.noise(0.12, 0.2); return; } if (cls === 'bassdrum') { this.tone(110, 0.25, 'sine', 0.3, null, 45); return; }
    if (m) this.tone(m[0], 0.22, m[1], m[2], null, m[3]);
  },
  hit(toneId) { const f = { HOT: 660, LOW: 110, BLUE: 392, FUNK: 294, SWEET: 784 }[toneId] || 440; this.tone(f, 0.09, toneId === 'LOW' ? 'sine' : 'square', 0.07, null, f * 0.7); },
  crit() { this.noise(0.08, 0.2); this.tone(880, 0.14, 'sawtooth', 0.1, null, 440); },
  coin() { this.tone(1200, 0.08, 'sine', 0.08); this.tone(1800, 0.12, 'sine', 0.06, this.ctx ? this.ctx.currentTime + 0.07 : null); },
  tap(result) { const f = { one: 1047, pocket: 784, loose: 523, clams: 196 }[result] || 440; this.tone(f, result === 'clams' ? 0.25 : 0.1, result === 'clams' ? 'sawtooth' : 'sine', 0.1, null, result === 'clams' ? 140 : null); },
  note(freq, dur) { this.tone(freq, dur || 0.4, 'triangle', 0.14); this.tone(freq * 2, (dur || 0.4) * 0.8, 'sine', 0.04); },
  levelUp() { if (!this.on()) return; const t0 = this.ctx.currentTime; [261.63, 311.13, 349.23, 369.99, 392, 466.16, 523.25].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.12, t0 + i * 0.11)); },
};

/* ---------- Title & creation ---------- */
UI.titleSettings = defaultSettings();
function showTitle() {
  UI.screen = 'title'; closeSheet(); closePopup(); stopBattleLoop(); resetFlows();
  setTop('');
  setScreen(`<div class="title">
    <div class="logo-wrap"><h1 class="logo">CYBER FUNK</h1><div class="sub">A Neon Orleans Jazz-Punk RPG</div><div class="tag">“The city that care forgot never forgot how to play.”</div></div>
    <div class="title-art"><span>▲</span><span>☂</span><span>♪</span></div>
    <div class="version" data-act="version">v${VERSION}</div>
  </div>`);
  const saved = hasSave();
  setActions(`<div class="title-btns">${saved ? btn('continue-game', 'Continue', 'primary wide') : ''}${btn('new', 'New Game', (saved ? '' : 'primary ') + 'wide')}${btn('howto', 'How to Play', 'wide')}${btn('settings', 'Settings', 'wide ghost')}</div>`);
  UI.devTaps = 0;
  UI.h['continue-game'] = () => { const s = loadGame(); if (!s) { toast('No save found.'); showTitle(); return; } S = s; resumeGame(); };
  UI.h.new = async () => { if (saved) { const ok = await confirmBox('Start a new game?', '<p>Your current save will be overwritten when the new game autosaves. Export it first if you want to keep it.</p>', 'New game', 'Cancel'); if (!ok) return; } createCharacter(); };
  UI.h.howto = () => openHowTo(false);
  UI.h.settings = () => openSettings(true);
  UI.h.version = () => { UI.devTaps = (UI.devTaps || 0) + 1; if (UI.devTaps >= 5) { UI.devTaps = 0; openDevMenu(); } };
}
function createCharacter() {
  UI.screen = 'create'; S = null; setTop(''); resetFlows();
  const draft = { name: '', roots: 'creole', cls: 'trumpet' };
  const step1 = () => {
    setScreen(`<div class="create"><h2>Who's playing?</h2><p class="dim">Every Grand Marshal starts with a name.</p><input id="name-input" class="input" maxlength="16" placeholder="Your name" value="${esc(draft.name)}" autocomplete="off"><p class="small dim">Tap Next when you're ready. You can\'t change it later; nobody in Tremé would let you.</p></div>`);
    setActions(`<div class="agrid two">${btn('back', '‹ Title', 'act ghost')}${btn('next', 'Next ▸', 'act primary')}</div>`);
    UI.h.back = () => showTitle();
    UI.h.next = () => { const v = ($('#name-input').value || '').trim(); draft.name = v || pick(['Lagniappe', 'Dawlin', 'Cher', 'Hotshot', 'Lil\' Bit']); step2(); };
    setTimeout(() => { const i = $('#name-input'); if (i) i.focus(); }, 50);
  };
  const step2 = () => {
    setScreen(`<div class="create"><h2>Roots</h2><p class="dim">Where you\'re from. A small bonus, a starting item, and a way of talking.</p>
      ${Object.values(ROOTS).map(r => `<button class="btn card-btn ${draft.roots === r.id ? 'sel' : ''}" data-act="pick:${r.id}"><b>${esc(r.name)}</b> <span class="dim small">${esc(r.home)}</span><div class="small">${esc(r.blurb)}</div><div class="small dim">${esc(r.flavor)}</div></button>`).join('')}</div>`);
    setActions(`<div class="agrid two">${btn('back', '‹ Back', 'act ghost')}${btn('next', 'Next ▸', 'act primary')}</div>`);
    UI.h.pick = (id) => { draft.roots = id; step2(); };
    UI.h.back = () => step1(); UI.h.next = () => step3();
  };
  const step3 = () => {
    setScreen(`<div class="create"><h2>Instrument</h2><p class="dim">Your class. Tap a card to pick it.</p>
      ${Object.values(CLASSES).map(c => { const first = SKILLS[c.skills[0]]; return `<button class="btn card-btn ${draft.cls === c.id ? 'sel' : ''}" data-act="pick:${c.id}" style="--cc:${c.color}"><b style="color:${c.color}">${esc(c.name)}</b> <span class="dim small">“${esc(c.title)}” · ${esc(c.role)}</span><div class="small">${c.tones.map(t => `<span class="tone t-${t}">${t}</span>`).join(' ')} ${esc(c.blurb)}</div><div class="small dim">Heart ${c.base[0]} · Funk ${c.base[1]} · Chops ${c.base[2]} · Grit ${c.base[3]} · Tempo ${c.base[4]} · Mojo ${c.base[5]}</div><div class="small">First skill: <b>${esc(first.name)}</b> (${first.fp} FP): ${esc(first.desc)}</div></button>`; }).join('')}</div>`);
    setActions(`<div class="agrid two">${btn('back', '‹ Back', 'act ghost')}${btn('next', 'Start ▸', 'act primary')}</div>`);
    UI.h.pick = (id) => { draft.cls = id; step3(); };
    UI.h.back = () => step2();
    UI.h.next = () => { S = newState(draft.name, draft.roots, draft.cls, UI.titleSettings, 0); applyDisplaySettings(); openHowTo(true); };
  };
  step1();
}
function openHowTo(thenStart) {
  const html = `<div class="howto">
    <h4>Six actions</h4><p><b>RIFF</b> is your basic attack (+2 Funk, +20 Groove). <b>PLAY</b> spends Funk on a skill. <b>SOLO</b> is your ultimate at 100 Groove. <b>VAMP</b> halves damage until your next turn and restores 15% Funk. <b>BAG</b> uses an item. <b>SPLIT</b> runs (never from bosses or elites).</p>
    <h4>On the One</h4><p>Every RIFF, damaging PLAY, and SOLO pops up a timing bar. Tap anywhere as the marker crosses the glowing <b>ONE</b> zone: ×1.5 damage and +10 Groove. The pocket around it is ×1.2, loose is ×1.0, and a miss is CLAMS at ×0.6. Set Rhythm Taps to Auto in Settings if you'd rather not tap.</p>
    <h4>Tones & weaknesses</h4><p>Every attack has a tone: <span class="tone t-HOT">HOT</span> <span class="tone t-LOW">LOW</span> <span class="tone t-BLUE">BLUE</span> <span class="tone t-FUNK">FUNK</span>. Every enemy has a weakness (×1.5) and usually a resistance (×0.5). Metronome's machines are usually weak to FUNK. Tone tapes and beads change your next attack's tone. The Blue Book remembers what you learn.</p>
    <h4>Groove</h4><p>Builds from RIFF (+20), any skill (+10), hitting a weakness (+10), ON THE ONE (+10), VAMP (+10), and taking damage (+5). At 100, SOLO.</p>
    <h4>Statuses</h4><p>Small chips with turn counters. Tap one to read it.</p>
    <h4>Save</h4><p>Autosaves when you enter a district, after every fight, and before every boss. Save by hand at the Lagniappe club. Export a save code in Settings so progress is never trapped.</p>
  </div>`;
  openSheet('How to Play', html, {}, { foot: thenStart ? btn('go', 'Walk the dirge ▸', 'primary wide') : '' });
  UI.sh.go = () => { closeSheet(); safeFlow(prologue); };
}
/* ---------- Dev menu ---------- */
function openDevMenu() {
  const s = S;
  const bossBtns = Object.keys(BOSSES).map(id => btn('boss:' + id, BOSSES[id].name, 'small')).join('');
  openSheet('Dev Menu', `<p class="small dim">For testing. ${s ? '' : 'Start or load a game first for most of these.'}</p>
    <div class="row">${btn('xp', '+500 XP', 'small')}${btn('gold', '+Ð1000', 'small')}${btn('heal', 'Full heal', 'small')}</div>
    <div class="row">${btn('unlock', 'Unlock all districts', 'small')}${btn('notes', 'Give all Blue Notes', 'small')}</div>
    <div class="row">${btn('band', 'Recruit all bandmates', 'small')}${btn('items', 'Stock the bag', 'small')}${btn('gear', 'Best gear', 'small')}</div>
    <h4>Jump to boss</h4><div class="row wrap">${bossBtns}</div>
    <h4>Jump to act</h4><div class="row wrap">${ACT_ORDER.filter(a => a !== 'done').map(a => btn('act:' + a, a, 'small')).join('')}</div>`, {
    xp: () => { if (!S) return; const ups = gainXp(S, 500); renderTopbar(); toast('+500 XP'); if (ups.length) showLevelUps(ups); },
    gold: () => { if (!S) return; S.doubloons += 1000; renderTopbar(); toast('+Ð1000'); },
    heal: () => { if (!S) return; fullRest(S); renderTopbar(); toast('Healed.'); },
    unlock: () => { if (!S) return; S.unlocked = Object.keys(DISTRICTS); toast('All districts unlocked.'); },
    notes: () => { if (!S) return; S.notes = SCALE_ORDER.slice(); toast('All six Blue Notes.'); },
    band: () => { if (!S) return; S.band.recruited = Object.keys(BANDMATES); S.band.active = ['sugar', 'static']; Object.assign(S.quests, { cutting: 'done', static_contract: 'done', faisdodo: 'done', haints: 'done' }); toast('Band recruited.'); },
    items: () => { if (!S) return; ['gumbo', 'poboy', 'muffuletta', 'chicory', 'yakamein', 'pralines', 'discobead', 'cayenne', 'indigo', 'subtape', 'smoke'].forEach(i => addItem(S, i, 5)); addItem(S, 'grisgris', 1); toast('Bag stocked.'); },
    gear: () => { if (!S) return; const tier = S.level >= 11 ? 'chrome' : S.level >= 7 ? 'neon' : 'street'; S.gear.instrument = `inst_${S.cls}_${tier}`; if (!S.gearBag.includes(S.gear.instrument)) S.gearBag.push(S.gear.instrument); S.gear.threads = S.level >= 11 ? 'thr_kevlar' : S.level >= 8 ? 'thr_duster' : 'thr_secondline'; S.gearBag.push(S.gear.threads); S.gear.charm = 'ch_gator'; S.gearBag.push('ch_gator'); S.gear.mod = 'mod_jaw'; S.gearBag.push('mod_jaw'); clampVitals(S); renderTopbar(); toast('Geared up.'); },
    boss: async (id) => { if (!S) return; closeSheet(); const bd = BOSSES[id]; const d = bd.district; if (!S.unlocked.includes(d)) S.unlocked.push(d); S.district = d; delete S.flags['boss_' + id]; delete S.flags['bosspre_' + id];
      const acts = { captain_hush: ['treme', 2], vox_perfecta: ['quarter', 2], mr_ledger: ['storyville', 3], rougarou: ['bayou', 3], archivist: ['cemetery', 2], isolde: ['garden', 2], conductor: ['tower', 1], the_click: ['tower', 1] };
      S.main = { act: acts[id][0], step: acts[id][1] }; if (S.level < bd.lvl) { S.level = bd.lvl; fullRest(S); }
      if (id === 'conductor' || id === 'the_click') { if (!S.secondLine) S.secondLine = SECOND_LINE.filter(m => m.cond(S)).map(m => ({ id: m.id, name: m.name })); S.flags.gusFreed = true; S.towerFloor = id === 'conductor' ? 3 : 4; S.towerFight = 0; S.flags.boss_conductor = id === 'the_click'; await safeFlow(towerFlow); return; }
      await safeFlow(() => bossFlow(id)); },
    act: (a) => { if (!S) return; const idx = ACT_ORDER.indexOf(a); S.unlocked = ACT_ORDER.slice(0, idx + 1).filter(x => DISTRICTS[x]); S.main = { act: a, step: 0 }; S.flags.metRoux = true; ACT_ORDER.slice(0, idx).forEach(prev => { const b = DISTRICTS[prev] && DISTRICTS[prev].boss; if (b) { S.flags['boss_' + b] = true; const n = Object.keys(BLUE_NOTES).find(k => BLUE_NOTES[k].boss === b); if (n && !S.notes.includes(n)) S.notes.push(n); } }); if (idx >= 5) { S.flags.gusFreed = true; } const lv = DISTRICTS[a] ? DISTRICTS[a].lvl[0] : 13; if (S.level < lv) { S.level = lv; fullRest(S); } closeSheet(); safeFlow(() => goDistrict(DISTRICTS[a] ? a : 'tower')); },
  });
}
/* ---------- Boot & resume ---------- */
function resetFlows() { UI.busy = false; UI.continueResolve = null; UI.typing = null; UI.onSheetClose = null; UI.h = {}; UI.sh = {}; UI.ph = {}; }
async function resumeGame() {
  applyDisplaySettings(); closeSheet(); closePopup(); stopBattleLoop(); resetFlows();
  const pb = S.pendingBattle; S.pendingBattle = null;
  if (pb && pb.type === 'tutorial') { await safeFlow(async () => { storyScreen('Prologue: The Dirge'); renderTopbar(); await narrate('You pick the song back up where the Hush interrupted it.'); const r = await runBattle(buildEnemies(pb.step === 1 ? ['hush_patrol'] : ['hush_patrol', 'hush_patrol'], { level: 1 }), { ctx: { type: 'tutorial', step: pb.step }, context: 'tutorial', noFlee: true }); if (r !== 'win') return; if (pb.step === 1) { const r2 = await runBattle(buildEnemies(['hush_patrol', 'hush_patrol'], { level: 1 }), { ctx: { type: 'tutorial', step: 2 }, context: 'tutorial', noFlee: true, intro: 'Two more Patrolmen.' }); if (r2 !== 'win') return; } await prologueEnd(); }); return; }
  if (S.main.act === 'treme' && S.main.step === 0 && !S.flags.metRoux && !S.flags.hasCassette) { await safeFlow(prologue); return; }
  if (pb && pb.type === 'tower') { S.district = 'tower'; }
  if (!DISTRICTS[S.district] || !S.unlocked.includes(S.district)) S.district = 'treme';
  await safeFlow(async () => { await goDistrict(S.district); if (pb && pb.type !== 'street') toast('Your last fight restarts when you go back in.'); });
}
function init() {
  wireGlobal();
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) UI.titleSettings.reduceMotion = true; } catch (e) { /* ignore */ }
  applyDisplaySettings();
  const start = (hot) => {
    if (hot && hot.state) { const s = migrate(hot.state); if (s) { S = s; resumeGame(); return; } }
    showTitle();
  };
  try { if (window.claude && window.claude.hot && typeof window.claude.hot.snapshot === 'function') window.claude.hot.snapshot(() => ({ state: S })); } catch (e) { /* not in viewer */ }
  try { if (window.claude && window.claude.hot && typeof window.claude.hot.ready === 'function') { window.claude.hot.ready(start); return; } } catch (e) { /* not in viewer */ }
  start((window.claude && window.claude.hot && window.claude.hot.data) || {});
}
/* Debug handle (used by the dev menu and automated tests). */
window.CF = { get S() { return S; }, set S(v) { S = v; }, UI, DISTRICTS, PLACES, BOSSES, ENEMIES, ITEMS, GEAR, CLASSES, SKILLS, STATUSES, BALANCE, VERSION };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
