/**
 * The browser game: one Session, the view store, the React presenter and the synth, plus every
 * command the UI can issue. React components call these; they never change state themselves.
 */
import type { BandmateId } from '@core/ids/band';
import type { ClassId, RootsId } from '@core/ids/characters';
import type { BossId } from '@core/ids/enemies';
import { BOSS_IDS } from '@core/ids/enemies';
import { BANDMATE_IDS } from '@core/ids/band';
import { NOTE_IDS } from '@core/ids/enemies';
import type { GearId, GearSlot, ItemId, ShopItemId } from '@core/ids/items';
import { ACT_ORDER, ACT_STEPS, type ActId, type StoryPosition } from '@core/ids/story';
import type { DistrictId, GlossaryId, PlaceId } from '@core/ids/world';
import type { StatusId } from '@core/ids/combat';
import type { PlayerIntent, Settings, StepDef } from '@core/types';
import { ACTS, BOSSES, DISTRICTS, ENEMIES, GEAR, PLACES, cuttingContest } from '@content/index';
import {
  addItem,
  buy,
  currentStep,
  defaultSettings,
  equip,
  fullRest,
  gainXp,
  sell,
  toggleBandmate,
  unequip,
  useFieldItem,
} from '@engine/index';
import { Sfx } from './audio/sfx';
import { exportCode, importCode, localSaveStorage, type SaveStorage } from './persistence';
import { ReactPresenter } from './reactPresenter';
import { Session } from './session';
import { createView, type SheetSpec, type ViewState } from './view';

/** Nicknames for a player who leaves the name blank. */
const DEFAULT_NAMES = ['Lagniappe', 'Dawlin', 'Cher', 'Hotshot', "Lil' Bit"] as const;

/** The whole client-side game. */
export class GameApp {
  readonly view: ViewState = createView();
  readonly sfx: Sfx;
  readonly presenter: ReactPresenter;
  readonly session: Session;
  /** Test speed-up (Playwright and the dev menu set it). */
  turbo = false;

  constructor(storage: SaveStorage = localSaveStorage) {
    this.sfx = new Sfx(() => this.settings().sound);
    this.presenter = new ReactPresenter(this.view, {
      settings: () => this.settings(),
      game: () => this.session.store.game,
      sfx: this.sfx,
      turbo: () => this.turbo,
      onRoute: r => {
        const g = this.session.store.game;
        if (r.kind === 'district' && g) this.nextAmbient(g.district);
      },
    });
    this.session = new Session({
      presenter: this.presenter,
      storage,
      onBusy: busy => {
        this.view.busy = busy;
      },
    });
  }

  /** The live save proxy (render snapshots of `store`). */
  get store() {
    return this.session.store;
  }

  /** Settings in effect: the save's, or the title screen's before a game exists. */
  settings(): Settings {
    return this.session.store.game?.settings ?? this.view.titleSettings;
  }

  /* ---------------- title ---------------- */

  /** Is there a save to continue? */
  hasSave(): boolean {
    return !!this.session.deps.storage.read();
  }

  /** Load the save and pick up where it left off. */
  continueGame(): boolean {
    if (this.session.load()) {
      this.presenter.toast('No save found.');
      return false;
    }
    void this.session.resume();
    return true;
  }

  /** Ask before a new game overwrites the save. */
  confirmNewGame(): Promise<boolean> {
    return this.presenter.confirm(
      'Start a new game?',
      'Your current save will be overwritten when the new game autosaves. Export it first if you want to keep it.',
      'New game',
      'Cancel',
      new AbortController().signal,
    );
  }

  /** Go to character creation. */
  newGame(): void {
    this.view.create = { step: 1, name: '', roots: 'creole', cls: 'trumpet' };
    this.view.screen = 'create';
  }

  /** Edit the character being created. */
  editCreate(patch: Partial<Pick<ViewState['create'], 'name' | 'roots' | 'cls'>>): void {
    Object.assign(this.view.create, patch);
  }

  /** Creation: back a step (or to the title). */
  createBack(): void {
    const c = this.view.create;
    if (c.step === 1) void this.toTitle();
    else c.step = (c.step - 1) as 1 | 2;
  }

  /** Creation: next step; an empty name gets a random nickname (v1 behavior). */
  createNext(): void {
    const c = this.view.create;
    if (c.step === 1) {
      c.name = c.name.trim() || this.session.cosmetic.pick(DEFAULT_NAMES);
      c.step = 2;
    } else if (c.step === 2) c.step = 3;
    else this.createCharacter(c.name.trim(), c.roots, c.cls);
  }

  /** Create the character, then show How to Play with a start button. */
  createCharacter(name: string, roots: RootsId, cls: ClassId): void {
    this.session.newGame(name, roots, cls, { ...this.view.titleSettings });
    this.presenter.openSheet({ kind: 'howto', start: true });
  }

  /** Walk the dirge: start the prologue. */
  beginPrologue(): void {
    this.presenter.closeSheet();
    void this.session.startPrologue();
  }

  /** Back to the title screen (the save stays). */
  async toTitle(): Promise<void> {
    this.presenter.closeSheet();
    await this.session.quit();
    Object.assign(this.view, {
      screen: 'title',
      lines: [],
      prompt: null,
      outcome: null,
      battle: null,
      timing: null,
      popups: [],
    });
  }

  /** Menu → Title Screen, after a confirm. */
  async confirmToTitle(): Promise<void> {
    this.presenter.closeSheet();
    const ok = await this.presenter.confirm(
      'Back to title?',
      'Progress since your last autosave is kept only if you saved. Autosaves happen when you enter a district, after fights, and before bosses.',
      'Title screen',
      'Stay',
      new AbortController().signal,
    );
    if (ok) await this.toTitle();
  }

  /* ---------------- story ---------------- */

  /** Continue (or tap the story to skip typing). */
  advance(): void {
    this.presenter.advance();
  }

  /** Pick a choice. */
  pick(promptId: number, key: string): void {
    this.presenter.pick(promptId, key);
  }

  /** Answer a dialog. */
  answerPopup(id: number, value?: unknown): void {
    this.presenter.answerPopup(id, value);
  }

  /** Show a lexicon term (and remember it in the Lexicon). */
  showTerm(term: GlossaryId): void {
    const g = this.store.game;
    if (g && !g.lexicon.includes(term)) g.lexicon.push(term);
    this.view.popups.push({ id: Date.now(), kind: 'lexicon', term });
  }

  /** Record terms the player saw in narration. */
  sawTerms(terms: GlossaryId[]): void {
    const g = this.store.game;
    if (!g) return;
    for (const t of terms) if (!g.lexicon.includes(t)) g.lexicon.push(t);
  }

  /** Explain a status chip. */
  showStatus(status: StatusId): void {
    this.view.popups.push({ id: Date.now(), kind: 'status', status });
  }

  /* ---------------- sheets ---------------- */

  /** Open a menu sheet (ignored while a scene waits on one). */
  openSheet(sheet: SheetSpec): void {
    if (this.view.sheet?.awaited) return;
    this.presenter.openSheet(sheet);
  }

  /** Close the sheet. */
  closeSheet(): void {
    this.presenter.closeSheet();
  }

  /* ---------------- district & places ---------------- */

  /** Next ambient line for a district (rotates on every visit). */
  nextAmbient(d: DistrictId): number {
    const i = ((this.view.ambient[d] ?? 0) + 1) % DISTRICTS[d].ambient.length;
    this.view.ambient[d] = i;
    return i;
  }

  enterPlace(id: PlaceId): void {
    this.session.enterPlace(id);
  }
  leavePlace(): void {
    this.session.leavePlace();
  }
  chooseOption(place: PlaceId, key: string): void {
    void this.session.chooseOption(place, key);
  }
  hitTheStreets(): void {
    void this.session.hitTheStreets();
  }
  trackBounty(): void {
    void this.session.trackBounty();
  }
  travel(to: DistrictId): void {
    this.presenter.closeSheet();
    void this.session.travel(to);
  }

  /** The place on the district screen that gets the "!" hint. */
  hintPlace(): PlaceId | null {
    const g = this.store.game;
    if (!g) return null;
    return currentStep(g).def.hintPlace ?? null;
  }

  /* ---------------- battle ---------------- */

  chooseIntent(intent: PlayerIntent): void {
    this.presenter.chooseIntent(intent);
  }
  tap(phase: number | null): void {
    this.presenter.tap(phase);
  }
  bluesDone(taps: number[], label: string): void {
    this.presenter.bluesResult(label);
    setTimeout(() => this.presenter.bluesDone(taps), this.turbo ? 0 : 700);
  }

  /* ---------------- inventory, gear, band, shop ---------------- */

  /** Use an item from the bag (in battle it becomes the turn's action). */
  useItem(id: ItemId): void {
    if (this.view.battle?.legal) {
      this.presenter.closeSheet();
      this.chooseIntent({ type: 'bag', itemId: id });
      return;
    }
    const r = useFieldItem(this.session.rng, this.session.game, id);
    if (r.used) this.presenter.toast(r.message);
  }

  equip(id: GearId): void {
    equip(this.session.game, id);
    this.presenter.toast('Equipped ' + this.gearName(id) + '.');
    this.presenter.openSheet({ kind: 'gear' });
  }
  unequip(slot: Exclude<GearSlot, 'instrument'>): void {
    unequip(this.session.game, slot);
    this.presenter.openSheet({ kind: 'gear' });
  }
  private gearName(id: GearId): string {
    return GEAR[id].name;
  }

  toggleBandmate(id: BandmateId): void {
    if (this.view.battle) {
      this.presenter.toast('Swap at the Lagniappe club.');
      return;
    }
    const r = toggleBandmate(this.session.game, id);
    if (!r.ok && r.message) this.presenter.toast(r.message);
  }

  buy(id: ShopItemId, price: number): void {
    const r = buy(this.session.game, id, price);
    if (r.ok) this.sfx.coin();
    for (const m of r.messages) this.presenter.toast(m);
  }
  sell(id: ItemId | GearId): void {
    sell(this.session.game, id);
  }
  /** Take a bounty from the board. */
  takeBounty(d: DistrictId): void {
    const g = this.session.game;
    g.bounty = d;
    this.presenter.toast(`Tracking ${ENEMIES[DISTRICTS[d].elite].name} in ${DISTRICTS[d].name}.`);
  }
  shopTab(tab: 'buy' | 'sell'): void {
    const s = this.view.sheet;
    if (s?.kind === 'shop') s.tab = tab;
  }

  /* ---------------- settings & saves ---------------- */

  /** Change a setting (the save's in a game, the title's otherwise). */
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings()[key] = value;
    if (this.store.game) this.session.save();
  }

  /** Save by hand. */
  save(): void {
    if (this.session.save(true)) this.presenter.toast('Saved.');
  }

  /** The save as a CF2: code. */
  exportSave(): string | null {
    const raw = this.session.serialize();
    return raw ? exportCode(raw) : null;
  }

  /** Load a CF2: code. */
  async importSave(code: string): Promise<boolean> {
    const raw = importCode(code);
    if (!raw) return false;
    // Stop whatever scene is running before the save underneath it changes.
    await this.session.director.abort('import');
    if (this.session.load(raw)) return false;
    this.session.save();
    this.presenter.closeSheet();
    this.presenter.toast('Save loaded.');
    void this.session.resume();
    return true;
  }

  /** Settings → Reset Game, after a confirm. */
  async confirmReset(): Promise<void> {
    this.presenter.closeSheet();
    const ok = await this.presenter.confirm(
      'Reset everything?',
      'This erases your save. The city will not remember you. Export first if you want it back.',
      'Erase',
      'Keep',
      new AbortController().signal,
    );
    if (ok) await this.resetGame();
  }

  /** Erase the save. */
  async resetGame(): Promise<void> {
    this.session.deps.storage.clear();
    await this.toTitle();
    this.presenter.toast('Reset.');
  }

  /* ---------------- dev menu ---------------- */

  readonly dev = {
    xp: () => {
      const g = this.store.game;
      if (!g) return;
      const ups = gainXp(g, 500);
      this.presenter.toast('+500 XP');
      if (ups.length) void this.presenter.levelUps(ups, new AbortController().signal);
    },
    gold: () => {
      if (!this.store.game) return;
      this.store.game.doubloons += 1000;
      this.presenter.toast('+Ð1000');
    },
    heal: () => {
      if (!this.store.game) return;
      fullRest(this.store.game);
      this.presenter.toast('Healed.');
    },
    unlock: () => {
      if (!this.store.game) return;
      this.store.game.unlocked = Object.keys(DISTRICTS) as DistrictId[];
      this.presenter.toast('All districts unlocked.');
    },
    notes: () => {
      if (!this.store.game) return;
      this.store.game.notes = [...NOTE_IDS];
      this.presenter.toast('All six Blue Notes.');
    },
    band: () => {
      const g = this.store.game;
      if (!g) return;
      g.band.recruited = [...BANDMATE_IDS];
      g.band.active = ['sugar', 'static'];
      Object.assign(g.quests, { cutting: 'done', static_contract: 'done', faisdodo: 'done', haints: 'done' });
      this.presenter.toast('Band recruited.');
    },
    items: () => {
      const g = this.store.game;
      if (!g) return;
      (
        [
          'gumbo',
          'poboy',
          'muffuletta',
          'chicory',
          'yakamein',
          'pralines',
          'discobead',
          'cayenne',
          'indigo',
          'subtape',
          'smoke',
        ] as const
      ).forEach(i => addItem(g, i, 5));
      addItem(g, 'grisgris', 1);
      this.presenter.toast('Bag stocked.');
    },
    gear: () => {
      const g = this.store.game;
      if (!g) return;
      const tier = g.level >= 11 ? 'chrome' : g.level >= 7 ? 'neon' : 'street';
      const give = (id: GearId) => {
        if (!g.gearBag.includes(id)) g.gearBag.push(id);
        equip(g, id);
      };
      give(`inst_${g.cls}_${tier}`);
      give(g.level >= 11 ? 'thr_kevlar' : g.level >= 8 ? 'thr_duster' : 'thr_secondline');
      give('ch_gator');
      give('mod_jaw');
      this.presenter.toast('Geared up.');
    },
    /** Jump straight to a boss fight. */
    boss: (id: BossId) => {
      const g = this.store.game;
      if (!g) return;
      this.presenter.closeSheet();
      const bd = BOSSES[id];
      if (!g.unlocked.includes(bd.district)) g.unlocked.push(bd.district);
      g.district = bd.district;
      g.bossesDefeated = g.bossesDefeated.filter(b => b !== id);
      g.bossIntros = g.bossIntros.filter(b => b !== id);
      g.story = bossStep(id);
      if (g.level < bd.level) {
        g.level = bd.level;
        fullRest(g);
      }
      void this.session.run(s => s.boss(id).then(() => {}), `dev:boss:${id}`);
    },
    /** Jump to the start of an act, as if every earlier boss were beaten. */
    act: (act: ActId) => {
      const g = this.store.game;
      if (!g) return;
      this.presenter.closeSheet();
      const idx = ACT_ORDER.indexOf(act);
      g.unlocked = ACT_ORDER.slice(0, idx + 1).filter((x): x is DistrictId => x in DISTRICTS);
      g.story = { act, step: ACT_STEPS[act][0] } as StoryPosition;
      g.flags.metRoux = true;
      for (const prev of ACT_ORDER.slice(0, idx)) {
        const boss = prev in DISTRICTS ? DISTRICTS[prev as DistrictId].boss : null;
        if (boss && !g.bossesDefeated.includes(boss)) {
          g.bossesDefeated.push(boss);
          const note = BOSSES[boss].note;
          if (note && !g.notes.includes(note)) g.notes.push(note);
        }
      }
      if (idx >= 5) g.flags.gusFreed = true;
      const lv = act in DISTRICTS ? DISTRICTS[act as DistrictId].levels[0] : 13;
      if (g.level < lv) {
        g.level = lv;
        fullRest(g);
      }
      const target: DistrictId = act in DISTRICTS ? (act as DistrictId) : 'tower';
      void this.session.run(s => s.goto(target), `dev:act:${act}`);
    },
    /** Play the Cutting Contest (its place arrives with the Quarter in P3). */
    cutting: () => {
      const g = this.store.game;
      if (!g) return;
      this.presenter.closeSheet();
      if (g.quests.cutting === undefined) g.quests.cutting = 'active';
      void this.session.run(cuttingContest, 'dev:cutting');
    },
    bosses: BOSS_IDS,
    acts: ACT_ORDER.filter(a => a !== 'done'),
  };

  /** New-game settings defaults (for tests). */
  static defaults(): Settings {
    return defaultSettings();
  }
}

/** The story step a boss is fought at: the step whose hint place is the boss's place. */
function bossStep(id: BossId): StoryPosition {
  const place = Object.values(PLACES).find(p => p.boss === id);
  const act = BOSSES[id].district as ActId;
  const steps = ACT_STEPS[act] as readonly string[];
  const step =
    steps.find(s => place && (ACTS[act] as Record<string, StepDef>)[s]?.hintPlace === place.id) ??
    (act === 'tower' ? 'climb_tower' : steps[steps.length - 1]!);
  return { act, step } as StoryPosition;
}
