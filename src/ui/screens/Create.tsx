import { useEffect, useRef } from 'react';
import { CLASS_IDS, ROOTS_IDS } from '@core/ids/characters';
import { CLASSES, ROOTS, SKILLS } from '@content/index';
import { heroSprite } from '@content/sprites';
import { Button } from '../components/Button';
import { Sprite } from '../components/Sprite';
import { Tone } from '../components/Tone';
import { useApp, useView } from '../GameContext';
import s from './Create.module.css';

/** Character creation: name, roots, instrument. Its buttons live in the action bar. */
export function CreateScreen() {
  const app = useApp();
  const { create: c } = useView();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (c.step === 1) input.current?.focus();
  }, [c.step]);

  return (
    <div className={s.create}>
      {c.step === 1 && (
        <>
          <h1>Who&apos;s playing?</h1>
          <p className="dim">Every Grand Marshal starts with a name.</p>
          <label className="sr-only" htmlFor="name-input">
            Your name
          </label>
          <input
            id="name-input"
            ref={input}
            maxLength={16}
            placeholder="Your name"
            autoComplete="off"
            value={c.name}
            onChange={e => app.editCreate({ name: e.target.value })}
          />
          <p className="small dim">
            Tap Next when you&apos;re ready. You can&apos;t change it later; nobody in Tremé would let you.
          </p>
        </>
      )}
      {c.step === 2 && (
        <>
          <h1>Roots</h1>
          <p className="dim">Where you&apos;re from. A small bonus, a starting item, and a way of talking.</p>
          {ROOTS_IDS.map(id => {
            const r = ROOTS[id];
            return (
              <Button
                key={id}
                testId={`pick:${id}`}
                variant={c.roots === id ? 'sel' : undefined}
                aria-pressed={c.roots === id}
                onClick={() => app.editCreate({ roots: id })}
              >
                <b>{r.name}</b> <span className="dim small">{r.home}</span>
                <div className="small">{r.blurb}</div>
                <div className="small dim">{r.flavor}</div>
              </Button>
            );
          })}
        </>
      )}
      {c.step === 3 && (
        <>
          <h1>Instrument</h1>
          <p className="dim">Your class. Tap a card to pick it.</p>
          {CLASS_IDS.map(id => {
            const cl = CLASSES[id];
            const first = SKILLS[cl.skills[0]];
            return (
              <Button
                key={id}
                testId={`pick:${id}`}
                variant={c.cls === id ? 'sel' : undefined}
                aria-pressed={c.cls === id}
                onClick={() => app.editCreate({ cls: id })}
              >
                <Sprite id={heroSprite(id)} scale={3} className={s.hero} />
                <b style={{ color: cl.color }}>{cl.name}</b>{' '}
                <span className="dim small">
                  “{cl.title}” · {cl.role}
                </span>
                <div className="small">
                  {cl.tones.map(t => (
                    <Tone key={t} tone={t} />
                  ))}{' '}
                  {cl.blurb}
                </div>
                <div className="small dim">
                  Heart {cl.base[0]} · Funk {cl.base[1]} · Chops {cl.base[2]} · Grit {cl.base[3]} · Tempo{' '}
                  {cl.base[4]} · Mojo {cl.base[5]}
                </div>
                <div className="small">
                  First skill: <b>{first.name}</b> ({first.fp} FP): {first.desc}
                </div>
              </Button>
            );
          })}
        </>
      )}
    </div>
  );
}

/** Back / Next for character creation. */
export function CreateActions() {
  const app = useApp();
  const { create: c } = useView();
  return (
    <div className={s.row}>
      <Button testId="back" variant="ghost" center onClick={() => app.createBack()}>
        {c.step === 1 ? '‹ Title' : '‹ Back'}
      </Button>
      <Button testId="next" variant="primary" onClick={() => app.createNext()}>
        {c.step === 3 ? 'Start ▸' : 'Next ▸'}
      </Button>
    </div>
  );
}
