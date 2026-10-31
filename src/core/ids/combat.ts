/**
 * Ids for combat content: tones, statuses, timing grades, skills.
 * Each list is the canonical order; the union type is derived from it. Adding an id here
 * without a table row (or the reverse) is a compile error.
 */

/** The five musical damage types. */
export const TONE_IDS = ['HOT', 'LOW', 'BLUE', 'FUNK', 'SWEET'] as const;
/** A musical damage type. */
export type ToneId = (typeof TONE_IDS)[number];

/** Every status effect, in table order. */
export const STATUS_IDS = [
  'scorched',
  'shredded',
  'blues',
  'offbeat',
  'swooned',
  'muted',
  'rattled',
  'hyped',
  'foundation',
  'uptempo',
  'pocket',
  'encore',
  'countermelody',
  'pitchshield',
  'silence',
  'quantized',
  'charging',
] as const;
/** A status effect. */
export type StatusId = (typeof STATUS_IDS)[number];

/** On the One timing grades, best to worst. */
export const TIMING_IDS = ['one', 'pocket', 'loose', 'clams'] as const;
/** An On the One timing grade. */
export type TimingId = (typeof TIMING_IDS)[number];

/** Player class skills: riff, six unlockable skills and a solo per class. */
export const CLASS_SKILL_IDS = [
  'tr_riff',
  'tr_s1',
  'tr_s2',
  'tr_s3',
  'tr_s4',
  'tr_s5',
  'tr_s6',
  'tr_solo',
  'tb_riff',
  'tb_s1',
  'tb_s2',
  'tb_s3',
  'tb_s4',
  'tb_s5',
  'tb_s6',
  'tb_solo',
  'su_riff',
  'su_s1',
  'su_s2',
  'su_s3',
  'su_s4',
  'su_s5',
  'su_s6',
  'su_solo',
  'sx_riff',
  'sx_s1',
  'sx_s2',
  'sx_s3',
  'sx_s4',
  'sx_s5',
  'sx_s6',
  'sx_solo',
  'cl_riff',
  'cl_s1',
  'cl_s2',
  'cl_s3',
  'cl_s4',
  'cl_s5',
  'cl_s6',
  'cl_solo',
  'sn_riff',
  'sn_s1',
  'sn_s2',
  'sn_s3',
  'sn_s4',
  'sn_s5',
  'sn_s6',
  'sn_solo',
  'bd_riff',
  'bd_s1',
  'bd_s2',
  'bd_s3',
  'bd_s4',
  'bd_s5',
  'bd_s6',
  'bd_solo',
] as const;
/** Normal-enemy moves (en_*). */
export const ENEMY_SKILL_IDS = [
  'en_basic',
  'en_cease',
  'en_tick',
  'en_gnaw',
  'en_pickpocket',
  'en_spill',
  'en_wall',
  'en_royalty',
  'en_twofer',
  'en_spin',
  'en_garnish',
  'en_eightysix',
  'en_haze',
  'en_repossess',
  'en_deathroll',
  'en_wispfire',
  'en_headbutt',
  'en_drain',
  'en_howl',
  'en_gravechill',
  'en_corrupt',
  'en_burrow',
  'en_record',
  'en_requiem',
  'en_snub',
  'en_service',
  'en_hedge',
  'en_harmonize',
  'en_backstab',
  'en_snap',
  'en_ticktick',
  'en_ticktick_release',
  'en_sergeant',
  'en_bagman',
  'en_biggrunch',
  'en_keeper',
  'en_beaumont',
  'en_warden',
  'en_ghosttrack',
] as const;
/** Boss moves (b_*). */
export const BOSS_SKILL_IDS = [
  'b_baton',
  'b_noisecancel',
  'b_perfectpitch',
  'b_sample',
  'b_pitchcorrect',
  'b_foreclose',
  'b_audit',
  'b_clawrake',
  'b_howlclick',
  'b_playback',
  'b_erase',
  'b_overdub',
  'b_bowblade',
  'b_pizzicato',
  'b_shield',
  'b_cadenza_charge',
  'b_cadenza',
  'b_downbeat',
  'b_fermata',
  'b_ritardando',
  'b_tempolock',
  'b_crescendo_charge',
  'b_crescendo',
  'b_quantize',
  'b_clicktrack',
  'b_perfecttime',
  'b_spheres',
] as const;
/** Bandmate assist moves (as_*). */
export const ASSIST_SKILL_IDS = ['as_sugar', 'as_static', 'as_remy', 'as_moses'] as const;
/** Any skill: player, enemy, boss or assist. One resolver runs them all. */
export type SkillId =
  | (typeof CLASS_SKILL_IDS)[number]
  | (typeof ENEMY_SKILL_IDS)[number]
  | (typeof BOSS_SKILL_IDS)[number]
  | (typeof ASSIST_SKILL_IDS)[number];

/** The six character stats. Order matches ClassDef.base and ClassDef.growth. */
export const STAT_KEYS = ['heart', 'funk', 'chops', 'grit', 'tempo', 'mojo'] as const;
/** A character stat. heart = max HP, funk = max FP. */
export type StatKey = (typeof STAT_KEYS)[number];
/** The four stats an actor carries into battle (heart and funk become hp/fp pools). */
export type CombatStatKey = 'chops' | 'grit' | 'tempo' | 'mojo';
