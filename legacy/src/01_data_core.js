/* ============================================================
   CYBER FUNK — data: core tables (tones, statuses, classes, roots)
   ============================================================ */
'use strict';
const VERSION = '1.0.0';
const SAVE_KEY = 'cyberfunk_save_v1';
const LEVEL_CAP = 15;

const TONES = {
  HOT:   { name: 'HOT',   color: '#ff5a2b', desc: 'High, fast, and fiery.' },
  LOW:   { name: 'LOW',   color: '#9b5cff', desc: 'Bass that shakes armor loose.' },
  BLUE:  { name: 'BLUE',  color: '#3fb6ff', desc: 'The blue note, a sorrow that saps strength.' },
  FUNK:  { name: 'FUNK',  color: '#39ff88', desc: 'Syncopation that scrambles anything keeping strict time.' },
  SWEET: { name: 'SWEET', color: '#ff6ad5', desc: 'Healing tones; never deals damage.' },
};

const STATUSES = {
  scorched:      { name: 'Scorched',      kind: 'bad',  turns: 3, color: '#ff5a2b', desc: 'Lose 6% of max Heart per turn.' },
  shredded:      { name: 'Shredded',      kind: 'bad',  turns: 3, color: '#ff8f5a', mod: { grit: -0.4 }, desc: 'Grit −40%.' },
  blues:         { name: 'The Blues',     kind: 'bad',  turns: 3, color: '#3fb6ff', mod: { chops: -0.3 }, desc: 'Chops −30%.' },
  offbeat:       { name: 'Off-Beat',      kind: 'bad',  turns: 2, color: '#39ff88', desc: '50% chance to lose the turn (bosses: 25%).' },
  swooned:       { name: 'Swooned',       kind: 'bad',  turns: 1, color: '#ff6ad5', desc: 'Skip the next turn. Bosses are immune.' },
  muted:         { name: 'Muted',         kind: 'bad',  turns: 2, color: '#cfcfcf', desc: "Can't PLAY or SOLO." },
  rattled:       { name: 'Rattled',       kind: 'bad',  turns: 3, color: '#ffc43d', mod: { tempo: -0.4 }, desc: 'Tempo −40%.' },
  hyped:         { name: 'Hyped',         kind: 'good', turns: 3, color: '#ff5a2b', mod: { chops: 0.3 }, desc: 'Chops +30%.' },
  foundation:    { name: 'Foundation',    kind: 'good', turns: 3, color: '#9b5cff', mod: { grit: 0.4 }, desc: 'Grit +40%.' },
  uptempo:       { name: 'Up-Tempo',      kind: 'good', turns: 3, color: '#ffc43d', mod: { tempo: 0.4 }, desc: 'Tempo +40%.' },
  pocket:        { name: 'In the Pocket', kind: 'good', turns: 3, color: '#39ff88', desc: '+25% crit chance and a wider ONE zone.' },
  encore:        { name: 'Encore',        kind: 'good', turns: 3, color: '#ff6ad5', desc: 'Regain 8% of max Heart per turn.' },
  countermelody: { name: 'Countermelody', kind: 'good', turns: 99, untilTriggered: true, color: '#00e5ff', desc: 'The next attack on you deals 30% less, and you counter with HOT ×1.5.' },
  pitchshield:   { name: 'Pitch Shield',  kind: 'good', turns: 99, untilTriggered: true, color: '#ffffff', desc: 'The next 3 hits deal 25% unless one lands ON THE ONE or is a SOLO, which shatters it.' },
  silence:       { name: 'Perfect Silence', kind: 'good', turns: 99, untilTriggered: true, color: '#ffffff', desc: 'Takes no damage. Only Playing the Blues can shatter it.' },
  quantized:     { name: 'Quantized',     kind: 'bad',  turns: 2, color: '#cfcfcf', desc: 'The ONE zone is narrowed.' },
  charging:      { name: 'Charging',      kind: 'good', turns: 1, color: '#ffc43d', desc: 'Winding up for something big. VAMP to brace.' },
};

const ROOTS = {
  creole: { id: 'creole', name: 'Creole', home: '7th Ward', bonus: { mojo: 2 }, items: {}, gear: ['ch_pouch'], doubloons: 0,
    blurb: '+2 Mojo. Starts with a Gris-Gris Pouch. Family knows everyone: 5% off in Tremé and the Quarter.',
    flavor: 'Seventh Ward, where every cousin plays something and every porch has an opinion.' },
  cajun:  { id: 'cajun', name: 'Cajun', home: 'Bayou Lafourche', bonus: { grit: 2 }, items: { boudin: 2 }, doubloons: 0,
    blurb: '+2 Grit. Starts with 2 Boudin Links. Speaks Cajun French with bayou folk: 5% off in the Bayou, plus extra dialogue down the bayou.',
    flavor: 'Bayou Lafourche, where the music came up the water in a pirogue and never left.' },
  yat:    { id: 'yat', name: 'Yat', home: 'Irish Channel', bonus: { tempo: 2 }, items: {}, doubloons: 50,
    blurb: '+2 Tempo. Starts with an extra Ð50. Streetwise: better odds on bluffs and street-event choices.',
    flavor: 'Irish Channel, born and raised. You know which banquettes flood and which bars never close.' },
};

/* --- Skills ------------------------------------------------
   Effect kinds (one generic resolver):
   dmg    {tone, mult, hits, target:'one'|'all'|'rand', status:{id,chance,turns}, ignoreGrit, noDodge, ignoreResist, critBonus, drain, recoil}
   status {id, chance, target:'self'|'one'|'all'|'allies', turns}
   heal   {pct|flat, target:'self'}
   funk   {pct|flat}
   cleanse {target:'self'|'one', kind:'bad'|'good'}
   strip  {target:'one'|'all'|'self'}   (remove good statuses)
   guard  {pct, reflect}
   groove {amt}
   fn     {run:(ctx)=>void}   escape hatch for one-off mechanics
   mult may be a function (ctx)=>number.
------------------------------------------------------------ */
const SKILLS = {
  /* Trumpet */
  tr_riff:   { id: 'tr_riff', name: 'Brass Stab', fp: 0, riff: true, desc: 'HOT ×1.0.', fx: [{ k: 'dmg', tone: 'HOT', mult: 1.0 }] },
  tr_s1:     { id: 'tr_s1', name: 'Hot Lick', fp: 6, lvl: 1, desc: 'HOT ×1.5 on one enemy; 30% Scorched.', fx: [{ k: 'dmg', tone: 'HOT', mult: 1.5, status: { id: 'scorched', chance: 0.3 } }] },
  tr_s2:     { id: 'tr_s2', name: 'Shake', fp: 9, lvl: 3, desc: '3 hits of HOT ×0.6 on random enemies; each 15% Scorched.', fx: [{ k: 'dmg', tone: 'HOT', mult: 0.6, hits: 3, target: 'rand', status: { id: 'scorched', chance: 0.15 } }] },
  tr_s3:     { id: 'tr_s3', name: 'Plunger Wah', fp: 8, lvl: 5, desc: 'HOT ×0.8 and The Blues on one enemy.', fx: [{ k: 'dmg', tone: 'HOT', mult: 0.8, status: { id: 'blues', chance: 1 } }] },
  tr_s4:     { id: 'tr_s4', name: 'Scream Note', fp: 16, lvl: 7, desc: 'HOT ×2.6 on one enemy; you take 5% of max Heart as recoil.', fx: [{ k: 'dmg', tone: 'HOT', mult: 2.6, recoil: 0.05 }] },
  tr_s5:     { id: 'tr_s5', name: 'Across the River', fp: 20, lvl: 10, desc: 'HOT ×1.3 on all enemies; you gain Hyped.', fx: [{ k: 'dmg', tone: 'HOT', mult: 1.3, target: 'all' }, { k: 'status', id: 'hyped', target: 'self' }] },
  tr_s6:     { id: 'tr_s6', name: 'Triple-Tongue Inferno', fp: 24, lvl: 13, desc: '4 hits of HOT ×0.9 on one enemy; guaranteed Scorched.', fx: [{ k: 'dmg', tone: 'HOT', mult: 0.9, hits: 4, status: { id: 'scorched', chance: 1 } }] },
  tr_solo:   { id: 'tr_solo', name: 'Archangel Call', fp: 0, solo: true, desc: 'HOT ×3.5 on all enemies and Scorched on all; you gain Up-Tempo.', fx: [{ k: 'dmg', tone: 'HOT', mult: 3.5, target: 'all', status: { id: 'scorched', chance: 1 } }, { k: 'status', id: 'uptempo', target: 'self' }] },

  /* Trombone */
  tb_riff:   { id: 'tb_riff', name: 'Slide Swat', fp: 0, riff: true, desc: 'BLUE ×1.0.', fx: [{ k: 'dmg', tone: 'BLUE', mult: 1.0 }] },
  tb_s1:     { id: 'tb_s1', name: 'Smear', fp: 6, lvl: 1, desc: 'BLUE ×1.3; 40% The Blues.', fx: [{ k: 'dmg', tone: 'BLUE', mult: 1.3, status: { id: 'blues', chance: 0.4 } }] },
  tb_s2:     { id: 'tb_s2', name: 'Growl', fp: 8, lvl: 3, desc: 'BLUE ×1.2; heal for 50% of the damage dealt.', fx: [{ k: 'dmg', tone: 'BLUE', mult: 1.2, drain: 0.5 }] },
  tb_s3:     { id: 'tb_s3', name: 'Tailgate Reach', fp: 7, lvl: 5, desc: "BLUE ×1.6; can't be dodged and ignores half the target's Grit.", fx: [{ k: 'dmg', tone: 'BLUE', mult: 1.6, noDodge: true, ignoreGrit: 0.5 }] },
  tb_s4:     { id: 'tb_s4', name: 'Dirge', fp: 12, lvl: 7, desc: 'The Blues and Rattled on all enemies; your next damaging skill this battle deals +50%.', fx: [{ k: 'status', id: 'blues', target: 'all' }, { k: 'status', id: 'rattled', target: 'all' }, { k: 'fn', run: (c) => { c.actor.flags.dirgeNext = true; c.actor.flags.dirgeTurn = c.battle.round; } }] },
  tb_s5:     { id: 'tb_s5', name: 'Gutbucket', fp: 18, lvl: 10, desc: "BLUE ×(1.5 + 1.5 × the fraction of your Heart that's missing).", fx: [{ k: 'dmg', tone: 'BLUE', mult: (c) => 1.5 + 1.5 * (1 - c.actor.hp / c.actor.maxHp) }] },
  tb_s6:     { id: 'tb_s6', name: 'Cut the Body Loose', fp: 22, lvl: 13, desc: 'BLUE ×1.4 on all enemies, rising to ×2.2 plus Encore on you if you used Dirge last turn or any enemy has The Blues.', fx: [
    { k: 'dmg', tone: 'BLUE', target: 'all', mult: (c) => (c.battle.helpers.cutLooseReady(c) ? 2.2 : 1.4) },
    { k: 'status', id: 'encore', target: 'self', cond: (c) => c.battle.helpers.cutLooseReady(c) } ] },
  tb_solo:   { id: 'tb_solo', name: 'Tailgate Jubilee', fp: 0, solo: true, desc: 'Heal 50% of Heart, cleanse yourself, and BLUE ×3.0 on all enemies.', fx: [{ k: 'heal', pct: 0.5, target: 'self' }, { k: 'cleanse', target: 'self' }, { k: 'dmg', tone: 'BLUE', mult: 3.0, target: 'all' }] },

  /* Sousaphone */
  su_riff:   { id: 'su_riff', name: 'Bass Bump', fp: 0, riff: true, desc: 'LOW ×1.0.', fx: [{ k: 'dmg', tone: 'LOW', mult: 1.0 }] },
  su_s1:     { id: 'su_s1', name: 'Oom-Pah', fp: 5, lvl: 1, desc: '2 hits of LOW ×0.8; 30% Shredded.', fx: [{ k: 'dmg', tone: 'LOW', mult: 0.8, hits: 2, status: { id: 'shredded', chance: 0.3 } }] },
  su_s2:     { id: 'su_s2', name: 'Foundation', fp: 8, lvl: 3, desc: 'Gain Foundation and heal 15%.', fx: [{ k: 'status', id: 'foundation', target: 'self' }, { k: 'heal', pct: 0.15, target: 'self' }] },
  su_s3:     { id: 'su_s3', name: 'Shotgun House Shaker', fp: 12, lvl: 5, desc: 'LOW ×1.0 on all enemies; 40% Shredded.', fx: [{ k: 'dmg', tone: 'LOW', mult: 1.0, target: 'all', status: { id: 'shredded', chance: 0.4 } }] },
  su_s4:     { id: 'su_s4', name: 'Bell Wall', fp: 10, lvl: 7, desc: 'Take 60% less damage until your next turn and reflect half of what you blocked.', fx: [{ k: 'guard', pct: 0.4, reflect: 0.5 }] },
  su_s5:     { id: 'su_s5', name: 'Bass Drop', fp: 16, lvl: 10, desc: 'LOW ×2.4 on one enemy; strips its buffs.', fx: [{ k: 'strip', target: 'one' }, { k: 'dmg', tone: 'LOW', mult: 2.4 }] },
  su_s6:     { id: 'su_s6', name: 'Undertow', fp: 22, lvl: 13, desc: 'LOW ×1.6 on all enemies; Shredded and Rattled on all.', fx: [{ k: 'dmg', tone: 'LOW', mult: 1.6, target: 'all' }, { k: 'status', id: 'shredded', target: 'all' }, { k: 'status', id: 'rattled', target: 'all' }] },
  su_solo:   { id: 'su_solo', name: 'The Big Muddy', fp: 0, solo: true, desc: 'LOW ×3.2 on all enemies and Shredded on all; you gain Foundation.', fx: [{ k: 'dmg', tone: 'LOW', mult: 3.2, target: 'all', status: { id: 'shredded', chance: 1 } }, { k: 'status', id: 'foundation', target: 'self' }] },

  /* Saxophone */
  sx_riff:   { id: 'sx_riff', name: 'Reed Bite', fp: 0, riff: true, desc: 'FUNK ×1.0.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 1.0 }] },
  sx_s1:     { id: 'sx_s1', name: 'Honk', fp: 6, lvl: 1, desc: 'FUNK ×1.3; 35% Off-Beat.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 1.3, status: { id: 'offbeat', chance: 0.35 } }] },
  sx_s2:     { id: 'sx_s2', name: 'Smoky Ballad', fp: 9, lvl: 3, desc: 'BLUE ×0.6 and 70% Swooned (on bosses, The Blues instead).', fx: [{ k: 'dmg', tone: 'BLUE', mult: 0.6, status: { id: 'swooned', chance: 0.7, bossAlt: 'blues' } }] },
  sx_s3:     { id: 'sx_s3', name: 'Circular Breath', fp: 0, lvl: 5, once: true, desc: 'Once per battle: restore 40% of max Funk and gain In the Pocket.', fx: [{ k: 'funk', pct: 0.4 }, { k: 'status', id: 'pocket', target: 'self' }] },
  sx_s4:     { id: 'sx_s4', name: 'Bar Walk', fp: 12, lvl: 7, desc: 'Gain Up-Tempo and In the Pocket; FUNK ×1.0 on a random enemy.', fx: [{ k: 'status', id: 'uptempo', target: 'self' }, { k: 'status', id: 'pocket', target: 'self' }, { k: 'dmg', tone: 'FUNK', mult: 1.0, target: 'rand' }] },
  sx_s5:     { id: 'sx_s5', name: 'Altissimo', fp: 18, lvl: 10, desc: 'BLUE ×2.2 on one enemy, ignoring resistance.', fx: [{ k: 'dmg', tone: 'BLUE', mult: 2.2, ignoreResist: true }] },
  sx_s6:     { id: 'sx_s6', name: 'Sheets of Sound', fp: 24, lvl: 13, desc: '6 hits of FUNK ×0.5 on random enemies; each 15% Off-Beat.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 0.5, hits: 6, target: 'rand', status: { id: 'offbeat', chance: 0.15 } }] },
  sx_solo:   { id: 'sx_solo', name: 'Midnight Serenade', fp: 0, solo: true, desc: 'BLUE ×2.8 on all enemies; Swooned on non-bosses, The Blues on bosses.', fx: [{ k: 'dmg', tone: 'BLUE', mult: 2.8, target: 'all', status: { id: 'swooned', chance: 1, bossAlt: 'blues' } }] },

  /* Clarinet */
  cl_riff:   { id: 'cl_riff', name: 'Noodle', fp: 0, riff: true, desc: 'HOT ×1.0 with +10% crit chance.', fx: [{ k: 'dmg', tone: 'HOT', mult: 1.0, critBonus: 0.10 }] },
  cl_s1:     { id: 'cl_s1', name: 'Sweet Trill', fp: 6, lvl: 1, tone: 'SWEET', desc: 'Heal 30% of max Heart.', fx: [{ k: 'heal', pct: 0.3, target: 'self' }] },
  cl_s2:     { id: 'cl_s2', name: 'Noodle Run', fp: 7, lvl: 3, desc: '3 hits of HOT ×0.5 on one enemy; +15% crit chance.', fx: [{ k: 'dmg', tone: 'HOT', mult: 0.5, hits: 3, critBonus: 0.15 }] },
  cl_s3:     { id: 'cl_s3', name: 'Chalumeau', fp: 8, lvl: 5, tone: 'SWEET', desc: 'Cleanse your negative statuses; Foundation for 2 turns.', fx: [{ k: 'cleanse', target: 'self' }, { k: 'status', id: 'foundation', target: 'self', turns: 2 }] },
  cl_s4:     { id: 'cl_s4', name: 'Countermelody', fp: 10, lvl: 7, desc: 'The next attack on you deals 30% less, and you counter with HOT ×1.5.', fx: [{ k: 'status', id: 'countermelody', target: 'self' }] },
  cl_s5:     { id: 'cl_s5', name: 'Woodshed', fp: 14, lvl: 10, desc: 'Gain Hyped, In the Pocket, and Up-Tempo.', fx: [{ k: 'status', id: 'hyped', target: 'self' }, { k: 'status', id: 'pocket', target: 'self' }, { k: 'status', id: 'uptempo', target: 'self' }] },
  cl_s6:     { id: 'cl_s6', name: 'Clarion Cascade', fp: 22, lvl: 13, desc: 'HOT ×1.4 on all enemies; heal 25%.', fx: [{ k: 'dmg', tone: 'HOT', mult: 1.4, target: 'all' }, { k: 'heal', pct: 0.25, target: 'self' }] },
  cl_solo:   { id: 'cl_solo', name: 'High Society', fp: 0, solo: true, desc: 'Full heal and cleanse, HOT ×2.6 on all enemies, and Encore on you.', fx: [{ k: 'heal', pct: 1, target: 'self' }, { k: 'cleanse', target: 'self' }, { k: 'dmg', tone: 'HOT', mult: 2.6, target: 'all' }, { k: 'status', id: 'encore', target: 'self' }] },

  /* Snare Drum */
  sn_riff:   { id: 'sn_riff', name: 'Stick Work', fp: 0, riff: true, desc: 'FUNK ×1.0.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 1.0 }] },
  sn_s1:     { id: 'sn_s1', name: 'Paradiddle', fp: 6, lvl: 1, desc: '4 hits of FUNK ×0.45 on one enemy.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 0.45, hits: 4 }] },
  sn_s2:     { id: 'sn_s2', name: 'Rimshot', fp: 8, lvl: 3, desc: 'FUNK ×1.5 with +30% crit chance; 40% Off-Beat.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 1.5, critBonus: 0.3, status: { id: 'offbeat', chance: 0.4 } }] },
  sn_s3:     { id: 'sn_s3', name: 'Press Roll', fp: 10, lvl: 5, desc: '6 hits of FUNK ×0.3 on random enemies; each 30% Rattled.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 0.3, hits: 6, target: 'rand', status: { id: 'rattled', chance: 0.3 } }] },
  sn_s4:     { id: 'sn_s4', name: 'Cadence', fp: 12, lvl: 7, desc: 'Gain Up-Tempo and Hyped.', fx: [{ k: 'status', id: 'uptempo', target: 'self' }, { k: 'status', id: 'hyped', target: 'self' }] },
  sn_s5:     { id: 'sn_s5', name: 'Flam Tap', fp: 16, lvl: 10, desc: '2 hits of FUNK ×0.9; the second ignores Grit.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 0.9 }, { k: 'dmg', tone: 'FUNK', mult: 0.9, ignoreGrit: 1, sameTarget: true }] },
  sn_s6:     { id: 'sn_s6', name: 'Street Beat', fp: 22, lvl: 13, desc: 'FUNK ×1.2 on all enemies; 50% Off-Beat on all.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 1.2, target: 'all', status: { id: 'offbeat', chance: 0.5 } }] },
  sn_solo:   { id: 'sn_solo', name: 'Second Line Breakdown', fp: 0, solo: true, desc: '8–12 hits of FUNK ×0.5 on random enemies; each 20% Off-Beat.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 0.5, hits: [8, 12], target: 'rand', status: { id: 'offbeat', chance: 0.2 } }] },

  /* Bass Drum */
  bd_riff:   { id: 'bd_riff', name: 'Boom', fp: 0, riff: true, desc: 'LOW ×1.1.', fx: [{ k: 'dmg', tone: 'LOW', mult: 1.1 }] },
  bd_s1:     { id: 'bd_s1', name: 'Cymbal Crash', fp: 6, lvl: 1, desc: 'FUNK ×0.9 on all enemies; 25% Off-Beat.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 0.9, target: 'all', status: { id: 'offbeat', chance: 0.25 } }] },
  bd_s2:     { id: 'bd_s2', name: 'Heartbeat', fp: 8, lvl: 3, tone: 'SWEET', desc: 'Heal 10% and gain Encore.', fx: [{ k: 'heal', pct: 0.1, target: 'self' }, { k: 'status', id: 'encore', target: 'self' }] },
  bd_s3:     { id: 'bd_s3', name: 'Parade Stomp', fp: 10, lvl: 5, desc: 'LOW ×1.4; 50% Shredded.', fx: [{ k: 'dmg', tone: 'LOW', mult: 1.4, status: { id: 'shredded', chance: 0.5 } }] },
  bd_s4:     { id: 'bd_s4', name: 'Count Off', fp: 6, lvl: 7, desc: 'Set the Big Four counter to 4 and gain Hyped.', fx: [{ k: 'fn', run: (c) => { c.actor.flags.setBeat = 4; } }, { k: 'status', id: 'hyped', target: 'self' }] },
  bd_s5:     { id: 'bd_s5', name: 'Raise the Rafters', fp: 18, lvl: 10, desc: 'LOW ×1.3 on all enemies; 40% Rattled.', fx: [{ k: 'dmg', tone: 'LOW', mult: 1.3, target: 'all', status: { id: 'rattled', chance: 0.4 } }] },
  bd_s6:     { id: 'bd_s6', name: 'Twin Thunder', fp: 24, lvl: 13, desc: 'One enemy takes LOW ×1.6, then FUNK ×1.6.', fx: [{ k: 'dmg', tone: 'LOW', mult: 1.6 }, { k: 'dmg', tone: 'FUNK', mult: 1.6, sameTarget: true }] },
  bd_solo:   { id: 'bd_solo', name: 'Thunder on Rampart', fp: 0, solo: true, desc: 'LOW ×3.4 on all enemies, always counted as beat 4; Rattled on all.', fx: [{ k: 'dmg', tone: 'LOW', mult: 3.4, target: 'all', forceBeat4: true, status: { id: 'rattled', chance: 1 } }] },

  /* Enemy specials and boss moves live here too, so one resolver handles everything. */
  en_basic:         { id: 'en_basic', name: 'Attack', fp: 0, desc: 'A basic attack.', fx: [{ k: 'dmg', mult: 1.0 }] },
  en_cease:         { id: 'en_cease', name: 'Cease & Desist', fp: 0, desc: '25% chance of Muted for 1 turn.', fx: [{ k: 'dmg', mult: 0.8, status: { id: 'muted', chance: 0.25, turns: 1 } }] },
  en_tick:          { id: 'en_tick', name: 'Tick', fp: 0, desc: 'Rattled.', fx: [{ k: 'dmg', mult: 0.7, status: { id: 'rattled', chance: 1 } }] },
  en_gnaw:          { id: 'en_gnaw', name: 'Gnaw', fp: 0, desc: 'Two weak bites.', fx: [{ k: 'dmg', mult: 0.55, hits: 2 }] },
  en_pickpocket:    { id: 'en_pickpocket', name: 'Pickpocket', fp: 0, desc: 'Steals Ð5–20, returned if you win.', fx: [{ k: 'dmg', mult: 0.6 }, { k: 'fn', run: (c) => c.battle.helpers.steal(c, 5, 20) }] },
  en_spill:         { id: 'en_spill', name: 'Spill', fp: 0, desc: 'Rattled.', fx: [{ k: 'dmg', mult: 0.8, status: { id: 'rattled', chance: 1 } }] },
  en_wall:          { id: 'en_wall', name: 'Invisible Wall', fp: 0, desc: 'Gains Foundation.', fx: [{ k: 'status', id: 'foundation', target: 'self' }] },
  en_royalty:       { id: 'en_royalty', name: 'Royalty Claim', fp: 0, desc: 'Steals 10 Funk.', fx: [{ k: 'dmg', mult: 0.7 }, { k: 'fn', run: (c) => c.battle.helpers.stealFunk(c, 10) }] },
  en_twofer:        { id: 'en_twofer', name: 'Two-for-One!', fp: 0, desc: 'Gives an ally Hyped.', fx: [{ k: 'status', id: 'hyped', target: 'ally' }] },
  en_spin:          { id: 'en_spin', name: 'Hurricane Spin', fp: 0, desc: 'Spins and hits twice.', fx: [{ k: 'dmg', mult: 0.8, hits: 2 }] },
  en_garnish:       { id: 'en_garnish', name: 'Garnish', fp: 0, desc: 'Steals Doubloons.', fx: [{ k: 'dmg', mult: 0.7 }, { k: 'fn', run: (c) => c.battle.helpers.steal(c, 10, 40) }] },
  en_eightysix:     { id: 'en_eightysix', name: 'Eighty-Six', fp: 0, desc: 'A heavy hit.', fx: [{ k: 'dmg', mult: 1.7 }] },
  en_haze:          { id: 'en_haze', name: 'Green Haze', fp: 0, desc: 'Off-Beat.', fx: [{ k: 'dmg', mult: 0.6, status: { id: 'offbeat', chance: 1 } }] },
  en_repossess:     { id: 'en_repossess', name: 'Repossess', fp: 0, desc: 'Removes one of your buffs.', fx: [{ k: 'dmg', mult: 0.7 }, { k: 'strip', target: 'one', count: 1 }] },
  en_deathroll:     { id: 'en_deathroll', name: 'Death Roll', fp: 0, desc: 'A heavy hit plus Rattled.', fx: [{ k: 'dmg', mult: 1.5, status: { id: 'rattled', chance: 1 } }] },
  en_wispfire:      { id: 'en_wispfire', name: 'Wisp Fire', fp: 0, desc: 'Scorched.', fx: [{ k: 'dmg', mult: 0.8, status: { id: 'scorched', chance: 1 } }] },
  en_headbutt:      { id: 'en_headbutt', name: 'Headbutt', fp: 0, desc: 'Off-Beat.', fx: [{ k: 'dmg', mult: 1.0, status: { id: 'offbeat', chance: 1 } }] },
  en_drain:         { id: 'en_drain', name: 'Drain', fp: 0, desc: 'Damages you and heals itself.', fx: [{ k: 'dmg', mult: 0.9, drain: 1.0 }] },
  en_howl:          { id: 'en_howl', name: 'Howl', fp: 0, desc: 'Hyped.', fx: [{ k: 'status', id: 'hyped', target: 'self' }] },
  en_gravechill:    { id: 'en_gravechill', name: 'Grave Chill', fp: 0, desc: 'Rattled.', fx: [{ k: 'dmg', mult: 0.8, status: { id: 'rattled', chance: 1 } }] },
  en_corrupt:       { id: 'en_corrupt', name: 'Corrupt', fp: 0, desc: 'Muted.', fx: [{ k: 'dmg', mult: 0.6, status: { id: 'muted', chance: 1 } }] },
  en_burrow:        { id: 'en_burrow', name: 'Burrow', fp: 0, desc: 'Foundation and extra dodge.', fx: [{ k: 'status', id: 'foundation', target: 'self' }, { k: 'fn', run: (c) => { c.actor.dodgeBonus = 0.15; } }] },
  en_record:        { id: 'en_record', name: 'Record', fp: 0, desc: 'Copies one of your buffs onto itself.', fx: [{ k: 'dmg', mult: 0.6 }, { k: 'fn', run: (c) => c.battle.helpers.copyBuff(c) }] },
  en_requiem:       { id: 'en_requiem', name: 'Perfect Requiem', fp: 0, desc: 'The Blues on you.', fx: [{ k: 'dmg', mult: 0.7, status: { id: 'blues', chance: 1 } }] },
  en_snub:          { id: 'en_snub', name: 'The Snub', fp: 0, desc: 'The Blues.', fx: [{ k: 'dmg', mult: 0.7, status: { id: 'blues', chance: 1 } }] },
  en_service:       { id: 'en_service', name: 'At Your Service', fp: 0, desc: 'Heals an ally.', fx: [{ k: 'heal', pct: 0.25, target: 'ally' }] },
  en_hedge:         { id: 'en_hedge', name: 'Hedge Maze', fp: 0, desc: 'Foundation on all allies.', fx: [{ k: 'status', id: 'foundation', target: 'allies' }] },
  en_harmonize:     { id: 'en_harmonize', name: 'Harmonize', fp: 0, desc: 'Hyped on all.', fx: [{ k: 'status', id: 'hyped', target: 'allies' }] },
  en_backstab:      { id: 'en_backstab', name: 'Backstab', fp: 0, desc: 'A high crit chance.', fx: [{ k: 'dmg', mult: 1.1, critBonus: 0.5 }] },
  en_snap:          { id: 'en_snap', name: 'Snap to Grid', fp: 0, desc: 'Strips your buffs and −30 Groove.', fx: [{ k: 'dmg', mult: 0.7 }, { k: 'strip', target: 'one' }, { k: 'groove', amt: -30, target: 'one' }] },
  en_ticktick:      { id: 'en_ticktick', name: 'Tick... Tick...', fp: 0, desc: 'Charges for a turn, then Muted.', fx: [{ k: 'fn', run: (c) => c.battle.helpers.charge(c, 'en_ticktick_release', 'The Click Sentinel winds its mainspring...') }] },
  en_ticktick_release: { id: 'en_ticktick_release', name: 'TOCK.', fp: 0, desc: 'Muted.', fx: [{ k: 'dmg', mult: 1.2, status: { id: 'muted', chance: 1 } }] },
  en_sergeant:      { id: 'en_sergeant', name: 'Riot Baton', fp: 0, desc: 'A heavy swing that can Rattle.', fx: [{ k: 'dmg', mult: 1.4, status: { id: 'rattled', chance: 0.5 } }] },
  en_bagman:        { id: 'en_bagman', name: 'Shakedown', fp: 0, desc: 'Steals Doubloons and hits hard.', fx: [{ k: 'dmg', mult: 1.5 }, { k: 'fn', run: (c) => c.battle.helpers.steal(c, 30, 80) }] },
  en_biggrunch:     { id: 'en_biggrunch', name: 'Grunch Rush', fp: 0, desc: 'Two heavy headbutts.', fx: [{ k: 'dmg', mult: 1.0, hits: 2, status: { id: 'offbeat', chance: 0.3 } }] },
  en_keeper:        { id: 'en_keeper', name: 'Seal the Tomb', fp: 0, desc: 'Muted and Foundation on itself.', fx: [{ k: 'dmg', mult: 1.0, status: { id: 'muted', chance: 0.6 } }, { k: 'status', id: 'foundation', target: 'self' }] },
  en_beaumont:      { id: 'en_beaumont', name: 'Lockdown Protocol', fp: 0, desc: 'Three precise shots.', fx: [{ k: 'dmg', mult: 0.7, hits: 3, critBonus: 0.2 }] },
  en_warden:        { id: 'en_warden', name: 'Tempo Enforcement', fp: 0, desc: 'Strips buffs, Rattled, and a heavy hit.', fx: [{ k: 'strip', target: 'one' }, { k: 'dmg', mult: 1.6, status: { id: 'rattled', chance: 1 } }] },
  en_ghosttrack:    { id: 'en_ghosttrack', name: 'Echo', fp: 0, desc: 'A mournful replay.', fx: [{ k: 'dmg', mult: 0.9, status: { id: 'blues', chance: 0.3 } }] },

  /* Boss moves */
  b_baton:          { id: 'b_baton', name: 'Baton Strike', fp: 0, desc: 'A hard swing.', fx: [{ k: 'dmg', mult: 1.3 }] },
  b_noisecancel:    { id: 'b_noisecancel', name: 'Noise Cancel', fp: 0, desc: 'Muted for 2 turns.', fx: [{ k: 'dmg', mult: 0.6, status: { id: 'muted', chance: 1, turns: 2 } }] },
  b_perfectpitch:   { id: 'b_perfectpitch', name: 'Perfect Pitch', fp: 0, desc: 'Muted for 1 turn.', fx: [{ k: 'dmg', mult: 0.9, status: { id: 'muted', chance: 1, turns: 1 } }] },
  b_sample:         { id: 'b_sample', name: 'Sample', fp: 0, desc: 'Replays the last skill you used, back at you, at 70%.', fx: [{ k: 'fn', run: (c) => c.battle.helpers.sample(c) }] },
  b_pitchcorrect:   { id: 'b_pitchcorrect', name: 'Pitch Correction', fp: 0, desc: 'Gains Foundation.', fx: [{ k: 'status', id: 'foundation', target: 'self' }] },
  b_foreclose:      { id: 'b_foreclose', name: 'Foreclose', fp: 0, desc: 'Shredded.', fx: [{ k: 'dmg', mult: 1.1, status: { id: 'shredded', chance: 1 } }] },
  b_audit:          { id: 'b_audit', name: 'Audit', fp: 0, desc: 'Strips your buffs.', fx: [{ k: 'dmg', mult: 0.7 }, { k: 'strip', target: 'one' }] },
  b_clawrake:       { id: 'b_clawrake', name: 'Claw Rake', fp: 0, desc: '2 hits.', fx: [{ k: 'dmg', mult: 0.85, hits: 2 }] },
  b_howlclick:      { id: 'b_howlclick', name: 'Howl of the Click', fp: 0, desc: 'Muted for 1 turn.', fx: [{ k: 'dmg', mult: 0.7, status: { id: 'muted', chance: 1, turns: 1 } }] },
  b_playback:       { id: 'b_playback', name: 'Playback', fp: 0, desc: 'Summons a Ghost Track.', fx: [{ k: 'fn', run: (c) => c.battle.helpers.summon(c, 'ghost_track', 2, 'A Ghost Track flickers into the room, an echo of a dead musician.') }] },
  b_erase:          { id: 'b_erase', name: 'Erase', fp: 0, desc: 'Strips your buffs.', fx: [{ k: 'dmg', mult: 0.8 }, { k: 'strip', target: 'one' }] },
  b_overdub:        { id: 'b_overdub', name: 'Overdub', fp: 0, desc: 'Heals 15%.', fx: [{ k: 'heal', pct: 0.15, target: 'self' }] },
  b_bowblade:       { id: 'b_bowblade', name: 'Bow Blade', fp: 0, desc: '2 hits.', fx: [{ k: 'dmg', mult: 0.9, hits: 2 }] },
  b_pizzicato:      { id: 'b_pizzicato', name: 'Pizzicato Barrage', fp: 0, desc: '5 small hits.', fx: [{ k: 'dmg', mult: 0.4, hits: 5 }] },
  b_shield:         { id: 'b_shield', name: 'Perfect Pitch Shield', fp: 0, desc: 'The next 3 hits deal 25% unless one lands ON THE ONE or is a SOLO.', fx: [{ k: 'fn', run: (c) => c.battle.helpers.pitchShield(c) }] },
  b_cadenza_charge: { id: 'b_cadenza_charge', name: 'Cadenza', fp: 0, desc: 'Telegraphs for a turn, then a huge hit.', fx: [{ k: 'fn', run: (c) => c.battle.helpers.charge(c, 'b_cadenza', 'Isolde raises her bow. The air goes still. "Cadenza." (VAMP to survive it.)') }] },
  b_cadenza:        { id: 'b_cadenza', name: 'Cadenza', fp: 0, desc: 'A huge hit.', fx: [{ k: 'dmg', mult: 3.0 }] },
  b_downbeat:       { id: 'b_downbeat', name: 'Downbeat', fp: 0, desc: 'A heavy hit.', fx: [{ k: 'dmg', mult: 1.6 }] },
  b_fermata:        { id: 'b_fermata', name: 'Fermata', fp: 0, desc: 'You lose your next turn.', fx: [{ k: 'dmg', mult: 0.5 }, { k: 'fn', run: (c) => c.battle.helpers.fermata(c) }] },
  b_ritardando:     { id: 'b_ritardando', name: 'Ritardando', fp: 0, desc: 'Rattled.', fx: [{ k: 'dmg', mult: 0.9, status: { id: 'rattled', chance: 1 } }] },
  b_tempolock:      { id: 'b_tempolock', name: 'Tempo Lock', fp: 0, desc: 'Your Groove drops to 0.', fx: [{ k: 'dmg', mult: 0.6 }, { k: 'groove', amt: -100, target: 'one' }] },
  b_crescendo_charge: { id: 'b_crescendo_charge', name: 'Crescendo', fp: 0, desc: 'A telegraphed countdown into a massive hit that VAMP halves.', fx: [{ k: 'fn', run: (c) => c.battle.helpers.charge(c, 'b_crescendo', 'The orchestra swells... 3... 2... 1...') }] },
  b_crescendo:      { id: 'b_crescendo', name: 'Crescendo', fp: 0, desc: 'A massive hit.', fx: [{ k: 'dmg', mult: 2.8 }] },
  b_quantize:       { id: 'b_quantize', name: 'Quantize', fp: 0, desc: 'Strips buffs and narrows the ONE zone for 2 turns.', fx: [{ k: 'dmg', mult: 0.8 }, { k: 'strip', target: 'one' }, { k: 'status', id: 'quantized', target: 'one', turns: 2 }] },
  b_clicktrack:     { id: 'b_clicktrack', name: 'Click Track', fp: 0, desc: 'Muted.', fx: [{ k: 'dmg', mult: 0.7, status: { id: 'muted', chance: 1 } }] },
  b_perfecttime:    { id: 'b_perfecttime', name: 'Perfect Time', fp: 0, desc: 'Heals 8%.', fx: [{ k: 'heal', pct: 0.08, target: 'self' }] },
  b_spheres:        { id: 'b_spheres', name: 'Silence of the Spheres', fp: 0, desc: 'A heavy hit.', fx: [{ k: 'dmg', mult: 1.8 }] },

  /* Bandmate assists */
  as_sugar:  { id: 'as_sugar', name: 'Call & Response', fp: 0, desc: 'You regain 15% Heart and 10 Funk.', fx: [{ k: 'heal', pct: 0.15, target: 'player' }, { k: 'funk', flat: 10, target: 'player' }] },
  as_static: { id: 'as_static', name: 'Scratch', fp: 0, desc: "Strips one enemy's buffs and deals FUNK damage, doubled against machines.", fx: [{ k: 'strip', target: 'one' }, { k: 'dmg', tone: 'FUNK', mult: 1.0, machineBonus: 2 }] },
  as_remy:   { id: 'as_remy', name: 'Rub-a-Dub', fp: 0, desc: 'FUNK damage to all enemies; 25% Off-Beat.', fx: [{ k: 'dmg', tone: 'FUNK', mult: 0.7, target: 'all', status: { id: 'offbeat', chance: 0.25 } }] },
  as_moses:  { id: 'as_moses', name: 'Strum Hymn', fp: 0, desc: 'You gain Hyped for 2 turns.', fx: [{ k: 'status', id: 'hyped', target: 'player', turns: 2 }] },
};

const CLASSES = {
  trumpet:    { id: 'trumpet', name: 'Trumpet', title: 'Lead Horn', role: 'Burst damage, glass cannon', tones: ['HOT'], color: '#ff5a2b',
    base: [55, 25, 14, 6, 12, 8], growth: [10, 4, 3, 1, 2, 1], riff: 'tr_riff', skills: ['tr_s1', 'tr_s2', 'tr_s3', 'tr_s4', 'tr_s5', 'tr_s6'], solo: 'tr_solo',
    legendary: 'The Archangel', blurb: 'High notes that peel paint off the balconies. Hits hardest, bruises easiest.' },
  trombone:   { id: 'trombone', name: 'Trombone', title: 'Tailgate', role: 'Drain bruiser, debuffs', tones: ['BLUE'], color: '#3fb6ff',
    base: [65, 20, 12, 8, 9, 8], growth: [12, 3, 2.5, 1.5, 1, 1], riff: 'tb_riff', skills: ['tb_s1', 'tb_s2', 'tb_s3', 'tb_s4', 'tb_s5', 'tb_s6'], solo: 'tb_solo',
    legendary: 'Tailgate Royale', blurb: 'Smears, growls, and dirges. Wears enemies down and drinks the sorrow back as Heart.' },
  sousaphone: { id: 'sousaphone', name: 'Sousaphone', title: 'Low End', role: 'Tank, armor shred', tones: ['LOW'], color: '#9b5cff',
    base: [80, 18, 10, 12, 6, 6], growth: [15, 3, 2, 2.5, 1, 1], riff: 'su_riff', skills: ['su_s1', 'su_s2', 'su_s3', 'su_s4', 'su_s5', 'su_s6'], solo: 'su_solo',
    legendary: 'Leviathan Bell', blurb: 'The bottom of the band. Slow, enormous, and impossible to move.' },
  saxophone:  { id: 'saxophone', name: 'Saxophone', title: 'Honker', role: 'Control and charm', tones: ['FUNK', 'BLUE'], color: '#39ff88',
    base: [58, 28, 12, 7, 10, 10], growth: [10, 5, 2.5, 1, 1.5, 1.5], riff: 'sx_riff', skills: ['sx_s1', 'sx_s2', 'sx_s3', 'sx_s4', 'sx_s5', 'sx_s6'], solo: 'sx_solo',
    legendary: 'Midnight Honker', blurb: 'Honks that knock the grid off-beat and ballads that make the Hush forget to fight.' },
  clarinet:   { id: 'clarinet', name: 'Clarinet', title: 'Licorice Stick', role: 'Healer, buffer, agile', tones: ['HOT', 'SWEET'], color: '#ff6ad5',
    base: [52, 30, 11, 6, 13, 9], growth: [9, 5, 2, 1, 2, 1.5], riff: 'cl_riff', skills: ['cl_s1', 'cl_s2', 'cl_s3', 'cl_s4', 'cl_s5', 'cl_s6'], solo: 'cl_solo',
    legendary: 'The Licorice Saint', blurb: 'Quick, sweet, and hard to pin down. Heals, buffs, and counters with a high trill.' },
  snare:      { id: 'snare', name: 'Snare Drum', title: 'Snare Line', role: 'Speed, multi-hit, stun', tones: ['FUNK'], color: '#ffc43d',
    base: [56, 22, 12, 7, 15, 9], growth: [10, 3.5, 2.5, 1, 2.5, 1], riff: 'sn_riff', skills: ['sn_s1', 'sn_s2', 'sn_s3', 'sn_s4', 'sn_s5', 'sn_s6'], solo: 'sn_solo',
    legendary: 'Thunderhead Snare', blurb: 'Fastest hands in the parade. Rolls, rimshots, and a street beat that stops the grid cold.' },
  bassdrum:   { id: 'bassdrum', name: 'Bass Drum', title: 'The Heartbeat', role: 'Heavy hitter, Big Four counter', tones: ['LOW', 'FUNK'], color: '#b14aff',
    base: [70, 20, 14, 9, 7, 7], growth: [13, 3, 3, 2, 1, 1], riff: 'bd_riff', skills: ['bd_s1', 'bd_s2', 'bd_s3', 'bd_s4', 'bd_s5', 'bd_s6'], solo: 'bd_solo',
    legendary: 'The Big Four', bigFour: true, blurb: 'Every action counts 1-2-3-4. Land the hit on four and the whole street feels it.' },
};
const STAT_KEYS = ['heart', 'funk', 'chops', 'grit', 'tempo', 'mojo'];
const STAT_NAMES = { heart: 'Heart', funk: 'Funk', chops: 'Chops', grit: 'Grit', tempo: 'Tempo', mojo: 'Mojo' };
const SKILL_LEVELS = [1, 3, 5, 7, 10, 13];

const TIMING = {
  one:    { id: 'one',    label: 'ON THE ONE!',   mult: 1.5, groove: 10, color: '#ffc43d' },
  pocket: { id: 'pocket', label: 'IN THE POCKET', mult: 1.2, groove: 0,  color: '#39ff88' },
  loose:  { id: 'loose',  label: 'LOOSE',         mult: 1.0, groove: 0,  color: '#00e5ff' },
  clams:  { id: 'clams',  label: 'CLAMS',         mult: 0.6, groove: 0,  color: '#ff2bd6' },
};
