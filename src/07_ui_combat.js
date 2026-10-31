/* ============================================================
   CYBER FUNK — battle UI, On the One timing bar, Play the Blues
   ============================================================ */
'use strict';

function stopBattleLoop() { UI.lastStop = (new Error('stop')).stack; if (UI.rafId) { cancelAnimationFrame(UI.rafId); UI.rafId = null; } $('#timing').hidden = true; $('#timing').innerHTML = ''; UI.battle = null; UI.battleWait = null; }
function hpPct(a) { return Math.max(0, Math.round(100 * a.hp / a.maxHp)); }
function chipsHtml(a) { return a.statuses.filter(st => st.id !== 'charging' || true).map(st => { const d = STATUSES[st.id]; return `<span class="chip" data-status="${st.id}" style="--c:${d.color}">${esc(d.name)}${d.untilTriggered ? '' : ' ' + st.turns}</span>`; }).join(''); }
function enemyCard(b, e) {
  const bk = S.book[e.defId] || {}; const known = bk.weak || bk.hint;
  const d = ENEMIES[e.defId] || BOSSES[e.defId];
  return `<div class="ecard ${e.alive ? '' : 'dead'} ${e.boss ? 'boss' : ''} ${b.targetMode && e.alive ? 'targetable' : ''}" id="card-${e.id}" data-act="target:${e.id}">
    <div class="ecard-head"><b>${esc(e.name)}</b><span class="dim small">Lv ${e.level}${e.elite ? ' ★' : ''}</span></div>
    <div class="bar ehp"><i style="width:${hpPct(e)}%"></i><span>${e.hp}/${e.maxHp}</span></div>
    <div class="chips">${chipsHtml(e)}</div>
    <div class="small dim eweak">${known ? `Weak <span class="tone t-${d.weak}">${d.weak}</span>${d.resist ? ` · Resists <span class="tone t-${d.resist}">${d.resist}</span>` : ''}` : 'Weakness: ?'}</div>
  </div>`;
}
function renderBattle(b) {
  const p = b.player;
  const logLines = b.logLines.slice(-6).map(l => `<div class="ll ${l.cls}">${esc(l.text)}</div>`).join('');
  setScreen(`<div class="battle">
    <div class="enemies" id="enemies">${b.enemies.map(e => enemyCard(b, e)).join('')}</div>
    <div class="blog" id="blog">${logLines}</div>
    <div class="pstat" id="pstat">
      <div class="pname"><b>${esc(S.name)}</b> <span class="dim small">Lv ${S.level} · ${esc(CLASSES[S.cls].name)}</span>${p.bigFour ? `<span class="beat">${[1, 2, 3, 4].map(n => `<i class="${p.beat === n ? 'on' : ''} ${n === 4 ? 'four' : ''}">${n}</i>`).join('')}</span>` : ''}</div>
      <div class="bar heart"><i style="width:${hpPct(p)}%"></i><span>♥ ${p.hp}/${p.maxHp}</span></div>
      <div class="bar funk"><i style="width:${Math.round(100 * p.fp / p.maxFp)}%"></i><span>♪ ${p.fp}/${p.maxFp}</span></div>
      <div class="bar groove ${p.groove >= 100 ? 'full' : ''}"><i style="width:${p.groove}%"></i><span>GROOVE ${p.groove}${p.groove >= 100 ? ' — SOLO READY' : ''}</span></div>
      <div class="chips">${chipsHtml(p)}${p.guard ? '<span class="chip" style="--c:#00e5ff">Guarding</span>' : ''}</div>
    </div>
  </div>`);
}
function updateBattleBits(b) {
  // cheaper partial update: bars and chips
  b.enemies.forEach(e => { const card = $('#card-' + e.id); if (!card) { const en = $('#enemies'); if (en) en.insertAdjacentHTML('beforeend', enemyCard(b, e)); return; } card.classList.toggle('dead', !e.alive); const bar = card.querySelector('.ehp i'); if (bar) bar.style.width = hpPct(e) + '%'; const sp = card.querySelector('.ehp span'); if (sp) sp.textContent = `${Math.max(0, e.hp)}/${e.maxHp}`; const ch = card.querySelector('.chips'); if (ch) ch.innerHTML = chipsHtml(e); const bk = S.book[e.defId] || {}; const d = ENEMIES[e.defId] || BOSSES[e.defId]; const w = card.querySelector('.eweak'); if (w && (bk.weak || bk.hint)) w.innerHTML = `Weak <span class="tone t-${d.weak}">${d.weak}</span>${d.resist ? ` · Resists <span class="tone t-${d.resist}">${d.resist}</span>` : ''}`; });
  const p = b.player; const ps = $('#pstat'); if (!ps) return;
  const hb = ps.querySelector('.heart i'); if (hb) hb.style.width = hpPct(p) + '%'; ps.querySelector('.heart span').textContent = `♥ ${Math.max(0, p.hp)}/${p.maxHp}`;
  ps.querySelector('.funk i').style.width = Math.round(100 * p.fp / p.maxFp) + '%'; ps.querySelector('.funk span').textContent = `♪ ${p.fp}/${p.maxFp}`;
  const gb = ps.querySelector('.groove'); gb.classList.toggle('full', p.groove >= 100); gb.querySelector('i').style.width = p.groove + '%'; gb.querySelector('span').textContent = `GROOVE ${p.groove}${p.groove >= 100 ? ' — SOLO READY' : ''}`;
  ps.querySelector('.chips').innerHTML = chipsHtml(p) + (p.guard ? '<span class="chip" style="--c:#00e5ff">Guarding</span>' : '');
  const beat = ps.querySelector('.beat'); if (beat) beat.querySelectorAll('i').forEach((el, i) => el.classList.toggle('on', p.beat === i + 1));
  const lg = $('#blog'); if (lg) { lg.innerHTML = b.logLines.slice(-6).map(l => `<div class="ll ${l.cls}">${esc(l.text)}</div>`).join(''); lg.scrollTop = lg.scrollHeight; }
}
function floatNum(targetEl, text, color, big) {
  if (!targetEl) return; const f = document.createElement('span'); f.className = 'float' + (big ? ' big' : ''); f.textContent = text; f.style.color = color; f.style.left = (20 + Math.random() * 50) + '%';
  targetEl.appendChild(f); setTimeout(() => f.remove(), 900);
}
function actorEl(b, id) { return id === b.player.id ? $('#pstat') : $('#card-' + id); }
async function drainEvents(b) {
  const fast = UI.turbo ? 0.02 : (S.settings.reduceMotion ? 0.5 : 1);
  try {
  while (b.events.length) {
    const ev = b.events.shift(); b.draining = ev; b.drainCount = (b.drainCount || 0) + 1; (b.dlog = b.dlog || []).push([Date.now(), 'ev', ev.t]);
    if (ev.t === 'log') { b.logLines.push({ text: ev.text, cls: ev.cls }); updateBattleBits(b); b.dlog.push([Date.now(), 'sleep']); await sleep((ev.cls === 'boss' || ev.cls === 'telegraph' || ev.cls === 'solo' ? 420 : 230) * fast); b.dlog.push([Date.now(), 'woke']); }
    else if (ev.t === 'dmg') { const el = actorEl(b, ev.target); const tone = TONES[ev.tone] || TONES.HOT; floatNum(el, ev.silent ? '0' : (ev.crit ? '✦' : '') + ev.amount + (ev.weak ? ' WEAK!' : ev.resisted ? ' resisted' : ''), tone.color, ev.crit || ev.weak); if (ev.crit && !S.settings.reduceMotion) { $('#screen').classList.add('shake'); setTimeout(() => $('#screen').classList.remove('shake'), 300); } try { ev.crit ? SFX.crit() : SFX.hit(ev.tone); } catch (e) { /* optional */ } updateBattleBits(b); await sleep(300 * fast); }
    else if (ev.t === 'heal') { floatNum(actorEl(b, ev.target), '+' + ev.amount, '#ff6ad5'); updateBattleBits(b); await sleep(220 * fast); }
    else if (ev.t === 'dodge') { floatNum(actorEl(b, ev.target), 'dodge', '#cfcfcf'); await sleep(200 * fast); }
    else if (ev.t === 'status' || ev.t === 'summon' || ev.t === 'turn') { if (ev.t === 'summon') renderBattle(b); else updateBattleBits(b); if (ev.t === 'turn') { $$('.ecard').forEach(c => c.classList.remove('active')); const el = actorEl(b, ev.actor); if (el) el.classList.add('active'); } }
    else if (ev.t === 'death') { const el = actorEl(b, ev.target); if (el) el.classList.add('dead'); await sleep(260 * fast); }
    else if (ev.t === 'round') { b.logLines.push({ text: `— Round ${ev.round} —`, cls: 'round' }); updateBattleBits(b); await sleep(140 * fast); }
    else if (ev.t === 'shatter') { $('#screen').classList.add('flash'); setTimeout(() => $('#screen').classList.remove('flash'), 400); await sleep(300 * fast); }
    else if (ev.t === 'assist') { await sleep(120 * fast); }
    else if (ev.t === 'blues' || ev.t === 'end') { /* handled by caller */ }
  }
  } catch (e) { b.drainError = (e && e.stack) || String(e); throw e; }
}
function needsTiming(action) {
  if (action.type === 'riff' || action.type === 'solo') return true;
  if (action.type === 'play') return SKILLS[action.skillId].fx.some(f => f.k === 'dmg');
  return false;
}
/* ---------- Timing bar ---------- */
function runTimingBar(b) {
  const p = b.player;
  if (S.settings.rhythm === 'auto') {
    const r = rollAutoTiming();
    return new Promise(res => { const t = $('#timing'); t.hidden = false; t.innerHTML = `<div class="timing auto"><div class="tresult" style="color:${r.color}">${r.label}</div><div class="small dim">auto rhythm</div></div>`; setTimeout(() => { t.hidden = true; t.innerHTML = ''; res(r); }, UI.turbo ? 25 : 520); });
  }
  const maxLvl = Math.max(...livingEnemies(b).map(e => e.level), 1);
  const duration = Math.max(880, 1200 - 20 * (maxLvl - 1));
  let one = 0.06 * (p.oneZone || 1); if (hasStatus(p, 'pocket')) one *= 1.3; if (hasStatus(p, 'quantized')) one *= 0.6;
  const pocket = one * 2.3, loose = one * 4.2;
  const center = 0.5 + Math.random() * 0.3;
  return new Promise(resolve => {
    const t = $('#timing'); t.hidden = false;
    t.innerHTML = `<div class="timing"><div class="tlabel">TAP ON THE <b>ONE</b></div>
      <div class="track"><div class="zone loose" style="left:${(center - loose) * 100}%;width:${loose * 200}%"></div><div class="zone pocket" style="left:${(center - pocket) * 100}%;width:${pocket * 200}%"></div><div class="zone one" style="left:${(center - one) * 100}%;width:${one * 200}%"></div><div class="marker" id="marker"></div></div>
      <div class="tresult" id="tresult"></div><div class="tapzone">tap anywhere</div></div>`;
    const marker = $('#marker'); const start = performance.now() + 220; let done = false; let pos = 0;
    const finish = (r) => { if (done) return; done = true; if (UI.rafId) cancelAnimationFrame(UI.rafId); UI.rafId = null; $('#tresult').textContent = r.label; $('#tresult').style.color = r.color; try { SFX.tap(r.id); } catch (e) { /* optional */ } t.removeEventListener('pointerdown', onTap); setTimeout(() => { t.hidden = true; t.innerHTML = ''; resolve(r); }, 420); };
    const classify = (x) => { const d = Math.abs(x - center); return d <= one ? TIMING.one : d <= pocket ? TIMING.pocket : d <= loose ? TIMING.loose : TIMING.clams; };
    const onTap = (ev) => { ev.preventDefault(); finish(classify(pos)); };
    t.addEventListener('pointerdown', onTap);
    const frame = (now) => { if (done) return; pos = clamp((now - start) / duration, 0, 1); marker.style.left = (pos * 100) + '%'; if (pos >= 1) { finish(TIMING.clams); return; } UI.rafId = requestAnimationFrame(frame); };
    UI.rafId = requestAnimationFrame(frame);
    setTimeout(() => { if (!done) finish(TIMING.clams); }, duration + 1500);
  });
}
/* ---------- Play the Blues sequence ---------- */
function runBluesSequence() {
  return new Promise(resolve => {
    const t = $('#timing'); t.hidden = false; const step = 560; const notes = SCALE_ORDER;
    t.innerHTML = `<div class="timing blues"><div class="tlabel">PLAY THE BLUES · tap each note as it lights</div><div class="pads">${notes.map((n, i) => `<div class="pad" id="pad-${i}">${esc(BLUE_NOTES[n].name.replace(/\s*\(.*\)/, ''))}<small>${n.replace('b', '♭')}</small></div>`).join('')}</div><div class="tresult" id="tresult"></div></div>`;
    const start = performance.now() + 500; const scores = new Array(notes.length).fill(0); const tapped = new Array(notes.length).fill(false);
    let done = false; let lit = -1;
    const onTap = (ev) => { ev.preventDefault(); const now = performance.now(); const idx = clamp(Math.round((now - start) / step), 0, notes.length - 1); if (tapped[idx]) return; tapped[idx] = true; const err = Math.abs(now - (start + idx * step)); scores[idx] = Math.max(0, 1 - err / (step * 0.55)); const pad = $('#pad-' + idx); if (pad) { pad.classList.add('hit'); pad.classList.toggle('perfect', scores[idx] > 0.7); } try { SFX.note(NOTE_FREQ[notes[idx]]); } catch (e) { /* optional */ } };
    t.addEventListener('pointerdown', onTap);
    const frame = (now) => { if (done) return; const idx = Math.floor((now - start) / step); if (idx !== lit && idx >= 0 && idx < notes.length) { lit = idx; $$('.pad').forEach(p => p.classList.remove('lit')); const pad = $('#pad-' + idx); if (pad) pad.classList.add('lit'); } if (now - start > step * notes.length + 350) { done = true; UI.rafId = null; t.removeEventListener('pointerdown', onTap); const acc = scores.reduce((a, c) => a + c, 0) / notes.length; $('#tresult').textContent = acc > 0.8 ? 'IN THE POCKET' : acc > 0.5 ? 'THAT\'S THE BLUES' : acc > 0.2 ? 'ROUGH BUT TRUE' : 'CLAMS'; $('#tresult').style.color = acc > 0.5 ? '#39ff88' : '#ffc43d'; setTimeout(() => { t.hidden = true; t.innerHTML = ''; resolve(acc); }, 700); return; } UI.rafId = requestAnimationFrame(frame); };
    UI.rafId = requestAnimationFrame(frame);
    setTimeout(() => { if (!done) { done = true; UI.rafId = null; t.removeEventListener('pointerdown', onTap); t.hidden = true; t.innerHTML = ''; resolve(scores.reduce((a, c) => a + c, 0) / notes.length); } }, step * notes.length + 3000);
  });
}
/* ---------- Action grid ---------- */
function battleActions(b) {
  const p = b.player; const click = b.clickPhase ? b.enemies.find(e => e.defId === 'the_click') : null;
  const canBlues = click && click.alive && hasStatus(click, 'silence') && (b.bluesFree || p.groove >= 100);
  const muted = hasStatus(p, 'muted');
  setActions(`${canBlues ? btn('act:blues', '♪ PLAY THE BLUES ♪', 'primary wide blues-btn') : ''}
    <div class="agrid">
      ${btn('act:riff', 'RIFF', 'act')}${btn('act:play', 'PLAY', 'act' + (muted ? ' disabled' : ''))}${btn('act:solo', 'SOLO', 'act solo' + (playerCanSolo(b) ? ' ready' : ' disabled'))}
      ${btn('act:vamp', 'VAMP', 'act')}${btn('act:bag', 'BAG', 'act')}${btn('act:split', 'SPLIT', 'act' + (b.noFlee || b.enemies.some(e => e.alive && (e.boss || e.elite)) ? ' disabled' : ''))}
    </div>`);
}
function waitPlayerAction(b) {
  return new Promise(resolve => {
    b.targetMode = null; battleActions(b); renderBattleTargets(b);
    const pickTarget = (then) => {
      const foes = livingEnemies(b);
      if (foes.length === 1) { then(foes[0].id); return; }
      b.targetMode = then; renderBattleTargets(b);
      setActions(`<div class="tsel"><div class="small">Tap a target</div>${btn('cancel', 'Cancel', 'ghost wide')}</div>`);
    };
    UI.h.cancel = () => { b.targetMode = null; renderBattleTargets(b); battleActions(b); };
    UI.h.target = (id) => { if (!b.targetMode) return; const e = b.enemies.find(x => x.id === id); if (!e || !e.alive) return; const then = b.targetMode; b.targetMode = null; renderBattleTargets(b); then(id); };
    UI.h.act = (which) => {
      if (which === 'riff') pickTarget(id => resolve({ type: 'riff', targetId: id }));
      else if (which === 'play') { if (hasStatus(b.player, 'muted')) { toast("You're Muted."); return; } showSkillPicker(b, (skillId) => { const sk = SKILLS[skillId]; const single = sk.fx.some(f => f.k === 'dmg' && (!f.target || f.target === 'one')) || sk.fx.some(f => f.k === 'strip' && f.target === 'one'); if (single) pickTarget(id => resolve({ type: 'play', skillId, targetId: id })); else resolve({ type: 'play', skillId }); }); }
      else if (which === 'solo') { if (!playerCanSolo(b)) { toast(hasStatus(b.player, 'muted') ? "You're Muted." : 'Build 100 Groove first.'); return; } const sk = SKILLS[b.player.solo]; const single = sk.fx.some(f => f.k === 'dmg' && (!f.target || f.target === 'one')); if (single) pickTarget(id => resolve({ type: 'solo', targetId: id })); else resolve({ type: 'solo' }); }
      else if (which === 'vamp') resolve({ type: 'vamp' });
      else if (which === 'bag') openBag(true, (itemId) => resolve({ type: 'bag', itemId }));
      else if (which === 'split') { if (b.noFlee || b.enemies.some(e => e.alive && (e.boss || e.elite))) { toast("Can't SPLIT from this one."); return; } resolve({ type: 'split' }); }
      else if (which === 'blues') resolve({ type: 'blues' });
    };
    UI.h.skill = (id) => UI.h._skillPick && UI.h._skillPick(id);
    UI.h.back = () => battleActions(b);
  });
}
function renderBattleTargets(b) { $$('.ecard').forEach(c => c.classList.toggle('targetable', !!b.targetMode && !c.classList.contains('dead'))); }
function showSkillPicker(b, then) {
  const p = b.player;
  UI.h._skillPick = then;
  const rows = p.skills.map(id => { const sk = SKILLS[id]; const can = p.fp >= sk.fp && !(sk.once && p.onceUsed[id]); const dfx = sk.fx.find(f => f.k === 'dmg'); const tone = sk.tone || (dfx ? dfx.tone : null); return `<button class="btn skillbtn ${can ? '' : 'disabled'}" data-act="skill:${id}"><span class="sb-name">${esc(sk.name)}${tone ? ` <span class="tone t-${tone}">${tone}</span>` : ''}</span><span class="sb-fp">${sk.fp} FP${sk.once ? (p.onceUsed[id] ? ' · used' : ' · once') : ''}</span><span class="sb-desc">${esc(sk.desc)}</span></button>`; }).join('');
  setActions(`<div class="skilllist">${rows}</div>${btn('back', '‹ Back', 'ghost wide')}`);
  UI.h.skill = (id) => { const sk = SKILLS[id]; if (p.fp < sk.fp) { toast('Not enough Funk.'); return; } if (sk.once && p.onceUsed[id]) { toast('Once per battle.'); return; } then(id); };
}
/* ---------- Battle runner ---------- */
async function runBattle(enemyActors, opts) {
  opts = opts || {};
  UI.screen = 'battle'; stopBattleLoop();
  const snapshot = deepClone({ hp: S.hp, fp: S.fp, bag: S.bag, doubloons: S.doubloons, mealBuff: S.mealBuff, dreamBuff: S.dreamBuff, nextFight: S.nextFight });
  const b = createBattle(S, enemyActors, opts); b.logLines = []; UI.battle = b;
  if (opts.ctx) { S.pendingBattle = opts.ctx; saveGame(false); }
  renderTopbar(); setTop(''); renderBattle(b); setActions('');
  try { SFX.stab(S.cls); } catch (e) { /* optional */ }
  if (opts.intro) { b.log(opts.intro, 'narr'); }
  let safety = 0;
  while (!b.over && safety++ < 400) {
    b.phase = 'enemies';
    const waiting = runUntilPlayer(b);
    b.phase = 'drain1';
    await drainEvents(b);
    if (b.over || !waiting) break;
    b.phase = 'wait';
    const action = await waitPlayerAction(b);
    UI.h = {}; setActions('<div class="tsel small dim">…</div>');
    let timing = null;
    b.phase = 'timing';
    if (action.type === 'blues') { const acc = await runBluesSequence(); action.accuracy = acc; }
    else if (needsTiming(action)) { timing = await runTimingBar(b); if (timing.groove) b.log(timing.label, 'good'); }
    b.phase = 'action';
    playerAction(b, action, timing);
    b.phase = 'drain2';
    await drainEvents(b);
  }
  await drainEvents(b);
  $$('.ecard').forEach(c => c.classList.remove('active'));
  S.pendingBattle = null;
  const result = b.result || 'lose';
  if (result === 'win') { applyBattleResult(b); await victoryScreen(b, opts); UI.battle = null; renderTopbar(); saveGame(false); return 'win'; }
  if (result === 'fled') { applyBattleResult(b); UI.battle = null; renderTopbar(); saveGame(false); await narrateFlash('You slip off into the neon. Nobody follows. ' + (b.stolen ? `The hustler keeps the ${fmtD(b.stolen)}, though.` : '')); return 'fled'; }
  // lose
  UI.battle = null;
  if (opts.boss) {
    const r = await defeatScreen(true);
    Object.assign(S, { hp: snapshot.hp, fp: snapshot.fp, bag: snapshot.bag, doubloons: snapshot.doubloons, mealBuff: snapshot.mealBuff, dreamBuff: snapshot.dreamBuff, nextFight: snapshot.nextFight });
    renderTopbar(); saveGame(false);
    return r; // 'retry' or 'lose'
  }
  await defeatScreen(false);
  const st = derivedStats(S); S.hp = st.maxHp; S.fp = st.maxFp; S.doubloons = Math.round(S.doubloons * 0.8); S.mealBuff = null; S.dreamBuff = null; S.nextFight = null;
  renderTopbar(); saveGame(false);
  throw new FlowAbort('cut');
}
async function narrateFlash(text) { storyScreen(); renderTopbar(); await narrate(text); }
async function victoryScreen(b, opts) {
  const rw = battleRewards(b);
  S.doubloons += rw.gold;
  rw.drops.forEach(id => addItem(S, id, 1));
  // counters / quest progress
  const defeated = b.enemies.filter(e => !e.alive);
  if (S.district === 'treme' && S.main.act === 'treme' && S.main.step === 1 && b.context === 'street') { S.counters.tremeFights = (S.counters.tremeFights || 0) + 1; if (S.counters.tremeFights >= 3) { S.main.step = 2; } }
  if (S.main.act === 'bayou' && S.main.step === 2) { const n = defeated.filter(e => e.defId === 'rougarou_pup').length; if (n) { S.counters.pups = (S.counters.pups || 0) + n; if (S.counters.pups >= 3) S.main.step = 3; } }
  if (S.quests.horn === 'active') { const n = defeated.filter(e => e.defId === 'hush_patrol' || e.defId === 'hush_sergeant' || e.defId === 'hush_elite').length; if (n) S.counters.hornFights = (S.counters.hornFights || 0) + n; }
  if (S.main.act === 'storyville' && S.main.step === 1 && countItem(S, 'ledgerpage') >= 3) S.main.step = 2;
  if (S.main.act === 'cemetery' && S.main.step === 1 && countItem(S, 'cryptkey') >= 3) S.main.step = 2;
  if (S.bounty && defeated.some(e => e.defId === BOUNTIES[S.bounty].elite) && b.context === 'bounty') { S.doubloons += BOUNTIES[S.bounty].gold; rw.bountyGold = BOUNTIES[S.bounty].gold; S.bountiesDone.push(S.bounty); S.bounty = null; }
  const disc = b.discoveries.filter((v, i, a) => a.indexOf(v) === i).map(id => (ENEMIES[id] || BOSSES[id]).name);
  storyScreen(); renderTopbar();
  const html = `<div class="victory"><h2>${opts.boss ? 'CUT THE BODY LOOSE' : 'YOU WON'}</h2>
    <div class="vrow"><span>XP</span><b>+${rw.xp}</b></div><div class="vrow"><span>Doubloons</span><b>+${fmtD(rw.gold)}</b></div>
    ${rw.bountyGold ? `<div class="vrow"><span>Bounty</span><b class="gold">+${fmtD(rw.bountyGold)}</b></div>` : ''}
    ${rw.drops.length ? `<div class="vrow"><span>Found</span><b>${rw.drops.map(id => esc(ITEMS[id].name)).join(', ')}</b></div>` : ''}
    ${disc.length ? `<div class="small dim">Blue Book: learned the weakness of ${esc(disc.join(', '))}.</div>` : ''}
    <div class="small dim">You catch your breath. +10% Heart, +20% Funk.</div></div>`;
  $('#story').innerHTML = html;
  setActions(btn('continue', 'Continue ▸', 'primary wide'));
  await waitContinue();
  const ups = gainXp(S, rw.xp); renderTopbar();
  if (ups.length) await showLevelUps(ups);
  if (S.counters.tremeFights === 3 && S.main.act === 'treme' && S.main.step === 2 && !S.flags.tremeStepToast) { S.flags.tremeStepToast = true; toast('The Hush are thinning out. Congo Square is next.'); }
  if (S.main.act === 'bayou' && S.main.step === 3 && !S.flags.pupToast) { S.flags.pupToast = true; toast("The wolves' trail leads to Pump Station 13."); }
}
function defeatScreen(isBoss) {
  return new Promise(resolve => {
    storyScreen(); renderTopbar();
    $('#story').innerHTML = `<div class="defeat"><h2>YOU GOT CUT</h2><p>${isBoss ? 'The song falls apart in the middle. But a song is just error, repeated. Run it back.' : 'The neon swims. Somebody drags you back to the Lagniappe club. You wake up on the folding chairs with a wet rag on your head and lighter pockets.'}</p>${isBoss ? '' : '<p class="small dim">Full Heart, −20% Doubloons.</p>'}</div>`;
    if (isBoss) { setActions(btn('retry', 'Run it back ▸', 'primary wide') + btn('leave', 'Walk away for now', 'ghost wide')); UI.h.retry = () => resolve('retry'); UI.h.leave = () => resolve('lose'); }
    else { setActions(btn('wake', 'Wake up ▸', 'primary wide')); UI.h.wake = () => resolve('lose'); }
  });
}
/* Build enemy actors for a fight spec. ids: array of enemy ids, or 'random' for the district pool. */
function buildEnemies(ids, opts) {
  opts = opts || {};
  const d = DISTRICTS[opts.district || S.district];
  if (ids === 'random') {
    const pool = d.pool.slice(); const n = irnd(d.groups[0], d.groups[1]);
    ids = [];
    const first = pick(pool);
    if (first === 'quartet') ids = ['quartet', 'quartet', 'quartet', 'quartet'];
    else { ids.push(first); for (let i = 1; i < n; i++) { let id = pick(pool.filter(x => x !== 'quartet')); ids.push(id); } }
    if (S.main.act === 'bayou' && S.main.step === 2 && !ids.includes('rougarou_pup')) ids[0] = 'rougarou_pup';
    if (S.main.act === 'storyville' && S.main.step === 1 && !ids.includes('enforcer')) ids[0] = 'enforcer';
    if (S.main.act === 'cemetery' && S.main.step === 1 && !ids.some(x => x === 'data_wraith' || x === 'haint')) ids[0] = pick(['data_wraith', 'haint']);
  }
  return ids.map(id => { const def = ENEMIES[id]; let L = opts.level; if (!L) { const lo = Math.max(def.lvl[0], d.lvl[0]), hi = Math.min(def.lvl[1], d.lvl[1]); L = irnd(Math.min(lo, hi), Math.max(lo, hi)); } return makeEnemy(S, id, L); });
}
