// Card inspection: a hover "peek" (larger copy beside the pointer, mouse only) and the full
// CardInspect dialog (right-click, long-press, or the I key on a focused card).

import {
  createContext,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { playerCard, threat } from '../../data/index.ts';
import { useGame } from '../../state/store.ts';
import {
  CardInspect,
  PlayerCardView,
  playerCardSummary,
  ThreatCardView,
  type ThreatLiveState,
  threatCardSummary,
} from '../cards/index.ts';

export type CardRef =
  | { type: 'player'; id: string }
  | { type: 'threat'; id: string; live?: ThreatLiveState | undefined; faceDown?: boolean | undefined };

interface InspectApi {
  open: (c: CardRef) => void;
  peek: (c: CardRef | null, el?: HTMLElement) => void;
}

const Ctx = createContext<InspectApi | null>(null);

function CardFace({ c, size }: { c: CardRef; size: 'lg' | 'xl' }) {
  const seen = useGame((s) => s.flashbacksSeen);
  if (c.type === 'player') {
    const card = playerCard(c.id);
    return (
      <PlayerCardView card={card} size={size} hideFlashback={card.cls === 'Awakened' && !seen.includes(card.id)} />
    );
  }
  return (
    <ThreatCardView
      card={threat(c.id)}
      size={size}
      faceDown={c.faceDown}
      progress={c.live?.progress}
      die={c.live?.die}
      tuckedCount={c.live?.tuckedCount}
      cancelled={c.live?.cancelled}
    />
  );
}

function summary(c: CardRef): string {
  if (c.type === 'player') return playerCardSummary(playerCard(c.id));
  if (c.faceDown) return 'Encrypted Threat, face-down. Decrypt it with a Recon card to reveal it.';
  return threatCardSummary(threat(c.id), c.live ?? {});
}

function title(c: CardRef): string {
  if (c.type === 'player') return playerCard(c.id).name;
  return c.faceDown ? 'Encrypted Threat' : threat(c.id).name;
}

export function InspectProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<CardRef | null>(null);
  const [peek, setPeek] = useState<{ c: CardRef; x: number; y: number } | null>(null);
  const api = useMemo<InspectApi>(
    () => ({
      open: (c) => {
        setPeek(null);
        setOpen(c);
      },
      peek: (c, el) => {
        if (!c || !el) {
          setPeek(null);
          return;
        }
        const r = el.getBoundingClientRect();
        const w = 250;
        const h = (w * 88) / 63;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const x = r.right + 12 + w < vw ? r.right + 12 : Math.max(8, r.left - 12 - w);
        const y = Math.min(Math.max(8, r.top + r.height / 2 - h / 2), vh - h - 8);
        setPeek({ c, x, y });
      },
    }),
    [],
  );
  return (
    <Ctx.Provider value={api}>
      {children}
      {peek && (
        <div className="peek" style={{ left: peek.x, top: peek.y }} aria-hidden="true">
          <CardFace c={peek.c} size="lg" />
        </div>
      )}
      <CardInspect
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? title(open) : ''}
        text={open ? <p className="inspect-summary">{summary(open)}</p> : undefined}
      >
        {open && <CardFace c={open} size="xl" />}
      </CardInspect>
    </Ctx.Provider>
  );
}

export function useInspect(): InspectApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useInspect outside InspectProvider');
  return c;
}

export interface InspectHandlers {
  onPointerEnter?: (e: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: () => void;
  onPointerDown?: (e: PointerEvent<HTMLElement>) => void;
  onContextMenu?: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLElement>) => void;
}

/** Event handlers that make an element inspectable (hover peek, right-click, long-press, I key). */
export function useInspectable(card: CardRef | null): InspectHandlers {
  const api = useInspect();
  const hoverPreview = useGame((s) => s.settings.hoverPreview);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const press = useRef<{ x: number; y: number } | null>(null);
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => clear, [clear]);
  if (!card) return {};
  return {
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType !== 'mouse' || !hoverPreview || e.buttons) return;
      const el = e.currentTarget;
      clear();
      timer.current = setTimeout(() => api.peek(card, el), 450);
    },
    onPointerLeave: () => {
      clear();
      api.peek(null);
    },
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      clear();
      api.peek(null);
      if (e.pointerType === 'mouse') return;
      press.current = { x: e.clientX, y: e.clientY };
      const start = press.current;
      timer.current = setTimeout(() => {
        if (press.current === start) api.open(card);
      }, 520);
      const end = (ev: globalThis.PointerEvent) => {
        if (ev.type === 'pointermove' && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 8) return;
        press.current = null;
        clear();
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        window.removeEventListener('pointermove', end);
      };
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
      window.addEventListener('pointermove', end);
    },
    onContextMenu: (e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
      clear();
      api.open(card);
    },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if ((e.key === 'i' || e.key === 'I') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        api.open(card);
      }
    },
  };
}
