/* Stress: many underleveled boss fights, detect stalls in the battle loop. */
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
const visible = el => el && !el.hidden; const S = () => w.CF.S; const UI = () => w.CF.UI;
const log = s => process.stderr.write(s + '\n');
async function step() {
  if (visible($('#popup'))) { click($('#popup [data-act="ok"]') || $('#popup [data-act="yes"]') || $('#popup [data-act="popup-close"]')); return 'popup'; }
  if (visible($('#timing'))) { await sleep(50); return 'timing'; }
  if (visible($('#sheet'))) { click($('[data-act="sheet-close"]')); return 'sheet'; }
  if ($('[data-act="continue"]')) { click($('[data-act="continue"]')); await sleep(5); if ($('[data-act="continue"]')) click($('[data-act="continue"]')); return 'cont'; }
  const ch = $$('[data-act^="choice:"]'); if (ch.length) { click(ch[0]); return 'choice'; }
  const t = $$('.ecard.targetable'); if (t.length) { click(t[0]); return 'target'; }
  if ($('[data-act="act:riff"]')) { const p = UI().battle.player; const play = $('[data-act="act:play"]'); if (!play.classList.contains('disabled') && p.fp > 8 && Math.random() < 0.5) { click(play); await sleep(5); const sk = $$('.skillbtn').filter(s => !s.classList.contains('disabled')); if (sk.length) { click(sk[0]); return 'play'; } click($('[data-act="back"]')); } click($('[data-act="act:riff"]')); return 'riff'; }
  if ($$('[data-act^="skill:"]').length) { click($('[data-act="back"]')); return 'back'; }
  if ($('[data-act="retry"]')) { click($('[data-act="retry"]')); return 'retry'; }
  if ($('[data-act="leave"]')) { click($('[data-act="leave"]')); return 'leave'; }
  if ($('[data-act="wake"]')) { click($('[data-act="wake"]')); return 'wake'; }
  return null;
}
(async () => {
  await sleep(100);
  UI().titleSettings.textSpeed = 'instant'; UI().titleSettings.rhythm = 'auto'; UI().titleSettings.reduceMotion = true;
  const cls = process.argv[2] || 'trombone';
  const s0 = w.newState('Stress', 'yat', cls, UI().titleSettings, 0); w.CF.S = s0; s0.flags.metRoux = true; s0.flags.hasCassette = true; s0.main = { act: 'treme', step: 2 }; s0.level = 3; s0.gear.instrument = 'inst_' + cls + '_street'; w.fullRest(s0);
  w.addItem(s0, 'gumbo', 2);
  w.goDistrict('treme'); await sleep(50);
  for (let i = 0; i < 20 && !$('[data-act="streets"]'); i++) { if ($('[data-act="continue"]')) click($('[data-act="continue"]')); await sleep(30); }
  let fights = 0; const t0 = Date.now();
  while (Date.now() - t0 < 240000 && fights < 25) {
    const S1 = S();
    if (S1.flags.boss_captain_hush) { delete S1.flags.boss_captain_hush; delete S1.flags.bosspre_captain_hush; S1.main = { act: 'treme', step: 2 }; S1.level = 3; S1.xp = 0; w.fullRest(S1); w.addItem(S1, 'gumbo', 2); }
    // enter congo and fight
    for (let i = 0; i < 20 && !$('[data-act="streets"]'); i++) { const r = await step(); if (!r) await sleep(40); }
    if (!$('[data-act="streets"]')) { w.renderDistrict(); }
    click($('[data-act="place:congo"]')); await sleep(20);
    const opt = $('[data-act="opt:0"]'); if (!opt) { log('no option; text ' + $('#screen').textContent.slice(0, 100)); break; }
    click(opt); await sleep(20);
    let idle = 0; let lastProgress = Date.now(); let ok = false;
    for (let k = 0; k < 20000; k++) {
      const b = UI().battle;
      if (S().flags.boss_captain_hush && $('[data-act="streets"]')) { ok = true; break; }
      const r = await step();
      if (r) { idle = 0; lastProgress = Date.now(); if (r === 'retry' || r === 'wake') log('  ' + r + ' at ' + Math.round((Date.now() - t0) / 1000) + 's level ' + S().level); await sleep(10); } else { idle++; await sleep(30); }
      if (Date.now() - lastProgress > 8000) {
        log('STALL after fight #' + fights + ' phase ' + (b && b.phase) + ' over ' + (b && b.over) + ' result ' + (b && b.result) + ' events ' + (b && JSON.stringify(b.events).slice(0, 300)) + ' draining ' + (b && JSON.stringify(b.draining)));
        log('dlog ' + (b && JSON.stringify((b.dlog || []).slice(-10))) + ' now ' + Date.now());
        log('screen ' + UI().screen + ' actions ' + $('#actions').textContent.replace(/\s+/g, ' ').slice(0, 100) + ' busy ' + UI().busy);
        log('timing hidden ' + $('#timing').hidden + ' sheet ' + $('#sheet').hidden + ' popup ' + $('#popup').hidden);
        log('errors ' + errors.join('\n'));
        process.exit(1);
      }
    }
    fights++;
    if (!ok) { log('fight did not finish; screen ' + UI().screen); break; }
    if (fights % 5 === 0) log('fights ' + fights + ' level ' + S().level + ' errors ' + errors.length);
  }
  log('done fights ' + fights + ' errors ' + errors.length); if (errors.length) log(errors.join('\n'));
  process.exit(0);
})();
