import { useEffect, useRef, useState } from 'react';
import { NOTE_IDS } from '@core/ids/enemies';
import { NOTES } from '@content/index';
import { BLUES_LEAD_MS, BLUES_STEP_MS, TIMING_LEAD_MS, bluesLabel, scoreBlues } from '@engine/index';
import { useApp, useView } from '../GameContext';
import s from './Timing.module.css';

/** On the One: the marker sweeps; tap (or press Space/Enter) as it crosses the gold ONE zone. */
function TimingBar() {
  const app = useApp();
  const v = useView();
  const t = v.timing as Extract<typeof v.timing, { kind: 'bar' }>;
  const marker = useRef<HTMLDivElement>(null);
  const phase = useRef(0);
  const done = useRef(false);
  const tap = () => {
    if (done.current) return;
    done.current = true;
    app.tap(phase.current);
  };

  useEffect(() => {
    done.current = false;
    const { durationMs } = t.spec;
    const start = performance.now() + TIMING_LEAD_MS;
    let raf = 0;
    const frame = (now: number) => {
      if (done.current) return;
      phase.current = Math.max(0, Math.min(1, (now - start) / durationMs));
      if (marker.current) marker.current.style.left = `${phase.current * 100}%`;
      if (phase.current >= 1) {
        done.current = true;
        app.tap(null);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const safety = setTimeout(() => {
      if (!done.current) {
        done.current = true;
        app.tap(null);
      }
    }, durationMs + 1500);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id]);

  const { center, one, pocket, loose } = t.spec;
  const zone = (cls: string, half: number) => (
    <div
      className={`${s.zone} ${cls}`}
      style={{ left: `${(center - half) * 100}%`, width: `${half * 200}%` }}
    />
  );
  return (
    <button
      type="button"
      className={s.timing}
      onPointerDown={e => (e.preventDefault(), tap())}
      data-testid="timing"
      aria-label="Tap on the one"
    >
      <div className={s.label}>
        TAP ON THE <b>ONE</b>
      </div>
      <div className={s.track}>
        {zone(s.loose!, loose)}
        {zone(s.pocket!, pocket)}
        {zone(s.one!, one)}
        <div ref={marker} className={s.marker} />
      </div>
      <div className={s.result} style={{ color: t.result?.color }} role="status">
        {t.result?.label}
      </div>
      <div className={s.hint}>tap anywhere</div>
    </button>
  );
}

/** Play the Blues: six pads light in turn; tap each as it lights. */
function BluesPads() {
  const app = useApp();
  const v = useView();
  const t = v.timing as Extract<typeof v.timing, { kind: 'blues' }>;
  const [lit, setLit] = useState(-1);
  const [scores, setScores] = useState<number[]>([]);
  const taps = useRef<number[]>([]);
  const start = useRef(0);
  const finished = useRef(false);
  const tap = () => {
    if (finished.current) return;
    const at = performance.now() - start.current;
    taps.current.push(at);
    setScores(scoreBlues(taps.current).scores);
    const idx = Math.max(0, Math.min(NOTE_IDS.length - 1, Math.round(at / BLUES_STEP_MS)));
    app.sfx.note(NOTES[NOTE_IDS[idx]!].freq);
  };

  useEffect(() => {
    start.current = performance.now() + BLUES_LEAD_MS;
    finished.current = false;
    let raf = 0;
    const end = () => {
      if (finished.current) return;
      finished.current = true;
      const r = scoreBlues(taps.current);
      app.bluesDone(taps.current, bluesLabel(r.accuracy));
    };
    const frame = (now: number) => {
      const idx = Math.floor((now - start.current) / BLUES_STEP_MS);
      if (idx >= 0 && idx < NOTE_IDS.length) setLit(idx);
      if (now - start.current > BLUES_STEP_MS * NOTE_IDS.length + 350) return end();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const safety = setTimeout(end, BLUES_STEP_MS * NOTE_IDS.length + 3000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id]);

  return (
    <button
      type="button"
      className={s.timing}
      onPointerDown={e => (e.preventDefault(), tap())}
      data-testid="blues"
      aria-label="Play the Blues: tap each note as it lights"
    >
      <div className={s.label}>PLAY THE BLUES · tap each note as it lights</div>
      <div className={s.pads}>
        {NOTE_IDS.map((n, i) => (
          <div
            key={n}
            className={[
              s.pad,
              lit === i && s.lit,
              (scores[i] ?? 0) > 0 && s.hit,
              (scores[i] ?? 0) > 0.7 && s.perfect,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {NOTES[n].name.replace(/\s*\(.*\)/, '')}
            <small>{n.replace('b', '♭')}</small>
          </div>
        ))}
      </div>
      <div className={s.result} role="status">
        {t.result}
      </div>
    </button>
  );
}

/** The timing layer over the battle: the bar, an auto-rhythm result, or the Blues pads. */
export function TimingOverlay() {
  const v = useView();
  const t = v.timing;
  if (!t) return null;
  return (
    <div className={s.overlay}>
      {t.kind === 'bar' && <TimingBar key={t.id} />}
      {t.kind === 'blues' && <BluesPads key={t.id} />}
      {t.kind === 'auto' && (
        <div className={s.timing} data-testid="timing">
          <div className={s.result} style={{ color: t.grade.color }} role="status">
            {t.grade.label}
          </div>
          <div className="small dim" style={{ textAlign: 'center' }}>
            auto rhythm
          </div>
        </div>
      )}
    </div>
  );
}
