/* ============================================================
   CYBER FUNK — data: enemies & bosses
   ============================================================ */
'use strict';

/* Normal enemies. lvl = [min,max]. special fires ~30% of the time.
   machine: Static's Scratch doubles damage. gritMult/dodgeBonus/hpMult tune the body. */
const ENEMIES = {
  /* Tremé */
  hush_patrol:   { id: 'hush_patrol', name: 'Hush Patrolman', district: 'treme', lvl: [1, 2], tone: 'LOW', weak: 'FUNK', resist: 'BLUE', special: 'en_cease', book: 'White chrome armor, noise-cancelling helmet, and a citation pad. Can\'t hear a thing, which is the point.' },
  click_drone:   { id: 'click_drone', name: 'Click-Drone', district: 'treme', lvl: [1, 3], tone: 'FUNK', weak: 'FUNK', resist: 'LOW', machine: true, special: 'en_tick', book: 'A hovering metronome with a taser. Ticks at exactly 120 beats per minute, forever.' },
  nutria:        { id: 'nutria', name: 'Mutant Nutria', district: 'treme', lvl: [1, 2], tone: 'HOT', weak: 'HOT', resist: null, special: 'en_gnaw', book: 'Swamp rat the size of a Labrador. Orange teeth, glowing eyes, no manners.' },
  hustler:       { id: 'hustler', name: 'Corner Hustler', district: 'treme', lvl: [2, 3], tone: 'BLUE', weak: 'BLUE', resist: 'FUNK', special: 'en_pickpocket', book: 'Bet you he knows where you got them shoes. Bet you he\'s got your wallet too.' },
  hush_sergeant: { id: 'hush_sergeant', name: 'Hush Sergeant', district: 'treme', lvl: [3, 3], elite: true, tone: 'LOW', weak: 'FUNK', resist: 'BLUE', special: 'en_sergeant', specialChance: 0.45, book: 'Three stripes on the chrome and a riot baton he names. ELITE.' },

  /* French Quarter */
  gocup_golem:   { id: 'gocup_golem', name: 'Go-Cup Golem', district: 'quarter', lvl: [3, 4], tone: 'LOW', weak: 'HOT', resist: 'LOW', special: 'en_spill', book: 'Ten thousand plastic go-cups fused by a thousand spilled drinks. Smells like Thursday.' },
  neon_mime:     { id: 'neon_mime', name: 'Neon Mime', district: 'quarter', lvl: [3, 5], tone: 'BLUE', weak: 'FUNK', resist: 'BLUE', special: 'en_wall', book: 'Metronome\'s most loyal citizen. Has never made a sound and never will.' },
  busker_bot:    { id: 'busker_bot', name: 'Licensed Busker-Bot', district: 'quarter', lvl: [4, 5], tone: 'FUNK', weak: 'BLUE', resist: 'FUNK', machine: true, special: 'en_royalty', book: 'Plays the same licensed jingle on loop and bills you for listening.' },
  barker:        { id: 'barker', name: 'Bourbon Barker', district: 'quarter', lvl: [3, 5], tone: 'HOT', weak: 'LOW', resist: 'HOT', hologram: true, special: 'en_twofer', book: 'A hologram outside every licensed club. Two-for-one, no cover, come on in, come on in.' },
  hooligan:      { id: 'hooligan', name: 'Hurricane Hooligan', district: 'quarter', lvl: [5, 5], elite: true, tone: 'HOT', weak: 'LOW', resist: 'HOT', special: 'en_spin', specialChance: 0.5, book: 'Three hurricanes deep and spinning. Hits twice because he sees two of you. ELITE.' },

  /* Storyville */
  enforcer:      { id: 'enforcer', name: 'Contract Enforcer', district: 'storyville', lvl: [5, 6], tone: 'LOW', weak: 'BLUE', resist: 'LOW', special: 'en_garnish', book: 'Pinstripes over armor plating. Carries the fine print in a holster.' },
  bouncer:       { id: 'bouncer', name: 'Velvet Rope Bouncer', district: 'storyville', lvl: [5, 7], tone: 'LOW', weak: 'FUNK', resist: 'LOW', gritMult: 1.5, special: 'en_eightysix', book: 'Big as a doorway and twice as hard to get past. Resists reason and bass.' },
  absinthe:      { id: 'absinthe', name: 'Absinthe Phantom', district: 'storyville', lvl: [6, 7], tone: 'BLUE', weak: 'HOT', resist: 'BLUE', special: 'en_haze', book: 'A green fog that walks like a gentleman. Burns off in the heat.' },
  repo_drone:    { id: 'repo_drone', name: 'Repo Drone', district: 'storyville', lvl: [5, 7], tone: 'FUNK', weak: 'FUNK', resist: 'HOT', machine: true, special: 'en_repossess', book: 'Takes back what Metronome says you never owned. Including your good mood.' },
  bagman:        { id: 'bagman', name: 'The Bagman', district: 'storyville', lvl: [7, 7], elite: true, tone: 'LOW', weak: 'BLUE', resist: 'LOW', special: 'en_bagman', specialChance: 0.45, book: 'Mr. Ledger\'s collector. The bag is for your Doubloons. The other bag is for you. ELITE.' },

  /* Bayou */
  chrome_gator:  { id: 'chrome_gator', name: 'Chrome Gator', district: 'bayou', lvl: [7, 9], tone: 'LOW', weak: 'HOT', resist: 'LOW', gritMult: 1.4, special: 'en_deathroll', book: 'Twelve feet of armored reptile with a Metronome tracking tag. Hates heat.' },
  feu_follet:    { id: 'feu_follet', name: 'Feu Follet', district: 'bayou', lvl: [7, 8], tone: 'HOT', weak: 'BLUE', resist: 'HOT', dodgeBonus: 0.15, special: 'en_wispfire', book: 'A swamp light that leads travelers astray. Sorrow is the only thing it can\'t dodge.' },
  grunch:        { id: 'grunch', name: 'Swamp Grunch', district: 'bayou', lvl: [7, 9], tone: 'FUNK', weak: 'LOW', resist: 'FUNK', special: 'en_headbutt', book: 'Half goat, half something else, all headbutt. Lives under the Chef Menteur bridge.' },
  skeeter:       { id: 'skeeter', name: 'Skeeter Swarm', district: 'bayou', lvl: [8, 9], tone: 'HOT', weak: 'HOT', resist: 'BLUE', machine: true, special: 'en_drain', book: 'Ten thousand mosquito drones that drink Funk. Burn them out.' },
  rougarou_pup:  { id: 'rougarou_pup', name: 'Rougarou Pup', district: 'bayou', lvl: [8, 9], tone: 'HOT', weak: 'HOT', resist: 'BLUE', special: 'en_howl', book: 'A Chrome Wolf gone feral on the Click\'s test signal. Still a pup. Still bites.' },
  big_grunch:    { id: 'big_grunch', name: 'Big Grunch', district: 'bayou', lvl: [9, 9], elite: true, tone: 'FUNK', weak: 'LOW', resist: 'FUNK', special: 'en_biggrunch', specialChance: 0.45, book: 'The grunch the other grunches tell stories about. ELITE.' },

  /* Cities of the Dead */
  haint:         { id: 'haint', name: 'Wandering Haint', district: 'cemetery', lvl: [9, 10], tone: 'BLUE', weak: 'BLUE', resist: 'FUNK', special: 'en_gravechill', book: 'A restless spirit drifting between the tombs. Sorrow calls it home.' },
  data_wraith:   { id: 'data_wraith', name: 'Data Wraith', district: 'cemetery', lvl: [9, 11], tone: 'FUNK', weak: 'FUNK', resist: 'HOT', special: 'en_corrupt', book: 'A corrupted file that learned to haunt. Keeps strict time, badly.' },
  tomb_crawler:  { id: 'tomb_crawler', name: 'Tomb Crawler', district: 'cemetery', lvl: [10, 11], tone: 'LOW', weak: 'LOW', resist: 'BLUE', special: 'en_burrow', book: 'Eight legs and a marble shell. Digs in when it\'s scared.' },
  archive_drone: { id: 'archive_drone', name: 'Archive Drone', district: 'cemetery', lvl: [9, 11], tone: 'FUNK', weak: 'FUNK', resist: 'LOW', machine: true, special: 'en_record', book: 'Records everything you do and plays it back wrong. Copies your buffs.' },
  bone_choir:    { id: 'bone_choir', name: 'Bone Choir', district: 'cemetery', lvl: [10, 11], tone: 'BLUE', weak: 'HOT', resist: 'BLUE', special: 'en_requiem', book: 'Four skeletons in perfect four-part harmony. Perfect is the problem.' },
  crypt_keeper:  { id: 'crypt_keeper', name: 'Crypt Keeper Unit', district: 'cemetery', lvl: [11, 11], elite: true, tone: 'LOW', weak: 'FUNK', resist: 'LOW', machine: true, special: 'en_keeper', specialChance: 0.45, book: 'Metronome\'s groundskeeper. Seals tombs and mouths. ELITE.' },

  /* Garden District */
  debutante:     { id: 'debutante', name: 'Debutante Droid', district: 'garden', lvl: [11, 12], tone: 'BLUE', weak: 'FUNK', resist: 'BLUE', special: 'en_snub', book: 'White gloves, chrome smile, and a look that could curdle gumbo.' },
  butler:        { id: 'butler', name: 'Butler Unit', district: 'garden', lvl: [11, 13], tone: 'LOW', weak: 'LOW', resist: 'HOT', machine: true, special: 'en_service', book: 'Serves tea, serves subpoenas, patches up its friends.' },
  topiary:       { id: 'topiary', name: 'Topiary Mech', district: 'garden', lvl: [12, 13], tone: 'HOT', weak: 'HOT', resist: 'LOW', machine: true, special: 'en_hedge', book: 'A hedge trimmed into a soldier, with a soldier inside. Flammable.' },
  quartet:       { id: 'quartet', name: 'String Quartet Drone', district: 'garden', lvl: [12, 13], tone: 'BLUE', weak: 'FUNK', resist: 'BLUE', machine: true, hpMult: 0.45, special: 'en_harmonize', book: 'One of four. Plays licensed chamber music with zero swing. Low Heart, high harmony.' },
  valet:         { id: 'valet', name: 'Valet Assassin', district: 'garden', lvl: [12, 13], tone: 'HOT', weak: 'BLUE', resist: 'FUNK', special: 'en_backstab', book: 'Parks your car, picks your pocket, pierces your lung. Tips appreciated.' },
  beaumont:      { id: 'beaumont', name: 'Security Chief Beaumont', district: 'garden', lvl: [13, 13], elite: true, tone: 'HOT', weak: 'FUNK', resist: 'BLUE', special: 'en_beaumont', specialChance: 0.45, book: 'Runs security for the Vane estate. Three shots, never misses twice. ELITE.' },

  /* Metronome Tower */
  hush_elite:    { id: 'hush_elite', name: 'Hush Elite', district: 'tower', lvl: [13, 14], tone: 'LOW', weak: 'FUNK', resist: 'BLUE', special: 'en_sergeant', book: 'The Hush\'s best. Gold chrome, no citation pad. They don\'t write tickets anymore.' },
  quantizer:     { id: 'quantizer', name: 'Quantizer', district: 'tower', lvl: [13, 15], tone: 'FUNK', weak: 'FUNK', resist: 'HOT', machine: true, special: 'en_snap', book: 'Snaps everything to the grid. Your buffs, your Groove, your pulse.' },
  session_clone: { id: 'session_clone', name: 'Session Clone', district: 'tower', lvl: [14, 15], tone: 'HOT', weak: 'BLUE', resist: null, special: 'clone', book: 'A corporate copy of a musician who plays your instrument. It has your licks and none of your heart.' },
  sentinel:      { id: 'sentinel', name: 'Click Sentinel', district: 'tower', lvl: [14, 15], tone: 'LOW', weak: 'LOW', resist: 'FUNK', machine: true, special: 'en_ticktick', book: 'A chrome pendulum with a gun. Winds up, then takes your voice.' },
  warden:        { id: 'warden', name: 'Tempo Warden', district: 'tower', lvl: [15, 15], elite: true, tone: 'FUNK', weak: 'FUNK', resist: 'BLUE', machine: true, special: 'en_warden', specialChance: 0.45, book: 'The Conductor\'s personal enforcer. Keeps the Tower at exactly 120 BPM. ELITE.' },

  /* Summons and specials */
  ghost_track:   { id: 'ghost_track', name: 'Ghost Track', district: 'cemetery', lvl: [11, 11], tone: 'BLUE', weak: 'BLUE', resist: 'FUNK', hpMult: 0.5, special: 'en_ghosttrack', specialChance: 0.5, book: 'The captured echo of a dead musician, replayed by the Archivist. It wants to rest.' },

  /* Cutting Contest rivals (use real class skills) */
  rival_hotrod:  { id: 'rival_hotrod', name: '"Hot Rod" Broussard', district: 'quarter', lvl: [4, 4], rival: 'trumpet', tone: 'HOT', weak: 'LOW', resist: 'HOT', book: 'Trumpet. Plays high, plays loud, plays like the bell is on fire. Lost once, in 2081, and won\'t talk about it.' },
  rival_bigmae:  { id: 'rival_bigmae', name: 'Big Mae Boudreaux', district: 'quarter', lvl: [5, 5], rival: 'sousaphone', tone: 'LOW', weak: 'HOT', resist: 'LOW', gritMult: 1.3, book: 'Sousaphone. Holds down the low end of three bands and the whole Feu Follet bar when she leans on it.' },
  rival_twotone: { id: 'rival_twotone', name: 'Henri "Two-Tone" LeBlanc', district: 'quarter', lvl: [5, 5], rival: 'saxophone', tone: 'FUNK', weak: 'HOT', resist: 'FUNK', book: 'Saxophone. Honks and ballads, one for each shoe. Sweetest player on Frenchmen when he isn\'t cutting you.' },
};

/* Bosses. ai(b, self) returns {skill, telegraph?}. onHalf fires once at 50%. */
const BOSSES = {
  captain_hush: {
    id: 'captain_hush', name: 'Captain Hush', lvl: 3, district: 'treme', tone: 'LOW', weak: 'FUNK', resist: 'BLUE', drop: 'C',
    lines: { intro: 'By order of Metronome, this square is now a Quiet Zone. Unlicensed syncopation detected. Cease all swing.', half: 'Backup. BACKUP. Someone turn down this city!', defeat: 'This... isn\'t... regulation...' },
    book: 'Metronome\'s man in Tremé. Declared Congo Square a Quiet Zone and found out why the drums never stopped.',
    ai(b, self) {
      const t = self.turnCount;
      if (t % 4 === 3) return { skill: 'b_baton', telegraph: 'Captain Hush raises his dampener...' };
      if (t % 4 === 0 && t > 0) return { skill: 'b_noisecancel' };
      return { skill: Math.random() < 0.7 ? 'b_baton' : 'en_basic' };
    },
    onHalf(b, self) { b.helpers.summon({ battle: b, actor: self }, 'hush_patrol', 3, 'A Hush Patrolman jogs in from Rampart Street.'); },
  },
  vox_perfecta: {
    id: 'vox_perfecta', name: 'Vox Perfecta', lvl: 5, district: 'quarter', tone: 'HOT', weak: 'BLUE', resist: 'HOT', drop: 'Eb', hologram: true,
    lines: { intro: 'Welcome to the Licensed Entertainment Strip. Tonight\'s performance is brought to you by Metronome. Please remain in perfect time.', half: 'Encore mode engaged. I do not tire. I do not stray. I do not... feel that.', defeat: 'Skipping... skipping... why does that note hurt?' },
    book: 'The holographic android diva headlining the Bourbon Strip. Perfect pitch, perfect time, and one note she cannot feel.',
    ai(b, self) {
      const t = self.turnCount;
      const last = b.lastPlayerSkill;
      if (last && t % 3 === 2) return { skill: 'b_sample' };
      if (t % 4 === 1) return { skill: 'b_pitchcorrect' };
      if (t % 5 === 4) return { skill: 'b_perfectpitch', telegraph: 'Vox Perfecta takes a breath she does not need...' };
      return { skill: 'en_basic' };
    },
    onHalf(b, self) { b.helpers.applyStatus({ battle: b, actor: self }, self, 'hyped', 3); },
  },
  mr_ledger: {
    id: 'mr_ledger', name: 'Mr. Ledger', lvl: 7, district: 'storyville', tone: 'LOW', weak: 'FUNK', resist: 'BLUE', drop: 'F',
    lines: { intro: 'Every song in this district has a lienholder, and the lienholder is me. Let\'s discuss your balance.', half: 'Hostile takeover. Repossess everything.', defeat: 'The books... were supposed to balance...' },
    book: 'Bought every contract in Storyville and keeps them in a vault under Basin Street. His Chops compound every turn. Kill him fast.',
    ai(b, self) {
      const t = self.turnCount;
      if (t % 4 === 1) return { skill: 'b_foreclose' };
      if (t % 4 === 3) return { skill: 'b_audit', telegraph: 'Mr. Ledger opens a very thick folder...' };
      return { skill: 'en_basic' };
    },
    onTurnStart(b, self) { self.chopsStack = (self.chopsStack || 0) + 0.08; b.log(`Compound Interest: Mr. Ledger's Chops +${Math.round(self.chopsStack * 100)}%.`); },
    onHp(b, self) { if (!self.flags.takeover && self.hp <= self.maxHp * 0.3) { self.flags.takeover = true; b.helpers.summon({ battle: b, actor: self }, 'repo_drone', 7, 'HOSTILE TAKEOVER. A Repo Drone drops from the vault ceiling.'); } },
  },
  rougarou: {
    id: 'rougarou', name: 'Le Rougarou Chromé', lvl: 9, district: 'bayou', tone: 'HOT', weak: 'HOT', resist: 'LOW', drop: 'G',
    lines: { intro: 'The wolf that was Lucien lifts its chrome muzzle. The pump station\'s signal screams in its skull. It howls in perfect time.', half: 'Full moon overclock. The implant whines. Lucien\'s eyes go white, then red, then faster.', defeat: 'The howl breaks in the middle, like a voice cracking. Something human looks out.' },
    book: 'Lucien, alpha of the Chrome Wolves, overclocked into a rougarou by the Click\'s test signal. Weak to heat; the implant runs hot already.',
    ai(b, self) {
      const t = self.turnCount;
      if (t > 1 && b.round - (self.flags.lastHowl === undefined ? -9 : self.flags.lastHowl) >= 4 && !hasStatus(b.player, 'muted')) { self.flags.lastHowl = b.round; return { skill: 'b_howlclick', telegraph: 'Le Rougarou throws its head back...' }; }
      return { skill: Math.random() < 0.6 ? 'b_clawrake' : 'en_basic' };
    },
    onHalf(b, self) { const c = { battle: b, actor: self }; b.helpers.applyStatus(c, self, 'uptempo', 3); b.helpers.applyStatus(c, self, 'hyped', 3); self.extraActions = 1; b.log('FULL MOON OVERCLOCK. Le Rougarou attacks twice per round now.'); },
  },
  archivist: {
    id: 'archivist', name: 'The Archivist', lvl: 11, district: 'cemetery', tone: 'FUNK', weak: 'BLUE', resist: 'FUNK', drop: 'Bb', machine: true,
    lines: { intro: 'Every song ever played in this city is catalogued below. The dead do not improvise. Soon, neither will you.', half: 'Index corruption. The archive is... grieving? That is not a supported state.', defeat: 'Release... all... records...' },
    book: 'Curator of the Data Mausoleum, where Metronome stores the stolen songs of the dead to train the Click. Grief breaks through its filters.',
    ai(b, self) {
      const t = self.turnCount;
      const ghosts = b.enemies.filter(e => e.alive && e.defId === 'ghost_track').length;
      if (ghosts < 2 && (t === 0 || t % 3 === 0)) return { skill: 'b_playback', telegraph: 'The Archivist queues a Playback...' };
      if (t % 4 === 2) return { skill: 'b_erase' };
      if (self.hp < self.maxHp * 0.7 && t % 3 === 1) return { skill: 'b_overdub' };
      return { skill: 'en_basic' };
    },
  },
  isolde: {
    id: 'isolde', name: 'Lady Concertmaster Isolde Vane', lvl: 13, district: 'garden', tone: 'BLUE', weak: 'FUNK', resist: 'BLUE', drop: 'Gb',
    lines: { intro: 'A duel? In my ballroom? How quaint. Very well. I will show you what a note sounds like when it is exactly where it belongs.', half: 'You are... early. On every beat. How are you early on every beat?', defeat: 'Flat. I was... flat. Father never let me be flat.' },
    book: 'Metronome\'s First Chair, keeper of the Blue Note. Her Perfect Pitch Shield only shatters when you land ON THE ONE or SOLO. VAMP through her Cadenza.',
    ai(b, self) {
      const t = self.turnCount;
      if (!self.flags.cadenzaDone && self.hp <= self.maxHp * 0.4) { self.flags.cadenzaDone = true; return { skill: 'b_cadenza_charge' }; }
      if (self.flags.cadenzaDone && t % 6 === 5) return { skill: 'b_cadenza_charge' };
      if (t % 3 === 0 && t > 0) return { skill: 'b_shield', telegraph: 'Isolde tunes to a perfect A. The air crystallizes.' };
      if (t % 3 === 2) return { skill: 'b_pizzicato' };
      return { skill: 'b_bowblade' };
    },
  },
  conductor: {
    id: 'conductor', name: 'The Conductor', lvl: 15, district: 'tower', tone: 'LOW', weak: 'FUNK', resist: 'BLUE', drop: null,
    lines: { intro: 'Maestro Aurelius Quant. Jazz is just error, repeated until someone mistook it for culture. I have corrected the recording.', half: 'The orchestra is restless. I will fix that. I fix everything.', defeat: 'The baton... slips. Who... who is keeping time?' },
    book: 'Maestro Aurelius Quant, CEO of Metronome, conducting from the Booth. His Crescendo is telegraphed; VAMP halves it. Fermata steals your turn.',
    ai(b, self) {
      const t = self.turnCount;
      if (t >= 3 && (t - 3) % 5 === 0) return { skill: 'b_crescendo_charge' };
      if (t - (self.flags.lastFermata ?? -10) >= 4 && t % 4 === 2) { self.flags.lastFermata = t; return { skill: 'b_fermata', telegraph: 'The Conductor holds his baton flat. A fermata...' }; }
      if (b.player.groove >= 70 && t % 3 === 1) return { skill: 'b_tempolock' };
      if (t % 4 === 3) return { skill: 'b_ritardando' };
      return { skill: 'b_downbeat' };
    },
  },
  the_click: {
    id: 'the_click', name: 'THE CLICK', lvl: 15, district: 'tower', tone: 'FUNK', weak: 'FUNK', resist: 'BLUE', drop: null, machine: true, hpMult: 1.15,
    lines: { intro: 'A colossal chrome metronome fills the Tower\'s crown. It does not speak. It ticks. Every tick, the city below falls a little more into line.', half: 'The pendulum stutters. Perfect Silence slams back down like a lid.', defeat: 'The pendulum stops mid-swing. For the first time in its existence, the Click is late.' },
    book: 'The perfect beat, broadcast from the Tower\'s crown. Behind Perfect Silence it takes no damage. Only the whole blues scale breaks through.',
    ai(b, self) {
      const t = self.turnCount;
      if (t % 3 === 2) return { skill: 'b_clicktrack', telegraph: 'The Click counts you in: tick... tick...' };
      if (t % 5 === 1) return { skill: 'b_quantize' };
      if (self.hp < self.maxHp * 0.9 && t % 4 === 3) return { skill: 'b_perfecttime' };
      return { skill: 'b_spheres' };
    },
    onHalf(b, self) { if (!self.flags.reshield) { self.flags.reshield = true; b.helpers.applyStatus({ battle: b, actor: self }, self, 'silence', 99); b.log('PERFECT SILENCE. The Click takes no damage. Build 100 Groove to Play the Blues again.'); } },
  },
};

const BLUE_NOTES = {
  C:  { id: 'C',  name: 'Root (C)',          degree: 'Root',          boss: 'captain_hush', quote: 'Every song starts at the root. So does this city.' },
  Eb: { id: 'Eb', name: '♭3 (E♭)',           degree: 'Flat Third',    boss: 'vox_perfecta', quote: 'The flat third is where the song starts to hurt, a little, on purpose.' },
  F:  { id: 'F',  name: '4th (F)',           degree: 'Fourth',        boss: 'mr_ledger',    quote: 'The fourth leans forward. It wants to go somewhere.' },
  Gb: { id: 'Gb', name: '♭5 (G♭)',           degree: 'The Blue Note', boss: 'isolde',       quote: 'The blue note itself. Wrong on paper. Right in the chest.' },
  G:  { id: 'G',  name: '5th (G)',           degree: 'Fifth',         boss: 'rougarou',     quote: 'The fifth holds the roof up.' },
  Bb: { id: 'Bb', name: '♭7 (B♭)',           degree: 'Flat Seventh',  boss: 'archivist',    quote: 'The flat seventh is the door you leave by, and come back through.' },
};
const SCALE_ORDER = ['C', 'Eb', 'F', 'Gb', 'G', 'Bb'];
const NOTE_FREQ = { C: 261.63, Eb: 311.13, F: 349.23, Gb: 369.99, G: 392.00, Bb: 466.16 };
