/* ============================================================
   CYBER FUNK — story: prologue, bosses, choices, tower, ending
   ============================================================ */
'use strict';

const NEXT_AFTER_BOSS = { captain_hush: { unlock: 'quarter', act: 'quarter' }, vox_perfecta: { unlock: 'storyville', act: 'storyville' }, mr_ledger: { unlock: 'bayou', act: 'bayou' }, rougarou: { unlock: 'cemetery', act: 'cemetery' }, archivist: { unlock: 'garden', act: 'garden' }, isolde: { unlock: null, act: 'tower' } };

async function giveNote(noteId) {
  const n = BLUE_NOTES[noteId]; if (!S.notes.includes(noteId)) S.notes.push(noteId);
  try { SFX.note(NOTE_FREQ[noteId], 0.9); } catch (e) { /* optional */ }
  await narrate(`A sound like a struck glass. The ${n.name} hangs in the air, blue-white, and settles into your horn. "${n.quote}" (${S.notes.length}/6 Blue Notes.)`);
  if (S.notes.length === 5) toast('Five notes. Ti-Jacques can build your legendary.');
}
async function advanceAfterBoss(bossId) {
  const nx = NEXT_AFTER_BOSS[bossId]; if (!nx) return;
  if (nx.unlock && !S.unlocked.includes(nx.unlock)) S.unlocked.push(nx.unlock);
  S.main = { act: nx.act, step: 0 };
  if (nx.unlock) toast(`${DISTRICTS[nx.unlock].name} unlocked. Check Travel.`);
}
async function bossFlow(id) {
  const bd = BOSSES[id];
  storyScreen(PLACES[Object.keys(PLACES).find(p => PLACES[p].boss === id)].name);
  if (!S.flags['bosspre_' + id]) { await BOSS_PRE[id](); S.flags['bosspre_' + id] = true; }
  else await narrate('You go back in.');
  saveGame(false);
  let res;
  do { res = await runBattle([makeEnemy(S, id)], { boss: id, ctx: { type: 'boss', id }, context: 'boss', noFlee: true }); if (res === 'retry') { storyScreen(); await narrate('You catch your breath on the steps outside, count yourself in, and go back for round two.'); } } while (res === 'retry');
  if (res !== 'win') { renderDistrict(); return; }
  S.flags['boss_' + id] = true;
  storyScreen();
  await BOSS_POST[id]();
  await advanceAfterBoss(id);
  saveGame(false);
  renderDistrict();
}
const BOSS_PRE = {
  async captain_hush() {
    await narrate('Congo Square. The fence is down where somebody cut it. Inside, the drum circle stones, a Hush command post where the bandstand used to be, and Captain Hush in the middle, white chrome gleaming, dampener on his belt.');
    await say('hush', '"By order of Metronome, this square is now a Quiet Zone."');
    await narrate('You step onto the stones. Somewhere behind you, in the dark, somebody starts a drum. Then another. The square remembers.');
    await narrate(S.roots === 'creole' ? 'Your grandmother danced here. Her grandmother too. You lift the horn.' : 'Gus brought you here your first week. "This is where it starts," he said. "Every song. Every one." You lift the horn.');
  },
  async vox_perfecta() {
    await narrate('The main stage of the Bourbon Strip. The licensed clubs are dark since the broadcaster went down, but the stage is still lit, and on it, forty feet of hologram folding down into something person-sized and silver.');
    await say('vox', '"Welcome to the Licensed Entertainment Strip. Tonight\'s performance is brought to you by Metronome. Please remain in perfect time."');
    await narrate('Her pitch is perfect. Her time is perfect. There is not one single feeling in it. The crowd on the banquette is waiting for somebody to prove that matters.');
  },
  async mr_ledger() {
    await narrate('Down the coal chute, two flights, through a door with no handle. The vault: steel shelves of contracts floor to ceiling, every one a life, and at a brass desk in the middle, Mr. Ledger, reading.');
    await say('ledger', '"Every song in this district has a lienholder, and the lienholder is me. Let\'s discuss your balance."');
    await narrate('He closes the book. His Chops compound every turn he\'s alive. Don\'t give him turns.');
  },
  async rougarou() {
    await narrate('Pump Station 13. The test signal is a scream now, right at the edge of hearing. The wolves part for you, implants flickering, and at the center, on the pump housing, Lucien.');
    await narrate('Or what\'s left of him: chrome fur, white eyes, a jaw that\'s more machine than mouth. Le Rougarou Chromé. It howls in perfect 4/4.');
    await narrate('"Heat," Grand-mère said. "The implant runs hot already. Heat is how you reach him."');
  },
  async archivist() {
    await narrate('Three Crypt Keys turn. The slab slides. Below, a server farm shaped like a chapel, racks where the pews should be, and in every rack a light that is somebody\'s song. One of them is Gus\'s.');
    await say('archivist', '"Every song ever played in this city is catalogued below. The dead do not improvise. Soon, neither will you."');
    await narrate('It is a machine for grief, and it has never once felt any. You are about to fix that.');
  },
  async isolde() {
    await narrate('The ballroom clears. Chandeliers, a parquet floor, the debutantes lining the walls in white. At the far end, Lady Concertmaster Isolde Vane lifts a violin that is also, somehow, a blade.');
    await say('isolde', '"A duel? In my ballroom? How quaint. Very well. I will show you what a note sounds like when it is exactly where it belongs."');
    await narrate('The Blue Note is in the violin. You can hear it, flat and true, under all that perfection. When she tunes to a perfect A, only an ON THE ONE hit or a SOLO gets through. When she raises the bow for a Cadenza, VAMP.');
  },
};
const BOSS_POST = {
  async captain_hush() {
    await narrate('Captain Hush goes down on one knee. The dampener on his belt cracks and the sound comes back into the square all at once: drums, voices, a trombone from a window on Rampart Street. Metronome\'s man drops something small and blue-white in the dust.');
    await giveNote('C');
    await say('mamaroux', '"Baby. You did it." She\'s at the fence with half of Tremé behind her. "The Quarter\'s next. Miss Odette runs Club Feu Follet on Frenchmen. Tell her Gus sent you. She\'ll know what that means."');
  },
  async vox_perfecta() {
    await narrate('Vox Perfecta kneels on the stage, hologram flickering. The crowd on the banquette is dead silent, and then somebody whistles, off-key, and the whole Strip laughs for the first time in a year.');
    await say('vox', '"That note. The blue one. I was not built to feel that. I felt that."');
    await narrate('Her chassis is open. Inside, under the licensing chip, a hum you recognize. The second Blue Note. And a choice.');
    const c = await choose([{ label: 'Reprogram her. Let her sing for real.' }, { label: 'Shut her down. Take the Perfect Pitch Chip.' }]);
    if (c === 0) { S.flags.vox = 'reprogrammed'; await narrate('You pull the licensing chip and wire the blue note straight into her voice. She stands, tries a scale, and lands the third a hair flat, on purpose, and grins like a person. "Oh," she says. "Oh, that\'s what it\'s for." Vox Perfecta will march with the second line.'); }
    else { S.flags.vox = 'shutdown'; S.gearBag.push('mod_pitch'); await narrate('You pull the chip and the stage goes dark. The Perfect Pitch Chip is warm in your hand. It still hums her set. (Perfect Pitch Chip: a mod. Wider ONE zone, +crit.)'); }
    await giveNote('Eb');
    await say('odette', '"Bourbon\'s open. Frenchmen\'s loud. Now, Storyville. Madame Céleste at the Velvet Lantern has a problem named Ledger, and she\'s been asking for you by name."');
  },
  async mr_ledger() {
    await narrate('Mr. Ledger slumps over his desk. The vault is quiet except for the hum of a thousand contracts, and under it, a note.');
    await giveNote('F');
    await narrate('On the desk: the contracts. All of them. Every musician, every dancer, every flower seller on Basin Street. And a ledger of what they\'re worth, which is a great deal of money.');
    const c = await choose([{ label: 'Burn the contracts. Free Storyville.' }, { label: 'Keep the money (+Ð1,000).' }]);
    if (c === 0) { S.flags.contracts = 'burned'; await narrate('You strike a match. It takes a while. The smoke goes up the coal chute and all over Basin Street, and people come out on their balconies to breathe it. Storyville is free. Madame Céleste\'s deluxe rooms are yours forever, and she will march with the second line.'); }
    else { S.flags.contracts = 'kept'; S.doubloons += 1000; renderTopbar(); await narrate('You take the ledger and the account codes. Ð1,000, and the paper on every life in Storyville, now yours. You tell yourself you\'ll do right by them. Madame Céleste says nothing when you come up the chute. She won\'t march.'); }
    await say('celeste', c === 0 ? '"You could have been rich. You chose to be good. In this house that\'s rarer than the other thing." She hands you an airboat key. "Manchac. Grand-mère Clothilde. She knows what the pylons are doing out there."' : '"The airboat key. Manchac Swamp. Grand-mère Clothilde knows what the pylons are doing out there." She doesn\'t look at you. "Go."');
  },
  async rougarou() {
    await narrate('The rougarou falls across the pump housing and the test signal cuts out. In the silence, the chrome fur ripples and goes still, and the white eyes go brown, and Lucien looks up at you with a human face and a machine jaw.');
    await say('lucien', '"Where... is my pack? What did I... I can hear it. I can still hear it. In the implant. Make it stop. Or make me stop."');
    const c = await choose([{ label: 'Spare him. Smash the implant.' }, { label: 'Finish him. Take the Chrome Fang.' }]);
    if (c === 0) { S.flags.lucien = 'spared'; await narrate('You bring the horn\'s bell down on the implant and it shatters like cheap glass. Lucien screams, then breathes, then laughs, and the pack comes out of the fog to sit around him in a circle. "Thank you," he says. "When you march, we run." Lucien and the Chrome Wolves will join the second line.'); }
    else { S.flags.lucien = 'finished'; S.gearBag.push('ch_fang'); await narrate('You end it. Quick, and as kind as it can be. The pack howls once, in swing, and scatters into the swamp. A chrome fang lies in the mud, humming. (Chrome Fang: a charm. +Chops, +Mojo.)'); }
    await giveNote('G');
    await narrate('The pump station\'s pylons go dark one by one across the swamp. Frogs. Wind. An airboat, far off, with an accordion on deck. Grand-mère Clothilde is standing on the dock when you get back. "The dead are next," she says. "Mambo Rosalie, St. Louis No. 1. Go careful."');
  },
  async archivist() {
    await narrate('The Archivist\'s racks go dark in a wave, floor to ceiling, and every light in them goes out, and every light in them is a song, and the songs go up through the slab and out into the cemetery like birds.');
    await giveNote('Bb');
    await narrate('One light stays. It drifts down out of the rack and stands in front of you, and it\'s wearing a hat.');
    await say('gus', '"Took you long enough, baby. Now go cut me loose proper."');
    S.flags.gusFreed = true;
    await say('gus', '"Listen. They got my song, but they never got my time. You hear me? They can copy the notes. They can\'t copy the swing. That\'s yours. That\'s the city\'s. Now: I got something for you."');
    S.gearBag.push('thr_regalia'); S.gear.threads = 'thr_regalia'; clampVitals(S); renderTopbar();
    await narrate('Gus\'s Grand Marshal\'s Regalia. The sash, the fan, the hat. It still smells like cigar. (Equipped. Grit +12, Heart +60, Mojo +2.)');
    await say('gus', '"One more note. The Blue Note itself. Isolde Vane\'s got it in that violin of hers, up in the Garden District. Get it, and then get everybody, and then come find me. I\'ll be out front. I\'m always out front."');
    await say('rosalie', '"He\'s settled. Not resting. Settled." Mambo Rosalie rings the bell. "The Garden District\'s security domes don\'t open for people like us. You\'ll need an invitation to the Vane ball. Static could forge one. Céleste could call a favor. The Silver Tuxedo\'s valet sells them."');
  },
  async isolde() {
    await narrate('Isolde Vane lowers the violin. Her bow arm is shaking. The debutantes along the walls have forgotten to curtsy.');
    await say('isolde', '"Flat. I was... flat. Father never let me be flat." She looks at the violin. "It felt... I think I liked it."');
    await giveNote('Gb');
    await narrate('Six notes. The whole scale, C to B♭, humming in your horn like a hive. You can feel the shape of the blues in your hands for the first time: every note the city is, in one phrase.');
    await say('isolde', '"The Conductor is in the Tower. Maestro Quant. He built the Click from our stolen notes, and tomorrow night he broadcasts it, and the whole city keeps perfect time forever." She sets the violin down. "Go. Take everyone. He\'s only ever been afraid of a crowd."');
    await narrate('Back to the Lagniappe club. Gus said he\'d be out front. Everybody else will be waiting too.');
  },
};
/* ---------- Prologue ---------- */
async function prologue() {
  S.main = { act: 'treme', step: 0 }; S.district = 'treme';
  storyScreen('Prologue: The Dirge');
  renderTopbar();
  await narrate('NEON ORLEANS, 2084. Tremé, at dusk. The neon comes on over the shotgun houses one sign at a time, pink and green and gold, and under it a brass band is walking slow down Claiborne Avenue with a casket on their shoulders.');
  await narrate('Auguste "Gus" Thibodeaux. Grand Marshal of the Lagniappe Social Aid & Pleasure Club. The man who taught you to play. A Metronome raid caught him in a rehearsal room last week with a device called the Mute, and when the Hush left, the song was gone out of him, and then so was he.');
  await narrate('This is a [[jazz funeral]]. Dirge on the way there. You know how it goes. You\'re in the band.');
  await say('mamaroux', '"Where y\'at, baby. Come here. You walk next to me. You hold your horn up where he can see it."');
  await narrate('The dirge goes down Claiborne under the overpass. The whole neighborhood falls in behind. Umbrellas up. Handkerchiefs out. Nobody dancing yet. Not yet.');
  await narrate('Then the [[MoodSync]] speaker on the corner cuts out, and a white chrome van pulls across the road, and the [[Hush|the Hush]] get out.');
  await say('hush', '"Unlicensed assembly. Unlicensed syncopation detected. Cease all swing. Disperse."');
  await narrate('The band stops. Mama Roux does not. She looks at you. Everybody looks at you.');
  await narrate('TUTORIAL: When you RIFF, PLAY, or SOLO, a timing bar sweeps across. Tap anywhere as the marker crosses the glowing ONE zone for ×1.5 damage and +10 Groove. The pocket around it is ×1.2. Miss everything and it\'s CLAMS (×0.6). Build Groove to 100 and your SOLO lights up.');
  const r1 = await runBattle(buildEnemies(['hush_patrol'], { level: 1 }), { ctx: { type: 'tutorial', step: 1 }, context: 'tutorial', noFlee: true, intro: 'One Hush Patrolman steps up, citation pad out. The Hush are weak to FUNK and resist BLUE.' });
  if (r1 !== 'win') { return; }
  storyScreen();
  await narrate('The patrolman goes down in the street and the band, which has not stopped watching, starts up again. Slow. The dirge. The van doors open.');
  await narrate('TUTORIAL: VAMP halves incoming damage until your next turn and restores 15% Funk. BAG uses an item. Every enemy has one weakness (×1.5) and usually one resistance (×0.5): find them and the Blue Book remembers.');
  const r2 = await runBattle(buildEnemies(['hush_patrol', 'hush_patrol'], { level: 1 }), { ctx: { type: 'tutorial', step: 2 }, context: 'tutorial', noFlee: true, intro: 'Two more Patrolmen. The band plays louder.' });
  if (r2 !== 'win') { return; }
  await prologueEnd();
}
async function prologueEnd() {
  storyScreen();
  await narrate('The van backs up fast and takes the corner on two wheels. The band plays the last of the dirge all the way to the cemetery gates, and they lay Gus down, and then the Grand Marshal who isn\'t Gus lifts the umbrella.');
  await narrate('And the trumpet cuts loose, and the snare cracks, and the whole street turns from grief to joy in the space of one bar, the way it has for two hundred years, the way Metronome will never understand. You [[cut the body loose]]. You dance him home.');
  await narrate('Later. The Lagniappe club. Folding chairs, a coffee urn, the trophy wall. Mama Roux sets two things on the table in front of you.');
  await say('mamaroux', '"His umbrella. And his last cassette. He made it the night before the raid. Listen."');
  if (!S.keyItems.includes('umbrella')) S.keyItems.push('umbrella'); if (!S.keyItems.includes('cassette')) S.keyItems.push('cassette'); S.flags.hasCassette = true;
  await say('gus', '"Don\'t you cry too long for me, now. Dirge on the way there, dance on the way back. That\'s how we do."');
  await say('gus', '"Listen. Metronome\'s building something in the Tower. They call it the Click. A perfect beat, broadcast citywide, and when it drops, every heart in Neon Orleans keeps time with it. Forever. No swing. No lagniappe. Just the grid."');
  await say('gus', '"To build it they stole the [[blues scale|six Blue Notes]]. The frequencies this city\'s made of. Root, flat third, fourth, flat fifth, fifth, flat seventh. Six notes, six lieutenants, one in each pocket. Take \'em back. Learn to play the whole scale. And when you can, baby, you can break the Click."');
  await say('mamaroux', '"Captain Hush took Congo Square. He\'s got the first one. But you can\'t get near him with the Hush thick on every corner like they are. Go thin them out. Win three fights on the streets, and he\'ll come see about you himself."');
  S.main.step = 1; S.flags.metRoux = true;
  await narrate('You take the umbrella. It\'s heavier than it looks. Everything is.');
  saveGame(false);
  await goDistrict('treme');
}
/* ---------- Scenes ---------- */
async function broadcasterScene() {
  storyScreen('Jackson Square');
  await narrate('The licensing broadcaster: a chrome spire across from the cathedral, humming, guarded by a pack of Click-Drones that circle it in perfect formation.');
  const res = await runBattle(buildEnemies(['click_drone', 'click_drone', 'click_drone'], { level: 4 }), { ctx: { type: 'quest', id: 'broadcaster' }, context: 'quest', intro: 'Three Click-Drones peel off the spire. Machines. FUNK goes right through them.' });
  if (res !== 'win') { await enterPlace('jackson'); return; }
  await narrate('The drones are scrap. The spire is still humming. Its access panel is open and there\'s a cassette deck inside, because of course there is. Three ways to kill the signal.');
  const c = await choose([{ label: 'Wire in Gus\'s cassette. Broadcast him.' }, { label: 'Smash it. Fast and loud.' }, { label: 'Patch in your own horn. Play the Strip a riff.' }]);
  if (c === 0) { await narrate('Gus\'s voice goes out over every licensed speaker on Bourbon Street. "Dirge on the way there, dance on the way back." For four seconds the whole Strip stops. Then somebody, somewhere, starts to dance. (+40 Groove next fight.)'); G.nextFight({ groove: 40 }); }
  else if (c === 1) { await narrate('You put the bell of your horn through the panel. Sparks, smoke, silence. A Hush squad comes running.'); const r2 = await runBattle(buildEnemies(['hush_patrol', 'hush_patrol'], { level: 4 }), { ctx: { type: 'quest', id: 'broadcaster2' }, context: 'quest' }); if (r2 !== 'win') { S.flags.broadcasterDone = true; S.main.step = 2; await enterPlace('jackson'); return; } }
  else { await narrate('You play into the panel and the whole Strip hears it: one riff, yours, raw. A Barker hologram glitches and tries to dance. The cathedral pigeons take off on the two. (+1 Mojo, permanently.)'); S.perm.mojo += 1; }
  S.flags.broadcasterDone = true; S.main.step = 2;
  await rewardXp(60);
  await narrate('The spire goes dark. Down Bourbon, the club doors unlock one by one. The main stage is open. Vox Perfecta is waiting on it.');
  await enterPlace('jackson');
}
async function ballScene() {
  storyScreen('Vane Manor');
  await narrate('Gold gates. A Butler Unit takes your invitation, scans it twice, and lets you through into a house the size of a parish. The ball is in full swing, if swing is the word for a waltz played to a click track.');
  await narrate('Lady Isolde Vane is in the ballroom. Between you and the ballroom: the receiving line, the debutantes, and a floor you have to cross without being thrown out.');
  const opts = [{ label: 'Dance your way across (Tempo)' }, { label: 'Bluff the receiving line (Mojo)' }];
  if (S.roots === 'creole') opts.push({ label: '"My family\'s been on Krewe rolls since 1872." (Creole)' });
  if (S.roots === 'cajun') opts.push({ label: '"I\'m the Lafourche delegation." (Cajun)' });
  if (S.roots === 'yat') opts.push({ label: '"Where y\'at? I\'m with the band." (Yat)' });
  opts.push({ label: 'Fight your way in' });
  const c = await choose(opts);
  let ok = false;
  if (c === 0) { ok = G.check('tempo', 0.4); await narrate(ok ? 'You take a Debutante Droid by the hand and waltz her the length of the floor, a hair ahead of the click, and nobody notices you\'ve crossed the room until you\'re at the ballroom door. She curtsies. You bow.' : 'You step on a Debutante Droid\'s foot on the two. The quartet stops. Every head turns.'); }
  else if (c === 1) { ok = G.check('mojo', 0.4, true); await narrate(ok ? '"Baron de Marigny\'s nephew. By marriage. Twice." The receiving line waves you through without checking. Nobody in the Garden District has ever admitted to not knowing a Marigny.' : '"Baron de Marigny\'s nephew." "Which one?" "...The tall one." The Butler Unit\'s eyes narrow. Butler Units can\'t narrow their eyes. This one has learned.'); }
  else if (c < opts.length - 1) { ok = G.check('mojo', 0.6, true); await narrate(ok ? (S.roots === 'creole' ? 'A dowager droid lights up. "The Seventh Ward Dupres? I was at your grandmother\'s debut. Go on, cher, go on." You go on.' : S.roots === 'cajun' ? '"Lafourche? We have a Lafourche delegation?" "You do now." The host unit, programmed to never admit ignorance, nods you through.' : '"The band." The valet-droid looks at your case. "...Of course. The band. Through the kitchen." You go through the kitchen. It\'s faster.') : 'The line stares. Somebody\'s programming decides you\'re a problem.'); }
  if (!ok) { const res = await runBattle(buildEnemies(['debutante', 'debutante', 'butler'], { level: 12 }), { ctx: { type: 'quest', id: 'ball' }, context: 'quest', intro: 'Two Debutante Droids and a Butler Unit. The quartet keeps playing.' }); if (res !== 'win') { await enterPlace('manor'); return; } await narrate('The last droid folds up in a pile of tulle. The quartet keeps playing. The ballroom doors are right there.'); }
  S.main.step = 2;
  await rewardXp(70);
  const c2 = await choose([{ label: 'Enter the ballroom now' }, { label: 'Step outside and get ready first' }]);
  if (c2 === 0) { await bossFlow('isolde'); return; }
  await enterPlace('manor');
}
async function secondLineScene() {
  storyScreen('Lagniappe Social Aid & Pleasure Club');
  await narrate('Six Blue Notes on the trophy wall, humming together. Gus\'s umbrella against the door. And outside, on Claiborne, a crowd that has been gathering since noon.');
  const roster = SECOND_LINE.filter(m => m.cond(S)).map(m => ({ id: m.id, name: m.name, line: m.line }));
  S.secondLine = roster;
  const html = roster.map(m => `<div class="roster-row"><b>${esc(m.name)}</b><div class="small dim">${esc(m.line)}</div></div>`).join('');
  $('#story').insertAdjacentHTML('beforeend', `<div class="roster">${html}</div>`); scrollStory();
  await narrate(`Your second line is ${roster.length} strong. Inside the Tower, every one of them makes you stronger (+${Math.min(25, roster.length * 2)}% to all stats), and every one of them strikes when you Play the Blues.`);
  await say('gus', '"Umbrella up. Everybody in. Dirge on the way there, dance on the way back." He looks at the crowd. "Except this time, baby, we skip the dirge."');
  await narrate('The drums start. The crowd steps off. You take Claiborne to Canal, Canal to Poydras, and the Tower comes up out of the glass like a needle, and the whole city falls in behind you.');
  if (!S.unlocked.includes('tower')) S.unlocked.push('tower');
  S.main.step = 1;
  saveGame(false);
  await goDistrict('tower');
}
const TOWER_FLOORS = [
  { name: 'The Lobby', fights: [['hush_elite', 'quantizer'], ['hush_elite', 'hush_elite', 'sentinel']], intro: 'Marble, chrome, a fountain that ticks. Hush Elites in gold armor. They are not writing tickets.' },
  { name: 'The Server Floors', fights: [['quantizer', 'quantizer', 'session_clone'], ['sentinel', 'session_clone', 'hush_elite']], intro: 'Floors of servers humming the Click. Quantizers snap everything to the grid. And in the aisles, Session Clones: corporate copies of musicians who play your instrument.' },
  { name: 'The Studio Floor', vending: true, intro: 'A recording studio the size of a city block. In the hallway, a busted vending machine with a hand-lettered sign: WORKS IF YOU HIT IT.' },
  { name: 'The Booth', boss: 'conductor', intro: 'The control booth. Glass on all sides. The city below, every light blinking on the beat. And at the console, baton raised, the Conductor.' },
  { name: 'The Crown', boss: 'the_click', intro: 'The top of the Tower. A colossal chrome metronome fills the crown, pendulum swinging. The Click. It does not speak. It ticks.' },
];
async function towerFlow() {
  S.inTower = true; clampVitals(S); renderTopbar();
  storyScreen('Metronome Tower');
  if (S.towerFloor === 0 && !S.flags.towerEntered) { S.flags.towerEntered = true; await narrate(`The second line stops at the plaza. ${S.secondLine.length} strong. The Hush at the doors look at the crowd, and the crowd looks back, and the Hush step aside, because that is what a crowd is for.`); await narrate('TUTORIAL: Inside the Tower, your second line gives you +' + Math.min(25, S.secondLine.length * 2) + '% to all stats. Reloading mid-Tower resumes at your floor.'); }
  for (let f = S.towerFloor; f < TOWER_FLOORS.length; f++) {
    const fl = TOWER_FLOORS[f]; S.towerFloor = f; saveGame(false);
    storyScreen(fl.name); renderTopbar();
    if (!S.flags['towerintro_' + f] || fl.boss) { S.flags['towerintro_' + f] = true; await narrate(fl.intro); }
    if (fl.fights) {
      for (let k = S.towerFight || 0; k < fl.fights.length; k++) {
        S.towerFight = k; saveGame(false);
        const res = await runBattle(buildEnemies(fl.fights[k], { district: 'tower', level: 13 + Math.min(2, f + k) }), { ctx: { type: 'tower' }, context: 'tower', noFlee: true });
        if (res !== 'win') { S.inTower = false; renderDistrict(); return; }
        storyScreen(fl.name); renderTopbar();
        if (k < fl.fights.length - 1) await narrate(pick(['The second line surges up the stairs behind you.', 'Somebody on the line hands you a beignet. The Tower smells like powdered sugar now.', 'Static jams the elevator music. It was MoodSync. It is now a breakbeat.']));
      }
      S.towerFight = 0;
    }
    if (fl.vending) {
      await say('vendor', 'CLUNK. The machine lights up. BEIGNETS. CAFÉ AU LAIT. SAVE POINT (UNLICENSED). It has a slot for Doubloons and a sticker that says GUS WAS HERE.');
      let leave = false;
      while (!leave) {
        const c = await choose([{ label: 'Buy snacks' }, { label: 'Save game' }, { label: 'Rest a minute (+25% Heart & Funk)', cond: !S.flags.towerRested }, { label: 'Go up. The Booth.' }]);
        if (c === 0) { openShop('Studio Floor Vending', [{ id: 'beignet' }, { id: 'cafe' }, { id: 'poboy' }, { id: 'gumbo' }], { noSell: true }); await new Promise(r => { UI.onSheetClose = r; }); }
        else if (c === 1) { if (saveGame(true)) toast('Saved. The machine blinks approvingly.'); }
        else if (c === 2) { S.flags.towerRested = true; healPct(S, 0.25); funkPct(S, 0.25); renderTopbar(); await narrate('You sit on the floor with your back to the machine. The second line sits with you. For a minute, nobody counts anything.'); }
        else leave = true;
      }
    }
    if (fl.boss === 'conductor') {
      S.main.step = 2; saveGame(false);
      if (!S.flags.conductorPre) { S.flags.conductorPre = true; await say('conductor', '"Maestro Aurelius Quant. CEO. Composer. I built the Click from six stolen notes and ten thousand captured songs, and tomorrow the city will finally be in tune. Jazz is just error, repeated until someone mistook it for culture."'); await narrate('He raises the baton. Behind you, the second line goes quiet, and then Gus laughs, once, loud enough to echo.'); }
      let res; do { res = await runBattle([makeEnemy(S, 'conductor')], { boss: 'conductor', ctx: { type: 'tower' }, context: 'boss', noFlee: true }); if (res === 'retry') { storyScreen(fl.name); await narrate('The second line pulls you back out of the booth. Gus counts you in again.'); } } while (res === 'retry');
      if (res !== 'win') { S.inTower = false; renderDistrict(); return; }
      S.flags.boss_conductor = true;
      storyScreen(fl.name);
      await narrate('The Conductor drops the baton. The console is still lit. Above you, through the glass ceiling, the pendulum keeps swinging, because the Click doesn\'t need him anymore. It never did.');
      await narrate('The second line rallies around you. Sugar sings. Mama Roux produces a thermos. You get your breath back: Heart and Funk +50%.');
      healPct(S, 0.5); funkPct(S, 0.5); renderTopbar(); S.main.step = 3; S.flags.towerRested2 = true; saveGame(false);
      continue;
    }
    if (fl.boss === 'the_click') {
      if (!S.flags.clickPre) { S.flags.clickPre = true; await narrate('Perfect Silence comes down off the pendulum like weather. Nothing you play can touch it. Not one note. But you have six.'); await narrate('TUTORIAL: PLAY THE BLUES. Tap each of the six notes as it lights up. The first one\'s free; after that it costs 100 Groove. It shatters the Silence and every member of your second line strikes. At half Heart the Click re-shields. Build Groove and play it again.'); }
      let res; do { res = await runBattle([makeEnemy(S, 'the_click')], { boss: 'the_click', clickPhase: true, ctx: { type: 'tower' }, context: 'boss', noFlee: true }); if (res === 'retry') { storyScreen(fl.name); await narrate('The pendulum swings. You find the one again.'); } } while (res === 'retry');
      if (res !== 'win') { S.inTower = false; renderDistrict(); return; }
      S.flags.boss_the_click = true; S.inTower = false;
      await ending();
      return;
    }
  }
}
async function ending() {
  storyScreen('Second Line');
  await narrate('The pendulum stops mid-swing. The Click shatters, not loud, more like a held breath finally let go, and every screen in the city goes dark, and then comes back on showing nothing at all, and the city, for the first time in a year, hears itself.');
  await narrate('You come down the Tower stairs with the whole second line behind you and out into the Central Business District at dawn. Poydras Street. Canal. The streetcar bell rings, late, and sweet.');
  await narrate('Trumpet. Trombone. Sousaphone. Snare and bass drum, the Big Four cracking off the glass buildings. Sugar on top of it all. The city falls in: every stoop, every balcony, every go-cup. Umbrellas up. Handkerchiefs out.');
  await say('gus', '"That\'s how we do." He tips his hat. He\'s already getting hard to see in the daylight. "Dance on the way back, baby. I\'ll be out front."');
  await narrate('And the dirge turns to joy, the way it always has, and Gus Thibodeaux, Grand Marshal, lifts the umbrella one more time and walks on ahead of the band into the sun, and is gone, and the song isn\'t.');
  $('#story').insertAdjacentHTML('beforeend', `<div class="epilogue">
    <div class="card"><b>Vox Perfecta</b><div class="small">${S.flags.vox === 'reprogrammed' ? 'Sings three nights a week at Club Feu Follet, a little flat on purpose. The crowds are enormous. The Barkers are confused.' : 'The main stage on Bourbon went dark and stayed dark. Then somebody put a real band on it. The Perfect Pitch Chip hums in your pocket, remembering her set.'}</div></div>
    <div class="card"><b>Storyville</b><div class="small">${S.flags.contracts === 'burned' ? 'Free. Madame Céleste marched at the front, and the Velvet Lantern\'s deluxe rooms are yours forever, and the piano never stops.' : 'Still runs on your paper, and the money was good. Madame Céleste watched the second line from the balcony. She didn\'t march. She remembers.'}</div></div>
    <div class="card"><b>Lucien</b><div class="small">${S.flags.lucien === 'spared' ? 'Runs the Chrome Wolves through the swamp with the implant gone, howling in swing. Grand-mère Clothilde says he fixed her steps.' : 'The pack scattered. The swamp hums its own tune. The Chrome Fang in your charm slot still hums at the full moon.'}</div></div>
    <div class="card"><b>The Second Line</b><div class="small">${S.secondLine.length} strong on the night the Click broke. Everyone in it got a hat.</div></div>
  </div>`); scrollStory();
  S.flags.ending = true; S.main = { act: 'done', step: 0 }; S.flags.endingCount = (S.flags.endingCount || 0) + 1;
  await rewardXp(500);
  saveGame(false);
  await narrate('THE END. The city that care forgot never forgot how to play.');
  await creditsAndNewGamePlus();
}
async function creditsAndNewGamePlus() {
  storyScreen('Credits');
  $('#story').innerHTML = `<div class="credits">
    <h2 class="logo small-logo">CYBER FUNK</h2><div class="dim">A Neon Orleans Jazz-Punk RPG</div>
    <p>Grand Marshal: <b>${esc(S.name)}</b> · ${esc(CLASSES[S.cls].name)} · Level ${S.level}</p>
    <p>Second line: ${S.secondLine ? S.secondLine.length : 0} strong · Day ${S.day}${S.ngPlus ? ' · New Game+' + S.ngPlus : ''}</p>
    <p class="small dim">For Gus, and every Grand Marshal who ever lifted an umbrella.<br>For the Social Aid & Pleasure Clubs, who remember how to play.<br>For Congo Square, where it started.</p>
    <p class="small dim">Trumpet, trombone, sousaphone, saxophone, clarinet, snare, bass drum.<br>Dirge on the way there. Dance on the way back.</p>
    <p class="small dim">Mimes, tourists, and Metronome Corporation were harmed in the making of this game.</p>
  </div>`;
  const c = await choose([{ label: 'New Game+ (keep level & gear; enemies +30%)' }, { label: 'Keep playing this city' }]);
  if (c === 0) {
    const ok = await confirmBox('Start New Game+?', `<p>You keep your level, gear, sheet music, blessings, and bag. The story, notes, and quests reset. Enemies are +${30 * (S.ngPlus + 1)}% stronger.</p>`, 'March again', 'Not yet');
    if (ok) { await startNewGamePlus(); return; }
  }
  await goDistrict('treme');
}
async function startNewGamePlus() {
  const old = S;
  const ns = newState(old.name, old.roots, old.cls, old.settings, (old.ngPlus || 0) + 1);
  ns.level = old.level; ns.xp = old.xp; ns.gear = deepClone(old.gear); ns.gearBag = old.gearBag.slice(); ns.sheet = old.sheet.slice(); ns.perm = deepClone(old.perm); ns.blessings = old.blessings;
  ns.bag = deepClone(old.bag); ns.doubloons = Math.round(old.doubloons * 0.5); ns.lexicon = old.lexicon.slice(); ns.book = deepClone(old.book); ns.day = old.day;
  Object.keys(ns.book).forEach(k => { ns.book[k].seen = true; });
  S = ns; fullRest(S); saveGame(false);
  storyScreen('New Game+');
  await narrate(`The city resets like a tape rewound. Enemies are ${30 * S.ngPlus}% stronger. You are exactly as strong as you were. Dirge on the way there.`);
  await prologue();
}
const DISTRICT_ARRIVAL = {
  async quarter() { await narrate('Off the streetcar on Canal, into the Quarter. Frenchmen Street is a few blocks down. Club Feu Follet has a green light over the door, and the door is open.'); },
  async storyville() { await narrate('Basin Street, magenta neon, velvet in every window. The Velvet Lantern is the only parlor with a line out the door, because it\'s the only one with a live piano.'); },
  async bayou() { await narrate('The airboat drops you on a dock at the edge of the world. A lantern in a cabin window. Grand-mère Clothilde is already on the porch, like she knew.'); },
  async cemetery() { await narrate('St. Louis No. 1. The tombs are whitewashed and the votives are LED now, flickering on the beat. Mambo Rosalie\'s bell rings from a temple at the far wall.'); },
  async garden() { await narrate('The St. Charles streetcar lets you off under the oaks without a sound. Every mansion is under a dome. Vane Manor is the one with the gold gates and the music coming through them, exact and cold.'); },
  async tower() { await narrate('The Central Business District. Glass, chrome, and the Tower in the middle ticking. The second line waits on Poydras. When you\'re ready, march.'); },
};
