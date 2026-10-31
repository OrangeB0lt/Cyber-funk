/* Natural-flow test: play Act I legitimately (no dev jumps) — streets, Congo Square, Quarter, Vox. */
const fs = require('fs'); const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'cyberfunk.html'), 'utf8');
const errors = []; const vc = new VirtualConsole();
vc.on('error', (...a) => errors.push(a.map(String).join(' '))); vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
const dom = new JSDOM(html, { url: 'https://cyberfunk.test/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window; const d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = s => d.querySelector(s); const $$ = s => Array.from(d.querySelectorAll(s));
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const clickAct = act => { const el = $(`[data-act="${act}"]`); if (!el) throw new Error('no act ' + act); click(el); };
const visible = el => el && !el.hidden; const S = () => w.CF.S; const UI = () => w.CF.UI;
const log = s => process.stderr.write(s + '\n');
async function step(choose) {
  if (visible($('#popup'))) { click($('#popup [data-act="ok"]') || $('#popup [data-act="yes"]') || $('#popup [data-act="popup-close"]')); return 'popup'; }
  if (visible($('#timing'))) { await sleep(60); return 'timing'; }
  if (visible($('#sheet'))) { clickAct('sheet-close'); return 'sheet'; }
  if ($('[data-act="continue"]')) { click($('[data-act="continue"]')); await sleep(5); if ($('[data-act="continue"]')) click($('[data-act="continue"]')); return 'cont'; }
  const ch = $$('[data-act^="choice:"]'); if (ch.length) { const labels = ch.map(c => c.textContent); const i = choose ? choose(labels) : 0; click(ch[Math.max(0, i)]); return 'choice ' + labels[Math.max(0, i)]; }
  const t = $$('.ecard.targetable'); if (t.length) { click(t[0]); return 'target'; }
  if ($('[data-act="act:riff"]')) {
    const b = UI().battle, p = b.player; const foes = b.enemies.filter(e => e.alive); const tgt = foes[0];
    const TONEITEM = { HOT: 'cayenne', LOW: 'subtape', BLUE: 'indigo', FUNK: 'discobead' };
    const heal = ['gumbo', 'muffuletta', 'poboy', 'beignet'].find(i => w.countItem(S(), i));
    if (p.hp < p.maxHp * (b.boss ? 0.5 : 0.35) && heal) { clickAct('act:bag'); await sleep(10); const u = $(`#sheet [data-act="use:${heal}"]`); if (u) { click(u); return 'heal'; } clickAct('sheet-close'); }
    if (tgt && tgt.resist === p.tone && tgt.weak && !p.nextTone && w.countItem(S(), TONEITEM[tgt.weak]) && p.fp >= 6) { clickAct('act:bag'); await sleep(10); const u = $(`#sheet [data-act="use:${TONEITEM[tgt.weak]}"]`); if (u) { click(u); return 'bead'; } clickAct('sheet-close'); }
    if ($('[data-act="act:blues"]')) { clickAct('act:blues'); return 'blues'; }
    const solo = $('[data-act="act:solo"]'); if (solo.classList.contains('ready')) { click(solo); return 'solo'; }
    const play = $('[data-act="act:play"]'); if (!play.classList.contains('disabled') && p.fp > 8 && Math.random() < 0.75) { click(play); await sleep(5); const sk = $$('.skillbtn').filter(s => !s.classList.contains('disabled') && /×/.test(s.textContent)); if (sk.length) { click(sk[sk.length - 1]); return 'play'; } clickAct('back'); }
    clickAct('act:riff'); return 'riff';
  }
  if ($$('[data-act^="skill:"]').length) { clickAct('back'); return 'back'; }
  if ($('[data-act="retry"]')) { clickAct('retry'); return 'retry'; }
  if ($('[data-act="wake"]')) { clickAct('wake'); return 'wake'; }
  return null;
}
async function until(cond, choose, max) { let idle = 0; for (let i = 0; i < (max || 40000); i++) { if (cond()) return true; const r = await step(choose); if (!r) { idle++; await sleep(15); if (idle > 600) return false; } else { idle = 0; if (r === 'retry' || r === 'wake') log('  (' + r + ' L' + S().level + ')'); await sleep(3); } } return false; }
const inDistrict = () => UI().screen === 'district' && $('[data-act="streets"]');
async function ensureDistrict() { for (let k = 0; k < 6 && !inDistrict(); k++) { if ($('[data-act="leave"]') && !visible($('#sheet'))) { clickAct('leave'); await sleep(20); } else await until(() => inDistrict() || $('[data-act="leave"]')); } if (!inDistrict()) throw new Error('not in district: ' + d.body.textContent.replace(/\s+/g, ' ').slice(0, 200)); }
async function travelTo(did) { if (S().district === did) return; await ensureDistrict(); clickAct('travel'); await sleep(20); clickAct('go:' + did); await until(() => inDistrict() && S().district === did); }
async function grindTo(level, did) { for (let i = 0; i < 40 && S().level < level; i++) { await ensureDistrict(); await travelTo(did); clickAct('streets'); await until(() => inDistrict(), labels => { const i2 = labels.findIndex(l => /Fight|Join|Catch|Sit in|Go ahead|Ask him|Argue|Help|Light|Smash|Walk through|Rip|Open it|Gather|Follow|"A horn|Leave a coin/.test(l)); return i2 >= 0 ? i2 : 0; }); } log('grind: L' + S().level + ' Ð' + S().doubloons); }
async function gearUp() { const pid = S().unlocked.includes('garden') ? 'maison' : 'pawn'; await ensureDistrict(); const did = w.CF.PLACES[pid].district; if (S().district !== did) await travelTo(did); clickAct('place:' + pid); await sleep(20); const o = $$('[data-act^="opt:"]').find(x => /Instruments|Top-tier/.test(x.textContent)); if (!o) { clickAct('leave'); return; } click(o); await sleep(20); for (let k = 0; k < 3; k++) { const b = $$('#sheet [data-act^="buy:"]').filter(x => !x.classList.contains('disabled') && /inst_|thr_|ch_|mod_/.test(x.dataset.act) && S().doubloons - (+x.dataset.act.split(':')[2]) >= 150).sort((a, c) => (+c.dataset.act.split(':')[2]) - (+a.dataset.act.split(':')[2]))[0]; if (!b) break; click(b); await sleep(10); } if (visible($('#sheet'))) clickAct('sheet-close'); await sleep(10); if ($('[data-act="leave"]')) clickAct('leave'); log('gear: ' + JSON.stringify(S().gear) + ' Ð' + S().doubloons); }
async function enter(pid, optIdx, choose) { await ensureDistrict(); const did = w.CF.PLACES[pid].district; if (S().district !== did) await travelTo(did); clickAct('place:' + pid); await sleep(30); const b = $(`[data-act="opt:${optIdx}"]`); if (!b) throw new Error('no option ' + optIdx + ' at ' + pid + ': ' + $('#options').textContent); click(b); await sleep(30); await until(() => $('[data-act="leave"]') || inDistrict(), choose); }
(async () => {
  try {
    await sleep(100);
    UI().titleSettings.textSpeed = 'instant'; UI().titleSettings.rhythm = 'auto'; UI().titleSettings.reduceMotion = true; UI().turbo = true;
    clickAct('new'); await sleep(20); $('#name-input').value = 'Nat'; clickAct('next'); await sleep(10); clickAct('pick:cajun'); clickAct('next'); await sleep(10); clickAct('pick:' + (process.argv[2] || 'trombone')); clickAct('next'); await sleep(20); clickAct('go');
    await until(() => inDistrict());
    log('Tremé reached. main ' + JSON.stringify(S().main) + ' L' + S().level);
    // streets until step 2
    for (let i = 0; i < 12 && S().main.step < 2; i++) { await ensureDistrict(); clickAct('streets'); await until(() => inDistrict(), labels => { const i2 = labels.findIndex(l => /Fight|Join|Catch|Sit in|Go ahead|Ask him|Argue|Help|Light|Smash|Walk through|Rip/.test(l)); return i2 >= 0 ? i2 : 0; }); }
    log('after streets: main ' + JSON.stringify(S().main) + ' L' + S().level + ' Ð' + S().doubloons + ' counters ' + JSON.stringify(S().counters));
    if (S().main.step < 2) throw new Error('did not reach step 2');
    // buy a disco bead or two for trombone vs Hush
    await enter('pawn', 2); // accessories shop
    if (visible($('#sheet'))) { const b = $('#sheet [data-act^="buy:discobead"]'); if (b) { click(b); click(b); } clickAct('sheet-close'); }
    // kitchen: talk to Mama Roux (should advance nothing now), buy food
    await enter('kitchen', 0);
    await grindTo(3, 'treme'); await enter('pawn', 0); await gearUp();
    // Congo Square boss
    await enter('congo', 0, labels => 0);
    await until(() => inDistrict());
    log('after Hush: notes ' + S().notes + ' unlocked ' + S().unlocked + ' main ' + JSON.stringify(S().main) + ' L' + S().level);
    if (!S().notes.includes('C') || !S().unlocked.includes('quarter')) throw new Error('Hush flow broken');
    // travel to quarter
    await ensureDistrict(); clickAct('travel'); await sleep(20); clickAct('go:quarter'); await until(() => inDistrict() && S().district === 'quarter');
    log('in quarter. main ' + JSON.stringify(S().main));
    await enter('feufollet', 0); // Odette
    log('after Odette: main ' + JSON.stringify(S().main) + ' quests ' + JSON.stringify(S().quests));
    if (S().main.step !== 1) throw new Error('Odette did not advance');
    // broadcaster option index: find by text
    await ensureDistrict(); clickAct('place:jackson'); await sleep(30);
    const opts = $$('[data-act^="opt:"]'); const bi = opts.findIndex(o => /licensing broadcaster/.test(o.textContent)); if (bi < 0) throw new Error('no broadcaster option: ' + opts.map(o => o.textContent).join('|'));
    click(opts[bi]); await until(() => $('[data-act="leave"]') || inDistrict(), labels => 0);
    log('after broadcaster: main ' + JSON.stringify(S().main) + ' flags ' + Object.keys(S().flags).join(','));
    if (S().main.step !== 2) throw new Error('broadcaster did not advance');
    // Cutting contest for Sugar
    await ensureDistrict(); clickAct('place:feufollet'); await sleep(30);
    const o2 = $$('[data-act^="opt:"]'); const ci = o2.findIndex(o => /Cutting Contest/.test(o.textContent)); click(o2[ci]); await until(() => $('[data-act="leave"]') || inDistrict(), labels => 0);
    log('after cutting: quests ' + JSON.stringify(S().quests) + ' band ' + JSON.stringify(S().band) + ' L' + S().level);
    await ensureDistrict(); clickAct('place:market'); await sleep(20); click($('[data-act="opt:0"]')); await sleep(20); for (const it of ['indigo','discobead','cayenne','gumbo']) { for (let k = 0; k < 4; k++) { const bb = $(`#sheet [data-act^="buy:${it}:"]`); if (bb && !bb.classList.contains('disabled')) click(bb); } } clickAct('sheet-close'); await sleep(10);
    await grindTo(5, 'quarter'); await gearUp();
    // Vox
    await enter('strip', 0, labels => { const i = labels.findIndex(l => /Reprogram/.test(l)); return i >= 0 ? i : 0; });
    await until(() => inDistrict());
    log('after Vox: notes ' + S().notes + ' unlocked ' + S().unlocked + ' main ' + JSON.stringify(S().main) + ' vox ' + S().flags.vox + ' L' + S().level);
    if (!S().notes.includes('Eb') || S().main.act !== 'storyville') throw new Error('Vox flow broken');
    // Storyville: Céleste, pages, whispers, Ledger
    await ensureDistrict(); clickAct('travel'); await sleep(20); clickAct('go:storyville'); await until(() => inDistrict() && S().district === 'storyville');
    await enter('lantern', 0); log('after Céleste: main ' + JSON.stringify(S().main));
    for (let i = 0; i < 25 && S().main.step < 2; i++) { await ensureDistrict(); await travelTo('storyville'); clickAct('streets'); await until(() => inDistrict(), labels => { const i2 = labels.findIndex(l => /Fight|Open it|Listen|Light|Smash|Rip|Join|Catch|Go ahead|Help|Ask him/.test(l)); return i2 >= 0 ? i2 : 0; }); }
    log('pages: ' + w.countItem(S(), 'ledgerpage') + ' main ' + JSON.stringify(S().main) + ' L' + S().level + ' Ð' + S().doubloons);
    if (S().main.step < 2) throw new Error('pages not collected');
    await gearUp();
    for (let k = 0; k < 4 && S().main.step !== 3; k++) { if (S().doubloons < 70) { for (let i = 0; i < 4; i++) { await ensureDistrict(); await travelTo('storyville'); clickAct('streets'); await until(() => inDistrict(), labels => 0); } } await enter('lantern', 2, labels => 0); } log('after whispers: main ' + JSON.stringify(S().main) + ' Ð' + S().doubloons);
    if (S().main.step !== 3) throw new Error('whispers did not advance');
    await enter('counting', 0, labels => { const i = labels.findIndex(l => /Burn/.test(l)); return i >= 0 ? i : 0; });
    await until(() => inDistrict());
    log('after Ledger: notes ' + S().notes + ' unlocked ' + S().unlocked + ' main ' + JSON.stringify(S().main) + ' contracts ' + S().flags.contracts + ' L' + S().level);
    if (!S().notes.includes('F') || !S().unlocked.includes('bayou')) throw new Error('Ledger flow broken');
    // Bayou
    await ensureDistrict(); clickAct('travel'); await sleep(20); clickAct('go:bayou'); await until(() => inDistrict() && S().district === 'bayou');
    log('bayou main ' + JSON.stringify(S().main));
    await enter('cabin', 0); log('after Clothilde: main ' + JSON.stringify(S().main));
    for (let i = 0; i < 25 && S().main.step < 3; i++) { await ensureDistrict(); await travelTo('bayou'); clickAct('streets'); await until(() => inDistrict(), labels => { const i2 = labels.findIndex(l => /Fight|Follow|Gather|Light|Smash|Rip|Join|Catch|Go ahead|Help|Ask him/.test(l)); return i2 >= 0 ? i2 : 0; }); }
    log('pups: ' + S().counters.pups + ' main ' + JSON.stringify(S().main) + ' L' + S().level);
    if (S().main.step < 3) throw new Error('pups not done');
    await grindTo(9, 'bayou'); await gearUp();
    await enter('pump', 0, labels => { const i = labels.findIndex(l => /Spare/.test(l)); return i >= 0 ? i : 0; });
    await until(() => inDistrict());
    log('after Rougarou: notes ' + S().notes + ' unlocked ' + S().unlocked + ' main ' + JSON.stringify(S().main) + ' lucien ' + S().flags.lucien + ' L' + S().level);
    if (!S().notes.includes('G') || !S().unlocked.includes('cemetery')) throw new Error('Rougarou flow broken');
    // Cemetery
    await ensureDistrict(); clickAct('travel'); await sleep(20); clickAct('go:cemetery'); await until(() => inDistrict() && S().district === 'cemetery');
    await enter('temple', 0); log('after Rosalie: main ' + JSON.stringify(S().main));
    for (let i = 0; i < 30 && S().main.step < 2; i++) { await ensureDistrict(); await travelTo('cemetery'); clickAct('streets'); await until(() => inDistrict(), labels => { const i2 = labels.findIndex(l => /Fight|"A horn|Leave a coin|Light|Smash|Rip|Join|Catch|Go ahead|Help|Ask him/.test(l)); return i2 >= 0 ? i2 : 0; }); }
    log('keys: ' + w.countItem(S(), 'cryptkey') + ' main ' + JSON.stringify(S().main) + ' L' + S().level);
    if (S().main.step < 2) throw new Error('keys not done');
    await grindTo(11, 'cemetery'); await gearUp();
    await enter('mausoleum', 0, labels => 0);
    await until(() => inDistrict());
    log('after Archivist: notes ' + S().notes + ' unlocked ' + S().unlocked + ' main ' + JSON.stringify(S().main) + ' gus ' + S().flags.gusFreed + ' threads ' + S().gear.threads + ' L' + S().level);
    if (!S().notes.includes('Bb') || !S().unlocked.includes('garden') || !S().flags.gusFreed) throw new Error('Archivist flow broken');
    // Garden: invitation via Céleste (burned) then ball then Isolde
    await ensureDistrict(); clickAct('travel'); await sleep(20); clickAct('go:storyville'); await until(() => inDistrict() && S().district === 'storyville');
    await enter('lantern', 0); log('invitation: ' + S().keyItems + ' main ' + JSON.stringify(S().main));
    if (S().main.step !== 1) throw new Error('invitation not obtained');
    await ensureDistrict(); clickAct('travel'); await sleep(20); clickAct('go:garden'); await until(() => inDistrict() && S().district === 'garden');
    await grindTo(13, 'garden'); await gearUp();
    await enter('manor', 0, labels => { let i = labels.findIndex(l => /Enter the ballroom now/.test(l)); if (i >= 0) return i; i = labels.findIndex(l => /Fight your way/.test(l)); return i >= 0 ? i : 0; });
    await until(() => inDistrict());
    log('after Isolde: notes ' + S().notes + ' main ' + JSON.stringify(S().main) + ' L' + S().level);
    if (S().notes.length !== 6 || S().main.act !== 'tower') throw new Error('Isolde flow broken');
    // Second line
    await ensureDistrict(); clickAct('travel'); await sleep(20); clickAct('go:treme'); await until(() => inDistrict() && S().district === 'treme');
    await ensureDistrict(); clickAct('place:club'); await sleep(30);
    const o3 = $$('[data-act^="opt:"]'); const si = o3.findIndex(o => /Form the Second Line/.test(o.textContent)); if (si < 0) throw new Error('no second line option: ' + o3.map(o => o.textContent).join('|'));
    click(o3[si]); await until(() => inDistrict() && S().district === 'tower');
    log('second line: ' + S().secondLine.length + ' main ' + JSON.stringify(S().main));
    await grindTo(15, 'tower'); await gearUp();
    // Tower
    await enter('towerlobby', 0, labels => { const i = labels.findIndex(l => /Go up|Keep playing/.test(l)); return i >= 0 ? i : 0; });
    await until(() => inDistrict() || S().flags.ending);
    await until(() => inDistrict(), labels => { const i = labels.findIndex(l => /Keep playing/.test(l)); return i >= 0 ? i : 0; });
    log('ENDING: ' + S().flags.ending + ' main ' + JSON.stringify(S().main) + ' L' + S().level + ' day ' + S().day);
    if (!S().flags.ending) throw new Error('no ending');
    log('NATURAL FLOW OK. errors ' + errors.length);
    if (errors.length) log(errors.join('\n'));
    process.exit(errors.length ? 1 : 0);
  } catch (e) { log('FAILED: ' + e.message + '\n' + e.stack.split('\n').slice(1, 3).join('\n')); log('screen ' + UI().screen + ' text ' + d.body.textContent.replace(/\s+/g, ' ').slice(0, 500)); const b = UI().battle; if (b) log('battle: phase ' + b.phase + ' idx ' + b.idx + ' order ' + JSON.stringify(b.order) + ' round ' + b.round + ' over ' + b.over + ' result ' + b.result + ' waiting ' + b.waiting + ' events ' + JSON.stringify(b.events).slice(0, 600) + ' draining ' + JSON.stringify(b.draining) + ' player hp ' + b.player.hp + ' alive ' + b.player.alive); log('drainError ' + (b && b.drainError) + ' now ' + Date.now() + ' dlog ' + JSON.stringify((b && b.dlog || []).slice(-8))); log('timing hidden ' + $('#timing').hidden + ' rhythm ' + S().settings.rhythm + ' busy ' + UI().busy + ' lastStop ' + (UI().lastStop || '').split('\n').slice(0, 6).join(' <- ')); log('errors ' + errors.join('\n')); process.exit(1); }
})();
