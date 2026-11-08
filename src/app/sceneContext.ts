/**
 * The SceneContext implementation: the scene API (narrative/types.ts) on top of the engine, the
 * session and a Presenter. Every helper's behavior (toasts, level-ups, autosaves) matches v1's
 * equivalent (`G` and the UI helpers in legacy/src/06_ui_core.js and 08_world.js).
 */
import type { BossId } from '@core/ids/enemies';
import { clamp } from '@core/helpers';
import type { StatKey } from '@core/ids/combat';
import { ACT_STEPS, type StoryPosition } from '@core/ids/story';
import {
  ARRIVALS,
  BOSS_SCENES,
  BOSSES,
  DISTRICTS,
  GEAR,
  ITEMS,
  NOTES,
  NPCS,
  PLACES,
  TEXT,
  fmtDoubloons,
} from '@content/index';
import {
  addItem,
  clampVitals,
  countItem,
  derivedStats,
  fullRest,
  funkPct,
  gainXp,
  gradeTiming,
  healPct,
  makePlayerActor,
  playerTimingSpec,
  removeItem,
  rollAutoTiming,
  storyIs,
  storyReached,
} from '@engine/index';
import type { ChoiceOption, SceneContext } from '@narrative/types';
import { runBattle } from './battleController';
import type { SessionPort } from './sessionPort';

/** Strip [[lexicon]] markup from button labels (v1 did the same). */
const plainLabel = (s: string) =>
  s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, a: string, b?: string) => b || a);

/** Build the scene API for one Director run. */
export function createSceneContext(session: SessionPort, signal: AbortSignal): SceneContext {
  const P = session.deps.presenter;
  const g = () => session.game;

  const ctx: SceneContext = {
    get game() {
      return session.game;
    },
    signal,
    get rng() {
      return session.rng;
    },

    title: text => P.story(text ?? null),
    narrate: text => P.line({ who: null, text }, signal),
    say: (who, text) => P.line({ who: NPCS[who].name, color: NPCS[who].color, text, npc: who }, signal),
    speak: (name, color, text, sprite) => P.line({ who: name, color, text, sprite }, signal),
    async choose(options, prompt) {
      const entries = Object.entries(options)
        .map(([key, v]) => ({ key, ...(typeof v === 'string' ? { label: v } : (v as ChoiceOption)) }))
        .filter(o => o.when !== false);
      if (prompt) P.promptLine(prompt);
      const key = await P.choose(
        entries.map(o => ({ key: o.key, label: plainLabel(o.label), hint: o.hint })),
        signal,
      );
      const chosen = entries.find(o => o.key === key)!;
      if (!chosen.silent) P.echo(chosen.label.replace(/^"|"$/g, ''));
      return key as never;
    },
    confirm: (title, body, yes = 'OK', no = 'Cancel') => P.confirm(title, body, yes, no, signal),
    toast: text => P.toast(text),
    sheet: req => P.sheet(req, signal),
    wait: ms => P.wait(ms, signal),
    async timing() {
      // v1: runTimingBar({ player, enemies: [] }) from the sit-in. Auto rhythm rolls on the game's
      // stream; the bar's position comes from presentation randomness, as in battle.
      if (g().settings.rhythm === 'auto') {
        const grade = rollAutoTiming(session.rng);
        await P.battle.autoTiming(grade, signal);
        return grade;
      }
      const spec = playerTimingSpec(makePlayerActor(g()), 1, 0.5 + session.cosmetic.next() * 0.3);
      const grade = gradeTiming(spec, await P.battle.timing(spec, signal));
      await P.battle.timingResult(grade, signal);
      return grade;
    },
    board: text => P.board(text),

    async goto(id) {
      const game = g();
      game.district = id;
      if (!game.unlocked.includes(id)) game.unlocked.push(id);
      game.inTower = false;
      session.save();
      session.route = { kind: 'district' };
      if (!game.districtIntros.includes(id)) {
        game.districtIntros.push(id);
        P.story(DISTRICTS[id].name);
        await ctx.narrate(DISTRICTS[id].intro);
        // Tremé has no arrival scene: the prologue is its first visit.
        if (id !== 'treme') await ARRIVALS[id](ctx);
      }
    },
    returnTo: route => {
      session.route = route;
    },

    give(id, n = 1, opts) {
      addItem(g(), id, n);
      if (!opts?.silent) P.toast(`Got ${ITEMS[id].name}${n > 1 ? ' ×' + n : ''}.`);
    },
    take: (id, n) => removeItem(g(), id, n),
    count: id => countItem(g(), id),
    gold(n) {
      if (n < 0 && g().doubloons < -n) return false;
      g().doubloons += n;
      if (n > 0) P.toast(`+${fmtDoubloons(n)}`);
      return true;
    },
    async xp(n) {
      const ups = gainXp(g(), n);
      P.toast(`+${n} XP`);
      if (ups.length) await P.levelUps(ups, signal);
    },
    heal: p => healPct(g(), p),
    funk: p => funkPct(g(), p),
    rest: () => fullRest(g()),
    check(stat, base, yatBonus) {
      const st = derivedStats(g()) as unknown as Partial<Record<StatKey, number>>;
      const v = st[stat] || 0;
      let ch = base + v * 0.015;
      if (yatBonus && g().roots === 'yat') ch += 0.15;
      return session.rng.chance(clamp(ch, 0.1, 0.95));
    },
    scaleXp: base => Math.round(base * (1 + 0.35 * (g().level - 1))),
    scaleGold: base => Math.round(base * (1 + 0.3 * (g().level - 1))),
    nextFight(mods) {
      g().nextFight = Object.assign(g().nextFight || {}, mods);
    },
    bookHint(id) {
      const book = g().book;
      book[id] = book[id] || { seen: false, weak: false };
      book[id]!.hint = true;
    },
    permStat(stat, n) {
      g().perm[stat] += n;
      clampVitals(g());
    },

    flags: {
      has: id => !!g().flags[id],
      set: id => {
        g().flags[id] = true;
      },
    },
    story: {
      is: p => storyIs(g(), p),
      reached: p => storyReached(g(), p),
      set: p => {
        g().story = { ...p };
      },
    },
    quest: id => g().quests[id],
    setQuest(id, status) {
      g().quests[id] = status;
    },
    counter: name => g().counters[name] || 0,
    choice(key, value) {
      (g().choices as Record<string, string>)[key] = value;
    },
    keyItem(id) {
      if (!g().keyItems.includes(id)) g().keyItems.push(id);
    },
    gainGear(id, opts) {
      g().gearBag.push(id);
      if (opts?.equip) {
        g().gear[GEAR[id].slot] = id;
        clampVitals(g());
      }
    },
    recruit(id) {
      const band = g().band;
      if (!band.recruited.includes(id)) band.recruited.push(id);
      if (band.active.length < 2 && !band.active.includes(id)) band.active.push(id);
    },
    async giveNote(id) {
      const n = NOTES[id];
      if (!g().notes.includes(id)) g().notes.push(id);
      P.sound({ kind: 'note', freq: n.freq, dur: 0.9 });
      await ctx.narrate(TEXT.noteFound(n.name, n.quote, g().notes.length));
      if (g().notes.length === 5) P.toast(TEXT.fiveNotes);
    },
    save: manual => session.save(manual),

    async fight(spec) {
      const r = session.deps.battle
        ? await session.deps.battle(spec, {})
        : await runBattle(session, spec, signal);
      return r === 'fled' ? 'fled' : 'win';
    },
    boss: id => bossFlow(id),
  };

  /** The full boss sequence (v1: bossFlow). */
  async function bossFlow(id: BossId): Promise<'win' | 'lose'> {
    const scenes = BOSS_SCENES[id];
    const place = Object.values(PLACES).find(p => p.boss === id);
    P.story(place?.name ?? BOSSES[id].name);
    if (!g().bossIntros.includes(id)) {
      if (scenes) await scenes.pre(ctx);
      g().bossIntros.push(id);
    } else await ctx.narrate(TEXT.goBackIn);
    session.save();
    let res: Awaited<ReturnType<typeof runBattle>>;
    do {
      const spec = { enemies: [], context: 'boss', noFlee: true } as const;
      res = session.deps.battle
        ? await session.deps.battle(spec, { boss: id })
        : await runBattle(session, spec, signal, { boss: id });
      if (res === 'retry') {
        P.story(null);
        await ctx.narrate(TEXT.runItBack);
      }
    } while (res === 'retry');
    session.route = { kind: 'district' };
    if (res !== 'win') return 'lose';
    g().bossesDefeated.push(id);
    P.story(null);
    if (scenes) await scenes.post(ctx);
    advanceAfterBoss(id);
    session.save();
    return 'win';
  }

  /** Open the next act (v1: advanceAfterBoss). */
  function advanceAfterBoss(id: BossId): void {
    const nx = BOSSES[id].next;
    if (!nx) return;
    if (nx.unlock && !g().unlocked.includes(nx.unlock)) g().unlocked.push(nx.unlock);
    g().story = { act: nx.act, step: ACT_STEPS[nx.act][0] } as StoryPosition;
    if (nx.unlock) P.toast(TEXT.districtUnlocked(DISTRICTS[nx.unlock].name));
  }

  return ctx;
}
