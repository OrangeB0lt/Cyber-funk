import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import type { Snapshot } from 'valtio';
import type { ActorView } from '@app/view';
import { CLASSES } from '@content/index';
import { actorSprite, heroSprite } from '@content/sprites';
import { Bar } from '../components/Bar';
import { StatusChips } from '../components/Chips';
import { Sprite } from '../components/Sprite';
import { Tone } from '../components/Tone';
import { useGame, useView } from '../GameContext';
import { resetBattleInput, useTargeting } from './targeting';
import s from './Battle.module.css';

/**
 * Damage and heal numbers rising from an actor's sprite. They spread across a fixed-width strip that
 * starts at the sprite, so several in a row stay readable and even a big "✦18 WEAK!" stays on screen.
 */
function Floats({ id }: { id: string }) {
  const v = useView();
  return (
    <span className={s.floats} aria-hidden="true">
      {v
        .battle!.floats.filter(f => f.target === id)
        .map(f => (
          <span
            key={f.id}
            className={`${s.float} ${f.big ? s.big : ''}`}
            style={{ color: f.color, left: `${f.x}%` } as CSSProperties}
          >
            {f.text}
          </span>
        ))}
    </span>
  );
}

/** The newest damage number still floating over an actor: its sprite flashes once per new one. */
function useLastHit(id: string): number | null {
  const v = useView();
  return v.battle!.floats.filter(f => f.target === id && f.kind === 'dmg').at(-1)?.id ?? null;
}

/** Where in the idle bob an actor starts, from its id, so a group doesn't bob in unison. */
function bobPhase(id: string): number {
  let h = 7;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return (h % 100) / 100;
}

function EnemyCard({ e }: { e: Snapshot<ActorView> }) {
  const v = useView();
  const g = useGame()!;
  const targeting = useTargeting();
  const hit = useLastHit(e.id);
  const book = e.defId === 'player' ? undefined : g.book[e.defId];
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
      <div className={s.cardBody}>
        <span className={s.portrait}>
          <Sprite id={actorSprite(e, g.cls)} scale={3} idle={e.alive} hit={hit} phase={bobPhase(e.id)} />
          <Floats id={e.id} />
        </span>
        <div className={s.info}>
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
        </div>
      </div>
    </button>
  );
}

/** You: your hero, name, level and class, the Big Four beat (Bass Drum), and your three bars. */
function PlayerPanel({ p, active }: { p: Snapshot<ActorView>; active: boolean }) {
  const g = useGame()!;
  const hit = useLastHit(p.id);
  return (
    <div className={`${s.player} ${active ? s.active : ''}`} data-testid="pstat">
      <div className={s.pbody}>
        <span className={s.hero}>
          <Sprite id={heroSprite(g.cls)} scale={2} idle hit={hit} phase={0.5} />
          <Floats id={p.id} />
        </span>
        <div className={s.pinfo}>
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
        </div>
      </div>
    </div>
  );
}

const SHAKE: Keyframe[] = [
  { transform: 'none' },
  { transform: 'translateX(-5px)', offset: 0.25 },
  { transform: 'translateX(5px)', offset: 0.75 },
  { transform: 'none' },
];
const FLASH: Keyframe[] = [{ filter: 'brightness(2.2)' }, { filter: 'none' }];

/**
 * Plays `frames` on the element each time `count` goes up. Web Animations instead of a remount, so
 * the enemy list keeps its scroll position and nothing inside restarts. Global CSS can't reach these,
 * so reduce motion (the setting or the OS preference) is checked here.
 */
function useReplay(
  ref: RefObject<HTMLElement | null>,
  count: number,
  frames: Keyframe[],
  ms: number,
  calm: boolean,
) {
  useEffect(() => {
    if (!count || calm || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    ref.current?.animate(frames, { duration: ms });
  }, [ref, count, frames, ms, calm]);
}

/** The battle screen: enemies, the log, and you. */
export function BattleScreen() {
  const v = useView();
  const g = useGame()!;
  const b = v.battle;
  const root = useRef<HTMLDivElement>(null);
  useEffect(resetBattleInput, []);
  useReplay(root, b?.shake ?? 0, SHAKE, 300, g.settings.reduceMotion);
  useReplay(root, b?.flash ?? 0, FLASH, 400, g.settings.reduceMotion);
  if (!b) return null;
  const p = b.player;
  return (
    <div ref={root} className={s.battle}>
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
      <PlayerPanel p={p} active={b.active === p.id} />
    </div>
  );
}
