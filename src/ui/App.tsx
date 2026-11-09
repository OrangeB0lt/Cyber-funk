/**
 * The app shell: topbar, the current screen, the action bar, and the overlay layers (timing,
 * sheet, popup, toast). Display settings (text size, reduce motion) are classes on the root.
 */
import type { GameApp } from '@app/game';
import { BattleScreen } from './combat/BattleScreen';
import { TimingOverlay } from './combat/TimingOverlay';
import { GameContext, useApp, useGame, useView } from './GameContext';
import { ActionBar } from './layers/ActionBar';
import { Announcer } from './layers/Announcer';
import { PopupLayer } from './layers/PopupLayer';
import { SheetLayer } from './layers/SheetLayer';
import { Toast } from './layers/Toast';
import { Topbar } from './layers/Topbar';
import { CreateScreen } from './screens/Create';
import { DistrictScreen } from './screens/District';
import { PlaceScreen } from './screens/Place';
import { StoryScreen } from './screens/Story';
import { TitleScreen } from './screens/Title';
import s from './App.module.css';

function Screen() {
  const v = useView();
  switch (v.screen) {
    case 'title':
      return <TitleScreen />;
    case 'create':
      return <CreateScreen />;
    case 'story':
      return <StoryScreen />;
    case 'district':
      return <DistrictScreen />;
    case 'place':
      return <PlaceScreen />;
    case 'battle':
      return <BattleScreen />;
  }
}

function Shell() {
  const app = useApp();
  const v = useView();
  const g = useGame();
  const st = g?.settings ?? v.titleSettings;
  // Everything behind a sheet or dialog is inert (no focus, no taps, hidden from screen readers).
  const covered = !!v.sheet || v.popups.length > 0;
  const cls = [
    s.app,
    st.textSize === 'S' && s.sizeS,
    st.textSize === 'L' && s.sizeL,
    st.reduceMotion && 'reduce-motion',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} onPointerDown={() => app.sfx.unlock()} data-screen={v.screen}>
      {g && v.screen !== 'title' && v.screen !== 'battle' && (
        <div inert={covered}>
          <Topbar />
        </div>
      )}
      {/* tabIndex -1: where focus lands when the control that opened a sheet is gone. */}
      <main className={s.screen} inert={covered || !!v.timing} tabIndex={-1}>
        <Screen />
      </main>
      <footer className={s.actions} inert={covered || !!v.timing}>
        <ActionBar />
      </footer>
      <div inert={covered}>
        <TimingOverlay />
      </div>
      <div inert={v.popups.length > 0}>
        <SheetLayer />
      </div>
      <PopupLayer />
      <Toast />
      <Announcer />
    </div>
  );
}

/** The root component. */
export function App({ app }: { app: GameApp }) {
  return (
    <GameContext.Provider value={app}>
      <Shell />
    </GameContext.Provider>
  );
}
