import { STAT_KEYS, type StatKey } from '@core/ids/combat';
import s from './StatGrid.module.css';

/** Display names for the six stats. */
export const STAT_NAMES: Record<StatKey, string> = {
  heart: 'Heart',
  funk: 'Funk',
  chops: 'Chops',
  grit: 'Grit',
  tempo: 'Tempo',
  mojo: 'Mojo',
};

/** The six stats (or level-up gains when `gains`). */
export function StatGrid({ stats, gains }: { stats: Partial<Record<StatKey, number>>; gains?: boolean }) {
  return (
    <div className={s.grid}>
      {STAT_KEYS.filter(k => !gains || (stats[k] ?? 0) > 0).map(k => (
        <div key={k} className={s.stat}>
          <span className={s.k}>{STAT_NAMES[k]}</span>
          <span className={`${s.v} ${gains ? s.plus : ''}`}>
            {gains ? '+' : ''}
            {stats[k]}
          </span>
        </div>
      ))}
    </div>
  );
}
