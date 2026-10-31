/* ============================================================
   CYBER FUNK — data: items, gear, sheet music, bandmates, second line
   ============================================================ */
'use strict';

/* Consumables. battle: usable in battle. field: usable outside. use = effect list for the resolver (target self). */
const ITEMS = {
  beignet:     { id: 'beignet', name: 'Beignet', price: 15, desc: '+40 Heart. Powdered sugar on everything you own.', battle: true, field: true, use: [{ k: 'heal', flat: 40 }] },
  cafe:        { id: 'cafe', name: 'Café au Lait', price: 15, desc: '+20 Funk. Chicory, hot milk, courage.', battle: true, field: true, use: [{ k: 'funk', flat: 20 }] },
  poboy:       { id: 'poboy', name: "Po'boy, dressed", price: 45, desc: '+120 Heart. Lettuce, tomato, pickles, mayo. Fully dressed.', battle: true, field: true, use: [{ k: 'heal', flat: 120 }] },
  muffuletta:  { id: 'muffuletta', name: 'Muffuletta', price: 100, desc: '+250 Heart. Olive salad the size of a hubcap.', battle: true, field: true, use: [{ k: 'heal', flat: 250 }] },
  chicory:     { id: 'chicory', name: 'Chicory Stim', price: 40, desc: '+50 Funk. Coffee with a cyberdeck in it.', battle: true, field: true, use: [{ k: 'funk', flat: 50 }] },
  gumbo:       { id: 'gumbo', name: 'Gumbo', price: 90, desc: 'Restore 50% of Heart and Funk. Dark roux, no argument.', battle: true, field: true, use: [{ k: 'heal', pct: 0.5 }, { k: 'funk', pct: 0.5 }] },
  yakamein:    { id: 'yakamein', name: 'Ya-Ka-Mein', price: 25, desc: '"Old Sober." Cure all negative statuses.', battle: true, field: true, use: [{ k: 'cleanse', target: 'self' }] },
  snoball:     { id: 'snoball', name: 'Sno-Ball', price: 20, desc: 'Cure Scorched, +10 Funk. Nectar cream, extra syrup.', battle: true, field: true, use: [{ k: 'cleanse', target: 'self', only: 'scorched' }, { k: 'funk', flat: 10 }] },
  pralines:    { id: 'pralines', name: 'Pralines', price: 35, desc: '+30 Groove. Butter, sugar, pecans, momentum.', battle: true, field: false, use: [{ k: 'groove', amt: 30 }] },
  boudin:      { id: 'boudin', name: 'Boudin Link', price: 30, desc: 'Encore for 3 turns. Rice, pork, and the will to go on.', battle: true, field: false, use: [{ k: 'status', id: 'encore', target: 'self', turns: 3 }] },
  cayenne:     { id: 'cayenne', name: 'Cayenne Shot', price: 30, desc: 'Your next attack becomes HOT at +20%.', battle: true, field: false, use: [{ k: 'fn', run: (c) => { c.actor.nextTone = 'HOT'; } }] },
  subtape:     { id: 'subtape', name: 'Subwoofer Tape', price: 30, desc: 'Your next attack becomes LOW at +20%.', battle: true, field: false, use: [{ k: 'fn', run: (c) => { c.actor.nextTone = 'LOW'; } }] },
  indigo:      { id: 'indigo', name: 'Indigo Candle', price: 30, desc: 'Your next attack becomes BLUE at +20%.', battle: true, field: false, use: [{ k: 'fn', run: (c) => { c.actor.nextTone = 'BLUE'; } }] },
  discobead:   { id: 'discobead', name: 'Disco Bead', price: 30, desc: 'Your next attack becomes FUNK at +20%.', battle: true, field: false, use: [{ k: 'fn', run: (c) => { c.actor.nextTone = 'FUNK'; } }] },
  smoke:       { id: 'smoke', name: 'Second Line Smoke', price: 40, desc: 'Guaranteed escape from a non-boss fight.', battle: true, field: false, use: [{ k: 'fn', run: (c) => { c.battle.flee = true; } }] },
  grisgris:    { id: 'grisgris', name: 'Gris-Gris Bag', price: 200, max: 1, passive: true, desc: "Carry 1. If you're cut, revive once at 30% Heart.", battle: false, field: false, use: [] },
  kingcake:    { id: 'kingcake', name: 'King Cake Slice', price: 0, rare: true, desc: '+60 Heart. 10% chance you find the baby: +1 Mojo, permanently.', battle: true, field: true, use: [{ k: 'heal', flat: 60 }, { k: 'fn', run: (c) => { if (Math.random() < 0.10) { c.battle.helpers.permStat(c, 'mojo', 1); c.battle.log('You found the baby in the King Cake! +1 Mojo, permanently.'); } } }] },
  hurricane:   { id: 'hurricane', name: 'Hurricane (drink)', price: 25, desc: 'Next fight: Hyped from the start. Rum, passion fruit, regret.', battle: false, field: true, prefight: { status: 'hyped' } },
  sazerac:     { id: 'sazerac', name: 'Sazerac', price: 25, desc: 'Next fight: In the Pocket from the start.', battle: false, field: true, prefight: { status: 'pocket' } },
  abita:       { id: 'abita', name: 'Cold Local Beer', price: 10, desc: '+25 Heart. Cold, local, nothing fancy.', battle: true, field: true, use: [{ k: 'heal', flat: 25 }] },
  redbeans:    { id: 'redbeans', name: 'Red Beans (dry)', price: 20, desc: 'A bag of Camellia red beans. Mama Roux needs these.', battle: false, field: false, key: true, use: [] },
  pianoroll:   { id: 'pianoroll', name: 'Player-Piano Roll', price: 0, desc: 'One of Professor Theo\'s missing rolls.', battle: false, field: false, key: true, use: [] },
  swampherb:   { id: 'swampherb', name: 'Swamp Herb', price: 0, desc: 'Elderberry, mamou root, and something Clothilde will name.', battle: false, field: false, key: true, use: [] },
  ledgerpage:  { id: 'ledgerpage', name: 'Ledger Page', price: 0, desc: 'A torn page of Mr. Ledger\'s contracts. Someone\'s whole life, itemized.', battle: false, field: false, key: true, use: [] },
  cryptkey:    { id: 'cryptkey', name: 'Crypt Key', price: 0, desc: 'A brass key with a data chip in the bow. Opens the Mausoleum.', battle: false, field: false, key: true, use: [] },
  invitation:  { id: 'invitation', name: 'Ball Invitation', price: 0, desc: 'Cream card, gold leaf. "Miss Isolde Vane requests your presence."', battle: false, field: false, key: true, use: [] },
  umbrella:    { id: 'umbrella', name: "Gus's Second-Line Umbrella", price: 0, desc: 'Purple, green, and gold fringe. Lifted at every second line Gus ever led.', battle: false, field: false, key: true, use: [] },
  cassette:    { id: 'cassette', name: "Gus's Last Cassette", price: 0, desc: '"Dirge on the way there, dance on the way back." His voice, on tape.', battle: false, field: false, key: true, use: [] },
  pralinelady_king: { id: 'pralinelady_king', name: 'Praline Lady\'s Secret Box', price: 0, desc: 'A box with a second bottom.', battle: false, field: false, key: true, use: [] },
};

const INSTRUMENT_TIERS = [
  { tier: 'pawnshop', label: 'Pawnshop', chops: 0, price: 0, lvl: 1 },
  { tier: 'street', label: 'Street-Tuned', chops: 4, price: 120, lvl: 3 },
  { tier: 'neon', label: 'Neon', chops: 9, price: 420, lvl: 7 },
  { tier: 'chrome', label: 'Chrome', chops: 15, price: 950, lvl: 11 },
  { tier: 'legend', label: 'Legendary', chops: 24, price: 350, lvl: 1, legendary: true },
];

const GEAR = {};
Object.values(CLASSES).forEach(cls => {
  INSTRUMENT_TIERS.forEach(t => {
    const id = `inst_${cls.id}_${t.tier}`;
    GEAR[id] = { id, slot: 'instrument', cls: cls.id, tier: t.tier, name: t.legendary ? cls.legendary : `${t.label} ${cls.name}`, price: t.price, lvl: t.lvl, legendary: !!t.legendary,
      stats: { chops: t.chops }, desc: t.legendary ? `${cls.name}'s legendary. Chops +${t.chops}. Built by Ti-Jacques from five Blue Notes' worth of chrome.` : `${cls.name}. Chops +${t.chops}.` };
  });
});
Object.assign(GEAR, {
  thr_thrift:    { id: 'thr_thrift', slot: 'threads', name: 'Thrift-Store Suit', price: 60, lvl: 1, stats: { grit: 1, heart: 5 }, desc: 'Grit +1, Heart +5. Somebody\'s uncle wore this to a wedding in 2071.' },
  thr_secondline:{ id: 'thr_secondline', slot: 'threads', name: 'Second-Line Suit', price: 180, lvl: 4, stats: { grit: 3, heart: 15 }, desc: 'Grit +3, Heart +15. Sash, fan, and matching shoes.' },
  thr_duster:    { id: 'thr_duster', slot: 'threads', name: 'Mirrorshade Duster', price: 450, lvl: 8, stats: { grit: 6, heart: 30 }, desc: 'Grit +6, Heart +30. Long coat, reflective lining, swamp-proof.' },
  thr_kevlar:    { id: 'thr_kevlar', slot: 'threads', name: 'Kevlar Zoot Suit', price: 900, lvl: 11, stats: { grit: 10, heart: 50 }, desc: 'Grit +10, Heart +50. Pleats you could stop a riot with.' },
  thr_regalia:   { id: 'thr_regalia', slot: 'threads', name: "Grand Marshal's Regalia", price: 0, lvl: 1, story: true, stats: { grit: 12, heart: 60, mojo: 2 }, desc: 'Grit +12, Heart +60, Mojo +2. Gus\'s sash, his fan, his hat. It still smells like cigar.' },

  ch_beads:      { id: 'ch_beads', slot: 'charm', name: 'Lucky Bead Strand', price: 120, lvl: 1, stats: { mojo: 3 }, desc: 'Mojo +3. Caught them off a float in \'79. Never missed since.' },
  ch_gator:      { id: 'ch_gator', slot: 'charm', name: 'Gator Tooth', price: 150, lvl: 1, stats: { grit: 3 }, desc: 'Grit +3. From a gator that lost an argument.' },
  ch_claw:       { id: 'ch_claw', slot: 'charm', name: 'Crawfish Claw', price: 150, lvl: 1, stats: { tempo: 3 }, desc: 'Tempo +3. Quick little thing.' },
  ch_medal:      { id: 'ch_medal', slot: 'charm', name: 'Saint Medal', price: 260, lvl: 1, stats: {}, statusResist: 0.5, desc: 'Resists negative statuses 50% of the time. St. Expedite, patron of hurry-up.' },
  ch_pouch:      { id: 'ch_pouch', slot: 'charm', name: 'Gris-Gris Pouch', price: 100, lvl: 1, stats: { heart: 15 }, desc: 'Heart +15. Red flannel, a root, and a prayer your grandmother knew.' },
  ch_fang:       { id: 'ch_fang', slot: 'charm', name: 'Chrome Fang', price: 0, lvl: 1, story: true, stats: { chops: 4, mojo: 3 }, desc: 'Chops +4, Mojo +3. The rougarou\'s tooth. It hums at the full moon.' },
  ch_mouthpiece: { id: 'ch_mouthpiece', slot: 'charm', name: "Busker's Mouthpiece", price: 0, lvl: 1, story: true, stats: { chops: 2, mojo: 2 }, desc: 'Chops +2, Mojo +2. Silver, worn smooth by forty years of Royal Street.' },
  ch_haintblue:  { id: 'ch_haintblue', slot: 'charm', name: 'Haint-Blue Bottle', price: 520, lvl: 10, stats: { grit: 3, mojo: 2 }, statusResist: 0.25, desc: 'Grit +3, Mojo +2, resists statuses 25%. Haints can\'t cross water, and they think this is water.' },
  ch_medallion:  { id: 'ch_medallion', slot: 'charm', name: 'Krewe Medallion', price: 300, lvl: 1, stats: { mojo: 1 }, doubloonBonus: 0.15, desc: 'Mojo +1, +15% Doubloons. Heavy as a real one. Might be a real one.' },
  ch_evileye:    { id: 'ch_evileye', slot: 'charm', name: "Zinnia's Spare Eye", price: 0, lvl: 1, story: true, stats: { mojo: 4, tempo: 2 }, desc: 'Mojo +4, Tempo +2. A cybernetic eye on a chain. It winks when something\'s about to happen.' },

  mod_lungs:     { id: 'mod_lungs', slot: 'mod', name: 'Bellows Lungs', price: 200, lvl: 1, stats: { funk: 10 }, desc: 'Funk +10. Breathe in once, play for a week.' },
  mod_jaw:       { id: 'mod_jaw', slot: 'mod', name: 'Chrome Jaw', price: 260, lvl: 1, stats: { chops: 5 }, desc: 'Chops +5. Embouchure of the gods.' },
  mod_tempo:     { id: 'mod_tempo', slot: 'mod', name: 'Tempo Chip', price: 240, lvl: 1, stats: { tempo: 4 }, desc: 'Tempo +4. Not Metronome-made. Swings a little, on purpose.' },
  mod_ribcage:   { id: 'mod_ribcage', slot: 'mod', name: 'Subwoofer Ribcage', price: 320, lvl: 1, stats: { grit: 4 }, toneBonus: { LOW: 0.2 }, desc: 'Grit +4, LOW damage +20%. You can feel your own heartbeat in the next room.' },
  mod_eyes:      { id: 'mod_eyes', slot: 'mod', name: 'Mirror Eyes', price: 240, lvl: 1, stats: { mojo: 4 }, desc: 'Mojo +4. Nobody can tell if you\'re bluffing. You can\'t either.' },
  mod_swing:     { id: 'mod_swing', slot: 'mod', name: 'Swing Unit', price: 350, lvl: 1, stats: {}, oneZone: 0.4, desc: 'Wider ONE zone (+40%). A little box that puts the ghost in the machine.' },
  mod_pitch:     { id: 'mod_pitch', slot: 'mod', name: 'Perfect Pitch Chip', price: 0, lvl: 1, story: true, stats: {}, oneZone: 0.3, critBonus: 0.08, desc: 'Wider ONE zone (+30%), crit +8%. Pulled out of Vox Perfecta. It still hums her set.' },
  mod_titanjaw:  { id: 'mod_titanjaw', slot: 'mod', name: 'Titanium Jaw', price: 700, lvl: 11, stats: { chops: 9 }, desc: 'Chops +9. The Garden District upgrade. Bite-proof.' },
  mod_overdrive: { id: 'mod_overdrive', slot: 'mod', name: 'Overdrive Chip', price: 650, lvl: 11, stats: { tempo: 7, mojo: 2 }, desc: 'Tempo +7, Mojo +2. Runs hot. Runs fast. Runs.' },
});

const SHEET_MUSIC = {
  sm_circular: { id: 'sm_circular', name: 'Circular Breathing', price: 200, desc: '+1 Funk per turn in battle.' },
  sm_secondwind: { id: 'sm_secondwind', name: 'Second Wind', price: 400, desc: 'Once per battle, survive a lethal hit with 1 Heart.' },
  sm_swing: { id: 'sm_swing', name: 'Swing Feel', price: 300, desc: 'Wider ONE zone (+30%).' },
  sm_rubato: { id: 'sm_rubato', name: 'Rubato', price: 250, desc: '+8% dodge.' },
  sm_ghost: { id: 'sm_ghost', name: 'Ghost Notes', price: 350, desc: '+25% crit damage.' },
};

const BANDMATES = {
  sugar:  { id: 'sugar', name: 'Sugar Desmarais', inst: 'vocals', color: '#ff6ad5', assist: 'as_sugar', passive: '+10% healing received', passiveId: 'heal',
    blurb: 'Vocalist. Won the Cutting Contest for her and she sang the whole way home. Big voice, bigger laugh, zero patience for licensed jingles.',
    arc: 'Sugar sang backup on MoodSync tracks for two years before she quit. "They pitched my voice to a grid," she says. "I pitched their grid to the river."' },
  static: { id: 'static', name: '"Static" Okafor', inst: 'cassette deck', color: '#00e5ff', assist: 'as_static', passive: '+10% Doubloons', passiveId: 'doubloons',
    blurb: 'Cassette-deck DJ and hacker. Got him out of a Metronome contract and he\'s been scratching the Hush\'s frequencies ever since.',
    arc: 'Static built the Click\'s first test encoder as a Metronome intern. He\'s been trying to break it ever since. "Every grid has a seam," he says. "I know where I left mine."' },
  remy:   { id: 'remy', name: 'Remy Guidry', inst: 'frottoir', color: '#39ff88', assist: 'as_remy', passive: '+5% dodge', passiveId: 'dodge',
    blurb: 'Rubboard player from Manchac. Defended the Fais Do-Do with him and he hasn\'t stopped playing since. Mais, he never does.',
    arc: 'Remy\'s grand-père played frottoir on the same floor of the Fais Do-Do for sixty years. "The gators took the dock," Remy says. "They don\'t get the dancehall."' },
  moses:  { id: 'moses', name: 'Brother Moses Valcour', inst: 'banjo', color: '#ffc43d', assist: 'as_moses', passive: '+1 Funk per turn', passiveId: 'funk',
    blurb: 'Banjo player and hymn-leader. Laid the restless haints to rest with him and he plays for the dead as sweet as the living.',
    arc: 'Brother Moses lost his whole band to the first Mute raids. He kept playing in the cemetery so they\'d have somewhere to listen. "Dead folks got good ears," he says. "Better than Metronome\'s."' },
};

/* Second line roster: condition is a function of the game state. */
const SECOND_LINE = [
  { id: 'gus', name: 'Gus Thibodeaux (Grand Marshal)', cond: s => s.flags.gusFreed, line: 'Leads the way, hat tipped, umbrella high.' },
  { id: 'mamaroux', name: 'Mama Roux', cond: () => true, line: 'Brings the red beans and the whole kitchen.' },
  { id: 'tijacques', name: 'Ti-Jacques', cond: () => true, line: 'Carries a horn in each hand and one in reserve.' },
  { id: 'odette', name: 'Miss Odette Fontenot', cond: () => true, line: 'Club Feu Follet closes for the night. Everybody\'s in the street.' },
  { id: 'sugar', name: 'Sugar Desmarais', cond: s => s.band.recruited.includes('sugar'), line: 'Sings the lead, loud enough for the Tower to hear.' },
  { id: 'static', name: '"Static" Okafor', cond: s => s.band.recruited.includes('static'), line: 'Deck on his shoulder, jamming the Hush frequencies.' },
  { id: 'remy', name: 'Remy Guidry', cond: s => s.band.recruited.includes('remy'), line: 'Frottoir strapped on, spoons flying.' },
  { id: 'moses', name: 'Brother Moses Valcour', cond: s => s.band.recruited.includes('moses'), line: 'Banjo and a hymn for the ones who can\'t march.' },
  { id: 'celeste', name: 'Madame Céleste Arceneaux', cond: s => s.flags.contracts === 'burned', line: 'Storyville walks free behind her, every one of them.' },
  { id: 'vox', name: 'Vox Perfecta', cond: s => s.flags.vox === 'reprogrammed', line: 'Singing for real now. A little flat on purpose.' },
  { id: 'lucien', name: 'Lucien', cond: s => s.flags.lucien === 'spared', line: 'The Chrome Wolves run alongside, howling in swing.' },
  { id: 'zinnia', name: 'Madame Zinnia', cond: s => s.quests.lost_eye === 'done', line: 'Reads the cards and says the Tower\'s already lost.' },
  { id: 'clothilde', name: 'Grand-mère Clothilde', cond: s => s.quests.herbs === 'done', line: 'Says a prayer over the whole line before it steps off.' },
  { id: 'rosalie', name: 'Mambo Rosalie', cond: s => s.quests.haints === 'done', line: 'Shakes the asson. The dead keep time with the living.' },
  { id: 'theo', name: 'Professor Theo Lavigne', cond: s => s.quests.rolls === 'done', line: 'Pushes an upright piano down Canal Street on a dolly.' },
];
