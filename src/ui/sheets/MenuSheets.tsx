/** The pause-menu sheets: Menu, Status & Skills, Bag, Gear, Band, Journal, Blue Book, Lexicon. */
import type { GearSlot } from '@core/ids/items';
import type { SkillId } from '@core/ids/combat';
import type { ItemId } from '@core/ids/items';
import { GEAR_SLOTS } from '@core/ids/items';
import type { GlossaryDef } from '@core/types';
import {
  BANDMATES,
  BOSSES,
  CLASSES,
  DISTRICTS,
  ENEMIES,
  GEAR,
  GLOSSARY,
  ITEMS,
  LEVEL_CAP,
  QUESTS,
  ROOTS,
  SHEET_MUSIC,
  SKILLS,
  SKILL_LEVELS,
  STATUSES,
  fmtDoubloons,
} from '@content/index';
import { currentStep, displayStats, gearForSlot, questProgress, xpToNext } from '@engine/index';
import { Bar } from '../components/Bar';
import { Button } from '../components/Button';
import { ItemRow } from '../components/ItemRow';
import { Notes } from '../components/Notes';
import { StatGrid } from '../components/StatGrid';
import { Tone } from '../components/Tone';
import { useApp, useGame, useView } from '../GameContext';
import { gearStats } from './format';
import { Sheet } from './Sheet';
import s from './Sheet.module.css';

export function MenuSheet() {
  const app = useApp();
  const items = [
    ['status', 'Status & Skills'],
    ['bag', 'Bag'],
    ['gear', 'Gear'],
    ['band', 'Band'],
    ['journal', 'Journal'],
    ['book', 'Blue Book'],
    ['lexicon', 'Lexicon'],
    ['settings', 'Settings'],
  ] as const;
  return (
    <Sheet title="Menu">
      <div className={s.menu}>
        {items.map(([k, label]) => (
          <Button
            key={k}
            testId={`m:${k}`}
            onClick={() =>
              app.openSheet(
                k === 'bag'
                  ? { kind: 'bag', battle: false }
                  : k === 'settings'
                    ? { kind: 'settings', fromTitle: false }
                    : { kind: k },
              )
            }
          >
            {label}
          </Button>
        ))}
        <Button
          testId="m:save"
          onClick={() => {
            app.save();
            app.closeSheet();
          }}
        >
          Save
        </Button>
        <Button testId="m:title" variant="ghost" onClick={() => void app.confirmToTitle()}>
          Title Screen
        </Button>
      </div>
    </Sheet>
  );
}

function SkillRow({ id, locked }: { id: SkillId; locked?: boolean }) {
  const sk = SKILLS[id];
  const dmg = sk.effects.find(f => f.kind === 'dmg');
  const tone = sk.tone ?? (dmg && 'tone' in dmg ? dmg.tone : undefined);
  return (
    <div className={`${s.skill} ${locked ? s.locked : ''}`}>
      <div className={s.skillHead}>
        <b>{sk.name}</b>
        {tone && <Tone tone={tone} />}
        <span className="dim">
          {sk.solo ? 'SOLO' : sk.riff ? 'RIFF' : `${sk.fp} FP`}
          {sk.level ? ` · L${sk.level}` : ''}
          {sk.once ? ' · once/battle' : ''}
        </span>
      </div>
      <div className="small">{sk.desc}</div>
    </div>
  );
}

export function StatusSheet() {
  const g = useGame()!;
  const c = CLASSES[g.cls];
  const r = ROOTS[g.roots];
  const need = g.level >= LEVEL_CAP ? null : xpToNext(g.level);
  const nf = g.nextFight;
  return (
    <Sheet title="Status & Skills" back>
      <div className={s.card2}>
        <div>
          <b>{g.name}</b> · {c.name} ({c.title}) · {r.name}
        </div>
        <div className="dim">
          Level {g.level}
          {need ? ` · XP ${g.xp}/${need}` : ' · MAX'} · Day {g.day}
          {g.ngPlus ? ` · NG+${g.ngPlus}` : ''}
        </div>
        {need && <Bar kind="xp" name="Experience" value={g.xp} max={need} />}
        <StatGrid stats={displayStats(g)} />
        <div className="small dim">
          Tones:{' '}
          {c.tones.map(t => (
            <Tone key={t} tone={t} />
          ))}
          {c.bigFour ? ' · Passive: Big Four (beat 4 hits +60%)' : ''}
        </div>
        {g.mealBuff && (
          <div className="small good">
            Meal buff: +{Math.round(g.mealBuff.chops * 100)}% Chops & Grit for {g.mealBuff.fights} more fight
            {g.mealBuff.fights === 1 ? '' : 's'}.
          </div>
        )}
        {g.dreamBuff && (
          <div className="small good">
            Sweet Dreams: +10% Chops & Grit, +20% Mojo for {g.dreamBuff.fights} more fight
            {g.dreamBuff.fights === 1 ? '' : 's'}.
          </div>
        )}
        {nf && (
          <div className="small good">
            Next fight: {nf.groove ? `+${nf.groove} Groove ` : ''}
            {nf.mojo ? `${nf.mojo > 0 ? '+' : ''}${nf.mojo} Mojo ` : ''}
            {nf.hyped ? 'Hyped ' : ''}
            {nf.pocket ? 'In the Pocket ' : ''}
            {nf.status ? STATUSES[nf.status].name : ''}
          </div>
        )}
      </div>
      <h4>Riff</h4>
      <SkillRow id={c.riff} />
      <h4>Skills</h4>
      {c.skills.map((id, i) => (
        <SkillRow key={id} id={id} locked={g.level < SKILL_LEVELS[i]!} />
      ))}
      <h4>Solo (100 Groove)</h4>
      <SkillRow id={c.solo} />
      {g.sheet.length > 0 && (
        <>
          <h4>Sheet Music</h4>
          {g.sheet.map(id => (
            <div key={id} className="small">
              • <b>{SHEET_MUSIC[id].name}</b>: {SHEET_MUSIC[id].desc}
            </div>
          ))}
        </>
      )}
      <h4>Blue Notes</h4>
      <Notes have={g.notes} />
    </Sheet>
  );
}

export function BagSheet({ battle }: { battle: boolean }) {
  const app = useApp();
  const g = useGame()!;
  const ids = (Object.keys(g.bag) as ItemId[]).filter(id => ITEMS[id]);
  return (
    <Sheet title="Bag" back={!battle}>
      {ids.length ? (
        ids.map(id => {
          const it = ITEMS[id];
          const usable = battle ? it.battle : it.field;
          return (
            <ItemRow
              key={id}
              action={
                usable ? (
                  <Button testId={`use:${id}`} small variant="primary" onClick={() => app.useItem(id)}>
                    Use
                  </Button>
                ) : (
                  <span className="dim small">
                    {it.key
                      ? 'key item'
                      : it.passive
                        ? 'automatic'
                        : battle
                          ? 'not in battle'
                          : 'battle only'}
                  </span>
                )
              }
            >
              <b>{it.name}</b> <span className="dim">×{g.bag[id]}</span>
              <div className="small">{it.desc}</div>
            </ItemRow>
          );
        })
      ) : (
        <p className="dim">Your bag is empty. Mama Roux would be worried.</p>
      )}
      {g.keyItems.length > 0 && (
        <>
          <h4>Key Items</h4>
          {g.keyItems.map(k => (
            <div key={k} className="small">
              • {ITEMS[k]?.name ?? k}
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}

const SLOT_NAMES: Record<GearSlot, string> = {
  instrument: 'Instrument',
  threads: 'Threads',
  charm: 'Charm',
  mod: 'Mod',
};

export function GearSheet() {
  const app = useApp();
  const g = useGame()!;
  return (
    <Sheet title="Gear" back>
      {GEAR_SLOTS.map(sl => {
        const id = g.gear[sl];
        const gd = id ? GEAR[id] : null;
        return (
          <ItemRow
            key={sl}
            action={
              <Button testId={`slot:${sl}`} small onClick={() => app.openSheet({ kind: 'slot', slot: sl })}>
                Change
              </Button>
            }
          >
            <span className="dim small">{SLOT_NAMES[sl]}</span>
            <br />
            <b>{gd ? gd.name : '— empty —'}</b>
            <div className="small">{gd ? gearStats(gd) : ''}</div>
          </ItemRow>
        );
      })}
      <StatGrid stats={displayStats(g)} />
    </Sheet>
  );
}

export function SlotSheet({ slot }: { slot: GearSlot }) {
  const app = useApp();
  const g = useGame()!;
  const owned = gearForSlot(g, slot);
  return (
    <Sheet title={`Change ${slot}`} back>
      {owned.length ? (
        owned.map(id => {
          const gd = GEAR[id];
          const eq = g.gear[slot] === id;
          return (
            <ItemRow
              key={id}
              equipped={eq}
              action={
                !eq && (
                  <Button testId={`equip:${id}`} small variant="primary" onClick={() => app.equip(id)}>
                    Equip
                  </Button>
                )
              }
            >
              <b>{gd.name}</b>
              {eq && <span className="good small"> equipped</span>}
              <div className="small">{gearStats(gd)}</div>
              <div className="small dim">{gd.desc}</div>
            </ItemRow>
          );
        })
      ) : (
        <p className="dim">Nothing for this slot yet.</p>
      )}
      {slot !== 'instrument' && g.gear[slot] && (
        <Button testId="unequip" variant="ghost" wide onClick={() => app.unequip(slot)}>
          Unequip
        </Button>
      )}
    </Sheet>
  );
}

export function BandSheet() {
  const app = useApp();
  const g = useGame()!;
  const v = useView();
  const canSwap = v.screen !== 'battle';
  return (
    <Sheet title="Band (bring up to 2)" back>
      {g.band.recruited.length ? (
        g.band.recruited.map(id => {
          const bm = BANDMATES[id];
          const on = g.band.active.includes(id);
          const assist = SKILLS[bm.assist];
          return (
            <ItemRow
              key={id}
              equipped={on}
              action={
                <Button
                  testId={`tog:${id}`}
                  small
                  variant={on ? 'ghost' : 'primary'}
                  onClick={() => app.toggleBandmate(id)}
                >
                  {on ? 'Bench' : 'Bring'}
                </Button>
              }
            >
              <b style={{ color: bm.color }}>{bm.name}</b> <span className="dim small">{bm.inst}</span>
              <div className="small">
                Passive: {bm.passiveDesc}. Assist (every 3rd round): <b>{assist.name}</b> — {assist.desc}
              </div>
              <div className="small dim">{bm.arc}</div>
            </ItemRow>
          );
        })
      ) : (
        <p className="dim">
          No bandmates yet. Win the Cutting Contest at Club Feu Follet, free Static in Storyville, defend the
          Fais Do-Do, and lay the haints to rest.
        </p>
      )}
      {!canSwap && <p className="dim small">Swap bandmates at the Lagniappe club.</p>}
    </Sheet>
  );
}

export function JournalSheet() {
  const g = useGame()!;
  const step = currentStep(g);
  const sides = Object.values(QUESTS).filter(q => g.quests[q.id]);
  const bounty = g.bounty ? DISTRICTS[g.bounty] : null;
  return (
    <Sheet title="Journal" back>
      <h4>Main Quest</h4>
      <div className={s.card2}>
        <b>{step.text}</b>
        <div className="small dim">Where: {step.def.where}</div>
      </div>
      {bounty && (
        <ItemRow>
          <b>Bounty: {ENEMIES[bounty.elite].name}</b>
          <div className="small">
            Track it from the {bounty.name} district screen. Pays {fmtDoubloons(bounty.bountyGold)}.
          </div>
        </ItemRow>
      )}
      <h4>Side Quests</h4>
      {sides.length ? (
        sides.map(q => {
          const st = g.quests[q.id];
          return (
            <ItemRow key={q.id}>
              <b>{q.name}</b>{' '}
              <span className={`${st === 'done' ? 'good' : 'gold'} small`}>
                {st === 'done' ? 'DONE' : 'active' + questProgress(g, q)}
              </span>
              <div className="small">{q.desc}</div>
              <div className="small dim">Reward: {q.reward}</div>
            </ItemRow>
          );
        })
      ) : (
        <p className="dim">No side quests yet. Talk to people.</p>
      )}
      <h4>Blue Notes</h4>
      <Notes have={g.notes} />
    </Sheet>
  );
}

export function BookSheet() {
  const g = useGame()!;
  const seen = Object.keys(g.book).filter(id => id in ENEMIES || id in BOSSES) as (keyof typeof g.book)[];
  return (
    <Sheet title="Blue Book" back>
      <p className="small dim">
        The bestiary, named after Storyville's old guidebook. Weaknesses appear once you've found them.
      </p>
      {seen.length ? (
        seen.map(id => {
          const boss = id in BOSSES ? BOSSES[id as keyof typeof BOSSES] : null;
          const enemy = id in ENEMIES ? ENEMIES[id as keyof typeof ENEMIES] : null;
          const d = (boss ?? enemy)!;
          const bk = g.book[id]!;
          const lv = enemy ? `L${enemy.levels[0]}–${enemy.levels[1]}` : `L${boss!.level}`;
          const known = bk.weak || bk.hint;
          return (
            <ItemRow key={id}>
              <b>{d.name}</b>{' '}
              <span className="dim small">
                {lv}
                {enemy?.machine ? ' · machine' : ''}
                {enemy?.elite ? ' · elite' : ''}
                {boss ? ' · boss' : ''}
              </span>
              <div className="small">
                Weak: {known ? <Tone tone={d.weak} /> : <span className="dim">?</span>} · Resists:{' '}
                {known ? d.resist ? <Tone tone={d.resist} /> : 'nothing' : <span className="dim">?</span>}
              </div>
              <div className="small dim">{d.book}</div>
            </ItemRow>
          );
        })
      ) : (
        <p className="dim">Nobody in the book yet. Hit the streets.</p>
      )}
    </Sheet>
  );
}

export function LexiconSheet() {
  const g = useGame()!;
  const cats = new Map<string, GlossaryDef[]>();
  for (const k of g.lexicon) {
    const e = GLOSSARY[k];
    if (!e) continue;
    cats.set(e.cat, [...(cats.get(e.cat) ?? []), e]);
  }
  return (
    <Sheet title="Lagniappe Lexicon" back>
      <p className="small dim">
        {g.lexicon.length} of {Object.keys(GLOSSARY).length} terms met.
      </p>
      {cats.size ? (
        [...cats.keys()].sort().map(c => (
          <div key={c}>
            <h4>{c}</h4>
            {cats.get(c)!.map(e => (
              <div key={e.id} className="small">
                <b>{e.term}</b>
                {e.pron && <span className="dim"> ({e.pron})</span>}: {e.def}
              </div>
            ))}
          </div>
        ))
      ) : (
        <p className="dim">Tap the dotted words in dialogue to learn them. They get saved here.</p>
      )}
    </Sheet>
  );
}
