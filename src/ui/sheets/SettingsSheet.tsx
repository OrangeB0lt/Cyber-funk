import { useState } from 'react';
import type { Settings } from '@core/types';
import { Button } from '../components/Button';
import { Segmented } from '../components/Segmented';
import { useApp, useGame, useView } from '../GameContext';
import { Sheet } from './Sheet';
import s from './Sheet.module.css';

type Rows = { [K in keyof Settings]: { label: string; options: { value: Settings[K]; label: string }[] } };

const ROWS: Rows = {
  textSpeed: {
    label: 'Text speed',
    options: [
      { value: 'slow', label: 'Slow' },
      { value: 'normal', label: 'Normal' },
      { value: 'fast', label: 'Fast' },
      { value: 'instant', label: 'Instant' },
    ],
  },
  rhythm: {
    label: 'Rhythm taps',
    options: [
      { value: 'manual', label: 'Manual' },
      { value: 'auto', label: 'Auto' },
    ],
  },
  difficulty: {
    label: 'Difficulty',
    options: [
      { value: 'tourist', label: 'Tourist' },
      { value: 'local', label: 'Local' },
      { value: 'grand', label: 'Grand Marshal' },
    ],
  },
  sound: {
    label: 'Sound',
    options: [
      { value: true, label: 'On' },
      { value: false, label: 'Muted' },
    ],
  },
  reduceMotion: {
    label: 'Reduce motion',
    options: [
      { value: false, label: 'Off' },
      { value: true, label: 'On' },
    ],
  },
  textSize: {
    label: 'Text size',
    options: [
      { value: 'S', label: 'S' },
      { value: 'M', label: 'M' },
      { value: 'L', label: 'L' },
    ],
  },
};

function Row<K extends keyof Settings>({ k, value }: { k: K; value: Settings[K] }) {
  const app = useApp();
  const r = ROWS[k];
  return (
    <Segmented
      label={r.label}
      testId={`set:${k}`}
      options={r.options}
      value={value}
      onChange={v => app.setSetting(k, v)}
    />
  );
}

export function SettingsSheet({ fromTitle }: { fromTitle: boolean }) {
  const app = useApp();
  const g = useGame();
  const v = useView();
  const st = g?.settings ?? v.titleSettings;
  const [area, setArea] = useState<
    | { kind: 'export'; code: string | null }
    | { kind: 'import'; text: string }
    | { kind: 'link'; text: string }
    | null
  >(null);
  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      app.presenter.toast('Copied.');
    } catch {
      app.presenter.toast('Select and copy the code.');
    }
  };
  return (
    <Sheet title="Settings" back={!fromTitle && !!g}>
      {(Object.keys(ROWS) as (keyof Settings)[]).map(k => (
        <Row key={k} k={k} value={st[k]} />
      ))}
      <p className="small dim">
        Tourist: enemy damage −25%. Grand Marshal: enemy damage +25%, enemy Heart +20%. Auto rhythm rolls the
        timing for you, weighted toward IN THE POCKET.
      </p>
      <h3>Save data</h3>
      <div className={s.row}>
        <Button testId="export" small onClick={() => setArea({ kind: 'export', code: app.exportSave() })}>
          Export Save
        </Button>
        <Button testId="import" small onClick={() => setArea({ kind: 'import', text: '' })}>
          Import Save
        </Button>
        {g && (
          <Button testId="reset" small variant="danger" onClick={() => void app.confirmReset()}>
            Delete Save
          </Button>
        )}
      </div>
      {area?.kind === 'export' &&
        (area.code ? (
          <>
            <p className="small">Copy this code somewhere safe:</p>
            <textarea
              readOnly
              rows={4}
              value={area.code}
              data-testid="export-text"
              aria-label="Save code"
              onFocus={e => e.currentTarget.select()}
            />
            <Button testId="copy" small wide onClick={() => void copy(area.code!)}>
              Copy to clipboard
            </Button>
          </>
        ) : (
          <p className="dim small">No game to export yet.</p>
        ))}
      {area?.kind === 'import' && (
        <>
          <p className="small">Paste a save code:</p>
          <textarea
            rows={4}
            placeholder="paste here"
            aria-label="Save code to import"
            data-testid="import-text"
            data-autofocus
            value={area.text}
            onChange={e => setArea({ kind: 'import', text: e.target.value })}
          />
          <Button
            testId="doimport"
            small
            variant="primary"
            wide
            onClick={() => {
              void app
                .importSave(area.text.trim())
                .then(ok => ok || app.presenter.toast("That code didn't work."));
            }}
          >
            Load this save
          </Button>
        </>
      )}
      <CloudSection
        linking={area?.kind === 'link' ? area.text : null}
        onLinking={text => setArea(text === null ? null : { kind: 'link', text })}
        onCopy={code => void copy(code)}
      />
    </Sheet>
  );
}

const CLOUD_STATUS = {
  off: 'Cloud saves are off in this build. Your saves stay on this device.',
  checking: 'Checking the connection…',
  online: null,
  offline: "Offline. Your saves are safe on this device and upload when you're back online.",
} as const;

/** Settings → Cloud saves: status, the player code, linking another device. */
function CloudSection({
  linking,
  onLinking,
  onCopy,
}: {
  linking: string | null;
  onLinking: (text: string | null) => void;
  onCopy: (code: string) => void;
}) {
  const app = useApp();
  const c = useView().cloud;
  const status =
    CLOUD_STATUS[c.mode] ??
    (!c.linked
      ? 'Your saves upload to the cloud the next time the game saves.'
      : c.pending > 0
        ? 'Uploading your latest saves…'
        : 'Your saves are backed up to the cloud.');
  return (
    <>
      <h3>Cloud saves</h3>
      <p className="small" data-testid="cloud:status">
        {status}
      </p>
      {c.mode !== 'off' && (
        <>
          {c.code && (
            <>
              <p className="small">
                Your player code. Write it down: enter it on another device to play these saves there, or to
                get them back if this browser forgets them.
              </p>
              <p className={s.code} data-testid="cloud:code">
                {c.code}
              </p>
            </>
          )}
          <div className={s.row}>
            {c.code && (
              <Button testId="cloud:copy" small onClick={() => onCopy(c.code!)}>
                Copy code
              </Button>
            )}
            <Button testId="cloud:link" small onClick={() => onLinking(linking === null ? '' : null)}>
              Use a player code
            </Button>
            {c.linked && (
              <Button testId="cloud:unlink" small variant="ghost" onClick={() => void app.confirmUnlink()}>
                Unlink this device
              </Button>
            )}
          </div>
          {linking !== null && (
            <>
              <p className="small">Enter the player code from your other device:</p>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="CFP-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                aria-label="Player code"
                className={s.codeInput}
                data-testid="cloud:link-text"
                data-autofocus
                value={linking}
                onChange={e => onLinking(e.target.value)}
              />
              <Button
                testId="cloud:dolink"
                small
                variant="primary"
                wide
                onClick={() => {
                  void app.linkCode(linking).then(ok => ok && onLinking(null));
                }}
              >
                Link this device
              </Button>
            </>
          )}
        </>
      )}
    </>
  );
}
