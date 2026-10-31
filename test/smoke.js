/* jsdom smoke test: drives the real UI through the game. */
const fs = require('fs'); const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'dist', 'cyberfunk.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('error', (...a) => { errors.push(a.map(String).join(' ')); });
vc.on('jsdomError', (e) => { if (String(e).includes('Could not load') || String(e).includes('Not implemented')) return; errors.push('jsdomError: ' + (e.message || e)); });
vc.on('log', () => {}); vc.on('warn', () => {});
const dom = new JSDOM(html, { url: 'https://cyberfunk.test/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc, resources: undefined });
const w = dom.window; const d = w.document;
w.addEventListener('error', (e) => { errors.push('window error: ' + (e.message || e)); });
w.addEventListener('unhandledrejection', (e) => { errors.push('unhandled: ' + (e.reason && e.reason.stack || e.reason)); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const $ = s => d.querySelector(s); const $$ = s => Array.from(d.querySelectorAll(s));
const click = el => { if (!el) throw new Error('click on null'); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const clickAct = act => { const el = $(`[data-act="${act}"]`); if (!el) throw new Error('no act ' + act + ' on screen: ' + d.body.textContent.slice(0, 200)); click(el); };
async function waitFor(fn, ms, label) { const t0 = Date.now(); while (Date.now() - t0 < (ms || 8000)) { try { const v = fn(); if (v) return v; } catch (e) { /* retry */ } await sleep(25); } throw new Error('timeout: ' + (label || fn.toString())); }
const visible = el => el && !el.hidden;
const S = () => w.CF.S; const UI = () => w.CF.UI;
let steps = 0;
/* Autoplay one UI step. choice: function(options)->index */
async function step(opts) {
  opts = opts || {}; steps++;
  if (visible($('#popup'))) { const b = $('#popup [data-act="ok"]') || $('#popup [data-act="yes"]') || $('#popup [data-act="popup-close"]'); click(b); await sleep(20); return 'popup'; }
  if (visible($('#timing'))) { await sleep(60); return 'timing'; }
  if (visible($('#sheet'))) { if (opts.sheet) { const r = await opts.sheet(); if (r) return 'sheet'; } clickAct('sheet-close'); await sleep(20); return 'sheet-close'; }
  const cont = $('[data-act="continue"]'); if (cont) { click(cont); await sleep(10); if ($('[data-act="continue"]')) { click($('[data-act="continue"]')); } await sleep(20); return 'continue'; }
  const choices = $$('[data-act^="choice:"]'); if (choices.length) { const i = opts.choose ? opts.choose(choices.map(c => c.textContent)) : 0; click(choices[Math.min(i, choices.length - 1)]); await sleep(20); return 'choice'; }
  const targ = $$('.ecard.targetable'); if (targ.length) { click(targ[0]); await sleep(20); return 'target'; }
  if ($('[data-act="act:riff"]')) {
    const b = UI().battle; const p = b && b.player;
    if (p && p.hp < p.maxHp * 0.4 && w.countItem(S(), 'gumbo') && $('[data-act="act:bag"]')) { clickAct('act:bag'); await waitFor(() => visible($('#sheet'))); const u = $('#sheet [data-act="use:gumbo"]'); if (u) { click(u); await sleep(20); return 'item'; } clickAct('sheet-close'); }
    if ($('[data-act="act:blues"]')) { clickAct('act:blues'); await sleep(50); return 'blues'; }
    const solo = $('[data-act="act:solo"]'); if (solo && solo.classList.contains('ready')) { click(solo); await sleep(20); return 'solo'; }
    const play = $('[data-act="act:play"]'); if (play && !play.classList.contains('disabled') && p && p.fp > 10 && Math.random() < 0.6) { click(play); await sleep(20); const sk = $$('.skillbtn').filter(s => !s.classList.contains('disabled')); if (sk.length) { click(sk[sk.length - 1]); await sleep(20); return 'play'; } clickAct('back'); }
    clickAct('act:riff'); await sleep(20); return 'riff';
  }
  if ($('[data-act="skill:"]')) { clickAct('back'); return 'back'; }
  if ($('[data-act="retry"]')) { clickAct('retry'); return 'retry'; }
  if ($('[data-act="wake"]')) { clickAct('wake'); return 'wake'; }
  return null;
}
async function autoplayUntil(cond, maxSteps, opts) {
  let idle = 0;
  for (let i = 0; i < (maxSteps || 3000); i++) {
    if (cond()) return true;
    const r = await step(opts);
    if (!r) { idle++; await sleep(40); if (idle > 300) return false; } else idle = 0;
  }
  return false;
}
const inDistrict = () => UI().screen === 'district' && $('[data-act="streets"]');
async function ensureDistrict() { for (let i = 0; i < 5 && !inDistrict(); i++) { if ($('[data-act="leave"]') && !visible($('#sheet')) && !visible($('#popup'))) { clickAct('leave'); await sleep(20); } else await autoplayUntil(() => inDistrict() || $('[data-act="leave"]'), 800); } if (!inDistrict()) w.renderDistrict(); }
async function enterDistrictAndWait() { await autoplayUntil(() => inDistrict(), 2000); }

(async () => {
  try {
    await waitFor(() => $('.logo'), 5000, 'title');
    console.log('title ok');
    // settings on title: instant text, auto rhythm
    UI().titleSettings.textSpeed = 'instant'; UI().titleSettings.rhythm = 'auto'; UI().titleSettings.reduceMotion = true;
    clickAct('new');
    await waitFor(() => $('#name-input'));
    $('#name-input').value = 'Tester'; clickAct('next'); await sleep(20);
    clickAct('pick:yat'); await sleep(20); clickAct('next'); await sleep(20);
    clickAct('pick:' + (process.argv[2] || 'trumpet')); await sleep(20); clickAct('next');
    await waitFor(() => visible($('#sheet')));
    clickAct('go');
    console.log('prologue started');
    await autoplayUntil(() => inDistrict(), 2500);
    if (!inDistrict()) throw new Error('did not reach district after prologue; screen=' + UI().screen + ' text=' + d.body.textContent.slice(0, 300));
    console.log('reached Tremé, level', S().level, 'hp', S().hp, 'main', JSON.stringify(S().main));
    // Save round trip
    const code = w.exportSave(); if (!code || !w.importSave(code)) throw new Error('export/import failed');
    const raw = w.localStorage.getItem('cyberfunk_save_v1'); if (!raw) throw new Error('no autosave');
    console.log('save ok', (raw.length / 1024).toFixed(1) + 'KB');
    // Open every menu sheet
    for (const m of ['status', 'bag', 'gear', 'band', 'journal', 'book', 'lexicon', 'settings']) { clickAct('menu'); await waitFor(() => visible($('#sheet'))); clickAct('m:' + m); await sleep(30); if (!visible($('#sheet'))) throw new Error('sheet ' + m + ' failed'); clickAct('sheet-close'); await sleep(10); }
    console.log('menus ok');
    // Hit the streets several times
    for (let i = 0; i < 6; i++) { clickAct('streets'); await autoplayUntil(() => inDistrict(), 800); if (!inDistrict()) throw new Error('streets did not return to district (' + i + ')'); }
    console.log('streets ok, level', S().level, 'Ð', S().doubloons, 'main', JSON.stringify(S().main));
    // Visit every place in every district via dev act jumps, click every option once (with autoplay)
    const visitDistrict = async (did) => {
      const dd = w.CF.DISTRICTS[did];
      for (const pid of dd.places) {
        await ensureDistrict();
        clickAct('place:' + pid); await sleep(30);
        const n = $$('[data-act^="opt:"]').length;
        for (let i = 0; i < n; i++) {
          if (!$(`[data-act="opt:${i}"]`)) { // re-enter place
            if (!$('[data-act="leave"]')) { await autoplayUntil(() => inDistrict() || $('[data-act="leave"]'), 600); }
            if (inDistrict()) { clickAct('place:' + pid); await sleep(30); }
          }
          const b = $(`[data-act="opt:${i}"]`); if (!b) continue;
          const label = b.textContent.slice(0, 40);
          click(b); await sleep(30);
          await autoplayUntil(() => $('[data-act="leave"]') || inDistrict(), 1500, { choose: (labels) => { const i2 = labels.findIndex(l => /Not |Keep|Just|Leave|Wait|Watch|Suit|Don't|Nobody|Keep playing|Step outside|Not tonight|Not yet|Walk away|Just watch|Keep walking|Leave it|Let me/.test(l)); return i2 >= 0 ? i2 : 0; }, sheet: async () => { const sb = $('#sheet [data-act^="buy:"]:not(.disabled)'); if (sb && Math.random() < 0.5) { click(sb); await sleep(20); } return false; } });
          if (errors.length) { console.log('ERRORS after', did, pid, label); console.log(errors.join('\n')); process.exit(1); }
        }
        if ($('[data-act="leave"]')) clickAct('leave'); else await autoplayUntil(() => inDistrict(), 400);
        await sleep(20);
      }
    };
    for (const did of ['treme', 'quarter', 'storyville', 'bayou', 'cemetery', 'garden', 'tower']) {
      // jump via dev menu
      await ensureDistrict(); await sleep(60);
      w.openDevMenu(); await waitFor(() => visible($('#sheet'))); clickAct('act:' + did); await sleep(30);
      await autoplayUntil(() => inDistrict(), 500);
      w.openDevMenu(); clickAct('band'); clickAct('items'); clickAct('gold'); clickAct('gear'); clickAct('sheet-close'); await sleep(10);
      if (did === 'tower') { S().main.step = 0; }
      console.log('visiting', did, 'level', S().level);
      await visitDistrict(did);
      // streets in this district
      for (let i = 0; i < 3; i++) { await ensureDistrict(); clickAct('streets'); await autoplayUntil(() => inDistrict(), 800); }
      console.log('  done', did, 'level', S().level, 'errors', errors.length);
      if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
    }
    // Boss gauntlet via dev menu
    for (const bid of ['captain_hush', 'vox_perfecta', 'mr_ledger', 'rougarou', 'archivist', 'isolde', 'conductor', 'the_click']) {
      await ensureDistrict(); await sleep(60);
      w.openDevMenu(); await waitFor(() => visible($('#sheet'))); clickAct('items'); clickAct('gear'); clickAct('band'); clickAct('heal'); clickAct('boss:' + bid); await sleep(50);
      const t0 = Date.now();
      await autoplayUntil(() => inDistrict() || $('.credits') || $('[data-act="choice:0"]') && /New Game\+/.test($('[data-act="choice:0"]').textContent), 4000, { choose: (labels) => { const i = labels.findIndex(l => /Keep playing|Reprogram|Burn|Spare|Enter the ballroom now|Go up|Not yet/.test(l)); return i >= 0 ? i : 0; } });
      console.log('boss', bid, 'done in', ((Date.now() - t0) / 1000).toFixed(1) + 's', 'flag', !!S().flags['boss_' + bid], 'notes', S().notes.length, 'errors', errors.length);
      if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
      if (bid === 'the_click') { if (!S().flags.ending) throw new Error('ending flag not set'); const ch = $$('[data-act^="choice:"]'); if (ch.length) { click(ch[1]); } await autoplayUntil(() => inDistrict(), 500); }
    }
    // Reload mid-district: simulate by loading save
    const s2 = w.loadGame(); if (!s2) throw new Error('reload failed');
    console.log('ALL OK. steps', steps, 'errors', errors.length);
    process.exit(0);
  } catch (e) { console.log('FAILED:', e.message); console.log(e.stack.split('\n').slice(0, 4).join('\n')); console.log('screen:', UI() && UI().screen, 'text:', d.body.textContent.replace(/\s+/g, ' ').slice(0, 400)); console.log('errors:', errors.join('\n')); process.exit(1); }
})();
