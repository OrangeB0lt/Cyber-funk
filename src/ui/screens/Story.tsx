import { useEffect, useRef } from 'react';
import type { Snapshot } from 'valtio';
import type { ClassId } from '@core/ids/characters';
import type { SpriteId } from '@core/ids/sprites';
import { plainText } from '@app/lexicon';
import type { StoryLine } from '@app/view';
import { heroSprite, npcSprite } from '@content/sprites';
import { Button } from '../components/Button';
import { LexText } from '../components/LexText';
import { Sprite } from '../components/Sprite';
import { Typewriter } from '../components/Typewriter';
import { useApp, useGame, useView } from '../GameContext';
import s from './Story.module.css';

/** Who to draw beside a line: the speaker's sprite, your hero on your own lines, nobody on narration. */
function portraitOf(l: Snapshot<StoryLine>, cls: ClassId | undefined): SpriteId | null {
  if (l.kind === 'you') return cls ? heroSprite(cls) : null;
  if (l.kind !== 'spoken') return null;
  if (l.sprite) return l.sprite;
  return l.npc && cls ? npcSprite(l.npc, cls) : null;
}

/** The story transcript: narration, dialogue, the player's choices, and battle outcome cards. */
export function StoryScreen() {
  const app = useApp();
  const v = useView();
  const cls = useGame()?.cls;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [v.lines.length, v.outcome]);

  return (
    // Tapping the story continues, like the Continue button (v1 behavior). Keyboard users use the button.
    <div className={s.story} onClick={() => app.advance()} data-testid="story">
      {v.title && <h1 className={s.title}>{v.title}</h1>}
      <div aria-live="polite" className={s.story}>
        {v.lines.map((l, i) => {
          const sprite = portraitOf(l, cls);
          // One portrait per run: a speaker's follow-up lines don't repeat it.
          const prev = v.lines[i - 1];
          const shown = sprite && !(prev && prev.kind === l.kind && portraitOf(prev, cls) === sprite);
          if (l.kind === 'board')
            return (
              <pre key={l.id} className={s.board} data-testid="board">
                {l.text}
              </pre>
            );
          return (
            <p key={l.id} className={`${s.line} ${s[l.kind]}`}>
              {shown && <Sprite id={sprite} scale={2} flip={l.kind === 'you'} className={s.portrait} />}
              {l.who && (
                <span className={s.who} style={{ color: l.color ?? '#fff' }}>
                  {l.who}
                </span>
              )}
              {l.kind === 'narr' || l.kind === 'spoken' ? (
                <Typewriter id={l.id} text={l.text} typed={l.typed} />
              ) : (
                <LexText text={l.text} />
              )}
            </p>
          );
        })}
      </div>
      {v.outcome?.kind === 'victory' && (
        <div className={`${s.outcome} ${s.victory}`} data-testid="victory">
          <h2>{v.outcome.title}</h2>
          {v.outcome.rows.map(r => (
            <div key={r.label} className={s.vrow}>
              <span>{r.label}</span>
              <b className={r.gold ? 'gold' : undefined}>{r.value}</b>
            </div>
          ))}
          {v.outcome.notes.map(n => (
            <div key={n} className="small dim">
              {n}
            </div>
          ))}
        </div>
      )}
      {v.outcome?.kind === 'defeat' && (
        <div className={`${s.outcome} ${s.defeat}`} data-testid="defeat">
          <h2>{v.outcome.title}</h2>
          <p>{v.outcome.text}</p>
          {v.outcome.cost && <p className="small dim">{v.outcome.cost}</p>}
        </div>
      )}
      <div ref={end} />
    </div>
  );
}

/** Continue, choices, or the outcome buttons. */
export function StoryActions() {
  const app = useApp();
  const { prompt } = useView();
  if (!prompt) return null;
  if (prompt.kind === 'continue')
    return (
      <Button testId="continue" variant="primary" wide onClick={() => app.advance()}>
        Continue ▸
      </Button>
    );
  if (prompt.kind === 'choice')
    return (
      <div className={s.choices}>
        {prompt.options.map(o => (
          <Button
            key={o.key}
            testId={`choice:${o.key}`}
            className={s.choice}
            variant={o.hint ? 'hint' : undefined}
            onClick={() => app.pick(prompt.id, o.key)}
          >
            {plainText(o.label)}
          </Button>
        ))}
      </div>
    );
  return (
    <div className={s.choices}>
      {prompt.buttons.map(b => (
        <Button
          key={b.key}
          testId={`out:${b.key}`}
          variant={b.primary ? 'primary' : 'ghost'}
          wide
          onClick={() => app.presenter.pick(prompt.id, b.key)}
        >
          {b.label}
        </Button>
      ))}
    </div>
  );
}
