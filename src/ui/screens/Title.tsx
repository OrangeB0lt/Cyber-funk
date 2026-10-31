import { useRef } from 'react';
import { Button } from '../components/Button';
import { useApp, useView } from '../GameContext';
import s from './Title.module.css';

/** The title screen. Tap the version five times for the dev menu. */
export function TitleScreen() {
  const app = useApp();
  const taps = useRef(0);
  return (
    <div className={s.title}>
      <div>
        <h1 className={s.logo}>CYBER FUNK</h1>
        <div className={s.sub}>A Neon Orleans Jazz-Punk RPG</div>
        <div className={s.tag}>“The city that care forgot never forgot how to play.”</div>
      </div>
      <div className={s.art} aria-hidden="true">
        <span>▲</span>
        <span>☂</span>
        <span>♪</span>
      </div>
      <button
        type="button"
        className={s.version}
        data-testid="version"
        aria-label={`Version ${__APP_VERSION__}`}
        onClick={() => {
          taps.current += 1;
          if (taps.current >= 5) {
            taps.current = 0;
            app.openSheet({ kind: 'dev' });
          }
        }}
      >
        v{__APP_VERSION__}
      </button>
    </div>
  );
}

/** Title actions: Continue, New Game, How to Play, Settings. */
export function TitleActions() {
  const app = useApp();
  const saved = useView().saves.some(s => s.summary || s.problem);
  return (
    <div className={s.buttons}>
      {saved && (
        <Button testId="continue-game" variant="primary" wide onClick={() => app.continueGame()}>
          Continue
        </Button>
      )}
      <Button testId="new" variant={saved ? undefined : 'primary'} wide onClick={() => app.startNewGame()}>
        New Game
      </Button>
      <Button testId="howto" wide onClick={() => app.openSheet({ kind: 'howto', start: false })}>
        How to Play
      </Button>
      <Button
        testId="settings"
        variant="ghost"
        wide
        onClick={() => app.openSheet({ kind: 'settings', fromTitle: true })}
      >
        Settings
      </Button>
    </div>
  );
}
