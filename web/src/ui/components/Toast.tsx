import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { UiIcon } from '../art/icons.tsx';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  message: ReactNode;
  title?: ReactNode;
  tone?: ToastTone | undefined;
  /** ms before auto-dismiss; 0 keeps it until dismissed. Default 5000. */
  duration?: number | undefined;
  /** Group tag for `clear(scope)` (e.g. 'episode' toasts are cleared when the screen changes). */
  scope?: string | undefined;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastApi {
  push: (t: ToastOptions) => number;
  dismiss: (id: number) => void;
  /** Dismiss every toast of a scope, or all toasts when no scope is given. */
  clear: (scope?: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

/** Show toasts from anywhere under <ToastProvider>. */
export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}

const ICON: Record<ToastTone, 'info' | 'check' | 'close'> = {
  info: 'info',
  success: 'check',
  warning: 'info',
  danger: 'close',
};

/** Hovering pauses a toast so it can be read, but never for longer than this in total. */
export const TOAST_MAX_PAUSE = 8000;

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const duration = item.duration ?? 5000;
  // Time left before auto-dismiss, kept across pauses (resuming does not restart the full duration).
  const left = useRef(duration);
  useEffect(() => {
    if (!duration || paused) return;
    const started = Date.now();
    const t = setTimeout(onDismiss, left.current);
    return () => {
      clearTimeout(t);
      left.current = Math.max(0, left.current - (Date.now() - started));
    };
  }, [duration, paused, onDismiss]);
  // Hard cap: a pointer resting on the toast cannot keep it alive indefinitely.
  useEffect(() => {
    if (!duration) return;
    const t = setTimeout(onDismiss, duration + TOAST_MAX_PAUSE);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);
  const tone = item.tone ?? 'info';
  return (
    <li
      className="toast"
      data-tone={tone}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <span className="toast__icon" aria-hidden="true">
        <UiIcon name={ICON[tone]} />
      </span>
      <div className="toast__body">
        {item.title && <p className="toast__title">{item.title}</p>}
        <p className="toast__msg">{item.message}</p>
      </div>
      <button
        type="button"
        className="btn btn--icon"
        data-variant="ghost"
        data-size="sm"
        aria-label="Dismiss notification"
        onClick={onDismiss}
      >
        <span className="btn__icon">
          <UiIcon name="close" />
        </span>
      </button>
    </li>
  );
}

/** Stable onDismiss per toast (an inline arrow would restart its timers on every render). */
function ToastRow({ item, dismiss }: { item: ToastItem; dismiss: (id: number) => void }) {
  const onDismiss = useCallback(() => dismiss(item.id), [dismiss, item.id]);
  return <Toast item={item} onDismiss={onDismiss} />;
}

/** Provides useToast() and renders the toast stack in a polite live region. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((t: ToastOptions) => {
    const id = next.current++;
    setItems((xs) => [...xs.slice(-2), { ...t, id }]);
    return id;
  }, []);
  const clear = useCallback(
    (scope?: string) => setItems((xs) => (scope === undefined ? [] : xs.filter((x) => x.scope !== scope))),
    [],
  );
  const api = useMemo(() => ({ push, dismiss, clear }), [push, dismiss, clear]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <section className="toasts" aria-label="Notifications">
        <ol aria-live="polite" aria-relevant="additions" className="toasts__list">
          {items.map((it) => (
            <ToastRow key={it.id} item={it} dismiss={dismiss} />
          ))}
        </ol>
      </section>
    </Ctx.Provider>
  );
}

/** Visually hidden live region: announces `message` whenever it changes (use for game log narration). */
export function LiveRegion({
  message,
  politeness = 'polite',
}: {
  message: string;
  politeness?: 'polite' | 'assertive';
}) {
  return (
    <div className="sr-only" aria-live={politeness} aria-atomic="true">
      {message}
    </div>
  );
}
