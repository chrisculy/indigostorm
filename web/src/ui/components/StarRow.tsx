import { StarIcon } from '../art/icons.tsx';

export interface StarSlot {
  label: string;
  earned: boolean;
  /** Longer condition text shown under the label. */
  detail?: string | undefined;
}

export interface StarRowProps {
  /** Either explicit slots (with labels) or a count of earned Stars out of `total`. */
  stars?: StarSlot[] | undefined;
  earned?: number | undefined;
  total?: number | undefined;
  showLabels?: boolean | undefined;
  /** Pop earned Stars in one after another (respects reduced motion). */
  animate?: boolean | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  className?: string | undefined;
}

/** Row of Stars (filled = earned). Accessible as one image with a full text summary. */
export function StarRow({
  stars,
  earned = 0,
  total = 3,
  showLabels = false,
  animate,
  size = 'md',
  className,
}: StarRowProps) {
  const slots: StarSlot[] =
    stars ?? Array.from({ length: total }, (_, i) => ({ label: `Star ${i + 1}`, earned: i < earned }));
  const count = slots.filter((s) => s.earned).length;
  const summary = `${count} of ${slots.length} Stars${
    stars ? `: ${slots.map((s) => `${s.label} ${s.earned ? 'earned' : 'not earned'}`).join(', ')}` : ''
  }`;
  return (
    <div
      className={className ? `stars ${className}` : 'stars'}
      data-size={size}
      data-labels={showLabels || undefined}
      data-animate={animate || undefined}
      role="img"
      aria-label={summary}
    >
      {slots.map((s, i) => (
        <span
          key={s.label}
          className="stars__slot"
          data-earned={s.earned || undefined}
          style={{ ['--i' as string]: i }}
        >
          <StarIcon filled={s.earned} className="stars__icon" />
          {showLabels && (
            <span className="stars__text">
              <span className="stars__label">{s.label}</span>
              {s.detail && <span className="stars__detail">{s.detail}</span>}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
