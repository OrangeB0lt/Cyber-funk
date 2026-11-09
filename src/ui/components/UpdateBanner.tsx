import { Button } from './Button';
import { useApp, useView } from '../GameContext';
import s from './UpdateBanner.module.css';

/**
 * "A new version is ready": shown on the hub screens only (district and place), so an update never
 * lands mid-scene or mid-battle. Updating saves first, then reloads into the new version.
 */
export function UpdateBanner() {
  const app = useApp();
  const v = useView();
  if (!v.updateReady) return null;
  return (
    <div className={s.banner} role="status" data-testid="update-banner">
      <span>A new version of the game is ready.</span>
      <Button testId="update" small variant="primary" onClick={() => void app.applyUpdate()}>
        Update
      </Button>
    </div>
  );
}
