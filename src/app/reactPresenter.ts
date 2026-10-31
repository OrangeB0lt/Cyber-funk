/**
 * The browser Presenter: turns scene and battle requests into view state that React renders, and
 * resolves them when the player acts. React components never resolve promises themselves; they call
 * the answer methods here (advance, pick, answerPopup, closeSheet, chooseIntent, tap, bluesDone…).
 *
 * Every wait is keyed by an id and honors the scene's AbortSignal, so returning to the title cancels
 * cleanly and a stale tap can never answer the wrong prompt (a v1 bug class).
 */
import type {
  Battle,
  BattleEvent,
  GameState,
  LevelUp,
  PlayerIntent,
  Settings,
  TimingGradeDef,
  TimingSpec,
  VictorySummary,
} from '@core/types';
import type { BossId, EnemyId } from '@core/ids/enemies';
import { BOSSES, ENEMIES, ITEMS, TEXT, TONES, fmtDoubloons } from '@content/index';
import { legalActions } from '@engine/index';
import type {
  BattlePresenter,
  ChoiceView,
  Presenter,
  Route,
  SheetRequest,
  SoundCue,
  StoryLineSpec,
} from '@narrative/types';
import type { Sfx } from './audio/sfx';
import type { ActorView, BattleView, SheetSpec, SheetView, ViewState } from './view';

/** Options for the presenter. */
export interface ReactPresenterOptions {
  /** The settings in effect (the save's, or the title screen's). */
  settings(): Settings;
  /** The current save, if any. */
  game(): GameState | null;
  /** The sound synth. */
  sfx: Sfx;
  /** Test speed-up: animations nearly instant. */
  turbo(): boolean;
  /** Called whenever a route is shown. */
  onRoute?(r: Route): void;
}

const BATTLE_LOG_LINES = 6;

export class ReactPresenter implements Presenter {
  private seq = 1;
  private readonly waits = new Map<number, (value: unknown) => void>();

  constructor(
    readonly view: ViewState,
    private readonly o: ReactPresenterOptions,
  ) {}

  private nextId(): number {
    return this.seq++;
  }

  /** Wait for `id` to be answered, or reject when the scene is aborted. */
  private awaitAnswer<T>(id: number, signal: AbortSignal): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      const onAbort = () => {
        this.waits.delete(id);
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort, { once: true });
      this.waits.set(id, value => {
        signal.removeEventListener('abort', onAbort);
        this.waits.delete(id);
        resolve(value as T);
      });
    });
  }

  private answer(id: number, value?: unknown): void {
    this.waits.get(id)?.(value);
  }

  /** Animation time multiplier. */
  private speed(): number {
    return this.o.turbo() ? 0.02 : this.o.settings().reduceMotion ? 0.5 : 1;
  }

  /* ---------------- story ---------------- */

  story(title: string | null): void {
    const v = this.view;
    v.screen = 'story';
    v.title = title;
    v.lines = [];
    v.prompt = null;
    v.outcome = null;
  }

  async line(l: StoryLineSpec, signal: AbortSignal): Promise<void> {
    const v = this.view;
    if (v.screen !== 'story') this.story(null);
    const lineId = this.nextId();
    v.lines.push({
      id: lineId,
      kind: l.who ? 'spoken' : 'narr',
      who: l.who ?? undefined,
      color: l.color,
      text: l.text,
      typed: this.o.settings().textSpeed === 'instant',
    });
    const id = this.nextId();
    v.prompt = { id, kind: 'continue', lineId };
    try {
      await this.awaitAnswer(id, signal);
    } finally {
      if (v.prompt?.id === id) v.prompt = null;
    }
  }

  /** Continue: finish the typewriter first, then advance. */
  advance(): void {
    const p = this.view.prompt;
    if (!p || p.kind !== 'continue') return;
    const line = this.view.lines.find(l => l.id === p.lineId);
    if (line && !line.typed) {
      line.typed = true;
      return;
    }
    this.answer(p.id);
  }

  /** The typewriter finished a line. */
  typed(lineId: number): void {
    const line = this.view.lines.find(l => l.id === lineId);
    if (line) line.typed = true;
  }

  promptLine(text: string): void {
    this.view.lines.push({ id: this.nextId(), kind: 'prompt', text, typed: true });
  }

  echo(text: string): void {
    this.view.lines.push({
      id: this.nextId(),
      kind: 'you',
      who: this.o.game()?.name ?? 'You',
      text,
      typed: true,
    });
  }

  async choose(options: readonly ChoiceView[], signal: AbortSignal): Promise<string> {
    const id = this.nextId();
    this.view.prompt = { id, kind: 'choice', options: [...options] };
    try {
      return await this.awaitAnswer<string>(id, signal);
    } finally {
      if (this.view.prompt?.id === id) this.view.prompt = null;
    }
  }

  /** The player picked a choice. Stale prompt ids are ignored. */
  pick(promptId: number, key: string): void {
    if (this.view.prompt?.id === promptId) this.answer(promptId, key);
  }

  async confirm(title: string, body: string, yes: string, no: string, signal: AbortSignal): Promise<boolean> {
    const id = this.nextId();
    this.view.popups.push({ id, kind: 'confirm', title, body, yes, no });
    try {
      return await this.awaitAnswer<boolean>(id, signal);
    } finally {
      this.removePopup(id);
    }
  }

  /** A dialog was answered (or dismissed). */
  answerPopup(id: number, value?: unknown): void {
    if (this.waits.has(id)) this.answer(id, value);
    else this.removePopup(id);
  }

  private removePopup(id: number): void {
    const i = this.view.popups.findIndex(p => p.id === id);
    if (i >= 0) this.view.popups.splice(i, 1);
  }

  /* ---------------- sheets ---------------- */

  async sheet(req: SheetRequest, signal: AbortSignal): Promise<void> {
    const id = this.nextId();
    this.view.sheet = this.sheetFor(req, id);
    try {
      await this.awaitAnswer(id, signal);
    } finally {
      if (this.view.sheet?.id === id) this.view.sheet = null;
    }
  }

  private sheetFor(req: SheetRequest, id: number): SheetView {
    if (req.kind === 'shop') {
      return {
        id,
        awaited: true,
        kind: 'shop',
        title: req.title,
        stock: req.stock.filter(s => s.when !== false).map(s => ({ ...s })),
        noSell: !!req.noSell,
        tab: 'buy',
      };
    }
    return { id, awaited: true, kind: req.kind };
  }

  /** Open a sheet from the UI (menus). Not awaited by any scene. */
  openSheet(sheet: SheetSpec): void {
    this.view.sheet = { ...sheet, id: this.nextId() } as SheetView;
  }

  /** Close the open sheet; a scene waiting on it continues. */
  closeSheet(): void {
    const s = this.view.sheet;
    if (!s) return;
    this.view.sheet = null;
    if (s.awaited) this.answer(s.id);
  }

  async levelUps(ups: readonly LevelUp[], signal: AbortSignal): Promise<void> {
    for (const up of ups) {
      this.o.sfx.levelUp();
      const id = this.nextId();
      this.view.popups.push({ id, kind: 'levelup', up });
      try {
        await this.awaitAnswer(id, signal);
      } finally {
        this.removePopup(id);
      }
    }
  }

  toast(text: string): void {
    const id = this.nextId();
    this.view.toast = { id, text };
    setTimeout(() => {
      if (this.view.toast?.id === id) this.view.toast = null;
    }, 1800);
  }

  sound(cue: SoundCue): void {
    if (cue.kind === 'stab') this.o.sfx.stab(cue.cls);
    else if (cue.kind === 'coin') this.o.sfx.coin();
    else this.o.sfx.note(cue.freq, cue.dur);
  }

  wait(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(signal.reason);
      const t = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(t);
        reject(signal.reason);
      };
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  route(r: Route): void {
    this.o.onRoute?.(r);
    const v = this.view;
    v.route = r;
    v.screen = r.kind;
    v.title = null;
    v.lines = [];
    v.prompt = null;
    v.outcome = null;
  }

  /* ---------------- battle ---------------- */

  private intentId: number | null = null;
  private timingId: number | null = null;

  readonly battle: BattlePresenter = {
    open: b => {
      this.view.screen = 'battle';
      this.view.outcome = null;
      this.view.battle = {
        player: actorView(b, b.player),
        enemies: b.enemies.map(e => actorView(b, e)),
        log: [],
        active: null,
        floats: [],
        shake: 0,
        flash: 0,
        legal: null,
      };
    },
    play: async (events, b, signal) => {
      for (const ev of events) {
        const ms = this.applyEvent(ev, b);
        if (ms) await this.wait(ms * this.speed(), signal);
      }
      const bv = this.view.battle;
      if (bv) syncActors(bv, b);
    },
    intent: async (b, signal) => {
      const bv = this.view.battle!;
      syncActors(bv, b);
      bv.legal = legalActions(b);
      const id = this.nextId();
      this.intentId = id;
      try {
        return await this.awaitAnswer<PlayerIntent>(id, signal);
      } finally {
        this.intentId = null;
        if (this.view.battle) this.view.battle.legal = null;
      }
    },
    timing: async (spec: TimingSpec, signal) => {
      const id = this.nextId();
      this.timingId = id;
      this.view.timing = { id, kind: 'bar', spec, result: null };
      try {
        return await this.awaitAnswer<number | null>(id, signal);
      } finally {
        this.timingId = null;
      }
    },
    timingResult: async (grade: TimingGradeDef, signal) => {
      const t = this.view.timing;
      if (t?.kind === 'bar') t.result = grade;
      this.o.sfx.tap(grade.id);
      try {
        await this.wait(420 * Math.min(1, this.speed() * 2), signal);
      } finally {
        this.view.timing = null;
      }
    },
    autoTiming: async (grade, signal) => {
      this.view.timing = { id: this.nextId(), kind: 'auto', grade };
      try {
        await this.wait(this.o.turbo() ? 25 : 520, signal);
      } finally {
        this.view.timing = null;
      }
    },
    blues: async signal => {
      const id = this.nextId();
      this.timingId = id;
      this.view.timing = { id, kind: 'blues', result: null };
      try {
        return await this.awaitAnswer<number[]>(id, signal);
      } finally {
        this.timingId = null;
        this.view.timing = null;
      }
    },
    victory: async (v: VictorySummary, boss: boolean, signal) => {
      const rows: { label: string; value: string; gold?: boolean }[] = [
        { label: 'XP', value: `+${v.rewards.xp}` },
        { label: 'Doubloons', value: `+${fmtDoubloons(v.rewards.gold)}` },
      ];
      if (v.bountyGold) rows.push({ label: 'Bounty', value: `+${fmtDoubloons(v.bountyGold)}`, gold: true });
      if (v.rewards.drops.length)
        rows.push({ label: 'Found', value: v.rewards.drops.map(id => ITEMS[id].name).join(', ') });
      const notes = [
        ...(v.discoveries.length ? [`Blue Book: learned the weakness of ${v.discoveries.join(', ')}.`] : []),
        TEXT.victoryRecover,
      ];
      this.story(null);
      this.view.outcome = { kind: 'victory', title: TEXT.victoryTitle(boss), rows, notes };
      await this.outcomePrompt([{ key: 'continue', label: 'Continue ▸', primary: true }], signal);
    },
    defeat: async (boss, signal) => {
      this.story(null);
      this.view.outcome = boss
        ? { kind: 'defeat', title: TEXT.defeatTitle, text: TEXT.defeatBoss }
        : { kind: 'defeat', title: TEXT.defeatTitle, text: TEXT.defeatStreet, cost: TEXT.defeatStreetCost };
      const key = await this.outcomePrompt(
        boss
          ? [
              { key: 'retry', label: 'Run it back ▸', primary: true },
              { key: 'leave', label: 'Walk away for now' },
            ]
          : [{ key: 'wake', label: 'Wake up ▸', primary: true }],
        signal,
      );
      return key === 'retry' ? 'retry' : 'leave';
    },
    close: () => {
      this.view.battle = null;
      this.view.timing = null;
    },
  };

  private async outcomePrompt(
    buttons: { key: string; label: string; primary?: boolean }[],
    signal: AbortSignal,
  ): Promise<string> {
    const id = this.nextId();
    this.view.prompt = { id, kind: 'outcome', buttons };
    try {
      return await this.awaitAnswer<string>(id, signal);
    } finally {
      if (this.view.prompt?.id === id) this.view.prompt = null;
      this.view.outcome = null;
    }
  }

  /** The player chose a battle action. */
  chooseIntent(intent: PlayerIntent): void {
    if (this.intentId !== null) this.answer(this.intentId, intent);
  }

  /** The player tapped the timing bar (phase 0–1), or it ran out (null). */
  tap(phase: number | null): void {
    if (this.timingId !== null && this.view.timing?.kind === 'bar') this.answer(this.timingId, phase);
  }

  /** Play the Blues finished. */
  bluesDone(tapsMs: number[]): void {
    if (this.timingId !== null && this.view.timing?.kind === 'blues') this.answer(this.timingId, tapsMs);
  }

  /** Show the Blues result label briefly (the component calls this before bluesDone). */
  bluesResult(label: string): void {
    if (this.view.timing?.kind === 'blues') this.view.timing.result = label;
  }

  /* ---------------- battle playback ---------------- */

  /** Apply one event to the battle view. Returns how long to pause (ms, before speed scaling). */
  private applyEvent(ev: BattleEvent, b: Battle): number {
    const bv = this.view.battle;
    if (!bv) return 0;
    const actor = (id: string) => (id === bv.player.id ? bv.player : bv.enemies.find(e => e.id === id));
    const float = (target: string, text: string, color: string, big = false) => {
      const id = this.nextId();
      bv.floats.push({ id, target, text, color, big, x: 20 + ((id * 37) % 50) });
      setTimeout(() => {
        const i = bv.floats.findIndex(f => f.id === id);
        if (i >= 0) bv.floats.splice(i, 1);
      }, 900);
    };
    switch (ev.type) {
      case 'log':
        this.pushLog(bv, ev.text, ev.cls);
        syncActors(bv, b);
        return ev.cls === 'boss' || ev.cls === 'telegraph' || ev.cls === 'solo' ? 420 : 230;
      case 'dmg': {
        const a = actor(ev.target);
        if (a) a.hp = ev.hpAfter;
        const color = TONES[ev.tone]?.color ?? TONES.HOT.color;
        const text = ev.silent
          ? '0'
          : (ev.crit ? '✦' : '') + ev.amount + (ev.weak ? ' WEAK!' : ev.resisted ? ' resisted' : '');
        float(ev.target, text, color, !!(ev.crit || ev.weak));
        if (ev.crit && !this.o.settings().reduceMotion) bv.shake++;
        if (ev.crit) this.o.sfx.crit();
        else this.o.sfx.hit(ev.tone);
        syncActors(bv, b);
        return 300;
      }
      case 'heal': {
        const a = actor(ev.target);
        if (a) a.hp = ev.hpAfter;
        float(ev.target, '+' + ev.amount, '#ff6ad5');
        syncActors(bv, b);
        return 220;
      }
      case 'revive': {
        const a = actor(ev.target);
        if (a) a.hp = ev.hpAfter;
        return 0;
      }
      case 'dodge':
        float(ev.target, 'dodge', '#cfcfcf');
        return 200;
      case 'status':
        syncActors(bv, b);
        return 0;
      case 'summon':
        syncActors(bv, b);
        return 0;
      case 'turn':
        bv.active = ev.actor;
        syncActors(bv, b);
        return 0;
      case 'death': {
        const a = actor(ev.target);
        if (a) a.alive = false;
        return 260;
      }
      case 'round':
        this.pushLog(bv, `— Round ${ev.round} —`, 'round');
        return 140;
      case 'shatter':
        bv.flash++;
        return 300;
      case 'assist':
        return 120;
      default:
        return 0;
    }
  }

  private pushLog(bv: BattleView, text: string, cls: BattleView['log'][number]['cls']): void {
    bv.log.push({ id: this.nextId(), text, cls });
    if (bv.log.length > BATTLE_LOG_LINES * 4) bv.log.splice(0, bv.log.length - BATTLE_LOG_LINES * 4);
  }
}

/** A fresh view of an actor. */
function actorView(_b: Battle, a: Battle['player']): ActorView {
  const def =
    a.side === 'enemy' && a.defId && a.defId !== 'player'
      ? a.boss
        ? BOSSES[a.defId as BossId]
        : ENEMIES[a.defId as EnemyId]
      : null;
  return {
    id: a.id,
    defId: String(a.defId ?? ''),
    name: a.name,
    level: a.level,
    hp: a.hp,
    maxHp: a.maxHp,
    fp: a.fp,
    maxFp: a.maxFp,
    groove: a.groove,
    beat: a.beat,
    bigFour: !!a.bigFour,
    alive: a.alive,
    boss: !!a.boss,
    elite: !!a.elite,
    statuses: a.statuses.map(s => ({ id: s.id, turns: s.turns })),
    guard: !!a.guard,
    weak: def ? def.weak : null,
    resist: def ? def.resist : null,
  };
}

/** Mirror everything but Heart and life from the live battle (those step with events). */
function syncActors(bv: BattleView, b: Battle): void {
  const sync = (v: ActorView, a: Battle['player']) => {
    v.fp = a.fp;
    v.maxFp = a.maxFp;
    v.groove = a.groove;
    v.beat = a.beat;
    v.guard = !!a.guard;
    v.name = a.name;
    v.statuses = a.statuses.map(s => ({ id: s.id, turns: s.turns }));
  };
  sync(bv.player, b.player);
  for (const e of b.enemies) {
    const v = bv.enemies.find(x => x.id === e.id);
    if (v) sync(v, e);
    else bv.enemies.push(actorView(b, e));
  }
}
