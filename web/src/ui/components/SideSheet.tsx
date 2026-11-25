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
  /** Change it (e.g. to an id of the prompt) to move focus in again when a new prompt replaces the
   * current one while the sheet stays open. */
  focusKey?: string | undefined;
}

/** The control to focus when the sheet opens: an explicit [data-autofocus] (the safe default) wins
 * over DOM order; then the first action button; then any button or tab stop. */
function initialFocus(d: HTMLElement): HTMLElement | null {
  for (const sel of [
    '[data-autofocus]',
    '.sheet__actions button:not(:disabled)',
    'button:not(:disabled)',
    '[tabindex="0"]',
  ]) {
    const el = d.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

const canRestore = (el: HTMLElement | null): el is HTMLElement =>
  !!el && el.isConnected && el !== document.body && !(el as HTMLButtonElement).disabled;

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
  focusKey,
}: SideSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const restore = useRef<HTMLElement | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: focusKey re-runs the focus move for a new prompt
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      restore.current = document.activeElement as HTMLElement | null;
      if (typeof d.show === 'function') d.show();
      else d.setAttribute('open', '');
      (initialFocus(d) ?? d).focus();
    } else if (open) {
      // A new prompt replaced the previous one in the open sheet (focusKey changed).
      (initialFocus(d) ?? d).focus();
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
      // Only back to an element that still exists and works; otherwise the owner decides (e.g. the
      // table moves focus to the hand).
      if (canRestore(restore.current)) restore.current.focus();
      restore.current = null;
    }
  }, [open, focusKey]);
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
