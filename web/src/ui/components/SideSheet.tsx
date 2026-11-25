import { type ReactNode, useEffect, useId, useRef } from 'react';
import { UiIcon } from '../art/icons.tsx';

export interface SideSheetProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  /** Action buttons (e.g. "Defeat Ally" / "Let it resolve"). */
  actions?: ReactNode;
  /** Escape / close button. Omit for prompts that must be answered. */
  onDismiss?: (() => void) | undefined;
  /** Small eyebrow above the title, e.g. "Pressure · Slot 2". */
  context?: ReactNode;
  side?: 'right' | 'left' | undefined;
  className?: string | undefined;
}

/**
 * Non-blocking prompt panel (non-modal <dialog>): the table stays usable and readable behind it.
 * Moves focus into the sheet when it opens and back to the previously focused element when it closes.
 */
export function SideSheet({
  open,
  title,
  children,
  actions,
  onDismiss,
  context,
  side = 'right',
  className,
}: SideSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const restore = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      restore.current = document.activeElement as HTMLElement | null;
      if (typeof d.show === 'function') d.show();
      else d.setAttribute('open', '');
      const first = d.querySelector<HTMLElement>('[data-autofocus], .sheet__actions button, button, [tabindex="0"]');
      (first ?? d).focus();
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
      restore.current?.focus?.();
    }
  }, [open]);
  useEffect(() => {
    const d = ref.current;
    if (!d || !onDismiss) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
      }
    };
    d.addEventListener('keydown', onKey);
    return () => d.removeEventListener('keydown', onKey);
  }, [onDismiss]);
  return (
    <dialog
      ref={ref}
      className={className ? `sheet ${className}` : 'sheet'}
      data-side={side}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      {open && (
        <div className="sheet__panel">
          <header className="sheet__head">
            <div>
              {context && <p className="sheet__context">{context}</p>}
              <h2 id={titleId} className="sheet__title">
                {title}
              </h2>
            </div>
            {onDismiss && (
              <button
                type="button"
                className="btn btn--icon"
                data-variant="ghost"
                data-size="sm"
                aria-label="Dismiss"
                onClick={onDismiss}
              >
                <span className="btn__icon">
                  <UiIcon name="close" />
                </span>
              </button>
            )}
          </header>
          <div className="sheet__body">{children}</div>
          {actions && <div className="sheet__actions">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}
