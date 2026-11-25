import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { UiIcon } from '../art/icons.tsx';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  message: ReactNode;
  title?: ReactNode;
  tone?: ToastTone | undefined;
  /** ms before auto-dismiss; 0 keeps it until dismissed. Default 5000. */
  duration?: number | undefined;
}

interface ToastItem extends ToastOptions {
  id: number;
}

interface ToastApi {
  push: (t: ToastOptions) => number;
  dismiss: (id: number) => void;
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

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const duration = item.duration ?? 5000;
  useEffect(() => {
    if (!duration || paused) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, paused, onDismiss]);
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

/** Provides useToast() and renders the toast stack in a polite live region. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((t: ToastOptions) => {
    const id = next.current++;
    setItems((xs) => [...xs.slice(-3), { ...t, id }]);
    return id;
  }, []);
  const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <section className="toasts" aria-label="Notifications">
        <ol aria-live="polite" aria-relevant="additions" className="toasts__list">
          {items.map((it) => (
            <Toast key={it.id} item={it} onDismiss={() => dismiss(it.id)} />
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
