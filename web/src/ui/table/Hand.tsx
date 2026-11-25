// The hand (select / drag cards), and the draw and discard piles.

import { type CSSProperties, type PointerEvent, useState } from 'react';
import { playerCard } from '../../data/index.ts';
import { willAwaken } from '../../engine/index.ts';
import { useGame, useHideFlashback } from '../../state/store.ts';
import { CardBack, PlayerCardView } from '../cards/index.ts';
import { Dialog } from '../components/index.ts';
import { useTable } from './context.ts';
import { useInspectable } from './inspect.tsx';
import { vtName } from './motion.ts';

function HandCard({
  uid,
  index,
  onDragStart,
  consumeClick,
}: {
  uid: string;
  index: number;
  onDragStart: (uid: string, e: PointerEvent<HTMLElement>) => void;
  consumeClick: () => boolean;
}) {
  const t = useTable();
  const sel = useGame((s) => s.ui.selection);
  const select = useGame((s) => s.select);
  const hide = useHideFlashback();
  const card = playerCard(uid);
  const inspect = useInspectable({ type: 'player', id: uid });
  const selected = sel?.kind === 'card' && sel.uid === uid;
  const playable = t.playable.has(uid) && !t.locked;
  const hinted = t.hint?.type === 'play' && t.hint.cardUid === uid;
  // Never name the Awakened Card before the play: it is a secret until it awakens.
  const awakens = willAwaken(t.state, uid);
  return (
    <li
      className="hand__item"
      data-selected={selected || undefined}
      data-hint={hinted || undefined}
      style={{ '--i': index } as CSSProperties}
    >
      <span className="hand__key" aria-hidden="true">
        {index + 1}
      </span>
      <PlayerCardView
        card={card}
        size="fluid"
        selected={selected}
        disabled={!playable}
        hideFlashback={hide(card.id)}
        onClick={() => {
          if (consumeClick()) return;
          select(selected ? null : { kind: 'card', uid });
        }}
        ariaHint={
          playable
            ? `Card ${index + 1}. ${selected ? 'Selected. ' : ''}${awakens ? 'Awakens if played now. ' : ''}Press I to inspect.`
            : 'No plays left this turn.'
        }
        style={{ viewTransitionName: vtName('c', uid), touchAction: playable ? 'none' : undefined } as CSSProperties}
        {...inspect}
        onPointerDown={(e) => {
          inspect.onPointerDown?.(e);
          if (playable) onDragStart(uid, e);
        }}
      />
      {awakens && (
        <span className="hand__awaken" aria-hidden="true">
          Awakens if played now
        </span>
      )}
    </li>
  );
}

export function Hand({
  onDragStart,
  consumeClick,
}: {
  onDragStart: (uid: string, e: PointerEvent<HTMLElement>) => void;
  consumeClick: () => boolean;
}) {
  const { v } = useTable();
  return (
    <section className="hand-zone" aria-label="Your hand">
      <h2 className="zone-label">
        Hand <span className="muted">({v.hand.length})</span>
      </h2>
      {v.hand.length === 0 ? (
        <p className="hand__empty">Your hand is empty.</p>
      ) : (
        <ol className="hand" style={{ '--n': v.hand.length } as CSSProperties}>
          {v.hand.map((uid, i) => (
            <HandCard key={uid} uid={uid} index={i} onDragStart={onDragStart} consumeClick={consumeClick} />
          ))}
        </ol>
      )}
    </section>
  );
}

export function Piles() {
  const { v } = useTable();
  const hide = useHideFlashback();
  const [open, setOpen] = useState(false);
  return (
    <div className="piles">
      <div className="pile pile--draw">
        {v.drawPileCount > 0 ? (
          <CardBack
            kind="operative"
            size="fluid"
            showNote={false}
            count={v.drawPileCount}
            aria-label={`Draw pile: ${v.drawPileCount} cards.`}
          />
        ) : (
          <div className="pile__empty">Empty</div>
        )}
        <span className="pile__label">Draw pile</span>
      </div>
      <button
        type="button"
        className="discard-btn"
        onClick={() => setOpen(true)}
        aria-label={`${v.discard.length} Discard: show the discard pile (${v.discard.length} ${v.discard.length === 1 ? 'card' : 'cards'}).`}
      >
        <span className="discard-btn__n num">{v.discard.length}</span>
        <span className="discard-btn__label">Discard</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Discard pile (${v.discard.length})`} size="lg">
        {v.discard.length === 0 ? (
          <p className="muted">Nothing discarded yet.</p>
        ) : (
          <ul className="card-grid" style={{ '--card-w': '140px' } as CSSProperties}>
            {v.discard.map((id) => (
              <li key={id}>
                <PlayerCardView card={playerCard(id)} size="sm" hideFlashback={hide(id)} />
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
