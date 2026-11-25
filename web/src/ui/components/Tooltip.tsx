import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

export interface TooltipProps {
  content: ReactNode;
  /** A single focusable element (button, link…). */
  children: ReactElement<{ 'aria-describedby'?: string }>;
  placement?: 'top' | 'bottom' | undefined;
  /** Link the tooltip to the trigger with aria-describedby. Turn off when it repeats the accessible name. */
  describe?: boolean | undefined;
}

/**
 * Hover/focus tooltip. Shows on hover and keyboard focus, hides on Escape (WCAG 1.4.13), stays
 * while the pointer is over it. Pure CSS positioning; no portal.
 */
export function Tooltip({ content, children, placement = 'top', describe = true }: TooltipProps) {
  const id = useId();
  const wrap = useRef<HTMLSpanElement>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true);
    };
    const reset = () => setDismissed(false);
    document.addEventListener('keydown', onKey);
    el.addEventListener('pointerleave', reset);
    el.addEventListener('focusout', reset);
    return () => {
      document.removeEventListener('keydown', onKey);
      el.removeEventListener('pointerleave', reset);
      el.removeEventListener('focusout', reset);
    };
  }, []);
  const trigger = describe && isValidElement(children) ? cloneElement(children, { 'aria-describedby': id }) : children;
  return (
    <span ref={wrap} className="tooltip-wrap" data-dismissed={dismissed || undefined}>
      {trigger}
      <span role="tooltip" id={id} className="tooltip" data-placement={placement}>
        {content}
      </span>
    </span>
  );
}
