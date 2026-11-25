import type {
  CSSProperties,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
} from 'react';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fluid';

/** Interaction and visual-state props shared by every card view. */
export interface CardStateProps {
  /** xs/sm/md/lg/xl fixed widths, or `fluid` to fill the parent's width. Default md. */
  size?: CardSize | undefined;
  /** Chosen (e.g. the hand card about to be played). Sets aria-pressed on interactive cards. */
  selected?: boolean | undefined;
  /** Legal target glow (dashed pulsing cyan outline). */
  highlighted?: boolean | undefined;
  /** Not playable right now. Stays focusable so it can still be inspected; clicks are ignored. */
  disabled?: boolean | undefined;
  /** De-emphasized (e.g. not relevant to the current choice). */
  dimmed?: boolean | undefined;
  /** Makes the card a <button>. */
  onClick?: MouseEventHandler<HTMLElement> | undefined;
  onContextMenu?: MouseEventHandler<HTMLElement> | undefined;
  onKeyDown?: KeyboardEventHandler<HTMLElement> | undefined;
  onFocus?: FocusEventHandler<HTMLElement> | undefined;
  onBlur?: FocusEventHandler<HTMLElement> | undefined;
  onPointerEnter?: PointerEventHandler<HTMLElement> | undefined;
  onPointerLeave?: PointerEventHandler<HTMLElement> | undefined;
  onPointerDown?: PointerEventHandler<HTMLElement> | undefined;
  /** Overrides the generated accessible name. */
  'aria-label'?: string | undefined;
  /** Extra words appended to the accessible name (e.g. "Press Enter to tuck here."). */
  ariaHint?: string | undefined;
  /** Force keyboard focusability on a non-clickable card (e.g. hover-to-inspect). */
  focusable?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

interface FrameProps extends CardStateProps {
  kind: string;
  /** Header/accent color (CSS color or var). */
  accent: string;
  label: string;
  children: ReactNode;
  /** Rendered behind the face (tucked-card stack). */
  under?: ReactNode;
  /** Rendered above the face, unclipped (dice, stamps, badges). */
  overlay?: ReactNode;
  /** Large faint emblem printed into the paper (decorative). */
  watermark?: ReactNode;
  /** Extra data-* attributes for styling. */
  data?: Record<string, string | number | boolean | undefined> | undefined;
  /** For decorative card art with no meaningful content (e.g. backs): still labelled. */
  faceClassName?: string | undefined;
}

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function CardFrame({
  kind,
  accent,
  label,
  children,
  under,
  overlay,
  watermark,
  data,
  faceClassName,
  size = 'md',
  selected,
  highlighted,
  disabled,
  dimmed,
  onClick,
  onContextMenu,
  onKeyDown,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  'aria-label': ariaLabel,
  ariaHint,
  focusable,
  id,
  className,
  style,
}: FrameProps) {
  const name = [ariaLabel ?? label, highlighted ? 'Legal target.' : '', disabled ? 'Unavailable.' : '', ariaHint ?? '']
    .filter(Boolean)
    .join(' ');
  const dataAttrs: Record<string, string> = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    if (v !== undefined && v !== false) dataAttrs[`data-${k}`] = String(v);
  }
  const common = {
    id,
    className: cx('card', className),
    style: { ...style, '--card-accent': accent } as CSSProperties,
    'data-kind': kind,
    'data-size': size,
    'data-selected': selected || undefined,
    'data-highlighted': highlighted || undefined,
    'data-disabled': disabled || undefined,
    'data-dimmed': dimmed || undefined,
    onContextMenu,
    onKeyDown,
    onFocus,
    onBlur,
    onPointerEnter,
    onPointerLeave,
    onPointerDown,
    ...dataAttrs,
  };
  const body = (
    <>
      {under && <span className="card__under">{under}</span>}
      <span className={cx('card__face', faceClassName)}>
        {watermark && (
          <span className="card-watermark" aria-hidden="true">
            {watermark}
          </span>
        )}
        {children}
      </span>
      {overlay && <span className="card__over">{overlay}</span>}
      {selected && (
        <span className="card__check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true" focusable="false">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        {...common}
        data-interactive=""
        aria-label={name}
        aria-pressed={selected === undefined ? undefined : selected}
        aria-disabled={disabled || undefined}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          onClick(e);
        }}
      >
        {body}
      </button>
    );
  }
  return (
    <div {...common} role="img" aria-label={name} tabIndex={focusable ? 0 : undefined}>
      {body}
    </div>
  );
}
