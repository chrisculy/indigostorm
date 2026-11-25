// Table overlays: episode-end banner, flashback reveal, shortcuts, menu, end-plays confirmation.

import { useRef } from 'react';
import { playerCard } from '../../data/index.ts';
import { endReasonText, type PlayerView } from '../../engine/index.ts';
import { pressureForecast } from '../../state/derive.ts';
import { useGame } from '../../state/store.ts';
import { UiIcon } from '../art/index.ts';
import { PlayerCardView } from '../cards/index.ts';
import { Button, Dialog, Kbd, StarRow } from '../components/index.ts';

const END_BLURB = {
  objective: 'You reached the Lead target. The operation is a success.',
  coverBlown: 'Exposure hit the redline. You got out — barely.',
  outOfTime: 'Your deck and hand ran out before the objective.',
  sceneCleared: 'Every Threat is dealt with. Scene Cleared bonus: +1 Lead.',
} as const;

export function EndBanner({ v, onDebrief, onHide }: { v: PlayerView; onDebrief: () => void; onHide: () => void }) {
  const r = v.result;
  const btn = useRef<HTMLButtonElement>(null);
  if (!r) return null;
  return (
    <div className="end-banner" role="alertdialog" aria-labelledby="end-title" aria-describedby="end-desc">
      <div className="end-banner__panel" data-reason={r.reason}>
        <p className="end-banner__eyebrow">Episode over · Turn {r.turn}</p>
        <h2 id="end-title" className="end-banner__title">
          {endReasonText(r.reason)}
        </h2>
        <p id="end-desc" className="end-banner__desc">
          {END_BLURB[r.reason]} Final Lead {r.lead}/{v.leadTarget}, Exposure {r.exposure}.
        </p>
        <StarRow
          size="lg"
          animate
          showLabels
          stars={[
            { label: 'Objective', earned: r.stars.objective },
            { label: 'Cover', earned: r.stars.cover },
            { label: 'Bonus', earned: r.stars.bonus },
          ]}
        />
        <div className="end-banner__actions">
          <Button
            ref={btn}
            variant="primary"
            size="lg"
            onClick={onDebrief}
            iconEnd={<UiIcon name="chevron-right" />}
            autoFocus
          >
            Debrief
          </Button>
          <Button variant="ghost" onClick={onHide}>
            View the table
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FlashbackDialog() {
  const q = useGame((s) => s.flashbackQueue);
  const dismiss = useGame((s) => s.dismissFlashback);
  const f = q[0];
  return (
    <Dialog
      open={!!f}
      onClose={dismiss}
      title="Flashback"
      size="lg"
      className="flashback-dialog"
      footer={
        <Button variant="primary" onClick={dismiss}>
          Continue
        </Button>
      }
    >
      {f && (
        <div className="flashback">
          <div className="flashback__card">
            <PlayerCardView card={playerCard(f.awakened)} size="lg" />
          </div>
          <div className="flashback__text">
            <p className="flashback__eyebrow">
              {playerCard(f.conditioned).name} awakens as <strong>{playerCard(f.awakened).name}</strong>
            </p>
            <blockquote className="flashback__quote">{f.text || 'A memory surfaces…'}</blockquote>
            <p className="muted">Its Awakening bonus was applied, and it is played in place of the Conditioned card.</p>
          </div>
        </div>
      )}
    </Dialog>
  );
}

const SHORTCUTS: [string[], string][] = [
  [['1', '…', '9'], 'Select a hand card (again to deselect)'],
  [['←', '→'], 'Move between highlighted targets'],
  [['↑', '↓'], 'Move between options'],
  [['Enter'], 'Choose / confirm'],
  [['Esc'], 'Cancel selection'],
  [['E'], 'End plays'],
  [['H'], 'Hint (suggested move)'],
  [['I'], 'Inspect the focused card'],
  [['R'], 'Rulebook'],
  [['?'], 'This list'],
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" size="sm">
      <dl className="shortcuts">
        {SHORTCUTS.map(([keys, what]) => (
          <div key={what} className="shortcuts__row">
            <dt>{keys.map((k) => (k === '…' ? <span key={k}>–</span> : <Kbd key={k}>{k}</Kbd>))}</dt>
            <dd>{what}</dd>
          </div>
        ))}
      </dl>
      <p className="muted">Right-click or long-press any card to inspect it.</p>
    </Dialog>
  );
}

export function MenuDialog({
  open,
  onClose,
  onRulebook,
  onShortcuts,
}: {
  open: boolean;
  onClose: () => void;
  onRulebook: () => void;
  onShortcuts: () => void;
}) {
  const go = useGame((s) => s.go);
  const abandon = useGame((s) => s.abandonEpisode);
  const mode = useGame((s) => s.episode?.mode);
  return (
    <Dialog open={open} onClose={onClose} title="Menu" size="sm">
      <div className="menu-list">
        <Button block variant="primary" onClick={onClose}>
          Resume
        </Button>
        <Button
          block
          onClick={() => {
            onClose();
            onRulebook();
          }}
          kbd="R"
        >
          Rulebook
        </Button>
        <Button
          block
          onClick={() => {
            onClose();
            onShortcuts();
          }}
          kbd="?"
        >
          Keyboard shortcuts
        </Button>
        <Button block onClick={() => go('settings')}>
          Settings
        </Button>
        <Button block onClick={() => go('howto')}>
          How to play
        </Button>
        <Button block variant="ghost" onClick={() => go('title')}>
          Save &amp; quit to title
        </Button>
        <details className="danger-zone">
          <summary>Abandon this episode…</summary>
          <p className="muted">
            The episode is discarded{mode === 'campaign' ? '; you can start this day again from the campaign map' : ''}.
          </p>
          <Button
            block
            variant="danger"
            onClick={() => {
              abandon();
              go(mode === 'campaign' ? 'campaign' : 'days');
            }}
          >
            Abandon episode
          </Button>
        </details>
      </div>
    </Dialog>
  );
}

export function ConfirmEndDialog({
  open,
  v,
  onConfirm,
  onClose,
}: {
  open: boolean;
  v: PlayerView;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const f = pressureForecast(v);
  const perks = v.perks.usableNow.length;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="End plays?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not yet
          </Button>
          <Button variant="primary" onClick={onConfirm} autoFocus>
            End plays
          </Button>
        </>
      }
    >
      <p>The Pressure step resolves next, then you draw 2.</p>
      {f.length > 0 && (
        <ul className="forecast__list">
          {f.map((x) => (
            <li key={`${x.slot}-${x.kind}`} data-kind={x.kind}>
              <strong>{x.name}</strong> {x.text}
            </li>
          ))}
        </ul>
      )}
      {perks > 0 && <p className="muted">You can still use {perks === 1 ? 'a perk' : `${perks} perks`} this turn.</p>}
    </Dialog>
  );
}
