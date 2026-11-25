// The Scene Row: Threat Deck pile, slots with live Threats, set-aside piles, and the In-play zone.

import { type CSSProperties, useState } from 'react';
import { playerCard, threat } from '../../data/index.ts';
import type { SlotView, TuckedCard } from '../../engine/index.ts';
import { AllyGlyph, GearGlyph, SuitIcon } from '../art/index.ts';
import { CardBack, ThreatCardView } from '../cards/index.ts';
import { Badge, Dialog } from '../components/index.ts';
import { useTable } from './context.ts';
import { type CardRef, useInspect, useInspectable } from './inspect.tsx';
import { vtName } from './motion.ts';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0');

function TuckedChip({ t }: { t: TuckedCard }) {
  const card = playerCard(t.uid);
  const inspect = useInspectable({ type: 'player', id: t.uid });
  const total = t.power + t.gearBonus;
  return (
    <li
      className="tucked-chip"
      data-suit={t.suit.toLowerCase()}
      style={{ viewTransitionName: vtName('c', t.uid) } as CSSProperties}
      title={`${card.name}: ${t.suit}, ${total} Power${t.wild ? ' (Improvised Weapon)' : ''}`}
      {...inspect}
    >
      <SuitIcon suit={t.suit} className="tucked-chip__icon" />
      <span className="tucked-chip__power num">{total}</span>
      <span className="sr-only">
        {card.name}, {t.suit}, {total} Power
      </span>
    </li>
  );
}

function SlotPreview({ slot }: { slot: number }) {
  const { hoverOption } = useTable();
  const p = hoverOption?.preview;
  if (!hoverOption || !p || !hoverOption.slots.includes(slot)) return null;
  if (p.hidden) return <span className="slot-preview">{p.awakens ? 'Awakens' : 'Reveal'}</span>;
  const clear = p.clears.find((c) => c.slot === slot);
  if (clear)
    return (
      <span className="slot-preview" data-tone="clear">
        Clears{clear.clean ? ' · Clean' : ''}
      </span>
    );
  const m = p.slots.find((x) => x.slot === slot);
  if (m)
    return (
      <span className="slot-preview">
        {m.symbols}/{m.symbolsNeeded} sym · {m.power}/{m.powerNeeded} pow
      </span>
    );
  return null;
}

function Slot({ sv, label }: { sv: SlotView; label: string }) {
  const t = useTable();
  // While Kinetic Momentum asks for a target, its options are the highlighted slots.
  const isTarget = t.targetSlots.has(sv.index) && (!t.locked || t.v.pending?.kind === 'kineticTarget');
  const hinted =
    !!t.hint &&
    ((t.hint.type === 'play' && (t.hint.slot === sv.index || t.hint.slot2 === sv.index)) ||
      (t.hint.type === 'perk' && t.hint.slot === sv.index));
  const narrowed = t.visible !== t.options && isTarget;
  const selecting = t.targetSlots.size > 0 || t.deployTarget;
  const pursuer = sv.isPursuerSlot;
  const card = sv.threatId ? threat(sv.threatId) : null;
  const live =
    sv.state === 'faceUp'
      ? {
          progress: {
            symbols: sv.symbols,
            symbolsNeeded: sv.symbolsNeeded,
            power: sv.power,
            powerNeeded: sv.powerNeeded,
            wouldBeClean: sv.cleanIfCleared && (sv.symbols > 0 || sv.power > 0),
          },
          die: sv.die ?? undefined,
          tuckedCount: sv.tucked.length,
          cancelled: sv.cancelPressure,
        }
      : undefined;
  const ref: CardRef | null =
    sv.state === 'faceUp' && sv.threatId
      ? { type: 'threat', id: sv.threatId, live }
      : sv.state === 'faceDown'
        ? { type: 'threat', id: '', faceDown: true }
        : null;
  const inspect = useInspectable(ref?.type === 'threat' && ref.faceDown ? null : ref);
  const fdInspect = useInspectable(null);
  const api = useInspect();
  const onClick = () => {
    if (isTarget) t.clickSlot(sv.index);
    else if (ref && !(ref.type === 'threat' && ref.faceDown) && !selecting) api.open(ref);
  };
  const hintText = isTarget
    ? narrowed
      ? 'Options for this slot are listed in the orders panel.'
      : 'Press Enter to choose this target.'
    : 'Press I to inspect.';
  return (
    <li
      className="slot"
      data-drop={isTarget ? `slot:${sv.index}` : undefined}
      data-state={sv.state}
      data-pursuer={pursuer || undefined}
      data-target={isTarget || undefined}
      data-hint={hinted || undefined}
      data-narrowed={narrowed || undefined}
      aria-label={`${label}${sv.state === 'empty' ? ': empty' : ''}`}
    >
      <span className="slot__label">
        {pursuer ? 'Pursuer' : label}
        {sv.state === 'faceUp' && card?.blocker && (
          <Badge tone="danger" solid>
            Blocker
          </Badge>
        )}
      </span>
      <div className="slot__card">
        {sv.state === 'faceUp' && card && live && (
          <ThreatCardView
            card={card}
            size="fluid"
            progress={live.progress}
            die={live.die}
            tuckedCount={live.tuckedCount}
            cancelled={live.cancelled}
            highlighted={isTarget}
            dimmed={selecting && !isTarget}
            selected={narrowed || undefined}
            onClick={onClick}
            ariaHint={hintText}
            style={{ viewTransitionName: vtName('t', card.id) } as CSSProperties}
            {...inspect}
          />
        )}
        {sv.state === 'faceDown' && (
          <CardBack
            kind="encrypted"
            size="fluid"
            showNote={false}
            highlighted={isTarget}
            dimmed={selecting && !isTarget}
            onClick={onClick}
            aria-label={`Encrypted Threat in ${label}, face-down.`}
            ariaHint={isTarget ? 'Press Enter to decrypt.' : 'Decrypt it with a Recon card.'}
            {...fdInspect}
          />
        )}
        {sv.state === 'empty' && (
          <div className="slot__empty">
            <span>{pursuer ? 'Pursuer neutralized' : 'Empty'}</span>
          </div>
        )}
        {t.burstSlots.has(sv.index) && <span key={t.eventSeq} className="burst" aria-hidden="true" />}
        <SlotPreview slot={sv.index} />
      </div>
      {sv.state === 'faceUp' && (
        <div className="slot__meta">
          {sv.tucked.length > 0 ? (
            <ul className="tucked" aria-label="Tucked cards">
              {sv.tucked.map((x) => (
                <TuckedChip key={x.uid} t={x} />
              ))}
            </ul>
          ) : (
            <span className="slot__none">No cards tucked</span>
          )}
          {sv.bonusPower > 0 && <Badge tone="force">+{sv.bonusPower} Power</Badge>}
        </div>
      )}
    </li>
  );
}

export function ThreatDeckPile() {
  const { v } = useTable();
  const [open, setOpen] = useState(false);
  const known = v.threatDeckKnownTop;
  return (
    <div className="deck-col">
      <div className="pile">
        {v.threatDeckCount > 0 ? (
          <CardBack
            kind={v.threatDeckTopEncrypted ? 'encrypted' : 'threat'}
            size="fluid"
            showNote={false}
            count={v.threatDeckCount}
            aria-label={`Threat Deck: ${v.threatDeckCount} cards${v.threatDeckTopEncrypted ? ', the top card is Encrypted' : ''}.`}
          />
        ) : (
          <div className="pile__empty">Empty</div>
        )}
        <span className="pile__label">Threat Deck</span>
      </div>
      {known.length > 0 && (
        <div className="known-top">
          <span className="known-top__label">Known top</span>
          <ol>
            {known.map((id) => (
              <li key={id}>{threat(id).name}</li>
            ))}
          </ol>
        </div>
      )}
      <div className="setaside">
        {v.awakenedSetAside > 0 && <Badge tone="stealth">Flashback ×{v.awakenedSetAside}</Badge>}
        {v.countermeasuresSetAside > 0 && <Badge tone="warning">Countermeasure ×{v.countermeasuresSetAside}</Badge>}
        {v.threatDiscard.length > 0 && (
          <button type="button" className="linkish" onClick={() => setOpen(true)}>
            Threat discard ({v.threatDiscard.length})
          </button>
        )}
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Threat discard pile" size="sm">
        <ul className="plain-list">
          {v.threatDiscard.map((id) => (
            <li key={id}>
              <strong>{threat(id).name}</strong> <span className="muted">· {threat(id).type}</span>
            </li>
          ))}
        </ul>
      </Dialog>
    </div>
  );
}

export function SceneRow() {
  const { v } = useTable();
  let n = 0;
  return (
    <ol className="scene" aria-label="Scene Row" style={{ '--slots': v.slots.length } as CSSProperties}>
      {v.slots.map((sv) => {
        if (!sv.isPursuerSlot) n++;
        return <Slot key={sv.index} sv={sv} label={sv.isPursuerSlot ? 'Pursuer slot' : `Slot ${n}`} />;
      })}
    </ol>
  );
}

function InPlayChip({ id }: { id: string }) {
  const c = playerCard(id);
  const inspect = useInspectable({ type: 'player', id });
  const api = useInspect();
  const gearFx = c.effects.find((e) => e.op === 'power_bonus');
  return (
    <li
      className="inplay-chip"
      data-cls={c.cls.toLowerCase()}
      style={{ viewTransitionName: vtName('c', id) } as CSSProperties}
    >
      <button
        type="button"
        className="inplay-chip__btn"
        aria-label={`${c.name} (${c.cls}). ${c.text} Press to inspect.`}
        onClick={() => api.open({ type: 'player', id })}
        {...inspect}
      />
      <span className="inplay-chip__glyph" aria-hidden="true">
        {c.cls === 'Gear' ? <GearGlyph /> : <AllyGlyph />}
      </span>
      <span className="inplay-chip__name">{c.name}</span>
      <span className="inplay-chip__fx" aria-hidden="true">
        {c.cls === 'Ally'
          ? Object.entries(c.allySymbols).map(([k, s]) => (
              <SuitIcon key={k} suit={s} className={`suit-${s.toLowerCase()}`} />
            ))
          : gearFx && gearFx.op === 'power_bonus'
            ? `${signed(gearFx.n)} ${gearFx.suit}`
            : ''}
      </span>
    </li>
  );
}

export function InPlay() {
  const t = useTable();
  const { v } = t;
  const items = [...v.gear, ...v.allies];
  const target = t.deployTarget && !t.locked;
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the deploy option is also a button in the orders panel; this is a pointer shortcut
    <section
      className="inplay"
      aria-label="In play: Gear and Allies"
      data-drop={target ? 'deploy' : undefined}
      data-target={target || undefined}
      onClick={target ? t.clickDeploy : undefined}
    >
      <h2 className="zone-label">In play</h2>
      {items.length === 0 ? (
        <p className="inplay__empty">{target ? 'Deploy here' : 'Gear and Allies you deploy stay here.'}</p>
      ) : (
        <ul className="inplay__list">
          {items.map((id) => (
            <InPlayChip key={id} id={id} />
          ))}
          {target && <li className="inplay__drop">Deploy here</li>}
        </ul>
      )}
    </section>
  );
}
