/**
 * A Presenter for tests and headless runs: answers every prompt instantly according to a policy and
 * records a transcript of what the player would have seen. With it, scenes, battles and whole
 * playthroughs run in Vitest in milliseconds.
 */
import { livingEnemies } from '@core/helpers';
import type { NpcId } from '@core/ids/world';
import type { Battle, LevelUp, PlayerIntent, TimingGradeDef, TimingSpec, VictorySummary } from '@core/types';
import { BLUES_STEP_MS, legalActions } from '@engine/index';
import type {
  CardStyle,
  ChoiceView,
  Presenter,
  Route,
  SheetRequest,
  SoundCue,
  StoryCard,
  StoryLineSpec,
} from '@narrative/types';

/** One thing the player saw or did. */
export type TranscriptEntry =
  | { t: 'title'; text: string | null }
  | { t: 'line'; who: string | null; text: string; npc?: NpcId }
  | { t: 'prompt'; text: string }
  /** The board's text each time it's drawn. */
  | { t: 'board'; text: string }
  /** A block of cards (the roster, the epilogue, the credits). */
  | { t: 'cards'; style: CardStyle; items: StoryCard[] }
  | { t: 'choose'; options: string[]; picked: string; label: string }
  | { t: 'confirm'; title: string; answer: boolean }
  | { t: 'sheet'; req: SheetRequest }
  | { t: 'toast'; text: string }
  | { t: 'levelup'; level: number }
  | { t: 'battle'; enemies: string[] }
  | { t: 'victory'; xp: number; gold: number }
  | { t: 'defeat'; boss: boolean }
  | { t: 'route'; route: Route }
  /** A stubbed fight (tests that replace battles). */
  | { t: 'fight'; context: string };

/** How the scripted player decides. Everything has a sensible default. */
export interface ScriptPolicy {
  /** Pick a choice key (default: the first option). */
  choose?(options: readonly ChoiceView[]): string;
  /** Pick a battle action (default: a simple competent player). */
  intent?(b: Battle): PlayerIntent;
  /** Where to tap the timing bar (default: dead center = ON THE ONE). */
  timing?(spec: TimingSpec): number | null;
  /** Answer yes/no dialogs (default: yes). */
  confirm?(title: string): boolean;
  /** Act inside a sheet before closing it (e.g. buy something). */
  sheet?(req: SheetRequest): void;
  /** After a lost boss fight: retry or leave (default: retry up to 3 times). */
  defeat?(): 'retry' | 'leave';
}

const abortable = (signal: AbortSignal) => {
  if (signal.aborted) throw signal.reason;
};

/** A competent default: Blues when possible, SOLO when ready, the priciest affordable damaging skill, else RIFF. */
export function defaultIntent(b: Battle): PlayerIntent {
  const legal = legalActions(b);
  const target = livingEnemies(b).sort((a, c) => a.hp - c.hp)[0]?.id;
  if (legal.canBlues) return { type: 'blues', accuracy: 0 };
  if (legal.canSolo) return { type: 'solo', targetId: target };
  const usable = legal.skills.filter(s => s.usable);
  if (legal.canPlay && usable.length && b.player.fp > 10) {
    const last = usable[usable.length - 1]!;
    return { type: 'play', skillId: last.id, targetId: target };
  }
  return { type: 'riff', targetId: target };
}

/** The scripted presenter. */
export class ScriptedPresenter implements Presenter {
  readonly transcript: TranscriptEntry[] = [];
  private retries = 0;

  constructor(private readonly policy: ScriptPolicy = {}) {}

  story(title: string | null): void {
    this.transcript.push({ t: 'title', text: title });
  }
  async line(l: StoryLineSpec, signal: AbortSignal): Promise<void> {
    abortable(signal);
    this.transcript.push({ t: 'line', who: l.who, text: l.text, ...(l.npc && { npc: l.npc }) });
  }
  promptLine(text: string): void {
    this.transcript.push({ t: 'prompt', text });
  }
  cards(style: CardStyle, items: readonly StoryCard[]): void {
    this.transcript.push({ t: 'cards', style, items: [...items] });
  }
  board(text: string): void {
    this.transcript.push({ t: 'board', text });
  }
  echo(): void {}
  async choose(options: readonly ChoiceView[], signal: AbortSignal): Promise<string> {
    abortable(signal);
    const picked = this.policy.choose?.(options) ?? options[0]!.key;
    const label = options.find(o => o.key === picked)?.label ?? '';
    this.transcript.push({ t: 'choose', options: options.map(o => o.label), picked, label });
    return picked;
  }
  async confirm(title: string, _b: string, _y: string, _n: string, signal: AbortSignal): Promise<boolean> {
    abortable(signal);
    const answer = this.policy.confirm?.(title) ?? true;
    this.transcript.push({ t: 'confirm', title, answer });
    return answer;
  }
  async sheet(req: SheetRequest, signal: AbortSignal): Promise<void> {
    abortable(signal);
    this.transcript.push({ t: 'sheet', req });
    this.policy.sheet?.(req);
  }
  async levelUps(ups: readonly LevelUp[], signal: AbortSignal): Promise<void> {
    abortable(signal);
    for (const u of ups) this.transcript.push({ t: 'levelup', level: u.level });
  }
  toast(text: string): void {
    this.transcript.push({ t: 'toast', text });
  }
  sound(_cue: SoundCue): void {}
  async wait(_ms: number, signal: AbortSignal): Promise<void> {
    abortable(signal);
  }
  route(route: Route): void {
    this.transcript.push({ t: 'route', route: { ...route } });
  }

  readonly battle = {
    open: (b: Battle) => {
      this.transcript.push({ t: 'battle', enemies: b.enemies.map(e => e.defId as string) });
    },
    play: async (_events: unknown, _b: Battle, signal: AbortSignal) => abortable(signal),
    intent: async (b: Battle, signal: AbortSignal): Promise<PlayerIntent> => {
      abortable(signal);
      return (this.policy.intent ?? defaultIntent)(b);
    },
    timing: async (spec: TimingSpec, signal: AbortSignal) => {
      abortable(signal);
      return this.policy.timing ? this.policy.timing(spec) : spec.center;
    },
    autoTiming: async (_g: TimingGradeDef, signal: AbortSignal) => abortable(signal),
    timingResult: async (_g: TimingGradeDef, signal: AbortSignal) => abortable(signal),
    blues: async (signal: AbortSignal) => {
      abortable(signal);
      return Array.from({ length: 6 }, (_, i) => i * BLUES_STEP_MS);
    },
    victory: async (v: VictorySummary, _boss: boolean, signal: AbortSignal) => {
      abortable(signal);
      this.transcript.push({ t: 'victory', xp: v.rewards.xp, gold: v.rewards.gold });
    },
    defeat: async (boss: boolean, signal: AbortSignal): Promise<'retry' | 'leave'> => {
      abortable(signal);
      this.transcript.push({ t: 'defeat', boss });
      if (this.policy.defeat) return this.policy.defeat();
      return boss && this.retries++ < 3 ? 'retry' : 'leave';
    },
    close: () => {},
  };

  /** Just the story text, for readable assertions. */
  lines(): string[] {
    return this.transcript.flatMap(e => (e.t === 'line' ? [e.who ? `${e.who}: ${e.text}` : e.text] : []));
  }
}
