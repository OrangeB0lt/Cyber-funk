import { derivedStats } from '@engine/index';
import { fmtDoubloons } from '@content/index';
import { Bar } from '../components/Bar';
import { useApp, useGame } from '../GameContext';
import s from './Topbar.module.css';

/**
 * Name, level, Heart, Funk and Doubloons. Tap for Status. The button's name is its visible text plus
 * a hidden "Heart 70 of 70, Funk 25 of 25. Status and skills." (Label in Name: no aria-label).
 */
export function Topbar() {
  const app = useApp();
  const g = useGame();
  if (!g) return null;
  const st = derivedStats(g);
  return (
    <header className={s.topbar}>
      <button
        type="button"
        className={s.top}
        data-testid="status"
        onClick={() => app.openSheet({ kind: 'status' })}
      >
        <span className={s.name}>
          <b>{g.name}</b> <span className="dim">Lv {g.level}</span>
        </span>
        <span className={s.bars}>
          <Bar
            kind="heart"
            name="Heart"
            decorative
            value={g.hp}
            max={st.maxHp}
            label={`♥ ${g.hp}/${st.maxHp}`}
          />
          <Bar
            kind="funk"
            name="Funk"
            decorative
            value={g.fp}
            max={st.maxFp}
            label={`♪ ${g.fp}/${st.maxFp}`}
          />
        </span>
        <span className={s.gold}>{fmtDoubloons(g.doubloons)}</span>
        <span className="sr-only">
          . Heart {g.hp} of {st.maxHp}, Funk {g.fp} of {st.maxFp}. Status and skills.
        </span>
      </button>
    </header>
  );
}
