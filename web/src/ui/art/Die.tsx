import { type ArtProps, Svg } from './Svg.tsx';

const PIPS: Record<number, [number, number][]> = {
  1: [[20, 20]],
  2: [
    [12, 12],
    [28, 28],
  ],
  3: [
    [11, 11],
    [20, 20],
    [29, 29],
  ],
  4: [
    [12, 12],
    [28, 12],
    [12, 28],
    [28, 28],
  ],
  5: [
    [11, 11],
    [29, 11],
    [20, 20],
    [11, 29],
    [29, 29],
  ],
  6: [
    [12, 10.5],
    [28, 10.5],
    [12, 20],
    [28, 20],
    [12, 29.5],
    [28, 29.5],
  ],
};

export type DieVariant = 'timer' | 'hunt';

export interface DieFaceProps extends ArtProps {
  value: number;
  /** timer = paper die with ink pips; hunt = crimson die with white pips (Pursuers). */
  variant?: DieVariant | undefined;
  /** Hide from assistive tech (when the surrounding text already says the value). */
  decorative?: boolean | undefined;
}

/**
 * A six-sided die face. Values 1–6 draw pips; anything else (0 or stalled past 6) shows the number.
 * Defaults its accessible name to "Timer 3" / "Hunt 3" when `title` is omitted and `decorative` is not set.
 */
export function DieFace({ value, variant = 'timer', title, decorative, ...svg }: DieFaceProps) {
  const pips = PIPS[value];
  const label = decorative ? undefined : (title ?? `${variant === 'hunt' ? 'Hunt' : 'Timer'} die showing ${value}`);
  const face = variant === 'hunt' ? 'var(--die-hunt, #b83227)' : 'var(--die-face, #fbfcff)';
  const pip = variant === 'hunt' ? '#fff' : 'var(--die-pip, #1d2433)';
  const edge = variant === 'hunt' ? 'rgb(0 0 0 / 0.35)' : 'rgb(29 36 51 / 0.35)';
  return (
    <Svg {...svg} title={label} viewBox="0 0 40 40" className={svg.className ? `die ${svg.className}` : 'die'}>
      <rect x="1.5" y="2.5" width="37" height="37" rx="8" fill={edge} />
      <rect x="1.5" y="1" width="37" height="36" rx="8" fill={face} stroke={edge} strokeWidth="1" />
      <rect x="4" y="3" width="32" height="8" rx="4" fill="#fff" opacity={variant === 'hunt' ? 0.12 : 0.6} />
      {pips ? (
        pips.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y - 1} r={value === 1 ? 4.6 : 3.5} fill={pip} />)
      ) : (
        <text
          x="20"
          y="27"
          textAnchor="middle"
          fontSize="20"
          fontWeight="700"
          fill={pip}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value}
        </text>
      )}
    </Svg>
  );
}
