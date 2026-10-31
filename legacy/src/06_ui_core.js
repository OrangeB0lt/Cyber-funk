/* ============================================================
   CYBER FUNK — UI core: renderer, typewriter, sheets, menus
   ============================================================ */
'use strict';

let S = null; // the one serializable game state
const UI = { h: {}, sh: {}, ph: {}, typing: null, continueResolve: null, sheetOpen: false, popupOpen: false, ambientIdx: {}, busy: false, battle: null, screen: 'title', rafId: null };
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmtD = n => 'Ð' + Math.round(n).toLocaleString('en-US');
/* sleep with a belt-and-braces ticker: resolves on its own timeout or the shared 40ms tick, whichever fires first. */
const SLEEPS = []; let sleepTicker = null;
function tickSleeps() { const now = Date.now(); for (let i = SLEEPS.length - 1; i >= 0; i--) { if (now >= SLEEPS[i].at) { const sl = SLEEPS.splice(i, 1)[0]; sl.fin(); } } if (!SLEEPS.length && sleepTicker) { clearInterval(sleepTicker); sleepTicker = null; } }
function sleep(ms) { return new Promise(r => { let done = false; const fin = () => { if (done) return; done = true; r(); }; setTimeout(fin, ms); SLEEPS.push({ at: Date.now() + ms, fin }); if (!sleepTicker) sleepTicker = setInterval(tickSleeps, 40); }); }
class FlowAbort extends Error { constructor(why) { super(why || 'abort'); this.flowAbort = true; } }

function btn(act, label, cls, attrs) { return `<button class="btn ${cls || ''}" data-act="${esc(act)}" ${attrs || ''}>${label}</button>`; }
function setTop(html) { const t = $('#topbar'); t.innerHTML = html; t.hidden = !html; }
function setScreen(html) { $('#screen').innerHTML = html; $('#screen').scrollTop = 0; }
function setActions(html) { $('#actions').innerHTML = html; }
function toast(text, ms) {
  const t = $('#toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(UI.toastTimer); UI.toastTimer = setTimeout(() => t.classList.remove('show'), ms || 1800);
}
function applyDisplaySettings() {
  const app = $('#app'); const st = (S && S.settings) || defaultSettings();
  app.classList.toggle('size-S', st.textSize === 'S'); app.classList.toggle('size-L', st.textSize === 'L');
  app.classList.toggle('reduce-motion', !!st.reduceMotion);
}

/* ---------- Lexicon-aware text ---------- */
let LEX_RE = null;
function lexRegex() {
  if (LEX_RE) return LEX_RE;
  const keys = Object.keys(GLOSSARY).filter(k => !GLOSSARY[k].noauto).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['\u2019]"));
  try { LEX_RE = new RegExp('(^|[^\\p{L}\\p{N}])(' + keys.join('|') + ')(?![\\p{L}\\p{N}])', 'giu'); } catch (e) { LEX_RE = /(?!)/g; }
  return LEX_RE;
}
function autoLex(text, seen) {
  const out = []; const re = lexRegex(); re.lastIndex = 0; let last = 0, m;
  while ((m = re.exec(text))) {
    const key = m[2].toLowerCase().replace(/\u2019/g, "'");
    if (!GLOSSARY[key] || seen.has(key)) continue;
    seen.add(key);
    const start = m.index + m[1].length;
    if (start > last) out.push({ t: text.slice(last, start) });
    out.push({ t: m[2], lex: key });
    last = start + m[2].length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
function parseLex(text) {
  const parts = []; const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g; let last = 0, m; const seen = new Set();
  const plain = t => { autoLex(t, seen).forEach(p => parts.push(p)); };
  while ((m = re.exec(text))) {
    if (m.index > last) plain(text.slice(last, m.index));
    const key = m[1].trim().toLowerCase(); const disp = m[2] || m[1];
    seen.add(key);
    parts.push({ t: disp, lex: GLOSSARY[key] ? key : null });
    last = re.lastIndex;
  }
  if (last < text.length) plain(text.slice(last));
  return parts;
}
function lexHtml(text) {
  return parseLex(text).map(p => p.lex ? `<span class="lex" data-lex="${esc(p.lex)}">${esc(p.t)}</span>` : esc(p.t)).join('');
}
function noteLexicon(key) { if (!S) return; if (!S.lexicon.includes(key)) S.lexicon.push(key); }

/* ---------- Topbar ---------- */
function renderTopbar() {
  if (!S) { setTop(''); return; }
  const st = derivedStats(S);
  if (S.hp > st.maxHp) S.hp = st.maxHp; if (S.fp > st.maxFp) S.fp = st.maxFp;
  setTop(`<div class="top" data-act="status">
    <div class="top-name"><b>${esc(S.name)}</b> <span class="dim">Lv ${S.level}</span></div>
    <div class="top-bars">
      <div class="bar heart"><i style="width:${Math.round(100 * S.hp / st.maxHp)}%"></i><span>♥ ${S.hp}/${st.maxHp}</span></div>
      <div class="bar funk"><i style="width:${Math.round(100 * S.fp / st.maxFp)}%"></i><span>♪ ${S.fp}/${st.maxFp}</span></div>
    </div>
    <div class="top-gold">${fmtD(S.doubloons)}</div>
  </div>`);
}

/* ---------- Story / typewriter ---------- */
function storyScreen(title) {
  UI.screen = 'story';
  setScreen(`<div class="story" id="story">${title ? `<h2 class="scene-title">${esc(title)}</h2>` : ''}</div>`);
}
function typeSpeed() { const t = S ? S.settings.textSpeed : 'normal'; return t === 'instant' ? 0 : t === 'fast' ? 7 : t === 'slow' ? 34 : 16; }
function typeInto(el, text) {
  return new Promise(resolve => {
    const parts = parseLex(text); const chars = [];
    parts.forEach(p => {
      const wrap = document.createElement('span'); if (p.lex) { wrap.className = 'lex'; wrap.dataset.lex = p.lex; noteLexicon(p.lex); }
      for (const ch of p.t) { const c = document.createElement('span'); c.className = 'ch hide'; c.textContent = ch; wrap.appendChild(c); chars.push(c); }
      el.appendChild(wrap);
    });
    const speed = typeSpeed();
    let i = 0; let done = false;
    const finish = () => { if (done) return; done = true; clearInterval(timer); chars.forEach(c => c.classList.remove('hide')); UI.typing = null; resolve(); };
    UI.typing = finish;
    const timer = speed ? setInterval(() => { for (let k = 0; k < 1 && i < chars.length; k++) chars[i++].classList.remove('hide'); if (i >= chars.length) finish(); }, speed) : null;
    if (!speed) finish();
  });
}
function scrollStory() { const sc = $('#screen'); sc.scrollTop = sc.scrollHeight; }
async function line(who, text, color) {
  const story = $('#story') || (storyScreen(), $('#story'));
  const p = document.createElement('p'); p.className = 'line' + (who ? ' spoken' : ' narr');
  if (who) { const n = document.createElement('span'); n.className = 'who'; n.style.color = color || '#fff'; n.textContent = who; p.appendChild(n); }
  const body = document.createElement('span'); body.className = 'txt'; p.appendChild(body);
  story.appendChild(p); scrollStory();
  setActions(btn('continue', 'Continue ▸', 'primary wide'));
  await typeInto(body, text); scrollStory();
  await waitContinue();
}
function waitContinue() {
  return new Promise(resolve => { UI.continueResolve = () => { UI.continueResolve = null; resolve(); }; });
}
async function narrate(text) { await line(null, text, null); }
async function say(npcId, text) { const n = NPCS[npcId] || { name: npcId, color: '#fff' }; await line(n.name, text, n.color); }
function choose(options, prompt) {
  return new Promise(resolve => {
    const opts = options.filter(o => o && (o.cond === undefined || o.cond));
    if (prompt) { const story = $('#story'); if (story) { const p = document.createElement('p'); p.className = 'line narr prompt'; p.innerHTML = lexHtml(prompt); story.appendChild(p); scrollStory(); } }
    setActions(`<div class="choices">${opts.map((o, i) => btn('choice:' + i, esc(o.label.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m0, a, b) => b || a)), 'choice' + (o.cls ? ' ' + o.cls : ''))).join('')}</div>`);
    UI.h.choice = (idx) => { const o = opts[idx]; const story = $('#story'); if (story && !o.silent) { const p = document.createElement('p'); p.className = 'line you'; p.innerHTML = `<span class="who" style="color:#fff">${esc(S ? S.name : 'You')}</span><span class="txt">${lexHtml(o.label.replace(/^"|"$/g, ''))}</span>`; story.appendChild(p); scrollStory(); } setActions(''); resolve(options.indexOf(o)); };
  });
}
function clearStory() { const st = $('#story'); if (st) st.innerHTML = ''; }

/* ---------- Sheets & popups ---------- */
function openSheet(title, bodyHtml, handlers, opts) {
  opts = opts || {}; UI.sh = handlers || {}; UI.sheetOpen = true;
  const sh = $('#sheet');
  sh.innerHTML = `<div class="sheet-card"><div class="sheet-head"><h3>${esc(title)}</h3>${opts.back ? btn('sheet-back', '‹ Menu', 'small ghost') : ''}${btn('sheet-close', '✕', 'small ghost close')}</div><div class="sheet-body">${bodyHtml}</div>${opts.foot ? `<div class="sheet-foot">${opts.foot}</div>` : ''}</div>`;
  sh.hidden = false; sh.classList.add('open'); sh.querySelector('.sheet-body').scrollTop = 0;
}
function closeSheet() { const sh = $('#sheet'); sh.hidden = true; sh.classList.remove('open'); sh.innerHTML = ''; UI.sheetOpen = false; UI.sh = {}; if (UI.onSheetClose) { const f = UI.onSheetClose; UI.onSheetClose = null; f(); } }
function popup(title, bodyHtml, handlers) {
  UI.ph = handlers || {}; UI.popupOpen = true;
  const p = $('#popup'); p.innerHTML = `<div class="popup-card"><h4>${esc(title)}</h4><div class="popup-body">${bodyHtml}</div>${btn('popup-close', 'OK', 'primary wide')}</div>`;
  p.hidden = false;
}
function closePopup() { const p = $('#popup'); p.hidden = true; p.innerHTML = ''; UI.popupOpen = false; UI.ph = {}; }
function confirmBox(title, bodyHtml, yes, no) {
  return new Promise(resolve => {
    UI.ph = { yes: () => { closePopup(); resolve(true); }, no: () => { closePopup(); resolve(false); } }; UI.popupOpen = true;
    const p = $('#popup'); p.innerHTML = `<div class="popup-card"><h4>${esc(title)}</h4><div class="popup-body">${bodyHtml}</div><div class="row">${btn('no', no || 'Cancel', 'ghost')}${btn('yes', yes || 'OK', 'primary')}</div></div>`;
    p.hidden = false;
  });
}
function showLexicon(key) {
  const g = GLOSSARY[key]; if (!g) return; noteLexicon(key);
  popup(g.term, `${g.pron ? `<div class="dim">“${esc(g.pron)}”</div>` : ''}<p>${esc(g.def)}</p><div class="dim small">${esc(g.cat)} · saved to your Lexicon</div>`);
}
function showStatusInfo(id) { const d = STATUSES[id]; if (!d) return; popup(d.name, `<p>${esc(d.desc)}</p><div class="dim small">${d.kind === 'good' ? 'Buff' : 'Debuff'} · ${d.untilTriggered ? 'until triggered' : d.turns + ' turns'}</div>`); }

/* ---------- Global tap handling ---------- */
function wireGlobal() {
  const app = $('#app');
  app.addEventListener('click', ev => {
    const lex = ev.target.closest('.lex'); if (lex) { ev.stopPropagation(); showLexicon(lex.dataset.lex); return; }
    const chip = ev.target.closest('.chip[data-status]'); if (chip) { ev.stopPropagation(); showStatusInfo(chip.dataset.status); return; }
    const el = ev.target.closest('[data-act]'); if (!el) {
      // tap on story area advances the typewriter
      if (ev.target.closest('#screen') && (UI.typing || UI.continueResolve) && !UI.sheetOpen && !UI.popupOpen) { if (UI.typing) UI.typing(); else if (UI.continueResolve) UI.continueResolve(); }
      return;
    }
    const act = el.dataset.act; const inPopup = !!ev.target.closest('#popup'); const inSheet = !!ev.target.closest('#sheet');
    if (inPopup) { if (act === 'popup-close') { closePopup(); return; } const f = UI.ph[act] || UI.ph[act.split(':')[0]]; if (f) f(act.includes(':') ? act.slice(act.indexOf(':') + 1) : undefined, el); return; }
    if (UI.popupOpen) return;
    if (inSheet) { if (act === 'sheet-close') { closeSheet(); return; } if (act === 'sheet-back') { openMenu(); return; } const f = UI.sh[act] || UI.sh[act.split(':')[0]]; if (f) f(act.includes(':') ? act.slice(act.indexOf(':') + 1) : undefined, el); return; }
    if (UI.sheetOpen) return;
    if (act === 'continue') { if (UI.typing) UI.typing(); else if (UI.continueResolve) UI.continueResolve(); return; }
    if (act === 'status') { openStatus(); return; }
    if (act === 'menu') { openMenu(); return; }
    const key = act.includes(':') ? act.split(':')[0] : act;
    const f = UI.h[key]; if (f) f(act.includes(':') ? act.slice(act.indexOf(':') + 1) : undefined, el);
  });
  app.addEventListener('pointerdown', () => { try { SFX.unlock(); } catch (e) { /* audio is optional */ } }, { passive: true });
}

/* ---------- Menu & sheets ---------- */
function openMenu() {
  openSheet('Menu', `<div class="menu-grid">
    ${btn('m:status', 'Status & Skills')}${btn('m:bag', 'Bag')}${btn('m:gear', 'Gear')}${btn('m:band', 'Band')}
    ${btn('m:journal', 'Journal')}${btn('m:book', 'Blue Book')}${btn('m:lexicon', 'Lexicon')}${btn('m:settings', 'Settings')}
    ${btn('m:save', 'Save')}${btn('m:title', 'Title Screen', 'ghost')}</div>`, {
    m: (which) => { ({ status: openStatus, bag: openBag, gear: openGear, band: openBand, journal: openJournal, book: openBlueBook, lexicon: openLexiconSheet, settings: openSettings, save: () => { if (saveGame(true)) toast('Saved.'); closeSheet(); }, title: async () => { closeSheet(); const ok = await confirmBox('Back to title?', '<p>Progress since your last autosave is kept only if you saved. Autosaves happen when you enter a district, after fights, and before bosses.</p>', 'Title screen', 'Stay'); if (ok) { stopBattleLoop(); showTitle(); } } })[which]();
    } });
}
function statBlock(s) {
  const d = displayStats(s); const base = classBase(s);
  return `<div class="stat-grid">${STAT_KEYS.map(k => `<div class="stat"><span class="k">${STAT_NAMES[k]}</span><span class="v">${d[k]}</span></div>`).join('')}</div>`;
}
function skillRow(id, locked) {
  const sk = SKILLS[id]; const toneFx = sk.fx.find(f => f.k === 'dmg'); const tone = sk.tone || (toneFx ? toneFx.tone : null);
  return `<div class="skill ${locked ? 'locked' : ''}"><div class="skill-head"><b>${esc(sk.name)}</b>${tone ? `<span class="tone t-${tone}">${tone}</span>` : ''}<span class="dim">${sk.solo ? 'SOLO' : sk.riff ? 'RIFF' : sk.fp + ' FP'}${sk.lvl ? ' · L' + sk.lvl : ''}${sk.once ? ' · once/battle' : ''}</span></div><div class="small">${esc(sk.desc)}</div></div>`;
}
function openStatus() {
  if (!S) return; const c = CLASSES[S.cls]; const r = ROOTS[S.roots];
  const need = S.level >= LEVEL_CAP ? null : xpToNext(S.level);
  const html = `<div class="card"><div><b>${esc(S.name)}</b> · ${esc(c.name)} (${esc(c.title)}) · ${esc(r.name)}</div>
    <div class="dim">Level ${S.level}${need ? ` · XP ${S.xp}/${need}` : ' · MAX'} · Day ${S.day}${S.ngPlus ? ' · NG+' + S.ngPlus : ''}</div>
    ${need ? `<div class="bar xp"><i style="width:${Math.round(100 * S.xp / need)}%"></i></div>` : ''}
    ${statBlock(S)}
    <div class="small dim">Tones: ${c.tones.map(t => `<span class="tone t-${t}">${t}</span>`).join(' ')}${c.bigFour ? ' · Passive: Big Four (beat 4 hits +60%)' : ''}</div>
    ${S.mealBuff ? `<div class="small good">Meal buff: +${Math.round(S.mealBuff.chops * 100)}% Chops & Grit for ${S.mealBuff.fights} more fight${S.mealBuff.fights === 1 ? '' : 's'}.</div>` : ''}
    ${S.dreamBuff ? `<div class="small good">Sweet Dreams: +10% Chops & Grit, +20% Mojo for ${S.dreamBuff.fights} more fight${S.dreamBuff.fights === 1 ? '' : 's'}.</div>` : ''}
    ${S.nextFight ? `<div class="small good">Next fight: ${S.nextFight.groove ? '+' + S.nextFight.groove + ' Groove ' : ''}${S.nextFight.mojo ? (S.nextFight.mojo > 0 ? '+' : '') + S.nextFight.mojo + ' Mojo ' : ''}${S.nextFight.hyped ? 'Hyped ' : ''}${S.nextFight.pocket ? 'In the Pocket ' : ''}${S.nextFight.status ? STATUSES[S.nextFight.status].name : ''}</div>` : ''}
    </div>
    <h4>Riff</h4>${skillRow(c.riff)}
    <h4>Skills</h4>${c.skills.map((id, i) => skillRow(id, S.level < SKILL_LEVELS[i])).join('')}
    <h4>Solo (100 Groove)</h4>${skillRow(c.solo)}
    ${S.sheet.length ? `<h4>Sheet Music</h4>${S.sheet.map(id => `<div class="small">• <b>${esc(SHEET_MUSIC[id].name)}</b>: ${esc(SHEET_MUSIC[id].desc)}</div>`).join('')}` : ''}
    <h4>Blue Notes</h4><div class="notes">${SCALE_ORDER.map(n => `<span class="note ${S.notes.includes(n) ? 'have' : ''}">${esc(BLUE_NOTES[n].name)}</span>`).join('')}</div>`;
  openSheet('Status & Skills', html, {}, { back: true });
}
function openBag(inBattle, onUse) {
  const ids = Object.keys(S.bag).filter(id => ITEMS[id]);
  const usable = id => inBattle ? ITEMS[id].battle : ITEMS[id].field;
  const list = ids.length ? ids.map(id => { const it = ITEMS[id]; return `<div class="item"><div class="item-info"><b>${esc(it.name)}</b> <span class="dim">×${S.bag[id]}</span><div class="small">${esc(it.desc)}</div></div>${usable(id) ? btn('use:' + id, 'Use', 'small primary') : it.key ? '<span class="dim small">key item</span>' : it.passive ? '<span class="dim small">automatic</span>' : '<span class="dim small">' + (inBattle ? 'not in battle' : 'battle only') + '</span>'}</div>`; }).join('') : '<p class="dim">Your bag is empty. Mama Roux would be worried.</p>';
  const keys = S.keyItems.length ? `<h4>Key Items</h4>${S.keyItems.map(k => `<div class="small">• ${esc(ITEMS[k] ? ITEMS[k].name : k)}</div>`).join('')}` : '';
  openSheet('Bag', list + keys, { use: (id) => { if (inBattle) { closeSheet(); onUse(id); return; } useFieldItem(id); openBag(false); } }, { back: !inBattle });
}
function useFieldItem(id) {
  const it = ITEMS[id]; if (!it || !countItem(S, id)) return;
  if (it.prefight) { S.nextFight = Object.assign(S.nextFight || {}, { status: it.prefight.status }); removeItem(S, id, 1); toast(`${it.name}: ${STATUSES[it.prefight.status].name} next fight.`); renderTopbar(); return; }
  const st = derivedStats(S); let msg = [];
  it.use.forEach(f => {
    if (f.k === 'heal') { const amt = f.flat || Math.round(st.maxHp * f.pct); const real = Math.min(amt, st.maxHp - S.hp); S.hp += real; msg.push(`+${real} Heart`); }
    if (f.k === 'funk') { const amt = f.flat || Math.round(st.maxFp * f.pct); const real = Math.min(amt, st.maxFp - S.fp); S.fp += real; msg.push(`+${real} Funk`); }
    if (f.k === 'cleanse') msg.push('statuses cleared (they only last in battle anyway)');
    if (f.k === 'fn' && id === 'kingcake') { if (Math.random() < 0.1) { S.perm.mojo += 1; msg.push('you found the baby! +1 Mojo'); } }
  });
  removeItem(S, id, 1); clampVitals(S); renderTopbar(); toast(`${it.name}: ${msg.join(', ') || 'used'}.`);
}
function gearStatStr(g) { const parts = Object.keys(g.stats || {}).map(k => `${STAT_NAMES[k]} +${g.stats[k]}`); if (g.oneZone) parts.push(`ONE zone +${Math.round(g.oneZone * 100)}%`); if (g.critBonus) parts.push(`crit +${Math.round(g.critBonus * 100)}%`); if (g.statusResist) parts.push(`status resist ${Math.round(g.statusResist * 100)}%`); if (g.toneBonus) parts.push(Object.keys(g.toneBonus).map(t => `${t} +${Math.round(g.toneBonus[t] * 100)}%`).join(' ')); if (g.doubloonBonus) parts.push(`Ð +${Math.round(g.doubloonBonus * 100)}%`); return parts.join(', ') || 'no bonus'; }
function openGear() {
  const slots = ['instrument', 'threads', 'charm', 'mod']; const names = { instrument: 'Instrument', threads: 'Threads', charm: 'Charm', mod: 'Mod' };
  const html = slots.map(sl => { const g = S.gear[sl] && GEAR[S.gear[sl]]; return `<div class="item"><div class="item-info"><span class="dim small">${names[sl]}</span><br><b>${g ? esc(g.name) : '— empty —'}</b><div class="small">${g ? esc(gearStatStr(g)) : ''}</div></div>${btn('slot:' + sl, 'Change', 'small')}</div>`; }).join('');
  openSheet('Gear', html + statBlock(S), { slot: (sl) => openSlot(sl) }, { back: true });
}
function openSlot(sl) {
  const owned = S.gearBag.filter(id => GEAR[id] && GEAR[id].slot === sl && (sl !== 'instrument' || GEAR[id].cls === S.cls));
  const html = (owned.length ? owned.map(id => { const g = GEAR[id]; const eq = S.gear[sl] === id; return `<div class="item ${eq ? 'eq' : ''}"><div class="item-info"><b>${esc(g.name)}</b>${eq ? ' <span class="good small">equipped</span>' : ''}<div class="small">${esc(gearStatStr(g))}</div><div class="small dim">${esc(g.desc)}</div></div>${eq ? '' : btn('equip:' + id, 'Equip', 'small primary')}</div>`; }).join('') : '<p class="dim">Nothing for this slot yet.</p>') + (sl !== 'instrument' && S.gear[sl] ? btn('unequip', 'Unequip', 'ghost wide') : '');
  openSheet('Change ' + sl, html, { equip: (id) => { S.gear[sl] = id; clampVitals(S); renderTopbar(); toast('Equipped ' + GEAR[id].name + '.'); openGear(); }, unequip: () => { S.gear[sl] = null; clampVitals(S); renderTopbar(); openGear(); } }, { back: true });
}
function openBand() {
  const rec = S.band.recruited;
  const html = rec.length ? rec.map(id => { const bm = BANDMATES[id]; const on = S.band.active.includes(id); return `<div class="item ${on ? 'eq' : ''}"><div class="item-info"><b style="color:${bm.color}">${esc(bm.name)}</b> <span class="dim small">${esc(bm.inst)}</span><div class="small">Passive: ${esc(bm.passive)}. Assist (every 3rd round): <b>${esc(SKILLS[bm.assist].name)}</b> — ${esc(SKILLS[bm.assist].desc)}</div><div class="small dim">${esc(bm.arc)}</div></div>${btn('tog:' + id, on ? 'Bench' : 'Bring', 'small ' + (on ? 'ghost' : 'primary'))}</div>`; }).join('') : '<p class="dim">No bandmates yet. Win the Cutting Contest at Club Feu Follet, free Static in Storyville, defend the Fais Do-Do, and lay the haints to rest.</p>';
  const canSwap = UI.screen !== 'battle';
  openSheet('Band (bring up to 2)', html + (canSwap ? '' : '<p class="dim small">Swap bandmates at the Lagniappe club.</p>'), { tog: (id) => { if (!canSwap) { toast('Swap at the Lagniappe club.'); return; } const i = S.band.active.indexOf(id); if (i >= 0) S.band.active.splice(i, 1); else { if (S.band.active.length >= 2) { toast('Only two can fit in the streetcar.'); return; } S.band.active.push(id); } clampVitals(S); openBand(); } }, { back: true });
}
function mainStepInfo() {
  const act = S.main.act; const steps = MAIN_STEPS[act]; const st = steps[Math.min(S.main.step, steps.length - 1)];
  let prog = '';
  if (st.progress) { const n = st.item ? countItem(S, st.progress) : (S.counters[st.progress] || 0); prog = ` (${Math.min(n, st.goal)}/${st.goal})`; }
  return { text: st.text + prog, where: st.where };
}
function openJournal() {
  const m = mainStepInfo();
  const sides = Object.values(QUESTS).filter(q => S.quests[q.id]).map(q => { const st = S.quests[q.id]; let prog = ''; if (q.progress && st === 'active') { const n = q.item ? countItem(S, q.progress) : (S.counters[q.progress] || 0); prog = ` (${Math.min(n, q.goal)}/${q.goal})`; } return `<div class="item"><div class="item-info"><b>${esc(q.name)}</b> <span class="${st === 'done' ? 'good' : 'gold'} small">${st === 'done' ? 'DONE' : 'active' + prog}</span><div class="small">${esc(q.desc)}</div><div class="small dim">Reward: ${esc(q.reward)}</div></div></div>`; }).join('');
  const bounty = S.bounty ? `<div class="item"><div class="item-info"><b>Bounty: ${esc(BOUNTIES[S.bounty].name)}</b><div class="small">Track it from the ${esc(DISTRICTS[S.bounty].name)} district screen. Pays ${fmtD(BOUNTIES[S.bounty].gold)}.</div></div></div>` : '';
  openSheet('Journal', `<h4>Main Quest</h4><div class="card"><b>${esc(m.text)}</b><div class="small dim">Where: ${esc(m.where)}</div></div>${bounty}<h4>Side Quests</h4>${sides || '<p class="dim">No side quests yet. Talk to people.</p>'}<h4>Blue Notes</h4><div class="notes">${SCALE_ORDER.map(n => `<span class="note ${S.notes.includes(n) ? 'have' : ''}">${esc(BLUE_NOTES[n].name)}</span>`).join('')}</div>`, {}, { back: true });
}
function openBlueBook() {
  const seen = Object.keys(S.book).filter(id => ENEMIES[id] || BOSSES[id]);
  const html = seen.length ? seen.map(id => { const d = ENEMIES[id] || BOSSES[id]; const bk = S.book[id]; const lv = Array.isArray(d.lvl) ? `L${d.lvl[0]}–${d.lvl[1]}` : `L${d.lvl}`; return `<div class="item"><div class="item-info"><b>${esc(d.name)}</b> <span class="dim small">${lv}${d.machine ? ' · machine' : ''}${d.elite ? ' · elite' : ''}${BOSSES[id] ? ' · boss' : ''}</span><div class="small">Weak: ${bk.weak || bk.hint ? `<span class="tone t-${d.weak}">${d.weak}</span>` : '<span class="dim">?</span>'} · Resists: ${bk.weak || bk.hint ? (d.resist ? `<span class="tone t-${d.resist}">${d.resist}</span>` : 'nothing') : '<span class="dim">?</span>'}</div><div class="small dim">${esc(d.book)}</div></div></div>`; }).join('') : '<p class="dim">Nobody in the book yet. Hit the streets.</p>';
  openSheet('Blue Book', `<p class="small dim">The bestiary, named after Storyville's old guidebook. Weaknesses appear once you've found them.</p>${html}`, {}, { back: true });
}
function openLexiconSheet() {
  const cats = {}; S.lexicon.forEach(k => { const g = GLOSSARY[k]; if (!g) return; (cats[g.cat] = cats[g.cat] || []).push(g); });
  const html = Object.keys(cats).length ? Object.keys(cats).sort().map(c => `<h4>${esc(c)}</h4>${cats[c].map(g => `<div class="small"><b>${esc(g.term)}</b>${g.pron ? ` <span class="dim">(${esc(g.pron)})</span>` : ''}: ${esc(g.def)}</div>`).join('')}`).join('') : '<p class="dim">Tap the dotted words in dialogue to learn them. They get saved here.</p>';
  openSheet('Lagniappe Lexicon', `<p class="small dim">${S.lexicon.length} of ${Object.keys(GLOSSARY).length} terms met.</p>${html}`, {}, { back: true });
}
function seg(name, key, options, cur) { return `<div class="seg-row"><span class="seg-label">${esc(name)}</span><div class="seg">${options.map(o => `<button class="seg-btn ${cur === o.v ? 'on' : ''}" data-act="set:${key}:${o.v}">${esc(o.l)}</button>`).join('')}</div></div>`; }
function openSettings(fromTitle) {
  const st = S ? S.settings : UI.titleSettings;
  const html = seg('Text speed', 'textSpeed', [{ v: 'slow', l: 'Slow' }, { v: 'normal', l: 'Normal' }, { v: 'fast', l: 'Fast' }, { v: 'instant', l: 'Instant' }], st.textSpeed)
    + seg('Rhythm taps', 'rhythm', [{ v: 'manual', l: 'Manual' }, { v: 'auto', l: 'Auto' }], st.rhythm)
    + seg('Difficulty', 'difficulty', [{ v: 'tourist', l: 'Tourist' }, { v: 'local', l: 'Local' }, { v: 'grand', l: 'Grand Marshal' }], st.difficulty)
    + seg('Sound', 'sound', [{ v: true, l: 'On' }, { v: false, l: 'Muted' }], st.sound)
    + seg('Reduce motion', 'reduceMotion', [{ v: false, l: 'Off' }, { v: true, l: 'On' }], st.reduceMotion)
    + seg('Text size', 'textSize', [{ v: 'S', l: 'S' }, { v: 'M', l: 'M' }, { v: 'L', l: 'L' }], st.textSize)
    + `<p class="small dim">Tourist: enemy damage −25%. Grand Marshal: enemy damage +25%, enemy Heart +20%. Auto rhythm rolls the timing for you, weighted toward IN THE POCKET.</p>
    <h4>Save data</h4><div class="row">${btn('export', 'Export Save', 'small')}${btn('import', 'Import Save', 'small')}${S ? btn('reset', 'Reset Game', 'small danger') : ''}</div>
    <div id="export-area"></div>`;
  openSheet('Settings', html, {
    set: (v) => { const [key, val] = v.split(':'); const parsed = val === 'true' ? true : val === 'false' ? false : val; st[key] = parsed; applyDisplaySettings(); if (S) saveGame(false); openSettings(fromTitle); },
    export: () => { const code = exportSave(); const area = $('#export-area'); if (!code) { area.innerHTML = '<p class="dim small">No game to export yet.</p>'; return; } area.innerHTML = `<p class="small">Copy this code somewhere safe:</p><textarea id="export-text" readonly rows="4">${esc(code)}</textarea>${btn('copy', 'Copy to clipboard', 'small wide')}`; },
    copy: async () => { const ta = $('#export-text'); if (!ta) return; try { await navigator.clipboard.writeText(ta.value); toast('Copied.'); } catch (e) { ta.focus(); ta.select(); toast('Select and copy the code.'); } },
    import: () => { const area = $('#export-area'); area.innerHTML = `<p class="small">Paste a save code:</p><textarea id="import-text" rows="4" placeholder="paste here"></textarea>${btn('doimport', 'Load this save', 'small primary wide')}`; },
    doimport: () => { const ta = $('#import-text'); if (!ta) return; const ok = importSave(ta.value.trim()); if (ok) { closeSheet(); toast('Save loaded.'); resumeGame(); } else toast('That code didn\'t work.'); },
    reset: async () => { closeSheet(); const ok = await confirmBox('Reset everything?', '<p>This erases your save. The city will not remember you. Export first if you want it back.</p>', 'Erase', 'Keep'); if (ok) { clearSave(); S = null; stopBattleLoop(); showTitle(); toast('Reset.'); } },
  }, { back: !fromTitle && !!S });
}
function showLevelUps(ups) {
  return new Promise(async resolve => {
    for (const up of ups) {
      try { SFX.levelUp(); } catch (e) { /* optional */ }
      const gains = STAT_KEYS.filter(k => up.gains[k] > 0).map(k => `<div class="stat"><span class="k">${STAT_NAMES[k]}</span><span class="v good">+${up.gains[k]}</span></div>`).join('');
      await new Promise(r => { UI.ph = { ok: () => { closePopup(); r(); } }; UI.popupOpen = true; const p = $('#popup'); p.innerHTML = `<div class="popup-card levelup"><h4>LEVEL ${up.level}!</h4><div class="stat-grid">${gains}</div>${up.newSkill ? `<div class="newskill">New skill: <b>${esc(SKILLS[up.newSkill].name)}</b><div class="small">${esc(SKILLS[up.newSkill].desc)}</div></div>` : ''}<div class="small dim">Heart and Funk +30%.</div>${btn('ok', 'Play on ▸', 'primary wide')}</div>`; p.hidden = false; });
    }
    resolve();
  });
}
function giveXp(n) { const ups = gainXp(S, n); renderTopbar(); return ups; }
async function rewardXp(n, silent) { const ups = giveXp(n); if (!silent) toast(`+${n} XP`); if (ups.length) await showLevelUps(ups); renderTopbar(); }
