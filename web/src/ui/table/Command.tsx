// The orders panel: options for the selected card or perk, the Pressure forecast, Hint and End plays.

import { useEffect, useRef } from 'react';
import { perksById, playerCard } from '../../data/index.ts';
import { willAwaken } from '../../engine/index.ts';
import { canEndPlays, type Option, onlyEndPlaysLeft, pressureForecast } from '../../state/derive.ts';
import { useGame } from '../../state/store.ts';
import { UiIcon } from '../art/index.ts';
import { Badge, Button, Kbd } from '../components/index.ts';
import { useTable } from './context.ts';

const VERB_LABEL: Record<string, string> = {
  tuck: 'Tuck',
  ability: 'Ability',
  deploy: 'Deploy',
  decrypt: 'Decrypt',
  improvised: 'Improvised',
  sleeper: 'Sleeper',
  perk: 'Perk',
};

function OptionButton({ o, index }: { o: Option; index: number }) {
  const t = useTable();
  const armedKey = useGame((s) => s.ui.armedKey);
  const setHover = useGame((s) => s.setHover);
  const armed = armedKey === o.key;
  const hinted = t.hintKey === o.key;
  const clears = (o.preview?.clears.length ?? 0) > 0;
  const ends = o.preview?.ends;
  return (
    <li>
      <button
        type="button"
        className="option"
        data-option-index={index}
        data-verb={o.verb}
        data-armed={armed || undefined}
        data-hint={hinted || undefined}
        data-clears={clears || undefined}
        data-ends={ends ?? undefined}
        onClick={() => t.choose(o)}
        onPointerEnter={() => setHover(o.key)}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover(o.key)}
        onBlur={() => setHover(null)}
        disabled={t.locked}
      >
        <span className="option__verb">{VERB_LABEL[o.verb] ?? o.verb}</span>
        <span className="option__text">
          <span className="option__label">{o.label}</span>
          {o.outcome && <span className="option__outcome">→ {o.outcome}</span>}
        </span>
        {hinted && (
          <Badge tone="accent" solid>
            Hint
          </Badge>
        )}
        {armed && <span className="option__confirm">Click again or press Enter to confirm</span>}
      </button>
    </li>
  );
}

function Forecast() {
  const { v } = useTable();
  const items = pressureForecast(v);
  if (v.modifiers.adrenaline) {
    return <p className="forecast__none">Adrenaline Surge: this turn's Pressure step is skipped.</p>;
  }
  return (
    <div className="forecast">
      <h3 className="mini-head">When you end plays</h3>
      {items.length === 0 ? (
        <p className="forecast__none">No Pressure and no timers run out this turn.</p>
      ) : (
        <ul className="forecast__list">
          {items.map((f) => (
            <li key={`${f.slot}-${f.kind}`} data-kind={f.kind}>
              <strong>{f.name}</strong> {f.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CommandPanel() {
  const t = useTable();
  const { v, state } = t;
  const sel = useGame((s) => s.ui.selection);
  const select = useGame((s) => s.select);
  const setTargetSlot = useGame((s) => s.setTargetSlot);
  const targetSlot = useGame((s) => s.ui.targetSlot);
  const endRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const playsLeft = Math.max(0, v.playsPerTurn - v.playsUsed);
  const endable = canEndPlays(state) && !t.locked;
  const onlyEnd = onlyEndPlaysLeft(state) && !t.locked;
  const hintEnd = t.hint?.type === 'endPlays';

  // (Focus after a play — the next hand card, or End plays when that is all that is left — is
  // handled by the Table.)
  // Focus the first option when a slot narrows the list.
  useEffect(() => {
    if (targetSlot !== null) listRef.current?.querySelector<HTMLButtonElement>('button.option')?.focus();
  }, [targetSlot]);

  let heading = 'Orders';
  let sub = '';
  if (sel?.kind === 'card') {
    // The selected card itself — never its Awakened Card, which stays secret until played.
    const card = playerCard(sel.uid);
    heading = card.name;
    sub = `${card.cls}${card.suit ? ` · ${card.suit} ${card.power}` : ''}${willAwaken(state, sel.uid) ? ' · awakens if played now' : ''}`;
  } else if (sel?.kind === 'perk') {
    heading = perksById.get(sel.perk)?.name ?? sel.perk;
    sub = 'Perk · choose a target';
  }

  const mods = v.modifiers;
  return (
    <section className="command" aria-label="Orders">
      <header className="command__head">
        <div>
          <h2 className="command__title">{heading}</h2>
          {sub && <p className="command__sub">{sub}</p>}
        </div>
        {sel && (
          <Button size="sm" variant="ghost" onClick={() => select(null)} kbd="Esc">
            Cancel
          </Button>
        )}
      </header>
      {(mods.falseTrail || mods.masterDecryptor || mods.adrenaline || mods.cleanNext || v.leadBlocked) && (
        <div className="command__mods">
          {mods.falseTrail && <Badge tone="stealth">False Trail: {mods.falseTrailAbsorbLeft} to absorb</Badge>}
          {mods.masterDecryptor && <Badge tone="recon">Master Decryptor: any suit</Badge>}
          {mods.adrenaline && <Badge tone="force">Adrenaline Surge</Badge>}
          {mods.cleanNext && <Badge tone="success">Next clear is Clean</Badge>}
          {v.leadBlocked && <Badge tone="danger">Blocker: Lead can't increase</Badge>}
        </div>
      )}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard */}
      <section className="command__body" aria-label="Orders details" tabIndex={0}>
        {sel ? (
          <>
            {targetSlot !== null && (
              <p className="command__narrow">
                Options for {v.slots[targetSlot]?.isPursuerSlot ? 'the Pursuer' : `slot ${targetSlot + 1}`}.{' '}
                <button type="button" className="linkish" onClick={() => setTargetSlot(null)}>
                  Show all
                </button>
              </p>
            )}
            {t.visible.length === 0 ? (
              <p className="muted">No legal play for this card right now.</p>
            ) : (
              <ol className="options" ref={listRef} aria-label="Ways to play it">
                {t.visible.map((o, i) => (
                  <OptionButton key={o.key} o={o} index={i} />
                ))}
              </ol>
            )}
          </>
        ) : (
          <>
            {v.phase === 'play' && !v.pending && (
              <p className="command__prompt">
                {playsLeft > 0 ? (
                  <>
                    Select a card (<Kbd>1</Kbd>–<Kbd>{String(Math.min(9, Math.max(1, v.hand.length)))}</Kbd>) or drag it
                    onto a Threat. <strong>{playsLeft}</strong> {playsLeft === 1 ? 'play' : 'plays'} left this turn.
                  </>
                ) : (
                  <>Both plays made. Use a perk, or end plays to resolve Pressure.</>
                )}
              </p>
            )}
            <Forecast />
          </>
        )}
      </section>
      <footer className="command__foot">
        <Button
          size="sm"
          variant="ghost"
          icon={<UiIcon name="info" />}
          onClick={t.hintNow}
          kbd="H"
          disabled={t.locked}
          aria-keyshortcuts="h"
        >
          Hint
        </Button>
        <Button
          ref={endRef}
          size="md"
          variant={onlyEnd ? 'primary' : 'secondary'}
          iconEnd={<UiIcon name="play" />}
          onClick={t.endPlays}
          disabled={!endable}
          kbd="E"
          className="end-plays"
          data-ready={onlyEnd || undefined}
          data-hint={hintEnd || undefined}
          aria-keyshortcuts="e"
        >
          End plays
        </Button>
      </footer>
    </section>
  );
}
