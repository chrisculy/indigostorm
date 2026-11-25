import { useRef, useState } from 'react';
import { downloadSave, parseImport, readFileText, type SaveData } from '../../state/persistence.ts';
import { useGame } from '../../state/store.ts';
import { Button, Dialog } from '../components/index.ts';
import { ScreenFrame } from './ScreenFrame.tsx';

function summary(d: SaveData): string[] {
  const out: string[] = [];
  if (d.campaign)
    out.push(`Campaign on Day ${Math.min(30, d.campaign.day)} (${Object.keys(d.campaign.stars).length} days played)`);
  else out.push('No campaign');
  const best = Object.keys(d.prototypeBest);
  out.push(
    best.length ? `Prototype results for ${best.length} day${best.length === 1 ? '' : 's'}` : 'No prototype results',
  );
  if (d.episode) out.push(`Episode in progress: Day ${d.episode.setup.day} (${d.episode.mode})`);
  out.push(`${d.rulesSeen.length} Rule Cards read`);
  return out;
}

export function SavesScreen() {
  const snapshot = useGame((s) => s.snapshot);
  const replaceData = useGame((s) => s.replaceData);
  const notify = useGame((s) => s.notify);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<SaveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = snapshot();

  const onFile = async (f: File | undefined) => {
    setError(null);
    if (!f) return;
    try {
      setPending(parseImport(await readFileText(f)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the file.');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <ScreenFrame
      title="Import / export"
      subtitle="Your progress lives in this browser. Export it to a file to back it up or move it."
    >
      <div className="saves">
        <section className="settings__group" aria-labelledby="save-now">
          <h2 id="save-now" className="sec-title">
            This device
          </h2>
          <ul className="plain-list">
            {summary(current).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <div>
            <Button
              variant="primary"
              onClick={() => {
                const name = downloadSave(snapshot());
                notify({ tone: 'success', message: `Saved ${name}.` });
              }}
            >
              Export save file
            </Button>
          </div>
        </section>
        <section className="settings__group" aria-labelledby="save-import">
          <h2 id="save-import" className="sec-title">
            Import
          </h2>
          <p className="muted">Load a file exported from Indigo Storm. It replaces the progress on this device.</p>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              id="import-file"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button onClick={() => fileRef.current?.click()}>Choose a save file…</Button>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>
      <Dialog
        open={!!pending}
        onClose={() => setPending(null)}
        title="Replace your progress?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pending) replaceData(pending);
                setPending(null);
                notify({ tone: 'success', message: 'Save imported.' });
              }}
            >
              Import
            </Button>
          </>
        }
      >
        <p>The file contains:</p>
        {pending && (
          <ul className="plain-list">
            {summary(pending).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        )}
      </Dialog>
    </ScreenFrame>
  );
}
