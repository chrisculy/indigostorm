import { useEffect, useRef, useState } from 'react';
import { ExposureIcon, LeadIcon, Pip, type PipState } from '../art/icons.tsx';

export interface TrackProps {
  kind: 'lead' | 'exposure';
  value: number;
  /** Highest position shown (Lead: up to 10, Exposure: the redline). */
  max: number;
  /** Lead target (ringed pip + "Target" marker). */
  target?: number | undefined;
  /** Cover Star threshold: positions at or below it are the "cover" zone (diamond marker). */
  threshold?: number | undefined;
  /** Exposure redline (crossed square + "Redline" marker). */
  redline?: number | undefined;
  label?: string | undefined;
  /** Compact single-line variant for tight headers. */
  compact?: boolean | undefined;
  className?: string | undefined;
}

/**
 * Lead / Exposure track as a row of numbered positions. Exposed to assistive tech as a native
 * <meter> with a full text value ("Exposure 2 of 6. Cover at 2 or less. Redline 6."). The value pulses when it changes.
 */
export function Track({ kind, value, max, target, threshold, redline, label, compact, className }: TrackProps) {
  const name = label ?? (kind === 'lead' ? 'Lead' : 'Exposure');
  const prev = useRef(value);
  const [pulse, setPulse] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (prev.current !== value) {
      setPulse(value > prev.current ? 'up' : 'down');
      prev.current = value;
      const t = setTimeout(() => setPulse(null), 700);
      return () => clearTimeout(t);
    }
  }, [value]);
  const parts = [`${name} ${value} of ${max}.`];
  if (target !== undefined) parts.push(`Target ${target}.`);
  if (threshold !== undefined) parts.push(`Cover at ${threshold} or less.`);
  if (redline !== undefined) parts.push(`Redline ${redline}.`);
  const positions = Array.from({ length: max + 1 }, (_, i) => i);
  const stateOf = (i: number): PipState => {
    if (redline !== undefined && i === redline) return 'redline';
    if (i <= value && i > 0) return 'filled';
    if (target !== undefined && i === target) return 'target';
    if (threshold !== undefined && i === threshold) return 'threshold';
    return 'empty';
  };
  return (
    <div
      className={className ? `track ${className}` : 'track'}
      data-kind={kind}
      data-compact={compact || undefined}
      data-pulse={pulse ?? undefined}
    >
      <meter className="sr-only" aria-label={name} min={0} max={max} value={value} aria-valuetext={parts.join(' ')}>
        {parts.join(' ')}
      </meter>
      <div className="track__head" aria-hidden="true">
        <span className="track__icon">{kind === 'lead' ? <LeadIcon /> : <ExposureIcon />}</span>
        <span className="track__name">{name}</span>
        <span className="track__value">
          <span className="track__now">{value}</span>
          {target !== undefined && <span className="track__of">/{target}</span>}
          {kind === 'exposure' && redline !== undefined && <span className="track__of">/{redline}</span>}
        </span>
      </div>
      <ol className="track__cells" aria-hidden="true">
        {positions.map((i) => (
          <li
            key={i}
            className="track__cell"
            data-state={stateOf(i)}
            data-current={i === value || undefined}
            data-zone={threshold !== undefined && i <= threshold ? 'cover' : undefined}
          >
            <Pip state={stateOf(i)} className="track__pip" />
            <span className="track__num">{i}</span>
            {target !== undefined && i === target && <span className="track__marker">Target</span>}
            {threshold !== undefined && i === threshold && <span className="track__marker">Cover ≤{threshold}</span>}
            {redline !== undefined && i === redline && (
              <span className="track__marker track__marker--red">Redline</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
