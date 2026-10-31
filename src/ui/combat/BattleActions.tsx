import { useSnapshot } from 'valtio';
import { SKILLS } from '@content/index';
import type { DamageEffect } from '@core/types';
import { Button } from '../components/Button';
import { Tone } from '../components/Tone';
import { useApp, useView } from '../GameContext';
import { battleInput, resetBattleInput, withTarget } from './targeting';
import s from './BattleActions.module.css';

/** The six battle actions (plus PLAY THE BLUES), the skill picker, and target selection. */
export function BattleActions() {
  const app = useApp();
  const v = useView();
  const input = useSnapshot(battleInput);
  const legal = v.battle?.legal;
  if (!legal) return <div className={`${s.wait} small dim`}>…</div>;
  const act = app.chooseIntent.bind(app);

  if (input.pending) {
    return (
      <div className={s.select}>
        <div className="small">Tap a target</div>
        <Button testId="cancel" variant="ghost" wide onClick={resetBattleInput}>
          Cancel
        </Button>
      </div>
    );
  }

  if (input.menu === 'skills') {
    return (
      <>
        <div className={s.skills}>
          {legal.skills.map(sc => {
            const sk = SKILLS[sc.id];
            const dmg = sk.effects.find((f): f is DamageEffect => f.kind === 'dmg');
            const tone = sk.tone ?? dmg?.tone;
            return (
              <Button
                key={sc.id}
                testId={`skill:${sc.id}`}
                className={s.skill}
                inactive={!sc.usable}
                onClick={() => {
                  if (!sc.usable) return app.presenter.toast(sc.reason ?? 'Not now.');
                  if (sc.needsTarget)
                    withTarget(app, legal.targets, id => ({ type: 'play', skillId: sc.id, targetId: id }));
                  else {
                    resetBattleInput();
                    act({ type: 'play', skillId: sc.id });
                  }
                }}
              >
                <span className={s.sname}>
                  {sk.name} {tone && <Tone tone={tone} />}
                </span>
                <span className={s.sfp}>
                  {sk.fp} FP{sk.once ? (sc.reason === 'Once per battle.' ? ' · used' : ' · once') : ''}
                </span>
                <span className={s.sdesc}>{sk.desc}</span>
              </Button>
            );
          })}
        </div>
        <Button testId="back" variant="ghost" wide onClick={resetBattleInput}>
          ‹ Back
        </Button>
      </>
    );
  }

  return (
    <>
      {legal.canBlues && (
        <Button
          testId="act:blues"
          className={s.blues}
          variant="primary"
          wide
          onClick={() => act({ type: 'blues', accuracy: 0 })}
        >
          ♪ PLAY THE BLUES ♪
        </Button>
      )}
      <div className={s.grid}>
        <Button
          testId="act:riff"
          className={s.act}
          onClick={() => withTarget(app, legal.targets, id => ({ type: 'riff', targetId: id }))}
        >
          RIFF
        </Button>
        <Button
          testId="act:play"
          className={s.act}
          inactive={!legal.canPlay}
          onClick={() =>
            legal.canPlay ? (battleInput.menu = 'skills') : app.presenter.toast("You're Muted.")
          }
        >
          PLAY
        </Button>
        <Button
          testId="act:solo"
          className={`${s.act} ${legal.canSolo ? s.ready : ''}`}
          inactive={!legal.canSolo}
          onClick={() => {
            if (!legal.canSolo)
              return app.presenter.toast(legal.muted ? "You're Muted." : 'Build 100 Groove first.');
            if (legal.soloNeedsTarget) withTarget(app, legal.targets, id => ({ type: 'solo', targetId: id }));
            else act({ type: 'solo' });
          }}
        >
          SOLO
        </Button>
        <Button testId="act:vamp" className={s.act} onClick={() => act({ type: 'vamp' })}>
          VAMP
        </Button>
        <Button
          testId="act:bag"
          className={s.act}
          onClick={() => app.openSheet({ kind: 'bag', battle: true })}
        >
          BAG
        </Button>
        <Button
          testId="act:split"
          className={s.act}
          inactive={!legal.canSplit}
          onClick={() =>
            legal.canSplit ? act({ type: 'split' }) : app.presenter.toast("Can't SPLIT from this one.")
          }
        >
          SPLIT
        </Button>
      </div>
    </>
  );
}
