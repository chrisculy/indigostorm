// Prompts for state.pending: Ally Cover, reorder (peek), Satellite Overwrite, Cloned Credentials,
// Kinetic Momentum and Hardened Resolve. Non-modal side sheet: the table stays readable.

import { type CSSProperties, type DragEvent, useState } from 'react';
import { playerCard, threat } from '../../data/index.ts';
import { actionKey, type Decision, type DecisionChoice, deltaText } from '../../engine/index.ts';
import { useGame } from '../../state/store.ts';
import { UiIcon } from '../art/index.ts';
import { PlayerCardView, pretty } from '../cards/index.ts';
import { Badge, Button, SideSheet } from '../components/index.ts';
import { useTable } from './context.ts';

function useHintChoice(): string | null {
  const { hint } = useTable();
  return hint?.type === 'decide' ? actionKey(hint) : null;
}
const key = (choice: DecisionChoice) => actionKey({ type: 'decide', choice });

function HintTag({ choice }: { choice: DecisionChoice }) {
  const h = useHintChoice();
  return h === key(choice) ? (
    <Badge tone="accent" solid>
      Hint
    </Badge>
  ) : null;
}

/** An orderable list of Threats (top first) with drag and buttons; optional discard toggles. */
function ThreatOrder({
  order,
  setOrder,
  discard,
  toggleDiscard,
  maxDiscard,
}: {
  order: string[];
  setOrder: (o: string[]) => void;
  discard?: string[];
  toggleDiscard?: (id: string) => void;
  maxDiscard?: number;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j] as string, next[i] as string];
    setOrder(next);
  };
  const onDrop = (e: DragEvent, target: string) => {
    e.preventDefault();
    if (!dragging || dragging === target) return;
    const next = order.filter((x) => x !== dragging);
    next.splice(next.indexOf(target), 0, dragging);
    setOrder(next);
    setDragging(null);
  };
  return (
    <ol className="order-list">
      {order.map((id, i) => {
        const t = threat(id);
        const discarded = discard?.includes(id) ?? false;
        return (
          <li
            key={id}
            className="order-item"
            draggable={!discarded}
            data-discarded={discarded || undefined}
            onDragStart={() => setDragging(id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, id)}
            onDragEnd={() => setDragging(null)}
          >
            <span className="order-item__pos num">
              {discarded ? '✕' : order.filter((x) => !discard?.includes(x)).indexOf(id) + 1}
            </span>
            <span className="order-item__text">
              <strong>{t.name}</strong>
              <span className="muted">
                {t.type} · {t.symbols}× {t.pref}
                {t.alt ? `/${t.alt}` : ''} + {t.power} Power · Reward {pretty(t.rewardText) || '—'}
                {t.pressureText ? ` · Pressure ${pretty(t.pressureText)}` : ''}
              </span>
            </span>
            <span className="order-item__btns">
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Move ${t.name} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="secondary"
                aria-label={`Move ${t.name} down`}
                disabled={i === order.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </Button>
              {toggleDiscard && (
                <Button
                  size="sm"
                  variant={discarded ? 'danger' : 'secondary'}
                  aria-pressed={discarded}
                  disabled={!discarded && (discard?.length ?? 0) >= (maxDiscard ?? 0)}
                  onClick={() => toggleDiscard(id)}
                >
                  {discarded ? 'Keep' : 'Discard'}
                </Button>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ReorderBody({ d }: { d: Extract<Decision, { kind: 'reorderTop' }> }) {
  const decide = useGame((s) => s.decide);
  const [order, setOrder] = useState(d.cards);
  return (
    <>
      <p>Put these Threats back on top of the Threat Deck in any order. The first one enters next.</p>
      <ThreatOrder order={order} setOrder={setOrder} />
      <div className="sheet-actions">
        <Button variant="primary" onClick={() => decide(order)} data-autofocus>
          Put back (top first)
        </Button>
        <HintTag choice={order} />
      </div>
    </>
  );
}

function SatelliteBody({ d }: { d: Extract<Decision, { kind: 'satellite' }> }) {
  const decide = useGame((s) => s.decide);
  const [order, setOrder] = useState(d.cards);
  const [discard, setDiscard] = useState<string[]>([]);
  const toggle = (id: string) =>
    setDiscard((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : xs.length < d.maxDiscard ? [...xs, id] : xs));
  const choice = { discard, order: order.filter((x) => !discard.includes(x)) };
  return (
    <>
      <p>
        Discard up to {d.maxDiscard} of the top {d.cards.length} Threats, then order the rest (top first).
      </p>
      <ThreatOrder
        order={order}
        setOrder={setOrder}
        discard={discard}
        toggleDiscard={toggle}
        maxDiscard={d.maxDiscard}
      />
      <div className="sheet-actions">
        <Button variant="primary" onClick={() => decide(choice)} data-autofocus>
          Confirm ({discard.length} discarded)
        </Button>
      </div>
    </>
  );
}

function ChooseCardBody({ d }: { d: Extract<Decision, { kind: 'chooseCard' }> }) {
  const decide = useGame((s) => s.decide);
  const [pick, setPick] = useState<string | null>(null);
  return (
    <>
      <p>Cloned Credentials: choose one card from your deck to start in your opening hand (then draw up to 4).</p>
      <ul className="choose-grid" style={{ '--card-w': '118px' } as CSSProperties}>
        {d.options.map((id) => (
          <li key={id}>
            <PlayerCardView
              card={playerCard(id)}
              size="sm"
              selected={pick === id}
              onClick={() => setPick(pick === id ? null : id)}
              ariaHint="Choose this card."
            />
            <HintTag choice={id} />
          </li>
        ))}
      </ul>
      <div className="sheet-actions">
        <Button variant="primary" disabled={!pick} onClick={() => pick && decide(pick)}>
          {pick ? `Start with ${playerCard(pick).name}` : 'Pick a card'}
        </Button>
        <Button variant="ghost" onClick={() => decide(null)}>
          Skip (keep the perk unused)
        </Button>
      </div>
    </>
  );
}

function slotName(t: ReturnType<typeof useTable>, slot: number): string {
  const sv = t.v.slots[slot];
  return sv?.threatId ? threat(sv.threatId).name : `slot ${slot + 1}`;
}

export function DecisionSheet() {
  const t = useTable();
  const d = t.v.pending;
  const decide = useGame((s) => s.decide);
  // Remount bodies (reset local order state) when a new decision appears.
  const id = d ? JSON.stringify(d) : '';
  if (!d || t.v.phase === 'over') return <SideSheet open={false} title="" />;
  let title = '';
  let context = '';
  let body = null;
  switch (d.kind) {
    case 'allyCover': {
      const th = threat(d.threatId);
      const what = d.effect === 'strike' ? 'Strike' : d.effect === 'expiry' ? 'Expiry effect' : 'Pressure';
      title = 'Ally Cover?';
      context = `${what} · ${th.name}`;
      body = (
        <>
          <p className="decision-effect">
            <strong>{th.name}</strong>
            {d.effect === 'expiry' ? ' escapes' : d.effect === 'strike' ? ' Strikes' : ' applies Pressure'}:{' '}
            <span className="decision-delta">{pretty(deltaText(d.delta))}</span>
          </p>
          <p>Defeat an Ally (it goes to your discard pile) to cancel this one effect entirely?</p>
          <div className="sheet-actions sheet-actions--stack">
            {d.allies.map((a) => (
              <Button key={a} variant="primary" onClick={() => decide(a)}>
                Defeat {playerCard(a).name} to cancel <HintTag choice={a} />
              </Button>
            ))}
            <Button variant="secondary" onClick={() => decide(null)} data-autofocus>
              Take it ({pretty(deltaText(d.delta))}) <HintTag choice={null} />
            </Button>
          </div>
        </>
      );
      break;
    }
    case 'reorderTop':
      title = 'Reorder the Threat Deck';
      context = `${playerCard(d.card).name} · look at the top ${d.cards.length}`;
      body = <ReorderBody key={id} d={d} />;
      break;
    case 'satellite':
      title = 'Satellite Overwrite';
      context = 'Perk · top of the Threat Deck';
      body = <SatelliteBody key={id} d={d} />;
      break;
    case 'chooseCard':
      title = 'Cloned Credentials';
      context = 'Perk · setup';
      body = <ChooseCardBody key={id} d={d} />;
      break;
    case 'kineticTarget':
      title = 'Kinetic Momentum';
      context = `Perk · ${d.excess} excess Power`;
      body = (
        <>
          <p>
            Carry the {d.excess} excess Power onto another face-up Threat (or keep the perk for later). You can also
            click a highlighted Threat.
          </p>
          <div className="sheet-actions sheet-actions--stack">
            {d.options.map((s) => (
              <Button key={s} variant="primary" onClick={() => decide(s)}>
                +{d.excess} Power to {slotName(t, s)} <HintTag choice={s} />
              </Button>
            ))}
            <Button variant="secondary" onClick={() => decide(null)}>
              Keep Kinetic Momentum for later
            </Button>
          </div>
        </>
      );
      break;
    case 'confirmHardenedResolve':
      title = 'Hardened Resolve?';
      context = 'Perk · redline';
      body = (
        <>
          <p className="decision-effect">
            Exposure would rise by {d.amount} to <strong>{d.exposure + d.amount}</strong> — the redline is {d.redline}.
          </p>
          <p>Use Hardened Resolve to stop at {d.redline - 1} instead? (Once per episode.)</p>
          <div className="sheet-actions sheet-actions--stack">
            <Button variant="primary" onClick={() => decide(true)} data-autofocus icon={<UiIcon name="check" />}>
              Yes, stop at {d.redline - 1} <HintTag choice={true} />
            </Button>
            <Button variant="danger" onClick={() => decide(false)}>
              No, let it reach {d.exposure + d.amount} (Cover Blown)
            </Button>
          </div>
        </>
      );
      break;
  }
  return (
    <SideSheet open title={title} context={context} className="decision-sheet">
      {body}
    </SideSheet>
  );
}
