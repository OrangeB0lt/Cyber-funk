import type { PlaceId } from '@core/ids/world';
import { PLACES, TEXT } from '@content/index';
import { Button } from '../components/Button';
import { Notes } from '../components/Notes';
import { useApp, useGame, useView } from '../GameContext';
import s from './World.module.css';

/** A place: its description, any intro text, and what you can do here. */
export function PlaceScreen() {
  const app = useApp();
  const g = useGame()!;
  const v = useView();
  const id = (v.route as { kind: 'place'; id: PlaceId }).id;
  const pl = PLACES[id];
  const intro = app.session.placeIntro(id);
  const options = app.session.placeOptions(id);
  return (
    <div className={s.screen}>
      <h1 className={s.name}>{pl.name}</h1>
      <p className="small dim">{pl.desc}</p>
      {intro?.notes && <Notes have={g.notes} />}
      {intro?.text && <p className="small">{intro.text}</p>}
      {options.length === 0 && (
        <p className="small dim" data-testid="not-built">
          {TEXT.placeNotBuilt}
        </p>
      )}
      <div className={s.list}>
        {options.map(o => (
          <Button
            key={o.key}
            testId={`opt:${o.key}`}
            className={s.place}
            variant={o.hint ? 'hint' : undefined}
            onClick={() => app.chooseOption(id, o.key)}
          >
            <span>{o.label}</span>
            {o.sub && <span className={s.pdesc}>{o.sub}</span>}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Back to the street, Menu. */
export function PlaceActions() {
  const app = useApp();
  return (
    <div className={`${s.grid} ${s.two}`}>
      <Button testId="leave" className={s.act} onClick={() => app.leavePlace()}>
        ‹ BACK TO THE STREET
      </Button>
      <Button testId="menu" variant="ghost" className={s.act} onClick={() => app.openSheet({ kind: 'menu' })}>
        MENU
      </Button>
    </div>
  );
}
