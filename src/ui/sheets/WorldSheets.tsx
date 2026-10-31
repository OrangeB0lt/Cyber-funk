/** Travel, the bounty board, How to Play and the dev menu. */
import { BOSSES, DISTRICTS, ENEMIES, fmtDoubloons } from '@content/index';
import { Button } from '../components/Button';
import { ItemRow } from '../components/ItemRow';
import { Tone } from '../components/Tone';
import { useApp, useGame } from '../GameContext';
import { Sheet } from './Sheet';
import s from './Sheet.module.css';

export function TravelSheet() {
  const app = useApp();
  const g = useGame()!;
  const rows = g.unlocked.filter(id => id !== g.district);
  return (
    <Sheet title="Travel">
      <p className="small dim">
        The streetcar runs between every unlocked district. The airboat screams out to Manchac.
      </p>
      {rows.length ? (
        rows.map(id => {
          const d = DISTRICTS[id];
          return (
            <ItemRow
              key={id}
              action={
                <Button testId={`go:${id}`} small variant="primary" onClick={() => app.travel(id)}>
                  {d.airboat ? 'Airboat' : 'Ride'}
                </Button>
              }
            >
              <b>{d.name}</b>
              <div className="small dim">
                Levels {d.levels[0]}–{d.levels[1]} · {d.airboat ? 'by airboat' : 'by streetcar'}
              </div>
            </ItemRow>
          );
        })
      ) : (
        <p className="dim">Nowhere else yet. Earn it.</p>
      )}
    </Sheet>
  );
}

export function BountySheet() {
  const app = useApp();
  const g = useGame()!;
  return (
    <Sheet title="Bounty Board">
      <p className="small dim">
        One elite per district. Take a bounty, then use TRACK BOUNTY on that district's screen to find it.
        Elites can't be fled.
      </p>
      {g.unlocked.map(id => {
        const d = DISTRICTS[id];
        const elite = ENEMIES[d.elite];
        const done = g.bountiesDone.includes(id);
        const active = g.bounty === id;
        return (
          <ItemRow
            key={id}
            action={
              done ? (
                <span className="good small">COLLECTED</span>
              ) : active ? (
                <span className="gold small">TRACKING</span>
              ) : (
                <Button testId={`take:${id}`} small variant="primary" onClick={() => app.takeBounty(id)}>
                  Take
                </Button>
              )
            }
          >
            <b>{elite.name}</b> <span className="dim small">{d.name}</span>
            <div className="small">{elite.book}</div>
            <div className="small gold">Pays {fmtDoubloons(d.bountyGold)}</div>
          </ItemRow>
        );
      })}
    </Sheet>
  );
}

export function HowToSheet({ start }: { start: boolean }) {
  const app = useApp();
  return (
    <Sheet
      title="How to Play"
      foot={
        start && (
          <Button testId="go" variant="primary" wide onClick={() => app.beginPrologue()}>
            Walk the dirge ▸
          </Button>
        )
      }
    >
      <div className={s.howto}>
        <h4>Six actions</h4>
        <p>
          <b>RIFF</b> is your basic attack (+2 Funk, +20 Groove). <b>PLAY</b> spends Funk on a skill.{' '}
          <b>SOLO</b> is your ultimate at 100 Groove. <b>VAMP</b> halves damage until your next turn and
          restores 15% Funk. <b>BAG</b> uses an item. <b>SPLIT</b> runs (never from bosses or elites).
        </p>
        <h4>On the One</h4>
        <p>
          Every RIFF, damaging PLAY, and SOLO pops up a timing bar. Tap anywhere as the marker crosses the
          glowing <b>ONE</b> zone: ×1.5 damage and +10 Groove. The pocket around it is ×1.2, loose is ×1.0,
          and a miss is CLAMS at ×0.6. Set Rhythm Taps to Auto in Settings if you'd rather not tap.
        </p>
        <h4>Tones & weaknesses</h4>
        <p>
          Every attack has a tone: <Tone tone="HOT" /> <Tone tone="LOW" /> <Tone tone="BLUE" />{' '}
          <Tone tone="FUNK" />. Every enemy has a weakness (×1.5) and usually a resistance (×0.5). Metronome's
          machines are usually weak to FUNK. Tone tapes and beads change your next attack's tone. The Blue
          Book remembers what you learn.
        </p>
        <h4>Groove</h4>
        <p>
          Builds from RIFF (+20), any skill (+10), hitting a weakness (+10), ON THE ONE (+10), VAMP (+10), and
          taking damage (+5). At 100, SOLO.
        </p>
        <h4>Statuses</h4>
        <p>Small chips with turn counters. Tap one to read it.</p>
        <h4>Save</h4>
        <p>
          Autosaves when you enter a district, after every fight, and before every boss. Save by hand at the
          Lagniappe club. Export a save code in Settings so progress is never trapped.
        </p>
      </div>
    </Sheet>
  );
}

export function DevSheet() {
  const app = useApp();
  const g = useGame();
  const d = app.dev;
  const b = (id: string, label: string, fn: () => void) => (
    <Button key={id} testId={`dev:${id}`} small onClick={fn}>
      {label}
    </Button>
  );
  return (
    <Sheet title="Dev Menu">
      <p className="small dim">For testing. {g ? '' : 'Start or load a game first for most of these.'}</p>
      <div className={s.row}>
        {b('xp', '+500 XP', d.xp)}
        {b('gold', '+Ð1000', d.gold)}
        {b('heal', 'Full heal', d.heal)}
      </div>
      <div className={s.row}>
        {b('unlock', 'Unlock all districts', d.unlock)}
        {b('notes', 'Give all Blue Notes', d.notes)}
      </div>
      <div className={s.row}>
        {b('band', 'Recruit all bandmates', d.band)}
        {b('items', 'Stock the bag', d.items)}
        {b('gear', 'Best gear', d.gear)}
      </div>
      <div className={s.row}>{b('cutting', 'Cutting Contest', d.cutting)}</div>
      <h4>Jump to boss</h4>
      <div className={s.row}>{d.bosses.map(id => b(`boss:${id}`, BOSSES[id].name, () => d.boss(id)))}</div>
      <h4>Jump to act</h4>
      <div className={s.row}>{d.acts.map(a => b(`act:${a}`, a, () => d.act(a)))}</div>
    </Sheet>
  );
}
