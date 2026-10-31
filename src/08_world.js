/* ============================================================
   CYBER FUNK — world: districts, places, shops, quests, events, mini-games
   ============================================================ */
'use strict';

/* Game API used by street events and scenes */
const G = {
  get s() { return S; }, get roots() { return S.roots; },
  narrate, say, choose,
  heal(p) { healPct(S, p); renderTopbar(); }, funk(p) { funkPct(S, p); renderTopbar(); },
  gold(n) { if (n < 0 && S.doubloons < -n) return false; S.doubloons += n; renderTopbar(); if (n > 0) toast(`+${fmtD(n)}`); return true; },
  xp(n) { const ups = gainXp(S, n); renderTopbar(); toast(`+${n} XP`); if (ups.length) showLevelUps(ups); },
  give(id, n) { addItem(S, id, n || 1); toast(`Got ${ITEMS[id].name}${(n || 1) > 1 ? ' ×' + n : ''}.`); },
  count(id) { return countItem(S, id); },
  check(stat, base, yatBonus) { const st = derivedStats(S); const v = st[stat] || 0; let ch = base + v * 0.015; if (yatBonus && S.roots === 'yat') ch += 0.15; return chance(clamp(ch, 0.1, 0.95)); },
  nextFight(mods) { S.nextFight = Object.assign(S.nextFight || {}, mods); },
  hasBandmate(id) { return S.band.recruited.includes(id); },
  randomItem(pool) { return pick(pool); },
  scaleXp(base) { return Math.round(base * (1 + 0.35 * (S.level - 1))); },
  scaleGold(base) { return Math.round(base * (1 + 0.3 * (S.level - 1))); },
  bookHint(id) { S.book[id] = S.book[id] || { seen: false }; S.book[id].hint = true; },
  async fight(ids, opts) { opts = opts || {}; return runBattle(buildEnemies(ids, opts), { ctx: { type: 'street', district: S.district }, ambush: !!opts.ambush, context: 'street' }); },
};

/* ---------- District hub ---------- */
function ambientLine(d) { const i = ((UI.ambientIdx[d.id] || 0) + 1) % d.ambient.length; UI.ambientIdx[d.id] = i; return d.ambient[i]; }
function placeHint(pl) {
  const m = S.main; const a = m.act, st = m.step;
  const map = { treme: { 2: 'congo', 0: 'club' }, quarter: { 0: 'feufollet', 1: 'jackson', 2: 'strip' }, storyville: { 0: 'lantern', 2: 'lantern', 3: 'counting' }, bayou: { 1: 'cabin', 3: 'pump' }, cemetery: { 0: 'temple', 2: 'mausoleum' }, garden: { 1: 'manor', 2: 'manor' }, tower: { 0: 'club', 1: 'towerlobby', 2: 'towerlobby', 3: 'towerlobby' } };
  return map[a] && map[a][st] === pl.id;
}
async function goDistrict(id, opts) {
  opts = opts || {};
  S.district = id; if (!S.unlocked.includes(id)) S.unlocked.push(id);
  S.inTower = false; S.towerFloor = 0;
  saveGame(false);
  UI.screen = 'district';
  const d = DISTRICTS[id];
  renderTopbar();
  if (!S.flags['intro_' + id]) { S.flags['intro_' + id] = true; storyScreen(d.name); await narrate(d.intro); if (DISTRICT_ARRIVAL[id]) await DISTRICT_ARRIVAL[id](); }
  renderDistrict();
}
function renderDistrict() {
  const d = DISTRICTS[S.district]; UI.screen = 'district'; renderTopbar();
  const m = mainStepInfo();
  setScreen(`<div class="district">
    <h2 class="dname">${esc(d.name)}</h2><div class="small dim">Levels ${d.lvl[0]}–${d.lvl[1]} · Day ${S.day}</div>
    <p class="ambient">${esc(ambientLine(d))}</p>
    <div class="card quest"><span class="dim small">NEXT</span> ${esc(m.text)}<div class="small dim">${esc(m.where)}</div></div>
    <div class="places">${d.places.map(pid => { const pl = PLACES[pid]; return `<button class="btn place ${placeHint(pl) ? 'hint' : ''}" data-act="place:${pid}"><span class="pname">${esc(pl.name)}${placeHint(pl) ? ' <span class="bang">!</span>' : ''}</span><span class="pdesc">${esc(pl.desc)}</span></button>`; }).join('')}</div>
  </div>`);
  const bounty = S.bounty === S.district;
  setActions(`<div class="agrid ${bounty ? 'two' : ''}">${btn('streets', 'HIT THE STREETS', 'act primary')}${bounty ? btn('bounty', 'TRACK BOUNTY', 'act gold') : ''}${btn('travel', 'TRAVEL', 'act')}${btn('menu', 'MENU', 'act ghost')}</div>`);
  UI.h.place = (pid) => safeFlow(() => enterPlace(pid));
  UI.h.streets = () => safeFlow(hitTheStreets);
  UI.h.bounty = () => safeFlow(trackBounty);
  UI.h.travel = () => openTravel();
}
async function safeFlow(fn) {
  if (UI.busy) return; UI.busy = true;
  try { await fn(); }
  catch (e) { if (e && e.flowAbort) { UI.busy = false; await wakeUpAtClub(); return; } console.error(e); toast('Something skipped a beat. Back to the street.'); UI.battle = null; stopBattleLoop(); try { renderDistrict(); } catch (e2) { showTitle(); } }
  finally { UI.busy = false; }
}
async function wakeUpAtClub() {
  S.district = 'treme'; S.pendingBattle = null; S.inTower = false; clampVitals(S); saveGame(false);
  storyScreen('Lagniappe Social Aid & Pleasure Club'); renderTopbar();
  await say('mamaroux', pick(["Lord. Look at you. Drink this, it's mostly coffee.", "You got cut, baby. Happens to everybody once. Don't let it happen twice.", "Gus got cut forty times before he was Grand Marshal. Eat something."]));
  renderDistrict();
}
/* ---------- Hit the Streets ---------- */
async function hitTheStreets() {
  const d = DISTRICTS[S.district]; const r = Math.random();
  storyScreen(); renderTopbar();
  if (r < 0.60) { await narrate(pick(['You turn a corner and the neon goes sour.', 'Footsteps behind you, in perfect time. That\'s never good.', 'A shadow peels off a wall. Then another.', 'The MoodSync speaker on the corner cuts out. Something heard you coming.'])); const res = await G.fight('random'); if (res === 'win') await afterStreet(); renderDistrict(); return; }
  if (r < 0.80) { await runEvent(); renderDistrict(); return; }
  if (r < 0.95) {
    if (chance(0.6)) { const n = G.scaleGold(irnd(12, 30)); S.doubloons += n; await narrate(pick([`A go-cup full of Doubloons, abandoned on a stoop. ${fmtD(n)}. Lagniappe.`, `A busted Click-Drone in the gutter, still clutching its parking-fine money. ${fmtD(n)}.`, `Somebody dropped a wad of Doubloons running from the Hush. ${fmtD(n)}. You'd give it back if you knew who.`])); }
    else { const it = pick(['beignet', 'cafe', 'poboy', 'pralines', 'snoball', 'yakamein', 'boudin', 'discobead', 'cayenne', 'indigo', 'subtape']); addItem(S, it, 1); await narrate(pick([`On a windowsill, wrapped in wax paper: a ${ITEMS[it].name}. Somebody's lagniappe, now yours.`, `A float crew tosses you a ${ITEMS[it].name} as they roll past. "Throw me something, mister!"`])); }
    renderTopbar(); renderDistrict(); return;
  }
  // rare
  if (chance(0.5)) { await narrate(`The street goes quiet. Too quiet. The ${ENEMIES[d.elite].name} steps out of the fog.`); const res = await runBattle(buildEnemies([d.elite]), { ctx: { type: 'street', district: S.district }, context: 'street', noFlee: true }); if (res === 'win') await afterStreet(); renderDistrict(); return; }
  await pralineLady(); renderDistrict();
}
async function afterStreet() { /* hook for post-fight district reactions */ }
async function runEvent(forceId) {
  const pool = EVENTS.filter(e => (!e.districts || e.districts.includes(S.district)) && (!forceId || e.id === forceId));
  const weighted = []; pool.forEach(e => { for (let i = 0; i < (e.weight || 1); i++) weighted.push(e); });
  const ev = pick(weighted);
  storyScreen(ev.name); renderTopbar();
  await narrate(ev.text);
  const opts = ev.options.filter(o => !o.cond || o.cond(G));
  const i = await choose(opts.map(o => ({ label: o.label })));
  await opts[i].run(G);
  renderTopbar();
}
async function pralineLady() {
  storyScreen('The Praline Lady'); renderTopbar();
  await say('pralinelady', pick(['"Pralines, baby. And a few things I don\'t keep on the cart." She lifts the cloth.', '"You look like you need something sweet and something lucky. I got both."']));
  openShop('The Praline Lady', [{ id: 'kingcake', price: 80 }, { id: 'pralines', price: 25 }, { id: 'grisgris', price: 180 }, { id: 'muffuletta', price: 90 }, { id: 'ch_beads', price: 110 }, { id: 'ch_haintblue', price: 480 }], { noSell: true });
  await new Promise(res => { UI.onSheetClose = res; });
}
async function trackBounty() {
  const bt = BOUNTIES[S.district]; storyScreen('Bounty'); renderTopbar();
  await narrate(`You follow the bounty board's directions to a ${pick(['dead-end alley', 'loading dock', 'shuttered bar', 'flooded underpass'])}. The ${ENEMIES[bt.elite].name} is waiting, like it knew.`);
  const res = await runBattle(buildEnemies([bt.elite]), { ctx: { type: 'bounty', district: S.district }, context: 'bounty', noFlee: true });
  if (res === 'win') { await narrate(`Bounty collected. The Pelican pays ${fmtD(bt.gold)} and buys the first round.`); }
  renderDistrict();
}
/* ---------- Travel ---------- */
function openTravel() {
  const rows = S.unlocked.filter(id => id !== S.district).map(id => { const d = DISTRICTS[id]; return `<div class="item"><div class="item-info"><b>${esc(d.name)}</b><div class="small dim">Levels ${d.lvl[0]}–${d.lvl[1]} · ${d.airboat ? 'by airboat' : 'by streetcar'}</div></div>${btn('go:' + id, d.airboat ? 'Airboat' : 'Ride', 'small primary')}</div>`; }).join('');
  openSheet('Travel', `<p class="small dim">The streetcar runs between every unlocked district. The airboat screams out to Manchac.</p>${rows || '<p class="dim">Nowhere else yet. Earn it.</p>'}`, { go: async (id) => { closeSheet(); await safeFlow(async () => { storyScreen(); renderTopbar(); if (id === 'bayou' || S.district === 'bayou') await narrate('The airboat\'s turbine spools up and the city falls away behind you in a smear of neon and fog.'); else await narrate(pick(['The streetcar hums along in perfect quarter notes. You tap a different rhythm on the window.', 'Chrome streetcar, cracked leather seats, a MoodSync jingle you refuse to learn.', 'The conductor nods at your case. Says nothing. Taps his foot, once, off the beat.'])); if (id === 'bayou' && S.main.act === 'bayou' && S.main.step === 0) S.main.step = 1; await goDistrict(id); }); } });
}
/* ---------- Shops ---------- */
function openShop(title, entries, opts) {
  opts = opts || {};
  const tab = opts.tab || 'buy';
  const district = S.district;
  const buyRows = entries.filter(e => !e.cond || e.cond()).map(e => {
    const it = ITEMS[e.id] || GEAR[e.id] || SHEET_MUSIC[e.id]; const isGear = !!GEAR[e.id]; const isSheet = !!SHEET_MUSIC[e.id];
    const price = priceFor(S, e.price !== undefined ? e.price : it.price, district);
    const own = isGear ? S.gearBag.includes(e.id) || Object.values(S.gear).includes(e.id) : isSheet ? S.sheet.includes(e.id) : countItem(S, e.id);
    const maxed = ITEMS[e.id] && ITEMS[e.id].max && countItem(S, e.id) >= ITEMS[e.id].max;
    const lvlLock = isGear && it.lvl > S.level;
    const can = S.doubloons >= price && !(isGear && own) && !(isSheet && own) && !maxed && !lvlLock;
    return `<div class="item"><div class="item-info"><b>${esc(it.name)}</b>${isGear || isSheet ? (own ? ' <span class="good small">owned</span>' : '') : own ? ` <span class="dim small">×${own}</span>` : ''}<div class="small">${esc(isGear ? gearStatStr(it) + '. ' + it.desc : it.desc)}</div>${lvlLock ? `<div class="small gold">Needs level ${it.lvl}</div>` : ''}</div>${btn('buy:' + e.id + ':' + price, fmtD(price), 'small ' + (can ? 'primary' : 'disabled'))}</div>`;
  }).join('');
  const sellable = Object.keys(S.bag).filter(id => ITEMS[id] && !ITEMS[id].key && !ITEMS[id].rare).map(id => ({ id, price: Math.max(1, Math.round(ITEMS[id].price * 0.4)), n: S.bag[id], name: ITEMS[id].name }))
    .concat(S.gearBag.filter(id => !Object.values(S.gear).includes(id) && !GEAR[id].story).map(id => ({ id, price: Math.max(1, Math.round(GEAR[id].price * 0.4)), n: 1, name: GEAR[id].name, gear: true })));
  const sellRows = sellable.length ? sellable.map(e => `<div class="item"><div class="item-info"><b>${esc(e.name)}</b> <span class="dim small">×${e.n}</span></div>${btn('sell:' + e.id, '+' + fmtD(e.price), 'small')}</div>`).join('') : '<p class="dim">Nothing to sell.</p>';
  const tabs = opts.noSell ? '' : `<div class="tabs">${btn('tab:buy', 'Buy', 'small ' + (tab === 'buy' ? 'primary' : 'ghost'))}${btn('tab:sell', 'Sell (40%)', 'small ' + (tab === 'sell' ? 'primary' : 'ghost'))}</div>`;
  openSheet(title, `<div class="shop-gold">You have <b>${fmtD(S.doubloons)}</b></div>${tabs}${tab === 'buy' ? buyRows : sellRows}`, {
    tab: (t) => openShop(title, entries, Object.assign({}, opts, { tab: t })),
    buy: (v) => { const [id, priceStr] = v.split(':'); const price = +priceStr; if (S.doubloons < price) { toast('Not enough Doubloons.'); return; }
      if (GEAR[id]) { if (GEAR[id].lvl > S.level) { toast(`Needs level ${GEAR[id].lvl}.`); return; } S.doubloons -= price; S.gearBag.push(id); try { SFX.coin(); } catch (e) { /* optional */ } toast(`Bought ${GEAR[id].name}.`); const slot = GEAR[id].slot; const cur = S.gear[slot] && GEAR[S.gear[slot]]; const better = !cur || (Object.values(GEAR[id].stats).reduce((a, c) => a + c, 0) >= Object.values(cur.stats || {}).reduce((a, c) => a + c, 0)); if (better && (slot !== 'instrument' || GEAR[id].cls === S.cls)) { S.gear[slot] = id; clampVitals(S); toast(`Equipped ${GEAR[id].name}.`); } }
      else if (SHEET_MUSIC[id]) { S.doubloons -= price; S.sheet.push(id); toast(`Learned ${SHEET_MUSIC[id].name}.`); }
      else { if (ITEMS[id].max && countItem(S, id) >= ITEMS[id].max) { toast('You can only carry one.'); return; } S.doubloons -= price; addItem(S, id, 1); try { SFX.coin(); } catch (e) { /* optional */ } toast(`Bought ${ITEMS[id].name}.`); }
      renderTopbar(); openShop(title, entries, opts); },
    sell: (id) => { if (GEAR[id]) { const i = S.gearBag.indexOf(id); if (i >= 0) { S.gearBag.splice(i, 1); S.doubloons += Math.max(1, Math.round(GEAR[id].price * 0.4)); } } else { removeItem(S, id, 1); S.doubloons += Math.max(1, Math.round(ITEMS[id].price * 0.4)); } renderTopbar(); openShop(title, entries, Object.assign({}, opts, { tab: 'sell' })); },
  });
}
function instrumentEntries(maxTier) {
  const tiers = ['street', 'neon', 'chrome'].slice(0, maxTier);
  return tiers.map(t => ({ id: `inst_${S.cls}_${t}` }));
}
/* ---------- Places ---------- */
function placeScreen(pl, lines, options) {
  UI.screen = 'place'; renderTopbar();
  setScreen(`<div class="place-screen"><h2 class="dname">${esc(pl.name)}</h2><p class="small dim">${esc(pl.desc)}</p>${lines ? `<div class="story" id="story">${lines}</div>` : '<div class="story" id="story"></div>'}
    <div class="options" id="options">${options.filter(o => !o.cond || o.cond()).map((o, i) => `<button class="btn option ${o.cls || ''}" data-act="opt:${i}"><span>${esc(o.label)}</span>${o.sub ? `<span class="pdesc">${esc(o.sub)}</span>` : ''}</button>`).join('')}</div></div>`);
  setActions(`<div class="agrid two">${btn('leave', '‹ BACK TO THE STREET', 'act')}${btn('menu', 'MENU', 'act ghost')}</div>`);
  const vis = options.filter(o => !o.cond || o.cond());
  UI.h.opt = (i) => safeFlow(async () => { await vis[+i].run(); });
  UI.h.leave = () => { renderDistrict(); };
}
async function enterPlace(pid) {
  const pl = PLACES[pid]; const h = PLACE_FLOWS[pid]; if (!h) { renderDistrict(); return; }
  await h(pl);
}
function greet(npcId, byRoots) { return byRoots[S.roots] || byRoots.any; }
const PLACE_FLOWS = {
  async club(pl) {
    const notes = SCALE_ORDER.map(n => `<span class="note ${S.notes.includes(n) ? 'have' : ''}">${esc(BLUE_NOTES[n].name)}</span>`).join('');
    placeScreen(pl, `<div class="notes">${notes}</div><p class="small dim">${S.notes.length}/6 Blue Notes on the trophy wall.</p>`, [
      { label: 'Rest (free)', sub: 'Full Heart and Funk. The day turns over.', run: async () => { fullRest(S); S.day += 1; renderTopbar(); toast('You sleep on the folding chairs. Day ' + S.day + '.'); saveGame(false); await enterPlace('club'); } },
      { label: 'Save game', run: async () => { if (saveGame(true)) toast('Saved to the club ledger.'); } },
      { label: 'Swap bandmates', run: async () => { openBand(); } },
      { label: 'Quest board', run: async () => { openJournal(); } },
      { label: 'Form the Second Line', cls: 'hint', cond: () => S.main.act === 'tower' && S.main.step === 0, run: async () => { await secondLineScene(); } },
      { label: 'March again (New Game+)', cls: 'hint', cond: () => !!S.flags.ending, run: async () => { await creditsAndNewGamePlus(); } },
      { label: "Gus's cassette", cond: () => S.flags.hasCassette, run: async () => { storyScreen(); await say('gus', "Don't you cry too long for me, now. Dirge on the way there, dance on the way back. That's how we do."); await say('gus', pick(['"And listen. Every song starts at the root. So does this city. Play it like you mean it."', '"When you get to the Tower, you walk in like it\'s your block. Because it is."', '"If Mama Roux says eat, you eat. That\'s not advice, that\'s the law."'])); await enterPlace('club'); } },
    ]);
  },
  async kitchen(pl) {
    const first = !S.flags.metRoux;
    let lines = '';
    placeScreen(pl, lines, [
      { label: 'Talk to Mama Roux', run: async () => { storyScreen(pl.name); await mamaRouxTalk(); await enterPlace('kitchen'); } },
      { label: 'Buy food', sub: 'Cheap healing.', run: async () => { openShop("Mama Roux's Kitchen", [{ id: 'beignet' }, { id: 'cafe' }, { id: 'poboy' }, { id: 'gumbo' }, { id: 'yakamein' }, { id: 'abita' }]); } },
      { label: `Sit-down meal (${fmtD(priceFor(S, 40, 'treme'))})`, sub: `+${S.quests.redbeans === 'done' ? 20 : 10}% Chops & Grit for 3 fights.`, run: async () => { const price = priceFor(S, 40, 'treme'); if (S.doubloons < price) { toast('Not enough Doubloons.'); return; } S.doubloons -= price; const amt = S.quests.redbeans === 'done' ? 0.2 : 0.1; S.mealBuff = { fights: 3, chops: amt, grit: amt }; fullRest(S); renderTopbar(); storyScreen(pl.name); await say('mamaroux', S.quests.redbeans === 'done' ? '"Red beans, rice, smoked sausage, and a piece of cornbread. That\'s Monday food. You can carry a city on Monday food."' : '"Sit. Eat. Don\'t talk with your mouth full, Gus never learned and look what happened." Red beans and a piece of fried chicken. Full restore, and you feel it in your Chops.'); await enterPlace('kitchen'); } },
      { label: 'Give her the red beans', cls: 'hint', cond: () => S.quests.redbeans === 'active' && countItem(S, 'redbeans') > 0, run: async () => { removeItem(S, 'redbeans', 1); S.quests.redbeans = 'done'; storyScreen(pl.name); await say('mamaroux', '"Camellia brand. Baby, you did good. Now get out my kitchen, I got a pot to start." Her meals get stronger from here on.'); await rewardXp(QUESTS.redbeans.xp); G.gold(QUESTS.redbeans.gold); await enterPlace('kitchen'); } },
    ]);
  },
  async pawn(pl) {
    const legendReady = S.notes.length >= 5 && !S.flags.legendBuilt;
    placeScreen(pl, '', [
      { label: 'Talk to Ti-Jacques', run: async () => { storyScreen(pl.name); await say('tijacques', pick(["Mais, cher, that horn's got more dents than a mailbox down the bayou, yeah. Twenty doubloons and I'll make her sing.", '"Metronome wanted to license my shop. I told them my shop\'s been licensed since 1952. By me."', '"Every horn in this window got a story. Most of them end with the Hush. Yours don\'t have to."', S.roots === 'creole' ? '"Your cousin Dede was in here Tuesday. Still owes me for a mouthpiece. Family discount, anyway."' : S.roots === 'cajun' ? '"Lafourche, huh? My mama was from Golden Meadow. Comment ça va, cher?"' : '"Irish Channel. I can hear it. Dat\'s alright, so\'s half my customers."'])); if (S.main.act === 'treme' && S.main.step >= 1 && !S.flags.hushHint) { S.flags.hushHint = true; await say('tijacques', '"Captain Hush? Can\'t stand a syncopated beat. FUNK goes right through that helmet. If your horn don\'t play funk, I sell Disco Beads. One attack, funk tone, plus twenty percent."'); G.bookHint('captain_hush'); if (!CLASSES[S.cls].tones.includes('FUNK')) { addItem(S, 'discobead', 3); await say('tijacques', `"And since that ${CLASSES[S.cls].name} of yours don\'t speak funk, here. Three Disco Beads, on the house. Gus would\'ve done the same." (Got 3 Disco Beads. Use one from the BAG in battle: your next attack becomes FUNK at +20%.)`); } } await enterPlace('pawn'); } },
      { label: 'Instruments & threads', run: async () => { openShop("Ti-Jacques' Pawn & Horn", instrumentEntries(2).concat([{ id: 'thr_thrift' }, { id: 'thr_secondline' }, { id: 'thr_duster' }, { id: 'ch_pouch' }, { id: 'ch_gator' }, { id: 'ch_claw' }])); } },
      { label: 'Accessories', sub: 'Tone tapes and beads: change your next attack\'s tone.', run: async () => { openShop("Ti-Jacques' Accessories", [{ id: 'discobead' }, { id: 'cayenne' }, { id: 'subtape' }, { id: 'indigo' }, { id: 'pralines' }, { id: 'smoke' }]); } },
      { label: `Build the legendary ${CLASSES[S.cls].legendary} (${fmtD(350)})`, cls: 'hint', cond: () => legendReady, run: async () => { if (S.doubloons < 350) { toast('Ti-Jacques needs Ð350 for the chrome.'); return; } S.doubloons -= 350; S.flags.legendBuilt = true; const id = `inst_${S.cls}_legend`; S.gearBag.push(id); S.gear.instrument = id; clampVitals(S); renderTopbar(); storyScreen(pl.name); await say('tijacques', `"Five Blue Notes. I can hear 'em from here, cher. Give me that horn." He works all night. In the morning there's a ${CLASSES[S.cls].legendary} on the counter, and it hums before you touch it.`); await narrate(`${CLASSES[S.cls].legendary} equipped. Chops +24.`); await enterPlace('pawn'); } },
    ]);
  },
  async congo(pl) {
    if (!S.flags.boss_captain_hush) {
      placeScreen(pl, '', [
        { label: 'Face Captain Hush', cls: 'hint', cond: () => S.main.act === 'treme' && S.main.step >= 2, run: async () => { await bossFlow('captain_hush'); } },
        { label: 'Look through the fence', cond: () => !(S.main.act === 'treme' && S.main.step >= 2), run: async () => { storyScreen(pl.name); await narrate('Through the humming fence: the old square, the drum circle stones, a Hush command post where the bandstand was. Captain Hush himself paces the center. Too many patrolmen on the streets to reach him. Thin them out first.'); await enterPlace('congo'); } },
      ]);
      return;
    }
    placeScreen(pl, '<p class="small">The fence is down. Somebody\'s already set up a drum circle on the stones, and the Hush give the square a wide berth now. A sparring circle runs most nights: practice fights, real XP, half the Doubloons.</p>', [
      { label: 'Spar (your level)', run: async () => { await sparFight(0); } },
      { label: 'Spar (harder, +2 levels)', run: async () => { await sparFight(2); } },
      { label: 'Sit with the drums', run: async () => { storyScreen(pl.name); await narrate('You sit on the stones and the drummers make room. Nobody says anything. The beat is older than the city. For a while you\'re part of it. (+20 Groove next fight.)'); G.nextFight({ groove: 20 }); await enterPlace('congo'); } },
    ]);
  },
  async strip(pl) {
    if (!S.flags.boss_vox_perfecta) {
      placeScreen(pl, '', [
        { label: 'Take the main stage', cls: 'hint', cond: () => S.main.act === 'quarter' && S.main.step >= 2, run: async () => { await bossFlow('vox_perfecta'); } },
        { label: 'Walk the Strip', cond: () => !(S.main.act === 'quarter' && S.main.step >= 2), run: async () => { storyScreen(pl.name); await narrate('Bourbon Street, licensed. Every club has a Barker hologram and a Busker-Bot and the same eight bars. At the far end, the main stage, and Vox Perfecta forty feet tall on every screen. The licensing broadcaster in Jackson Square keeps the whole Strip locked. Kill the signal first.'); await enterPlace('strip'); } },
      ]);
      return;
    }
    placeScreen(pl, `<p class="small">${S.flags.vox === 'reprogrammed' ? 'The main stage has a real band on it now, and Vox sings with them, a little flat on purpose. The Barkers are confused. The crowd is not.' : 'The main stage is dark. The Barkers still say "two-for-one" to nobody. Somewhere down Frenchmen, the real music is leaking back.'}</p>`, [
      { label: 'Listen a while', run: async () => { storyScreen(pl.name); await narrate(S.flags.vox === 'reprogrammed' ? 'Vox catches your eye from the stage and bends a note just for you. It\'s not perfect. That\'s the point. (+20 Groove next fight.)' : 'A kid with a cornet plays four bars from a balcony. A Hush patrol looks up, and then, for reasons they couldn\'t explain, looks away. (+20 Groove next fight.)'); G.nextFight({ groove: 20 }); await enterPlace('strip'); } },
    ]);
  },
  async pelican(pl) {
    placeScreen(pl, '', [
      { label: 'Drinks', sub: 'Temporary buffs for the next fight.', run: async () => { openShop('The Thirsty Pelican', [{ id: 'hurricane' }, { id: 'sazerac' }, { id: 'abita' }, { id: 'yakamein' }]); } },
      { label: 'Rumors', sub: 'Hints about what\'s ahead.', run: async () => { storyScreen(pl.name); await rumor(); await enterPlace('pelican'); } },
      { label: 'Bounty board', run: async () => { openBountyBoard(); } },
      { label: 'Crawfish Races', run: async () => { await crawfishRaces(); } },
    ]);
  },
  async feufollet(pl) {
    placeScreen(pl, '', [
      { label: 'Talk to Miss Odette', cls: S.main.act === 'quarter' && S.main.step === 0 ? 'hint' : '', run: async () => { storyScreen(pl.name); await odetteTalk(); await enterPlace('feufollet'); } },
      { label: 'Cutting Contest', sub: S.quests.cutting === 'done' ? 'Exhibition rounds for Doubloons.' : 'Beat three rivals in a row. Win Sugar.', cond: () => S.quests.cutting !== undefined, run: async () => { await cuttingContest(); } },
      { label: 'Sit In (paid gig)', sub: S.sitInDay === S.day ? 'Already played today. Rest at the club to turn the day.' : 'An 8-tap rhythm set. Pays by accuracy.', cond: () => !!S.flags.metOdette, run: async () => { if (S.sitInDay === S.day) { toast('You already sat in today.'); return; } await sitIn(); } },
    ]);
  },
  async market(pl) {
    placeScreen(pl, '', [
      { label: 'Browse the stalls', run: async () => { openShop('The French Market', [{ id: 'beignet' }, { id: 'cafe' }, { id: 'poboy' }, { id: 'muffuletta' }, { id: 'chicory' }, { id: 'gumbo' }, { id: 'yakamein' }, { id: 'snoball' }, { id: 'pralines' }, { id: 'boudin' }, { id: 'cayenne' }, { id: 'subtape' }, { id: 'indigo' }, { id: 'discobead' }, { id: 'smoke' }, { id: 'redbeans', cond: () => S.quests.redbeans === 'active' }]); } },
      { label: 'Listen to the vendors', run: async () => { storyScreen(pl.name); await narrate(pick(['"Pralines, pralines, get your pralines, licensed by nobody!" A Hush patrol pretends not to hear.', 'A sno-ball man shaves ice in 7/8 time just to annoy the drone over his stall.', 'An old woman selling hot sauce tells you Metronome tried to license cayenne. "Cayenne," she says, "licenses you."'])); await enterPlace('market'); } },
    ]);
  },
  async jackson(pl) {
    placeScreen(pl, '', [
      { label: 'Madame Zinnia\'s data-tarot (Ð30)', run: async () => { await zinniaTarot(); } },
      { label: 'Zinnia\'s charms', run: async () => { openShop("Madame Zinnia's Charms", [{ id: 'ch_beads' }, { id: 'ch_medal' }, { id: 'ch_pouch' }, { id: 'ch_medallion' }]); } },
      { label: 'The Lost Eye', cls: 'hint', cond: () => !S.quests.lost_eye || S.quests.lost_eye === 'active', sub: S.quests.lost_eye === 'active' ? 'Find the mime that took it.' : 'Zinnia wants a word.', run: async () => { await lostEyeQuest(); } },
      { label: 'The busker on the bench', cls: S.quests.horn === 'active' && (S.counters.hornFights || 0) >= 3 ? 'hint' : '', cond: () => S.quests.horn !== 'done', run: async () => { await hornQuest(); } },
      { label: 'The licensing broadcaster', cls: 'hint', cond: () => S.main.act === 'quarter' && S.main.step === 1, run: async () => { await broadcasterScene(); } },
      { label: 'Look at the broadcaster', cond: () => !(S.main.act === 'quarter' && S.main.step === 1), run: async () => { storyScreen(pl.name); await narrate(S.flags.broadcasterDone ? 'The broadcaster tower is dark. Somebody has hung a second-line umbrella on it. The cathedral bells, unlicensed, ring a little late and a little sweet.' : 'A chrome spire across the square from the cathedral, humming. Every licensed jingle on Bourbon routes through it. Not your problem yet. Miss Odette first.'); await enterPlace('jackson'); } },
    ]);
  },
  async lantern(pl) {
    const burned = S.flags.contracts === 'burned';
    placeScreen(pl, '', [
      { label: 'Talk to Madame Céleste', cls: S.main.act === 'storyville' && S.main.step === 0 ? 'hint' : '', run: async () => { storyScreen(pl.name); await celesteTalk(); await enterPlace('lantern'); } },
      { label: `Deluxe rest (${burned ? 'free' : fmtD(80)})`, sub: 'Full restore and Sweet Dreams for 3 fights.', run: async () => { if (!burned && S.doubloons < 80) { toast('Not enough Doubloons.'); return; } if (!burned) S.doubloons -= 80; fullRest(S); S.dreamBuff = { fights: 3 }; S.day += 1; renderTopbar(); storyScreen(pl.name); await narrate('Velvet, lamplight, a piano somewhere below playing something slow. Céleste says goodnight. The rest is yours and nobody else\'s business. You wake up restored, and the world has a little more swing in it. (Sweet Dreams: +10% Chops & Grit, +20% Mojo for 3 fights.)'); saveGame(false); await enterPlace('lantern'); } },
      { label: 'Whispers', sub: 'Pay for intel on a boss.', run: async () => { await whispers(); } },
      { label: 'Professor Theo\'s piano', sub: 'Sheet Music: permanent passives.', run: async () => { await theoTalk(); } },
      { label: 'The DJ in the corner booth', cls: !S.band.recruited.includes('static') ? 'hint' : '', cond: () => !!S.flags.metCeleste, run: async () => { await staticQuest(); } },
    ]);
  },
  async chopshop(pl) {
    placeScreen(pl, '', [
      { label: 'Browse cyberware', run: async () => { openShop('Basin Street Chop Shop', [{ id: 'mod_lungs' }, { id: 'mod_jaw' }, { id: 'mod_tempo' }, { id: 'mod_ribcage' }, { id: 'mod_eyes' }, { id: 'mod_swing' }]); } },
      { label: 'Talk to the surgeon', run: async () => { storyScreen(pl.name); await narrate(pick(['"No anesthesia, no refunds, no Metronome parts. Pick two." The surgeon has a cigarette and three arms.', '"Bellows Lungs are popular with horn players. Chrome Jaw too. I don\'t ask what the Swing Unit does. I just install it and the customers come back smiling."', '"I did Lucien\'s implant, before. Didn\'t know what the signal would do to it. If you see him out there... I\'m sorry."'])); await enterPlace('chopshop'); } },
    ]);
  },
  async counting(pl) {
    if (!S.flags.boss_mr_ledger) {
      placeScreen(pl, '', [
        { label: 'Enter the vault', cls: 'hint', cond: () => S.main.act === 'storyville' && S.main.step >= 3, run: async () => { await bossFlow('mr_ledger'); } },
        { label: 'Case the building', cond: () => !(S.main.act === 'storyville' && S.main.step >= 3), run: async () => { storyScreen(pl.name); await narrate('Brass teller windows, armed clerks, a portrait of Mr. Ledger over the door smiling like a closed account. The vault is somewhere below, but the stairs are a rumor. Céleste\'s Whispers know where.'); await enterPlace('counting'); } },
      ]);
      return;
    }
    placeScreen(pl, `<p class="small">${S.flags.contracts === 'burned' ? 'Ledger & Sons is a shell. Somebody has painted FREE over the door and nobody has painted over it.' : 'Ledger & Sons runs on under new management: yours, technically, on paper. The clerks avoid your eyes. The money was good.'}</p>`, [
      { label: 'Look around', run: async () => { storyScreen(pl.name); await narrate(S.flags.contracts === 'burned' ? 'Ash still drifts in the vault. A singer from the Lantern is using the teller counter as a stage. (+20 Groove next fight.)' : 'The ledgers are still here. You could read them. You don\'t.'); if (S.flags.contracts === 'burned') G.nextFight({ groove: 20 }); await enterPlace('counting'); } },
    ]);
  },
  async cabin(pl) {
    placeScreen(pl, '', [
      { label: 'Talk to Grand-mère Clothilde', cls: S.main.act === 'bayou' && S.main.step === 1 ? 'hint' : '', run: async () => { storyScreen(pl.name); await clothildeTalk(); await enterPlace('cabin'); } },
      { label: 'Be treated (free)', sub: 'Full Heart. Traiteurs don\'t take money.', run: async () => { fullRest(S); renderTopbar(); storyScreen(pl.name); await say('clothilde', pick(['She puts a hand on your forehead and says something soft in French that isn\'t a spell, exactly. The ache goes out of you.', '"Sit. Hush. No, not that Hush, the regular kind." Prayer, a cool cloth, and you\'re whole.'])); if (countItem(S, 'boudin') > 0) { const c = await choose([{ label: 'Give her a Boudin Link' }, { label: 'Keep it' }]); if (c === 0) { removeItem(S, 'boudin', 1); S.flags.boudinGiven = (S.flags.boudinGiven || 0) + 1; await say('clothilde', '"Mais, you didn\'t have to. But I won\'t say no." She eats it standing up, like a person who\'s been on her feet since 1998. (+5 Mojo next fight.)'); G.nextFight({ mojo: 5 }); } } await enterPlace('cabin'); } },
      { label: "Traiteur's Herbs", cls: 'hint', cond: () => S.quests.herbs === undefined || (S.quests.herbs === 'active' && countItem(S, 'swampherb') >= 3), sub: S.quests.herbs === 'active' ? 'Bring her the three herbs.' : 'She needs something gathered.', run: async () => { await herbsQuest(); } },
    ]);
  },
  async faisdodo(pl) {
    placeScreen(pl, '', [
      { label: 'Drinks', run: async () => { openShop('The Fais Do-Do', [{ id: 'abita' }, { id: 'hurricane' }, { id: 'boudin' }, { id: 'gumbo' }]); } },
      { label: 'Rumors', run: async () => { storyScreen(pl.name); await rumor(); await enterPlace('faisdodo'); } },
      { label: 'Remy at the frottoir', cls: !S.band.recruited.includes('remy') ? 'hint' : '', run: async () => { await remyQuest(); } },
      { label: 'Dance', run: async () => { storyScreen(pl.name); await narrate('Accordion, fiddle, frottoir. Somebody grabs your hand and you two-step until the fog comes in under the door. Pass a good time, cher. (+30 Groove next fight, +10% Heart.)'); G.nextFight({ groove: 30 }); G.heal(0.1); await enterPlace('faisdodo'); } },
    ]);
  },
  async boudin(pl) {
    placeScreen(pl, '', [
      { label: 'Buy food', run: async () => { openShop("Boudreaux's Boudin Shack", [{ id: 'boudin' }, { id: 'gumbo' }, { id: 'poboy' }, { id: 'abita' }, { id: 'yakamein' }]); } },
      { label: 'Hear a joke', run: async () => { storyScreen(pl.name); await say('boudreaux', pick([
        '"So Thibodeaux buys an airboat with a MoodSync speaker built in. Perfect time, no swing. He gets ten feet out and the whole swamp goes quiet. Frogs, gators, everything. Boudreaux hollers, \'Mais, what happened?\' Thibodeaux says, \'I think they\'re waiting for the two and four.\'"',
        '"Boudreaux and Thibodeaux go to Metronome Tower for a job. The man says, \'Can you keep perfect time?\' Boudreaux says, \'Yeah.\' Thibodeaux says, \'For how long?\' Man says, \'Forever.\' Thibodeaux says, \'Then what\'s the job for?\'"',
        '"Thibodeaux gets a Hush helmet. Noise-cancelling. Can\'t hear a thing. Boudreaux asks him how he likes it. Thibodeaux says, \'Like what?\' Boudreaux says, \'The helmet.\' Thibodeaux says, \'WHAT HELMET?\'"',
        '"Boudreaux tells Thibodeaux, \'Gus Thibodeaux is your cousin?\' Thibodeaux says, \'Every Thibodeaux is my cousin.\' Boudreaux says, \'That\'s a lotta funerals.\' Thibodeaux says, \'That\'s a lotta second lines.\'"',
      ])); await narrate('Boudreaux laughs harder than you do. Gus always swore he was the Thibodeaux in these. (+5 Mojo next fight.)'); G.nextFight({ mojo: 5 }); await enterPlace('boudin'); } },
    ]);
  },
  async pump(pl) {
    if (!S.flags.boss_rougarou) {
      placeScreen(pl, '', [
        { label: 'Enter Pump Station 13', cls: 'hint', cond: () => S.main.act === 'bayou' && S.main.step >= 3, run: async () => { await bossFlow('rougarou'); } },
        { label: 'Circle the fence', cond: () => !(S.main.act === 'bayou' && S.main.step >= 3), run: async () => { storyScreen(pl.name); await narrate('The pump station squats on pilings, chrome and concrete, broadcasting a test tone that makes your teeth itch. Wolf tracks everywhere. The pack guards every approach. Thin the pups first, and follow the trail to the alpha.'); await enterPlace('pump'); } },
      ]);
      return;
    }
    placeScreen(pl, `<p class="small">${S.flags.lucien === 'spared' ? 'The pump station is silent. Lucien\'s pack sleeps on the pilings, implants dark. He raises a hand as you pass.' : 'The pump station is silent. The wolves are gone. The swamp hums its own tune again.'}</p>`, [
      { label: 'Listen to the swamp', run: async () => { storyScreen(pl.name); await narrate('Frogs. Wind in the moss. An airboat far off, somebody on deck playing accordion. Nothing in 4/4. (+20 Groove next fight.)'); G.nextFight({ groove: 20 }); await enterPlace('pump'); } },
    ]);
  },
  async temple(pl) {
    placeScreen(pl, '', [
      { label: 'Talk to Mambo Rosalie', cls: S.main.act === 'cemetery' && S.main.step === 0 ? 'hint' : '', run: async () => { storyScreen(pl.name); await rosalieTalk(); await enterPlace('temple'); } },
      { label: `Blessing (${fmtD(150)}, ${3 - S.blessings} left)`, sub: 'A permanent +1 to a stat of your choice.', cond: () => S.blessings < 3, run: async () => { await blessing(); } },
      { label: 'Gris-Gris Bags', run: async () => { openShop("Mambo Rosalie's Altar", [{ id: 'grisgris' }, { id: 'yakamein' }, { id: 'indigo' }]); } },
      { label: 'Restless Haints', cls: 'hint', cond: () => !!S.flags.metRosalie && S.quests.haints !== 'done', sub: S.quests.haints === 'active' ? `${S.counters.haints || 0}/3 laid to rest.` : 'Three haints need hearing.', run: async () => { await haintsQuest(); } },
    ]);
  },
  async crypts(pl) {
    placeScreen(pl, '', [
      { label: 'Walk the rows', sub: 'A fight or a story. The keys are out here.', run: async () => { storyScreen(pl.name); const r = Math.random(); if (r < 0.65) { await narrate(pick(['Blue light between the tombs. It has eyes.', 'A tomb door opens an inch. Then all the way.', 'The votives go out one by one, down the row, toward you.'])); const res = await G.fight('random'); if (res === 'win') await afterStreet(); } else await runEvent(); renderTopbar(); await enterPlace('crypts'); } },
      { label: 'Read the inscriptions', run: async () => { storyScreen(pl.name); await narrate(pick(['"AUGUSTE THIBODEAUX, GRAND MARSHAL. He led. We followed. We still do." Fresh flowers. A cornet mouthpiece on the step.', '"HERE LIES A TROMBONE PLAYER WHO NEVER MISSED A SECOND LINE. He is not here. He is in the second line."', 'A tomb with no name, only a bass clef. Somebody has left a drumstick.'])); G.nextFight({ groove: 15 }); await enterPlace('crypts'); } },
    ]);
  },
  async mausoleum(pl) {
    if (!S.flags.boss_archivist) {
      placeScreen(pl, '', [
        { label: 'Unlock the mausoleum', cls: 'hint', cond: () => S.main.act === 'cemetery' && S.main.step >= 2, run: async () => { await bossFlow('archivist'); } },
        { label: 'Try the door', cond: () => !(S.main.act === 'cemetery' && S.main.step >= 2), run: async () => { storyScreen(pl.name); await narrate('The oldest tomb in the row, and under its slab, a steel door with three keyholes and a Metronome seal. Three Crypt Keys. The haints and the wraiths carry them.'); await enterPlace('mausoleum'); } },
      ]);
      return;
    }
    placeScreen(pl, '<p class="small">The servers are dark. The dead have their songs back. Somebody plays one, faintly, from a tomb that should be empty.</p>', [
      { label: 'Listen', run: async () => { storyScreen(pl.name); await narrate('A cornet, far down the rows. It plays four bars you know from a cassette. (+20 Groove next fight.)'); G.nextFight({ groove: 20 }); await enterPlace('mausoleum'); } },
    ]);
  },
  async maison(pl) {
    placeScreen(pl, '', [
      { label: 'Top-tier gear', run: async () => { openShop('Maison Chrome', instrumentEntries(3).concat([{ id: 'thr_duster' }, { id: 'thr_kevlar' }, { id: 'ch_haintblue' }, { id: 'ch_medallion' }, { id: 'mod_titanjaw' }, { id: 'mod_overdrive' }, { id: 'mod_swing' }])); } },
      { label: 'Browse without buying', run: async () => { storyScreen(pl.name); await narrate('The clerk looks at your shoes, then your horn, then decides you might be an eccentric. "Our Kevlar Zoot Suit stops a Hush baton and a dinner invitation with equal grace."'); await enterPlace('maison'); } },
    ]);
  },
  async tuxedo(pl) {
    placeScreen(pl, '', [
      { label: 'Pricey buffs', run: async () => { openShop('The Silver Tuxedo', [{ id: 'sazerac', price: 60 }, { id: 'hurricane', price: 60 }, { id: 'muffuletta', price: 140 }, { id: 'chicory', price: 60 }]); } },
      { label: 'Rumors', run: async () => { storyScreen(pl.name); await rumor(); await enterPlace('tuxedo'); } },
      { label: 'The valet (invitation, Ð300)', cls: S.main.act === 'garden' && S.main.step === 0 ? 'hint' : '', cond: () => S.main.act === 'garden' && S.main.step === 0, run: async () => { storyScreen(pl.name); await say('valet', '"Miss Vane\'s ball. Of course. The invitations are numbered, but numbers can be... re-issued. Three hundred Doubloons, and I never saw you."'); const c = await choose([{ label: 'Pay Ð300' }, { label: 'Not tonight' }]); if (c === 0) { if (S.doubloons < 300) { await say('valet', '"Then I never saw you for free. Come back with the money."'); } else { S.doubloons -= 300; await getInvitation('valet'); } } await enterPlace('tuxedo'); } },
      { label: 'Listen to the quartet bots', run: async () => { storyScreen(pl.name); await narrate(pick(['Four String Quartet Drones saw through a licensed minuet. A diner claps between movements. A Butler Unit removes him.', 'The quartet plays a waltz so exact you can feel your pulse trying to argue with it. You win the argument. (+10 Groove next fight.)'])); G.nextFight({ groove: 10 }); await enterPlace('tuxedo'); } },
    ]);
  },
  async manor(pl) {
    if (!S.flags.boss_isolde) {
      placeScreen(pl, '', [
        { label: 'Present your invitation', cls: 'hint', cond: () => S.main.act === 'garden' && S.main.step === 1, run: async () => { await ballScene(); } },
        { label: 'Enter the ballroom', cls: 'hint', cond: () => S.main.act === 'garden' && S.main.step === 2, run: async () => { await bossFlow('isolde'); } },
        { label: 'The gate', cond: () => S.main.act !== 'garden' || S.main.step === 0, run: async () => { storyScreen(pl.name); await narrate('Gold gates, a security dome, a Butler Unit checking cream-colored cards. No card, no ball. Static could forge one. Céleste could call in a favor, if you earned one. The Silver Tuxedo\'s valet sells them, if you have the money.'); await enterPlace('manor'); } },
      ]);
      return;
    }
    placeScreen(pl, '<p class="small">The ball is over. The chandeliers are out. Somewhere in the house, a violin plays something slightly, deliberately flat.</p>', [
      { label: 'Walk the grounds', run: async () => { storyScreen(pl.name); await narrate('Topiary soldiers stand at ease. A Debutante Droid, powered down, holds a punch cup forever. (+15 Groove next fight.)'); G.nextFight({ groove: 15 }); await enterPlace('manor'); } },
    ]);
  },
  async towerlobby(pl) {
    if (S.flags.ending) { placeScreen(pl, '<p class="small">The pendulum in the crown has stopped. Somebody has hung a second-line umbrella from it.</p>', [{ label: 'Look up', run: async () => { storyScreen(pl.name); await narrate('From the plaza you can see the umbrella turning in the wind, purple, green, and gold. The city keeps its own time now.'); await enterPlace('towerlobby'); } }]); return; }
    placeScreen(pl, '', [
      { label: S.towerFloor > 0 ? `Continue the climb (${TOWER_FLOORS[Math.min(S.towerFloor, TOWER_FLOORS.length - 1)].name})` : 'March on the Tower', cls: 'hint', cond: () => S.main.act === 'tower' && S.main.step >= 1, run: async () => { await towerFlow(); } },
    ]);
  },
};
/* ---------- NPC talks ---------- */
async function mamaRouxTalk() {
  if (!S.flags.metRoux) { S.flags.metRoux = true; }
  const g = { creole: '"Where y\'at, baby? Your mama still making groceries at the Circle Food? Tell her I said hey. Sit down, you lookin\' thin as a po\'boy wrapper."', cajun: '"There\'s my bayou baby. Mais, you want some gumbo? Of course you do. Sit."', yat: '"Where y\'at, dawlin\'! Irish Channel in my kitchen. Sit down before you fall down."', any: '"Where y\'at, baby? Sit down, you lookin\' thin as a po\'boy wrapper. Eat first. Then you can go save the city."' };
  await say('mamaroux', greet('mamaroux', g));
  if (S.main.act === 'treme' && S.main.step === 0) { S.main.step = 1; await say('mamaroux', '"Now listen. The Hush got every corner in Tremé. You can\'t get near Congo Square with them thick like that. Go thin them out. Three good fights on the streets and Captain Hush\'ll come see about you himself."'); return; }
  if (S.quests.redbeans === undefined) { const c = await choose([{ label: '"You need anything, Mama?"' }, { label: '"Just passing through."' }]); if (c === 0) { S.quests.redbeans = 'active'; await say('mamaroux', '"Red beans. Camellia brand, the dry ones. The French Market still carries them if the Hush haven\'t licensed beans yet. Bring me a bag and I\'ll cook you something that\'ll carry you to the Tower and back."'); } else await say('mamaroux', '"Mm-hm. Passing through. Eat something on your way."'); return; }
  const bits = ['"Gus used to sit right there. Same stool. Said my gumbo was the only thing in the city with more layers than his solos."', '"Ti-Jacques fixed that boy\'s horn more times than I can count. Never charged him once. Don\'t tell Ti-Jacques I told you."', '"You tired, baby? The club\'s got chairs. They ain\'t comfortable but they\'re free."', S.notes.length >= 3 ? '"Half the scale. I can feel it in the walls. Keep going."' : '"The Blue Notes. Six of them. Gus said the whole city was just those six notes played different every night."', S.flags.gusFreed ? '"You saw him. Gus. Did he... was he alright? Don\'t answer that. He\'s leading the line. He\'s alright."' : null].filter(Boolean);
  await say('mamaroux', pick(bits));
}
async function odetteTalk() {
  if (!S.flags.metOdette) {
    S.flags.metOdette = true;
    await say('odette', '"So you\'re the one from Tremé. Gus talked about you. Sit down, the first drink\'s on the house and the second one\'s on Metronome because I\'m not paying their license."');
    await say('odette', '"Here\'s the shape of it. Bourbon is the Licensed Entertainment Strip now. Vox Perfecta, android diva, forty feet tall, perfect pitch, zero feeling. Every club on the Strip is wired to a licensing broadcaster in Jackson Square. Kill that signal and the Strip\'s doors open. Then take the main stage and put something real on it."');
    if (S.main.act === 'quarter' && S.main.step === 0) S.main.step = 1;
    await say('odette', '"And when you\'re done with that: my back room runs a Cutting Contest. Three rivals, one after the other, real players. Win it and Sugar sings for you. She\'s been waiting for a band worth following."');
    S.quests.cutting = 'active';
    await say('odette', '"Oh, and if you need Doubloons, sit in with the house band once a day. We pay by how many clams you don\'t play."');
    return;
  }
  const bits = ['"Frenchmen Street was the last place in the city with a real downbeat. I intend to keep it that way."', S.flags.boss_vox_perfecta ? (S.flags.vox === 'reprogrammed' ? '"Vox came by. Sang a ballad, flat as a flounder, and the whole room cried. You did a good thing, cher."' : '"The Strip\'s dark without Vox. Honestly? It\'s quieter. I\'ll take quiet over licensed."') : '"Vox Perfecta can\'t feel a blue note. That\'s not a figure of speech. BLUE tones go right through her."', S.quests.cutting === 'done' ? '"Sugar says you\'re the real thing. Sugar doesn\'t say that."' : '"The Cutting Contest is waiting. Hot Rod plays HOT. Big Mae is all LOW end. Two-Tone honks FUNK with a BLUE chaser."'];
  if (!S.flags.voxHint) { S.flags.voxHint = true; G.bookHint('vox_perfecta'); }
  await say('odette', pick(bits));
}
async function celesteTalk() {
  if (!S.flags.metCeleste) {
    S.flags.metCeleste = true;
    await say('celeste', '"Bienvenue, chéri. In this house the music\'s live and the secrets cost extra. You\'re the one who took the Strip back. Good. Now listen, because Storyville has a worse problem than Metronome."');
    await say('celeste', '"Mr. Ledger. He bought every contract in the district. Musicians, dancers, dealers, the woman who sells flowers on Basin Street. Bought the paper on all of them, and the paper says the music is his. His collectors carry the pages on them. I want those pages. Three of them, and I can read where his vault is."');
    if (S.main.act === 'storyville' && S.main.step === 0) S.main.step = 1;
    await say('celeste', '"Contract Enforcers. Pinstripes, armor plating. Shake them on the street. And chéri, when you have the pages, come see me. My Whispers will tell you where the vault is, for a small fee. Everything here is for a small fee. That\'s how we stay open."');
    return;
  }
  if (S.main.act === 'garden' && S.main.step === 0 && S.flags.contracts === 'burned' && !S.flags.celesteInvite) {
    await say('celeste', '"You want into the Vane ball. Of course you do. Isolde Vane owes this house more than a favor, she owes it a whole winter. I\'ll call it in. Consider it the only thing in the Lantern that\'s ever been free."'); S.flags.celesteInvite = true; await getInvitation('celeste'); return;
  }
  const bits = [S.flags.contracts === 'burned' ? '"The district\'s free. People are singing on Basin Street again. The deluxe rooms are yours whenever you want them, no charge, forever. That\'s the deal and I keep my deals."' : S.flags.contracts === 'kept' ? '"You kept the money. Mm. I don\'t judge, chéri. I just remember." She remembers. The Lantern is a little colder.' : '"Ledger counts everything. Count faster than him. FUNK throws his whole arithmetic off."', '"Theo\'s been at that piano since before the Silence Ordinance. If you find his rolls, you\'ll make an old man cry, and he\'ll hate that, and he\'ll love it."', '"Static? Corner booth. Metronome owns his contract, and it\'s the only one in Storyville I couldn\'t buy back. Maybe you can."'];
  if (!S.flags.ledgerHint) { S.flags.ledgerHint = true; G.bookHint('mr_ledger'); }
  await say('celeste', pick(bits));
}
async function clothildeTalk() {
  if (!S.flags.metClothilde) {
    S.flags.metClothilde = true;
    await say('clothilde', S.roots === 'cajun' ? '"Mais, come here, mon \'tit. Lafourche? I knew your people. Your grand-père could call a fais do-do out of a dead swamp with that accordion. Sit, sit. Comment ça va?"' : '"Come here, mon \'tit. Traiteur don\'t take money. But if you got some boudin, I won\'t say no."');
    await say('clothilde', '"You hear that hum? That\'s Pump Station 13. Metronome\'s been testing their Click out here where they think nobody\'s listening. The Chrome Wolves were listening. Their alpha, Lucien, the boy with the implant, the signal got in him and turned him into something the old folks got a name for. Rougarou."');
    if (S.main.act === 'bayou' && S.main.step === 1) S.main.step = 2;
    await say('clothilde', '"The pups are out on the trails, feral. Put three of them down gentle and follow the tracks to the station. And mon \'tit: the rougarou runs hot already. Heat is how you reach him."');
    G.bookHint('rougarou');
    S.quests.herbs = 'active';
    await say('clothilde', '"One more thing. I need elderberry, mamou root, and the leaf I never say the name of. Three herbs, out by the cypress. Bring them and I\'ll bless you proper."');
    return;
  }
  const bits = [S.flags.lucien === 'spared' ? '"Lucien came by. Sat on my porch all night and didn\'t say a word. In the morning he fixed my steps. He\'s coming back to himself."' : S.flags.lucien === 'finished' ? '"I prayed for Lucien. I\'m praying for you too. Both of you needed it."' : '"The rougarou only has power over those who are afraid. Don\'t be afraid. Be hot."', S.roots === 'cajun' ? '"Your grand-père\'s accordion is still in my back room. Metronome never found it. When this is over, come get it."' : '"The swamp keeps its own time. Listen to the frogs. They never did learn 4/4."'];
  await say('clothilde', pick(bits));
}
async function rosalieTalk() {
  if (!S.flags.metRosalie) {
    S.flags.metRosalie = true;
    await say('rosalie', '"Come in. Mind the candles. I know who you are. The dead have been talking about you for a month."');
    await say('rosalie', '"Under the oldest tomb, Metronome built what they call the Data Mausoleum. They captured the songs of every musician they ever Muted, and they keep them down there, and they feed them to the Click so it can learn what to erase. Gus is down there. His song, I mean. The rest of him is restless, and I can\'t settle him until it\'s free."');
    if (S.main.act === 'cemetery' && S.main.step === 0) S.main.step = 1;
    await say('rosalie', '"The door takes three Crypt Keys. The Data Wraiths carry them. So do some of the wandering haints, poor things. And when you get down there: the Archivist is a machine that catalogs grief. Give it some. BLUE tones break through its filters."');
    G.bookHint('archivist');
    await say('rosalie', '"And if you have time for the living and the dead both: three haints out in the rows can\'t rest. Hear their stories. Play them a dirge. Fight what\'s left of their pain. Brother Moses has been trying alone, with that banjo, for a year."');
    S.quests.haints = 'active';
    return;
  }
  const bits = [S.flags.gusFreed ? '"Gus is settled. He\'s not resting, mind you. He\'s got a line to lead. But he\'s settled."' : '"Grief is a frequency. The Archivist doesn\'t have a filter for it."', '"A blessing is a small thing. One point. But the dead gave it to me to give to you, and the dead don\'t give small."', S.quests.haints === 'done' ? '"Brother Moses is sleeping through the night for the first time in a year. So am I."' : '"Three haints. One under the oak, one by the wall, one who won\'t stop singing. Moses knows the way."'];
  await say('rosalie', pick(bits));
}
async function theoTalk() {
  storyScreen('The Velvet Lantern');
  if (!S.flags.metTheo) {
    S.flags.metTheo = true;
    await say('theo', '"They call me the Professor because I taught every piano player in this district, and then Metronome taught them to stop. I sell sheet music. Not songs. Techniques. Things you keep."');
    if (S.quests.rolls === undefined) { S.quests.rolls = 'active'; await say('theo', '"And if you\'re out on the streets anyway: Ledger\'s collectors took my player-piano rolls. Three of them. Sixty years of my hands, punched in paper. They\'re in crates around Storyville somewhere, stacked wrong. Find them and the first sheet is free."'); }
  } else if (S.quests.rolls === 'active' && countItem(S, 'pianoroll') >= 3) {
    removeItem(S, 'pianoroll', 3); S.quests.rolls = 'done';
    await say('theo', '"All three. Sixty years." He doesn\'t cry. He puts one on the piano and it plays itself, and he puts his hands over the keys without touching them, and the room goes quiet, and then it doesn\'t.');
    await say('theo', '"Pick one. Any sheet. It\'s yours. And when you march on that Tower, I\'m pushing my piano down Canal Street behind you, and don\'t argue."');
    await rewardXp(QUESTS.rolls.xp); G.gold(QUESTS.rolls.gold);
    const avail = Object.keys(SHEET_MUSIC).filter(id => !S.sheet.includes(id));
    if (avail.length) { const c = await choose(avail.map(id => ({ label: `${SHEET_MUSIC[id].name}: ${SHEET_MUSIC[id].desc}` }))); S.sheet.push(avail[c]); toast('Learned ' + SHEET_MUSIC[avail[c]].name + '.'); }
  } else {
    await say('theo', pick(['"Circular Breathing isn\'t a trick. It\'s a decision not to stop."', '"Second Wind: once a night, the song refuses to end. I\'ve seen it save a man\'s life. His name was Gus."', S.quests.rolls === 'active' ? `"${countItem(S, 'pianoroll')} of three. Keep looking. They're in crates marked LAVIGNE, if the Enforcers haven't burned them."` : '"Play something. Not for me. For the piano."']));
  }
  openShop("Professor Theo's Sheet Music", Object.keys(SHEET_MUSIC).map(id => ({ id })), { noSell: true });
  await new Promise(res => { UI.onSheetClose = res; });
  await enterPlace('lantern');
}
async function rumor() {
  const nextBoss = ACT_ORDER.map(a => DISTRICTS[a] && DISTRICTS[a].boss).filter(Boolean).find(bid => !S.flags['boss_' + bid]) || 'conductor';
  const lines = {
    captain_hush: 'Captain Hush can\'t stand FUNK. Every fourth turn he raises that dampener, and you\'ll be Muted for two. Save your Funk for the turns in between.',
    vox_perfecta: 'Vox Perfecta resists HOT and can\'t feel BLUE. She samples whatever you play last and throws it back at seventy percent, so don\'t end a turn on your best skill if she\'s about to go.',
    mr_ledger: 'Mr. Ledger\'s Chops compound every single turn. Eight percent, stacking. FUNK scrambles his arithmetic. Kill him fast or don\'t bother.',
    rougarou: 'The rougarou is weak to HOT and resists LOW. At half Heart it overclocks and attacks twice a round. Bring something that heals.',
    archivist: 'The Archivist resists FUNK and breaks on BLUE. It summons Ghost Tracks, two at a time. Static\'s Scratch hits machines double.',
    isolde: 'Isolde Vane raises a Perfect Pitch Shield every three turns. Only an ON THE ONE hit or a SOLO shatters it. When she telegraphs her Cadenza, VAMP.',
    conductor: 'The Conductor counts down a Crescendo. VAMP when you hear "3... 2... 1." FUNK is the only thing he can\'t conduct.',
  };
  G.bookHint(nextBoss);
  const who = S.district === 'bayou' ? 'A man at the bar with a frottoir scar on his chest' : S.district === 'garden' ? 'The valet, pretending to polish a glass' : 'A woman at the end of the bar with three empty go-cups';
  await narrate(`${who} leans in. "${lines[nextBoss]}" ${pick(['She taps the bar twice. On the two and four.', 'He goes back to his drink.', 'You buy the next round.'])}`);
  await narrate(pick(['Also: "The Praline Lady wanders. If you see her, buy the King Cake. The baby\'s real."', 'Also: "Ti-Jacques will build you a legendary horn when you hold five Blue Notes. Don\'t let him say he won\'t."', 'Also: "Madame Zinnia\'s data-tarot is right more than it\'s wrong. That\'s better than the weather."', 'Also: "Every elite in this city has a bounty on the Pelican\'s board. Hunting\'s good money."']));
}
function openBountyBoard() {
  const rows = S.unlocked.filter(d => BOUNTIES[d]).map(d => { const bt = BOUNTIES[d]; const done = S.bountiesDone.includes(d); const active = S.bounty === d; return `<div class="item"><div class="item-info"><b>${esc(bt.name)}</b> <span class="dim small">${esc(DISTRICTS[d].name)}</span><div class="small">${esc(ENEMIES[bt.elite].book)}</div><div class="small gold">Pays ${fmtD(bt.gold)}</div></div>${done ? '<span class="good small">COLLECTED</span>' : active ? '<span class="gold small">TRACKING</span>' : btn('take:' + d, 'Take', 'small primary')}</div>`; }).join('');
  openSheet('Bounty Board', `<p class="small dim">One elite per district. Take a bounty, then use TRACK BOUNTY on that district's screen to find it. Elites can't be fled.</p>${rows}`, { take: (d) => { S.bounty = d; toast(`Tracking ${BOUNTIES[d].name} in ${DISTRICTS[d].name}.`); openBountyBoard(); } });
}
async function zinniaTarot() {
  storyScreen('Jackson Square');
  if (S.doubloons < 30) { await say('zinnia', '"Thirty Doubloons, cher. The cards don\'t read for free. Neither do I."'); await enterPlace('jackson'); return; }
  S.doubloons -= 30; renderTopbar();
  const r = Math.random();
  if (r < 0.25) { G.nextFight({ hyped: true }); await say('zinnia', '"The Tower, reversed. Your next fight, you walk in already hot." (Hyped at the start of your next fight.)'); }
  else if (r < 0.5) { G.nextFight({ pocket: true }); await say('zinnia', '"The Drummer. You\'re in the pocket before the count-off." (In the Pocket at the start of your next fight.)'); }
  else if (r < 0.7) { G.nextFight({ groove: 30 }); await say('zinnia', '"The Second Line. You start already moving." (+30 Groove next fight.)'); }
  else if (r < 0.85) { G.nextFight({ mojo: 6 }); await say('zinnia', '"The Lucky Bead. Something falls your way." (+6 Mojo next fight.)'); }
  else { await rumor(); }
  await enterPlace('jackson');
}
async function blessing() {
  if (S.doubloons < 150) { toast('The offering is Ð150.'); return; }
  storyScreen("Mambo Rosalie's Temple");
  await say('rosalie', '"Choose. The dead will give you one point, and they\'ll give it in the one place you ask."');
  const c = await choose(STAT_KEYS.map(k => ({ label: `+1 ${STAT_NAMES[k]}` })));
  S.doubloons -= 150; S.blessings += 1; S.perm[STAT_KEYS[c]] += 1; clampVitals(S); renderTopbar();
  await narrate(`Rosalie shakes the asson. The candles lean toward you. +1 ${STAT_NAMES[STAT_KEYS[c]]}, permanently.`);
  await enterPlace('temple');
}
async function getInvitation(how) {
  if (!S.keyItems.includes('invitation')) S.keyItems.push('invitation');
  if (S.main.act === 'garden' && S.main.step === 0) S.main.step = 1;
  await narrate(how === 'static' ? 'Static hands you a cream card still warm from the printer. "Numbered 212. There is no 212. There is now."' : how === 'celeste' ? 'A courier brings a cream card with gold leaf. "Miss Isolde Vane requests your presence." Céleste\'s handwriting on the back: "You owe me nothing. She owes me plenty."' : 'The valet produces a cream card from his sleeve like a magician who hates his job. "Miss Isolde Vane requests your presence."');
  toast('Got the Ball Invitation. Vane Manor is open.');
}
/* ---------- Side quests ---------- */
async function lostEyeQuest() {
  storyScreen('Jackson Square');
  if (S.quests.lost_eye === undefined) {
    S.quests.lost_eye = 'active';
    await say('zinnia', '"A Neon Mime took my eye. My EYE, cher. Walked up, mimed a hand on my face, and walked away with it in his invisible pocket. The cards say he\'s still in the Quarter. Shake him down and I\'ll march for you when the time comes."');
    await enterPlace('jackson'); return;
  }
  if (S.quests.lost_eye === 'active') {
    await narrate('You ask around the square. A sno-ball vendor points down Royal Street. "The one with the shiny pocket."');
    const res = await runBattle(buildEnemies(['neon_mime', 'neon_mime']), { ctx: { type: 'quest', id: 'lost_eye' }, context: 'quest', intro: 'Two Neon Mimes. One of them has a pocket that glows.' });
    if (res !== 'win') { await enterPlace('jackson'); return; }
    S.quests.lost_eye = 'done'; S.gearBag.push('ch_evileye');
    await say('zinnia', '"There she is." She pops the eye back in and it whirs and focuses on you. "I have a spare. Take it. It sees things a minute early, which is the only kind of seeing worth doing." (Zinnia\'s Spare Eye: a charm. She joins the second line.)');
    await rewardXp(QUESTS.lost_eye.xp); G.gold(QUESTS.lost_eye.gold);
  }
  await enterPlace('jackson');
}
async function hornQuest() {
  storyScreen('Jackson Square');
  if (S.quests.horn === undefined) {
    S.quests.horn = 'active';
    await say('busker', '"The Hush took my trumpet. Forty years on this bench, and some kid in a helmet writes me a citation and walks off with it. They keep what they confiscate on them, in those packs. Beat three Patrolmen and you\'ll find it, or something like it."');
    await enterPlace('jackson'); return;
  }
  if ((S.counters.hornFights || 0) >= 3) {
    S.quests.horn = 'done'; S.gearBag.push('ch_mouthpiece');
    await say('busker', '"That\'s her." He takes the trumpet like it\'s a baby and plays one note that stops the pigeons. "Keep the mouthpiece. I\'ve got the one I was born with." (Busker\'s Mouthpiece: a charm.)');
    await rewardXp(QUESTS.horn.xp); G.gold(QUESTS.horn.gold);
  } else await say('busker', `"${3 - (S.counters.hornFights || 0)} more Patrolmen. They\'re not hard to find. They find you."`);
  await enterPlace('jackson');
}
async function staticQuest() {
  storyScreen('The Velvet Lantern');
  if (S.band.recruited.includes('static')) { await say('static', pick(['"Every grid has a seam. I know where I left mine."', '"You want to hear something? I scratched the Hush frequency into a breakbeat. They march to it now and don\'t know why."', S.main.act === 'garden' && S.main.step === 0 ? '"The Vane ball? I can forge an invitation in my sleep. Give me four seconds."' : '"Corner booth\'s always open."'])); if (S.main.act === 'garden' && S.main.step === 0) { await getInvitation('static'); } await enterPlace('lantern'); return; }
  if (S.quests.static_contract === undefined) {
    S.quests.static_contract = 'active';
    await say('static', '"Static. Cassette deck, mostly. Metronome owns my contract, which means two Repo Drone squads follow me around to make sure I don\'t play anywhere that isn\'t theirs. Walk me from here to the Chop Shop. Two blocks. If we make it, I\'m out, and I\'m yours."');
    const c = await choose([{ label: '"Let\'s walk."' }, { label: '"Give me a minute to get ready."' }]);
    if (c === 1) { await enterPlace('lantern'); return; }
  } else await say('static', '"Ready to walk? Two blocks. Two squads."');
  const r1 = await runBattle(buildEnemies(['repo_drone', 'repo_drone']), { ctx: { type: 'quest', id: 'static_contract', step: 1 }, context: 'quest', intro: 'First block. Two Repo Drones drop out of the fog.' });
  if (r1 !== 'win') { await enterPlace('lantern'); return; }
  await narrate('One block down. Static scratches a drone\'s wreckage and it plays its own death rattle backwards. "Second squad\'s on Basin."');
  healPct(S, 0.15); renderTopbar();
  const r2 = await runBattle(buildEnemies(['repo_drone', 'repo_drone', 'enforcer']), { ctx: { type: 'quest', id: 'static_contract', step: 2 }, context: 'quest', intro: 'Second block. Two more drones and an Enforcer holding the contract itself.' });
  if (r2 !== 'win') { await enterPlace('lantern'); return; }
  S.quests.static_contract = 'done'; S.band.recruited.push('static'); if (S.band.active.length < 2) S.band.active.push('static');
  await say('static', '"That\'s the paper." He feeds the contract into his cassette deck. It comes out the other side as a loop. "I\'m out. I\'m in. Where we going?" (Static joins your band.)');
  await rewardXp(QUESTS.static_contract.xp); G.gold(QUESTS.static_contract.gold);
  await enterPlace('lantern');
}
async function remyQuest() {
  storyScreen('The Fais Do-Do');
  if (S.band.recruited.includes('remy')) { await say('remy', pick(['"Mais, the gators don\'t come around no more. They heard the frottoir."', S.roots === 'cajun' ? '"Lafourche and Manchac, in the same band. My grand-père would\'ve said it couldn\'t be done. Then he\'d have danced."' : '"You ever had cracklins at Boudreaux\'s? No? Cher. Go."'])); await enterPlace('faisdodo'); return; }
  if (S.quests.faisdodo === undefined) {
    S.quests.faisdodo = 'active';
    await say('remy', S.roots === 'cajun' ? '"Mais, Lafourche! I can hear it. Listen, cher, Metronome\'s tagged gators been coming up through the dock every night. Two waves, like clockwork, because of course. Help me hold the floor and I\'ll play frottoir behind you till the Tower falls."' : '"Remy. Frottoir. You see the dock? Metronome\'s Chrome Gators come up through it every night, two waves, like clockwork, because of course. Help me hold the dancehall and I\'m in your band, yeah."');
    const c = await choose([{ label: '"Let\'s hold the floor."' }, { label: '"Let me get ready first."' }]);
    if (c === 1) { await enterPlace('faisdodo'); return; }
  } else await say('remy', '"Ready? They come at midnight. It\'s midnight."');
  const r1 = await runBattle(buildEnemies(['chrome_gator', 'chrome_gator']), { ctx: { type: 'quest', id: 'faisdodo', step: 1 }, context: 'quest', intro: 'First wave. Two Chrome Gators come up through the dock boards.' });
  if (r1 !== 'win') { await enterPlace('faisdodo'); return; }
  await narrate('The first wave slides back into the water, dented. Remy hands you a beer without stopping playing. "Second wave\'s the big one."');
  healPct(S, 0.15); renderTopbar();
  const r2 = await runBattle(buildEnemies(['chrome_gator', 'chrome_gator', 'skeeter']), { ctx: { type: 'quest', id: 'faisdodo', step: 2 }, context: 'quest', intro: 'Second wave. Two gators and a Skeeter Swarm riding in on their backs.' });
  if (r2 !== 'win') { await enterPlace('faisdodo'); return; }
  S.quests.faisdodo = 'done'; S.band.recruited.push('remy'); if (S.band.active.length < 2) S.band.active.push('remy');
  await say('remy', '"The floor holds." The whole dancehall cheers. Remy straps the frottoir tighter. "Where we going, cher? I got spoons for days." (Remy joins your band.)');
  await rewardXp(QUESTS.faisdodo.xp); G.gold(QUESTS.faisdodo.gold);
  await enterPlace('faisdodo');
}
async function herbsQuest() {
  storyScreen("Grand-mère Clothilde's Cabin");
  if (S.quests.herbs === undefined) { S.quests.herbs = 'active'; await say('clothilde', '"Elderberry, mamou root, and the leaf I never name. Three herbs. Out by the cypress, on the trails. Bring them and I\'ll bless you proper."'); await enterPlace('cabin'); return; }
  if (S.quests.herbs === 'active' && countItem(S, 'swampherb') >= 3) {
    removeItem(S, 'swampherb', 3); S.quests.herbs = 'done';
    await say('clothilde', '"Ça c\'est bon. All three, and you didn\'t crush the leaf." She grinds them, says a prayer older than the parish, and presses a thumb to your forehead. "One point, mon \'tit. Where you want it?"');
    const c = await choose(STAT_KEYS.map(k => ({ label: `+1 ${STAT_NAMES[k]}` })));
    S.perm[STAT_KEYS[c]] += 1; clampVitals(S); renderTopbar();
    await narrate(`+1 ${STAT_NAMES[STAT_KEYS[c]]}, permanently. Grand-mère Clothilde will march with the second line.`);
    await rewardXp(QUESTS.herbs.xp); G.gold(QUESTS.herbs.gold);
  }
  await enterPlace('cabin');
}
async function haintsQuest() {
  storyScreen('The Crypt Rows');
  const n = S.counters.haints || 0;
  const stories = [
    { who: 'A haint under the oak', tale: '"I played cornet in the Eureka Brass Band. The Hush took my horn in \'82 and I died in \'83 and nobody played me out. No dirge. No second line. Just a van." It looks at your case. "Play me out. Please."', fight: ['haint', 'haint'], after: 'The haint listens to your dirge with its eyes closed. When the last note goes, it says, "That\'s the one," and walks off between the tombs, swinging its arms like a Grand Marshal.' },
    { who: 'A haint by the wall', tale: '"I sang at the Lantern. Ledger bought my contract and the Click took my song and I don\'t remember the words anymore. Just the shape of it." She hums something with no notes in it. "Give me the shape back."', fight: ['bone_choir', 'haint'], after: 'You play the dirge slow. Halfway through, she starts to sing, words and all. By the end she\'s laughing. "Oh, that\'s how it went. That\'s all it was." She fades mid-verse, happy.' },
    { who: 'A haint who won\'t stop singing', tale: 'It sings one note, perfect, forever. "They played me back," it says between breaths. "The Archivist. Played my last note on a loop until it was the only one I had. Make it stop. Make it move."', fight: ['data_wraith', 'archive_drone'], after: 'You play the dirge against its one note until the note bends, and breaks, and becomes two notes, then a phrase, then a song. It stops singing. It says "thank you" in a speaking voice it had forgotten, and goes.' },
  ];
  if (n >= 3) {
    S.quests.haints = 'done'; S.band.recruited.push('moses'); if (S.band.active.length < 2) S.band.active.push('moses');
    await say('moses', '"Three." Brother Moses sets the banjo across his knees. "A year I\'ve been out here. You did it in a week. Dead folks got good ears, friend, and they\'re telling me to follow you." (Brother Moses joins your band. Mambo Rosalie will march with the second line.)');
    await rewardXp(QUESTS.haints.xp); G.gold(QUESTS.haints.gold);
    await enterPlace('temple'); return;
  }
  const st = stories[n];
  await say('moses', n === 0 ? '"Brother Moses. Banjo. Rosalie sent you? Good. Come on, the first one\'s under the oak. Don\'t play until it\'s done talking. They need to be heard first."' : pick(['"Next one. Mind the roots."', '"This one\'s harder. They all are."']));
  await line(st.who, st.tale, '#3fb6ff');
  const c = await choose([{ label: 'Play the dirge' }, { label: 'Not yet' }]);
  if (c === 1) { await enterPlace('temple'); return; }
  await narrate('You play the dirge. Slow. The way Gus taught you: dirge on the way there. Something in the air tears, and what\'s left of the pain comes out of the ground.');
  const res = await runBattle(buildEnemies(st.fight), { ctx: { type: 'quest', id: 'haints', step: n }, context: 'quest', intro: 'What\'s left of the pain.' });
  if (res !== 'win') { await enterPlace('temple'); return; }
  S.counters.haints = n + 1;
  await narrate(st.after);
  if (n + 1 >= 3) await haintsQuest(); else await enterPlace('temple');
}
/* ---------- Mini-games ---------- */
async function cuttingContest() {
  storyScreen('Club Feu Follet');
  const exhibition = S.quests.cutting === 'done';
  const rivals = ['rival_hotrod', 'rival_bigmae', 'rival_twotone'];
  const names = ['"Hot Rod" Broussard', 'Big Mae Boudreaux', 'Henri "Two-Tone" LeBlanc'];
  await say('odette', exhibition ? '"Exhibition rounds. Same three, same rules, Doubloons for the winner. They\'ve been practicing."' : '"Three rounds. Hot Rod, Big Mae, then Two-Tone. The crowd decides, and the crowd likes whoever\'s still standing. Ready?"');
  const c = await choose([{ label: 'Step up' }, { label: 'Not tonight' }]);
  if (c === 1) { await enterPlace('feufollet'); return; }
  const lvl = exhibition ? Math.max(4, Math.min(15, S.level)) : 0;
  for (let i = 0; i < 3; i++) {
    const intro = [`"Hot Rod" Broussard steps up, trumpet already at his lips. "Let's see what Tremé sent."`, `Big Mae Boudreaux settles the sousaphone on her shoulder and the floorboards complain. "Cute. Now the low end."`, `Henri "Two-Tone" LeBlanc tips his hat and honks once, filthy. "Sweet or dirty, cher? Pick, because I'm playing both."`][i];
    const e = makeEnemy(S, rivals[i], lvl || undefined);
    const res = await runBattle([e], { ctx: { type: 'cutting', round: i }, context: 'cutting', noFlee: true, intro });
    if (res !== 'win') { await enterPlace('feufollet'); return; }
    if (i < 2) { healPct(S, 0.2); funkPct(S, 0.2); renderTopbar(); await narrate([`Hot Rod lowers his horn and grins. "Alright. Alright." The crowd is already looking at the door, where Big Mae is ducking in.`, `Big Mae laughs so hard the glasses rattle. "Child, you can play." Two-Tone is already tuning.`][i]); }
  }
  if (exhibition) { const g = G.scaleGold(60); S.doubloons += g; renderTopbar(); await say('odette', `"Three for three. The house pays ${fmtD(g)}. Come back tomorrow, they'll want revenge."`); await enterPlace('feufollet'); return; }
  S.quests.cutting = 'done'; S.band.recruited.push('sugar'); if (S.band.active.length < 2) S.band.active.push('sugar');
  await narrate('Two-Tone bows. The whole room is on its feet. From the back, somebody starts singing over the applause, and the applause stops to listen.');
  await say('sugar', '"Sugar Desmarais. I sang backup on MoodSync for two years and I will never forgive myself. You got a band? You got a singer." (Sugar joins your band.)');
  await rewardXp(QUESTS.cutting.xp); G.gold(QUESTS.cutting.gold);
  await enterPlace('feufollet');
}
async function sitIn() {
  storyScreen('Club Feu Follet');
  await say('odette', '"House band\'s on. Eight bars. Hit the ONE and the tip jar fills."');
  S.sitInDay = S.day;
  let total = 0; const results = [];
  for (let i = 0; i < 8; i++) {
    const r = await runTimingBar({ player: makePlayerActor(S), enemies: [], });
    results.push(r.id); total += r.id === 'one' ? 3 : r.id === 'pocket' ? 2 : r.id === 'loose' ? 1 : 0;
  }
  const pay = Math.round((8 + S.level * 3) * total / 24 * 4);
  S.doubloons += pay; renderTopbar();
  const ones = results.filter(r => r === 'one').length, clams = results.filter(r => r === 'clams').length;
  await narrate(`${ones} on the ONE, ${clams} clams. ${pay ? `The tip jar comes back with ${fmtD(pay)}.` : 'The tip jar comes back with a button and a note that says "practice."'} ${ones >= 6 ? 'Miss Odette raises her glass.' : ones >= 3 ? 'Not bad for a Tuesday.' : 'The house band is polite about it.'}`);
  await rewardXp(Math.round(10 + S.level * 2));
  await enterPlace('feufollet');
}
async function crawfishRaces() {
  storyScreen('The Thirsty Pelican');
  const crawfish = ['Mudbug Mary', 'Big Chief', 'Lil\' Pincher', 'The Senator'];
  await narrate('Four crawfish on a wet table, a chalk line, and a bartender with a whistle. "Place your bets, people, the Senator looks sleepy tonight."');
  const bet = await choose([{ label: 'Bet Ð10' }, { label: 'Bet Ð25' }, { label: 'Bet Ð50' }, { label: 'Just watch' }]);
  const amt = [10, 25, 50, 0][bet];
  if (amt && S.doubloons < amt) { await narrate('You don\'t have it. The bartender lets you watch anyway.'); }
  const wager = amt && S.doubloons >= amt ? amt : 0;
  let choice = -1;
  if (wager) { choice = await choose(crawfish.map(n => ({ label: n }))); S.doubloons -= wager; renderTopbar(); }
  const pos = [0, 0, 0, 0]; const story = $('#story');
  const row = () => crawfish.map((n, i) => `${n.padEnd(12, ' ')} ${'·'.repeat(pos[i])}🦐`).join('\n');
  const pre = document.createElement('pre'); pre.className = 'race'; story.appendChild(pre);
  setActions('');
  let winner = -1;
  for (let t = 0; t < 14 && winner < 0; t++) {
    for (let i = 0; i < 4; i++) { if (chance(0.55 + (i === 3 ? -0.1 : 0))) pos[i]++; if (pos[i] >= 10 && winner < 0) winner = i; }
    pre.textContent = row(); scrollStory(); await sleep(S.settings.reduceMotion ? 90 : 220);
  }
  if (winner < 0) winner = pos.indexOf(Math.max(...pos));
  pre.textContent = row() + `\n\n${crawfish[winner]} WINS`;
  if (wager) { if (choice === winner) { S.doubloons += wager * 3; renderTopbar(); await narrate(`${crawfish[winner]} by a claw! You win ${fmtD(wager * 3)}. The bartender blows the whistle at you, personally.`); } else await narrate(`${crawfish[winner]} takes it. Your crawfish wandered off the table. "Happens," the bartender says. "They're crawfish."`); }
  else await narrate(`${crawfish[winner]} takes it. The Senator falls asleep at the line.`);
  await enterPlace('pelican');
}
async function sparFight(bonus) {
  storyScreen('Congo Square');
  await narrate('The sparring circle. Nobody gets hurt here. Much.');
  const d = DISTRICTS[S.district];
  const lvl = clamp(S.level + bonus, 1, 15);
  const pool = Object.values(ENEMIES).filter(e => !e.elite && !e.rival && e.district !== 'tower' && e.id !== 'ghost_track');
  const ids = [pick(pool).id, pick(pool).id];
  const enemies = ids.map(id => makeEnemy(S, id, lvl));
  const res = await runBattle(enemies, { ctx: { type: 'spar', bonus }, context: 'spar', intro: 'Sparring partners step into the circle. The drummers keep time.' });
  if (res === 'win') { S.doubloons = Math.round(S.doubloons); }
  await enterPlace('congo');
}
async function whispers() {
  storyScreen('The Velvet Lantern');
  if (S.main.act === 'storyville' && S.main.step === 2) {
    await say('celeste', '"Three pages. Let me see." She reads them against the lamp. "Basin and Bienville. Under the Counting House, through the coal chute, down two flights. Sixty Doubloons for the Whisper, chéri. House rules."');
    const c = await choose([{ label: 'Pay Ð60' }, { label: 'Not yet' }]);
    if (c === 0) { if (S.doubloons < 60) { await say('celeste', '"Then earn it on the street and come back. The vault isn\'t going anywhere. That\'s the whole problem with it."'); } else { S.doubloons -= 60; removeItem(S, 'ledgerpage', 3); S.main.step = 3; renderTopbar(); await say('celeste', '"The coal chute. Go at night. And chéri: Ledger\'s Chops compound every turn he\'s alive. Don\'t give him turns."'); G.bookHint('mr_ledger'); } }
    await enterPlace('lantern'); return;
  }
  const bosses = Object.keys(BOSSES).filter(id => !S.flags['boss_' + id] && id !== 'the_click');
  if (!bosses.length) { await say('celeste', '"There\'s nothing left to whisper about. Go finish it."'); await enterPlace('lantern'); return; }
  await say('celeste', '"A Whisper is a hundred and twenty. Who do you want to know about?"');
  const c = await choose(bosses.map(id => ({ label: BOSSES[id].name })).concat([{ label: 'Nobody tonight' }]));
  if (c >= bosses.length) { await enterPlace('lantern'); return; }
  if (S.doubloons < 120) { await say('celeste', '"Come back with the money, chéri."'); await enterPlace('lantern'); return; }
  S.doubloons -= 120; renderTopbar(); const b = BOSSES[bosses[c]]; G.bookHint(b.id);
  await say('celeste', `"${b.name}. Weak to ${b.weak}${b.resist ? ', resists ' + b.resist : ''}. ${b.book}" She folds the money away. "Recorded in your Blue Book."`);
  await enterPlace('lantern');
}
