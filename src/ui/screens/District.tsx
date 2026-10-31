import type { DistrictId, PlaceId } from '@core/ids/world';
import { DISTRICTS, PLACES } from '@content/index';
import { currentStep } from '@engine/index';
import { Button } from '../components/Button';
import { useApp, useGame, useView } from '../GameContext';
import s from './World.module.css';

/** The district hub: ambient line, the next main-quest step, and the places. */
export function DistrictScreen() {
  const app = useApp();
  const g = useGame()!;
  const d = DISTRICTS[g.district];
  const v = useView();
  // The presenter advances this each time the district screen appears.
  const ambient = d.ambient[v.ambient[d.id] ?? 0];
  const hint = app.hintPlace();
  const step = currentStep(g);
  return (
    <div className={s.screen}>
      <h2 className={s.name}>{d.name}</h2>
      <div className="small dim">
        Levels {d.levels[0]}–{d.levels[1]} · Day {g.day}
      </div>
      <p className={s.ambient}>{ambient}</p>
      <div className={s.quest}>
        <span className="dim small">NEXT</span> {step.text}
        <div className="small dim">{step.def.where}</div>
      </div>
      <div className={s.list}>
        {d.places.map((pid: PlaceId) => (
          <Button
            key={pid}
            testId={`place:${pid}`}
            className={s.place}
            variant={hint === pid ? 'hint' : undefined}
            onClick={() => app.enterPlace(pid)}
          >
            <span className={s.pname}>
              {PLACES[pid].name}
              {hint === pid && <span className={s.bang}> !</span>}
            </span>
            <span className={s.pdesc}>{PLACES[pid].desc}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Hit the Streets, the bounty (when tracking), Travel, Menu. */
export function DistrictActions() {
  const app = useApp();
  const g = useGame()!;
  const bounty = g.bounty === (g.district as DistrictId);
  return (
    <div className={`${s.grid} ${bounty ? s.two : ''}`}>
      <Button testId="streets" variant="primary" className={s.act} onClick={() => app.hitTheStreets()}>
        HIT THE STREETS
      </Button>
      {bounty && (
        <Button testId="bounty" variant="gold" className={s.act} onClick={() => app.trackBounty()}>
          TRACK BOUNTY
        </Button>
      )}
      <Button testId="travel" className={s.act} onClick={() => app.openSheet({ kind: 'travel' })}>
        TRAVEL
      </Button>
      <Button testId="menu" variant="ghost" className={s.act} onClick={() => app.openSheet({ kind: 'menu' })}>
        MENU
      </Button>
    </div>
  );
}
