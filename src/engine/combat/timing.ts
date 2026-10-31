/**
 * On the One and Play the Blues: the minigame *rules*. The UI only animates and measures taps;
 * zone geometry, grading and scoring live here so the sim, tests and UI agree.
 * (Moved from v1's legacy/src/07_ui_combat.js runTimingBar / runBluesSequence.)
 */
import { clamp, hasStatus, livingEnemies } from '@core/helpers';
import { NOTE_IDS } from '@core/ids/enemies';
import type { Battle, PlayerIntent, TimingGradeDef } from '@core/types';
import { SKILLS, TIMING } from '@content/data';
import { logLine } from './events';

/** The On the One bar for one action. Positions are fractions of the track (0–1). */
export interface TimingSpec {
  /** How long the marker takes to cross the track. Faster against higher-level enemies. */
  durationMs: number;
  /** Center of the target zones. */
  center: number;
  /** Half-width of the ONE zone. */
  one: number;
  /** Half-width of the pocket zone. */
  pocket: number;
  /** Half-width of the loose zone. */
  loose: number;
}

/** Delay before the marker starts moving. */
export const TIMING_LEAD_MS = 220;

/** Does this action get an On the One timing roll? Riffs, solos and damaging skills do. */
export function needsTiming(intent: PlayerIntent): boolean {
  return (
    intent.type === 'riff' ||
    intent.type === 'solo' ||
    (intent.type === 'play' && SKILLS[intent.skillId].effects.some(f => f.kind === 'dmg'))
  );
}

/**
 * Zone geometry for the player's next action. The ONE zone is 6% wide on each side of center,
 * scaled by gear and sheet music (oneZone), ×1.3 In the Pocket, ×0.6 Quantized.
 * `center` is chosen by the caller (the UI uses 0.5–0.8 from its presentation randomness).
 */
export function timingSpec(b: Battle, center: number): TimingSpec {
  const p = b.player;
  const maxLvl = Math.max(...livingEnemies(b).map(e => e.level), 1);
  const durationMs = Math.max(880, 1200 - 20 * (maxLvl - 1));
  let one = 0.06 * (p.oneZone || 1);
  if (hasStatus(p, 'pocket')) one *= 1.3;
  if (hasStatus(p, 'quantized')) one *= 0.6;
  return { durationMs, center, one, pocket: one * 2.3, loose: one * 4.2 };
}

/** Grade a tap at `phase` (0–1 along the track). No tap (null) is CLAMS. */
export function gradeTiming(spec: TimingSpec, phase: number | null): TimingGradeDef {
  if (phase === null) return TIMING.clams;
  const d = Math.abs(phase - spec.center);
  return d <= spec.one
    ? TIMING.one
    : d <= spec.pocket
      ? TIMING.pocket
      : d <= spec.loose
        ? TIMING.loose
        : TIMING.clams;
}

/** Log the grade when it earns Groove (ON THE ONE!). The sim never calls this. */
export function announceTiming(b: Battle, t: TimingGradeDef): void {
  if (t.groove) logLine(b, t.label, 'good');
}

/** Play the Blues: one pad per Blue Note, lit in scale order. */
export const BLUES_STEP_MS = 560;
/** Delay before the first pad lights. */
export const BLUES_LEAD_MS = 500;

/**
 * Score Play the Blues from tap times (ms after the first pad was due). Each tap counts for the
 * nearest pad, once; a perfect tap scores 1, falling to 0 at 55% of a step away. Accuracy is the
 * average over all six pads (missed pads score 0).
 */
export function scoreBlues(tapsMs: readonly number[]): { scores: number[]; accuracy: number } {
  const n = NOTE_IDS.length;
  const scores = new Array<number>(n).fill(0);
  const tapped = new Array<boolean>(n).fill(false);
  for (const t of tapsMs) {
    const idx = clamp(Math.round(t / BLUES_STEP_MS), 0, n - 1);
    if (tapped[idx]) continue;
    tapped[idx] = true;
    const err = Math.abs(t - idx * BLUES_STEP_MS);
    scores[idx] = Math.max(0, 1 - err / (BLUES_STEP_MS * 0.55));
  }
  return { scores, accuracy: scores.reduce((a, c) => a + c, 0) / n };
}

/** What the player sees after Play the Blues. */
export function bluesLabel(accuracy: number): string {
  return accuracy > 0.8
    ? 'IN THE POCKET'
    : accuracy > 0.5
      ? "THAT'S THE BLUES"
      : accuracy > 0.2
        ? 'ROUGH BUT TRUE'
        : 'CLAMS';
}
