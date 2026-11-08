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
import { ACT_ORDER, type ActId } from '@core/ids/story';
import type { DistrictId, GlossaryId, PlaceId } from '@core/ids/world';
import type { StatusId } from '@core/ids/combat';
import { SAVE_SLOT_IDS, type SaveSlotId } from '@core/ids/saves';
import type { PlayerIntent, Settings } from '@core/types';
import { BOSSES, CLASSES, DISTRICTS, ENEMIES, GEAR, cuttingContest } from '@content/index';
import { bossStep, setupAct } from './devStates';
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
import type { CloudClient } from './save/cloud';
import { decodeSave, exportCode, importCode, type SaveSummary } from './save/format';
import { SaveSlots } from './save/slots';
import { browserKv, type KeyValue } from './save/storage';
import { CloudSync } from './save/sync';
import { ReactPresenter } from './reactPresenter';
import { Session } from './session';
import { createView, type SheetSpec, type SlotPick, type ViewState } from './view';

/** Nicknames for a player who leaves the name blank. */
const DEFAULT_NAMES = ['Lagniappe', 'Dawlin', 'Cher', 'Hotshot', "Lil' Bit"] as const;

/** The whole client-side game. */
export class GameApp {
  readonly view: ViewState = createView();
  readonly sfx: Sfx;
  readonly presenter: ReactPresenter;
  readonly session: Session;
  /** The device's save slots. The session saves to the active one. */
  readonly slots: SaveSlots;
  /** Background sync of the slots with the cloud-save server. */
  readonly cloud: CloudSync;
  /** Test speed-up (Playwright and the dev menu set it). */
  turbo = false;
  /** A conflict prompt is showing. */
  private settling = false;
  /** Cancels the conflict prompt (leaving for the title clears dialogs). */
  private conflictPrompt: AbortController | null = null;

  /**
   * `kv` is where saves live (localStorage by default). `cloud` is the cloud-save API, or null for
   * a local-only game (static builds, the local e2e suite).
   */
  constructor(opts: { kv?: KeyValue; cloud?: CloudClient | null } = {}) {
    const kv = opts.kv ?? browserKv;
    this.slots = new SaveSlots(kv);
    this.sfx = new Sfx(() => this.settings().sound);
    this.presenter = new ReactPresenter(this.view, {
      settings: () => this.settings(),
      game: () => this.session.store.game,
      sfx: this.sfx,
      turbo: () => this.turbo,
      onRoute: r => {
        const g = this.session.store.game;
        if (r.kind === 'district' && g) this.nextAmbient(g.district);
        // A conflict found mid-battle waits until the player is back on the map.
        if (this.cloud.conflicts.size) void this.settleConflicts();
      },
    });
    this.session = new Session({
      presenter: this.presenter,
      storage: this.slots.current,
      onBusy: busy => {
        this.view.busy = busy;
      },
    });
    this.cloud = new CloudSync({
      slots: this.slots,
      api: opts.cloud ?? null,
      kv,
      isPlaying: slot => !!this.session.store.game && this.slots.active === slot,
      onChange: () => this.refreshCloud(),
      onConflict: () => void this.settleConflicts(),
    });
    this.slots.subscribe(slot => this.refreshSlot(slot));
  }

  /** Boot: show what the save slots hold, then catch up with the cloud in the background. */
  start(): void {
    this.refreshCloud();
    void this.cloud.start();
  }

  /** Mirror one slot into the view (the slot picker and the title's Continue button read it). */
  private refreshSlot(slot: SaveSlotId): void {
    const i = this.view.saves.findIndex(s => s.slot === slot);
    if (i >= 0) this.view.saves[i] = { ...this.slots.info(slot), sync: this.cloud.slotState(slot) };
  }

  /** Mirror the cloud's state into the view. */
  private refreshCloud(): void {
    const c = this.cloud;
    this.view.cloud = { mode: c.mode, linked: c.linked, code: c.code, pending: c.pending };
    for (const slot of SAVE_SLOT_IDS) this.refreshSlot(slot);
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
    return this.view.saves.some(s => s.summary || s.problem);
  }

  /** Title → Continue: pick the slot to load. */
  continueGame(): void {
    this.openSheet({ kind: 'saves', mode: 'continue' });
  }

  /** Title → New Game: pick the slot to start in. */
  startNewGame(): void {
    this.openSheet({ kind: 'saves', mode: 'new' });
  }

  /** A slot was tapped in the slot picker. `raw` is the save being imported (mode 'import'). */
  async pickSlot(slot: SaveSlotId, mode: SlotPick, raw?: string): Promise<void> {
    if (this.cloud.conflicts.has(slot)) {
      await this.settleConflicts();
      if (this.cloud.conflicts.has(slot)) return;
    }
    const info = this.slots.info(slot);
    if (mode === 'continue') {
      if (!info.summary) {
        this.presenter.toast(info.problem ? "That save can't be read." : 'That slot is empty.');
        return;
      }
      this.presenter.closeSheet();
      this.slots.active = slot;
      if (this.session.load()) {
        this.presenter.toast("That save can't be read.");
        return;
      }
      void this.session.resume();
      return;
    }
    if (info.summary || info.problem) {
      const who = info.summary
        ? `${info.summary.name} (${CLASSES[info.summary.cls].name}, Lv ${info.summary.level})`
        : 'an unreadable save';
      const ok = await this.presenter.confirm(
        `Overwrite slot ${slot}?`,
        mode === 'new'
          ? `Slot ${slot} holds ${who}. A new game here replaces it when it first autosaves. Export it first if you want to keep it.`
          : `Slot ${slot} holds ${who}. The imported save replaces it.`,
        'Overwrite',
        'Cancel',
        new AbortController().signal,
      );
      if (!ok) return;
    }
    if (mode === 'new') {
      this.presenter.closeSheet();
      this.slots.active = slot;
      this.newGame();
    } else if (raw && !(await this.loadInto(slot, raw))) {
      this.presenter.toast("That code didn't work.");
    }
  }

  /** Slot picker → Delete, after a confirm. Never the slot of a game in progress. */
  async confirmDeleteSlot(slot: SaveSlotId): Promise<void> {
    if (this.store.game && slot === this.slots.active) return;
    const info = this.slots.info(slot);
    const who = info.summary ? info.summary.name : 'This save';
    const ok = await this.presenter.confirm(
      `Delete slot ${slot}?`,
      `${who} will be gone. Export first if you want it back.`,
      'Delete',
      'Keep',
      new AbortController().signal,
    );
    if (!ok) return;
    this.slots.storage(slot).clear();
    this.presenter.toast('Deleted.');
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
    this.conflictPrompt?.abort();
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
    void this.cloud.sync().then(() => this.settleConflicts());
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

  /**
   * Load a CF2: code. In a game it replaces the current slot; from the title it asks which slot.
   * False if the code isn't a save this version can load.
   */
  async importSave(code: string): Promise<boolean> {
    const raw = importCode(code);
    if (!raw || typeof decodeSave(raw) === 'string') return false;
    if (!this.store.game) {
      this.presenter.openSheet({ kind: 'saves', mode: 'import', raw });
      return true;
    }
    return this.loadInto(this.slots.active, raw);
  }

  /** Make `raw` the save in `slot` and play it. */
  private async loadInto(slot: SaveSlotId, raw: string): Promise<boolean> {
    // Stop whatever scene is running before the save underneath it changes.
    await this.session.director.abort('import');
    this.slots.active = slot;
    if (this.session.load(raw)) return false;
    this.session.save();
    this.presenter.closeSheet();
    this.presenter.toast('Save loaded.');
    void this.session.resume();
    return true;
  }

  /** Settings → Delete Save, after a confirm. */
  async confirmReset(): Promise<void> {
    this.presenter.closeSheet();
    const ok = await this.presenter.confirm(
      'Delete this save?',
      `This erases slot ${this.slots.active}. The city will not remember you. Export first if you want it back.`,
      'Erase',
      'Keep',
      new AbortController().signal,
    );
    if (ok) await this.resetGame();
  }

  /** Erase the current slot and go to the title. */
  async resetGame(): Promise<void> {
    this.slots.current.clear();
    await this.toTitle();
    this.presenter.toast('Deleted.');
  }

  /* ---------------- cloud saves ---------------- */

  /**
   * Ask about each slot another device changed, one at a time, never during a battle. The running
   * game's slot is offered as "load theirs or keep playing"; others as "use theirs or keep mine".
   */
  private async settleConflicts(): Promise<void> {
    if (this.settling) return;
    this.settling = true;
    const asked = new Set<SaveSlotId>();
    try {
      for (;;) {
        if (this.view.battle) return;
        const next = [...this.cloud.conflicts].find(([slot]) => !asked.has(slot));
        if (!next) return;
        const [slot, remote] = next;
        asked.add(slot);
        const playing = !!this.store.game && this.slots.active === slot;
        const mine = this.slots.info(slot).summary;
        const theirs = remote.summary ? describe(remote.summary, remote.savedAt) : null;
        const body = !theirs
          ? `Another device deleted slot ${slot}.`
          : !mine && !playing
            ? `You deleted slot ${slot} here, but another device saved ${theirs}. Keep their save?`
            : playing
              ? `Another device saved ${theirs}. Load that save, or keep playing here? Your next save replaces it.`
              : `Another device saved ${theirs}. Use that save, or keep this device's (${describe(mine!)})?`;
        this.conflictPrompt = new AbortController();
        const takeTheirs = await this.presenter.confirm(
          `Slot ${slot} changed on another device`,
          body,
          playing ? 'Load theirs' : mine ? 'Use theirs' : 'Keep theirs',
          mine || playing ? 'Keep mine' : 'Delete it',
          this.conflictPrompt.signal,
        );
        if (!takeTheirs) {
          await this.cloud.keepLocal(slot);
        } else if (!(await this.cloud.takeRemote(slot))) {
          this.presenter.toast("Couldn't download it. It'll ask again later.");
        } else if (playing) {
          await this.session.director.abort('import');
          if (!this.session.load()) {
            this.presenter.toast("Loaded the other device's save.");
            void this.session.resume();
          }
        }
      }
    } catch {
      // The prompt was cancelled (back to the title): it asks again after the next sync.
    } finally {
      this.settling = false;
      this.conflictPrompt = null;
    }
  }

  /** Settings → Use a player code. */
  async linkCode(code: string): Promise<boolean> {
    const r = await this.cloud.link(code);
    this.presenter.toast(
      r === 'ok'
        ? 'Linked. Your saves are syncing.'
        : r === 'bad-code'
          ? "That player code didn't work."
          : "Can't reach the server right now.",
    );
    return r === 'ok';
  }

  /** Settings → Unlink this device, after a confirm. */
  async confirmUnlink(): Promise<void> {
    const ok = await this.presenter.confirm(
      'Unlink this device?',
      'Your saves stay on this device and in the cloud. Keep your player code to link again. This device gets a new code the next time it saves.',
      'Unlink',
      'Cancel',
      new AbortController().signal,
    );
    if (!ok) return;
    this.cloud.unlink();
    this.presenter.toast('Unlinked.');
  }

  /** Slot picker → History: the slot's checkpoints on the server. */
  async openHistory(slot: SaveSlotId): Promise<void> {
    this.view.history = { slot, entries: null, failed: false };
    this.openSheet({ kind: 'history', slot });
    const entries = await this.cloud.history(slot);
    if (this.view.history?.slot !== slot) return;
    this.view.history = { slot, entries, failed: entries === null };
  }

  /** History → Restore, after a confirm. Only from the title (never under a running game). */
  async confirmRestore(
    slot: SaveSlotId,
    revision: number,
    summary: SaveSummary,
    savedAt: string,
  ): Promise<void> {
    if (this.store.game) return;
    const ok = await this.presenter.confirm(
      'Restore this checkpoint?',
      `Slot ${slot} goes back to ${describe(summary, savedAt)}, on every device. The current save stays in the history.`,
      'Restore',
      'Cancel',
      new AbortController().signal,
    );
    if (!ok) return;
    if (await this.cloud.restore(slot, revision)) {
      this.presenter.toast('Restored.');
      this.presenter.openSheet({ kind: 'saves', mode: 'continue' });
    } else {
      this.presenter.toast("Couldn't restore it. Check your connection.");
    }
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
      const target = setupAct(g, act);
      void this.session.run(s => s.goto(target), `dev:act:${act}`);
    },
    /** Jump into the Cutting Contest at Club Feu Follet (offering it first if needed). */
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

/** "Dawlin (Trumpet, Lv 4) in Tremé, Oct 31 10:42": a save in one line, for dialogs. */
function describe(s: SaveSummary, savedAt?: string): string {
  const when = savedAt
    ? ', ' +
      new Date(savedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';
  return `${s.name} (${CLASSES[s.cls].name}, Lv ${s.level}) in ${DISTRICTS[s.district].name}${when}`;
}
