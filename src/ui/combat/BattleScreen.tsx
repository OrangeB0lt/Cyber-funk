import { useEffect, type CSSProperties } from 'react';
import type { Snapshot } from 'valtio';
import type { ActorView } from '@app/view';
import { CLASSES } from '@content/index';
import { Bar } from '../components/Bar';
import { StatusChips } from '../components/Chips';
import { Tone } from '../components/Tone';
import { useGame, useView } from '../GameContext';
import { resetBattleInput, useTargeting } from './targeting';
import s from './Battle.module.css';

function Floats({ id }: { id: string }) {
  const v = useView();
  return (
    <>
      {v
        .battle!.floats.filter(f => f.target === id)
        .map(f => (
          <span
            key={f.id}
            className={`${s.float} ${f.big ? s.big : ''}`}
            style={{ color: f.color, left: `${f.x}%` } as CSSProperties}
            aria-hidden="true"
          >
            {f.text}
          </span>
        ))}
    </>
  );
}

function EnemyCard({ e }: { e: Snapshot<ActorView> }) {
  const v = useView();
  const g = useGame()!;
  const targeting = useTargeting();
  const book = g.book[e.defId as keyof typeof g.book];
  const known = !!(book?.weak || book?.hint);
  const canTarget = !!targeting.pending && e.alive;
  const cls = [
    s.card,
    e.boss && s.boss,
    !e.alive && s.dead,
    v.battle!.active === e.id && s.active,
    canTarget && s.targetable,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      data-testid={`target:${e.id}`}
      disabled={!canTarget}
      aria-label={`${e.name}, level ${e.level}, ${Math.max(0, e.hp)} of ${e.maxHp} Heart${canTarget ? '. Tap to target.' : ''}`}
      onClick={() => targeting.pick(e.id)}
    >
      <div className={s.head}>
        <b>{e.name}</b>
        <span className="dim small">
          Lv {e.level}
          {e.elite ? ' ★' : ''}
        </span>
      </div>
      <Bar
        kind="enemy"
        compact
        name={`${e.name} Heart`}
        value={e.hp}
        max={e.maxHp}
        label={`${Math.max(0, e.hp)}/${e.maxHp}`}
      />
      <StatusChips statuses={e.statuses} />
      <div className="small dim">
        {known && e.weak ? (
          <>
            Weak <Tone tone={e.weak} />
            {e.resist && (
              <>
                {' '}
                · Resists <Tone tone={e.resist} />
              </>
            )}
          </>
        ) : (
          'Weakness: ?'
        )}
      </div>
      <Floats id={e.id} />
    </button>
  );
}

/** The battle screen: enemies, the log, and you. */
export function BattleScreen() {
  const v = useView();
  const g = useGame()!;
  const b = v.battle;
  useEffect(resetBattleInput, []);
  if (!b) return null;
  const p = b.player;
  return (
    <div
      key={`${b.shake}-${b.flash}`}
      className={`${s.battle} ${b.shake ? s.shake : ''} ${b.flash ? s.flash : ''}`}
    >
      <div className={s.enemies}>
        {b.enemies.map(e => (
          <EnemyCard key={e.id} e={e} />
        ))}
      </div>
      <div className={s.log} aria-live="polite" data-testid="battle-log">
        {b.log.slice(-6).map(l => (
          <div key={l.id} className={s[l.cls === 'boss' ? 'boss-line' : l.cls] ?? ''}>
            {l.text}
          </div>
        ))}
      </div>
      <div className={`${s.player} ${b.active === p.id ? s.active : ''}`} data-testid="pstat">
        <div className={s.pname}>
          <b>{g.name}</b>{' '}
          <span className="dim small">
            Lv {g.level} · {CLASSES[g.cls].name}
          </span>
          {p.bigFour && (
            <span className={s.beat} aria-label={`Beat ${p.beat} of 4`}>
              {[1, 2, 3, 4].map(n => (
                <i key={n} className={`${p.beat === n ? s.on : ''} ${n === 4 ? s.four : ''}`}>
                  {n}
                </i>
              ))}
            </span>
          )}
        </div>
        <Bar
          kind="heart"
          name="Heart"
          value={p.hp}
          max={p.maxHp}
          label={`♥ ${Math.max(0, p.hp)}/${p.maxHp}`}
        />
        <Bar kind="funk" name="Funk" value={p.fp} max={p.maxFp} label={`♪ ${p.fp}/${p.maxFp}`} />
        <Bar
          kind="groove"
          name="Groove"
          value={p.groove}
          max={100}
          full={p.groove >= 100}
          label={`GROOVE ${p.groove}${p.groove >= 100 ? ' — SOLO READY' : ''}`}
        />
        <StatusChips statuses={p.statuses} guard={p.guard} />
        <Floats id={p.id} />
      </div>
    </div>
  );
}
