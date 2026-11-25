import { type ReactNode, type RefObject, useEffect, useId, useRef } from 'react';
import { UiIcon } from '../art/icons.tsx';

export interface DialogProps {
  open: boolean;
  /** Called on Escape, the close button, or a backdrop click. */
  onClose: () => void;
  title: ReactNode;
  /** Visually hide the title (it still names the dialog). */
  hideTitle?: boolean | undefined;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full' | undefined;
  /** Element to focus when opened (default: the first focusable element, as the browser does). */
  initialFocus?: RefObject<HTMLElement | null> | undefined;
  closeLabel?: string | undefined;
  className?: string | undefined;
}

/**
 * Modal dialog on the native <dialog> element: the browser traps focus (the rest of the page is
 * inert), closes on Escape, and returns focus to the opener.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle,
  description,
  children,
  footer,
  size = 'md',
  initialFocus,
  closeLabel = 'Close',
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
      initialFocus?.current?.focus();
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [open, initialFocus]);
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the click only detects backdrop clicks; Escape is handled natively (cancel event)
    <dialog
      ref={ref}
      className={className ? `dialog ${className}` : 'dialog'}
      data-size={size}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="dialog__panel">
          <header className="dialog__head">
            <h2 id={titleId} className={hideTitle ? 'sr-only' : 'dialog__title'}>
              {title}
            </h2>
            <button
              type="button"
              className="btn btn--icon dialog__close"
              data-variant="ghost"
              data-size="md"
              aria-label={closeLabel}
              onClick={onClose}
            >
              <span className="btn__icon">
                <UiIcon name="close" />
              </span>
            </button>
          </header>
          {description && (
            <p id={descId} className="dialog__desc">
              {description}
            </p>
          )}
          <div className="dialog__body">{children}</div>
          {footer && <footer className="dialog__foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
