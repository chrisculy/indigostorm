// Drag a hand card onto a Scene Row slot (or the In-play zone) with pointer events.
// Drop targets carry data-drop="slot:N" or data-drop="deploy".

import { type PointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import { playerCard } from '../../data/index.ts';
import { useHideFlashback } from '../../state/store.ts';
import { PlayerCardView } from '../cards/index.ts';

export type DropTarget = { kind: 'slot'; slot: number } | { kind: 'deploy' };

export interface DragInfo {
  uid: string;
  x: number;
  y: number;
  over: DropTarget | null;
}

function targetAt(x: number, y: number): DropTarget | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop]');
  const v = el?.dataset.drop;
  if (!v) return null;
  if (v === 'deploy') return { kind: 'deploy' };
  const m = /^slot:(\d+)$/.exec(v);
  return m ? { kind: 'slot', slot: Number(m[1]) } : null;
}

export function useCardDrag(opts: {
  canDrag: (uid: string) => boolean;
  onStart: (uid: string) => void;
  onDrop: (uid: string, target: DropTarget) => void;
}) {
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const suppressClick = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);

  const onPointerDown = useCallback((uid: string, e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || !optsRef.current.canDrag(uid)) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    let over: DropTarget | null = null;
    const move = (ev: globalThis.PointerEvent) => {
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
        active = true;
        optsRef.current.onStart(uid);
      }
      over = targetAt(ev.clientX, ev.clientY);
      setDrag({ uid, x: ev.clientX, y: ev.clientY, over });
    };
    const up = () => {
      cleanup.current?.();
      if (!active) return;
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      setDrag(null);
      if (over) optsRef.current.onDrop(uid, over);
    };
    const cancel = () => {
      cleanup.current?.();
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    cleanup.current = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      cleanup.current = null;
    };
  }, []);

  /** True once right after a drop: the click that follows a drag must not toggle selection. */
  const consumeClick = useCallback(() => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return true;
    }
    return false;
  }, []);

  return { drag, onPointerDown, consumeClick };
}

export function DragGhost({ drag }: { drag: DragInfo | null }) {
  const hide = useHideFlashback();
  if (!drag) return null;
  return (
    <div
      className="drag-ghost"
      style={{ left: drag.x, top: drag.y }}
      data-over={drag.over ? '' : undefined}
      aria-hidden="true"
    >
      <PlayerCardView card={playerCard(drag.uid)} size="sm" hideFlashback={hide(drag.uid)} />
    </div>
  );
}
