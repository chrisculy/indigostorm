import type { CSSProperties, ReactNode } from 'react';
import type { CardDay, Suit } from '../../data/types.ts';
import { SuitIcon } from '../art/icons.tsx';
import { SUIT_COLOR, stampLabel } from './format.ts';

/** Suit icon in a filled disc of the suit color (white glyph). `hollow` draws an outline disc instead. */
export function SuitChip({
  suit,
  hollow,
  className,
}: {
  suit: Suit;
  hollow?: boolean | undefined;
  className?: string;
}) {
  return (
    <span
      className={className ? `suit-chip ${className}` : 'suit-chip'}
      data-hollow={hollow || undefined}
      style={{ '--chip': SUIT_COLOR[suit] } as CSSProperties}
    >
      <SuitIcon suit={suit} />
    </span>
  );
}

/** Colored header band: name on the left, class/type label on the right. */
export function CardBand({ name, label, icon }: { name: string; label: string; icon?: ReactNode }) {
  return (
    <span className="card-band" data-len={name.length > 26 ? 'xlong' : name.length > 15 ? 'long' : undefined}>
      <span className="card-band__name">{name}</span>
      <span className="card-band__label">
        {icon}
        {label}
      </span>
    </span>
  );
}

/** Footer: card ID and the storage stamp (CORE / DAY n / PROTOTYPE STAND-IN). */
export function CardFoot({ id, day }: { id: string; day: CardDay }) {
  return (
    <span className="card-foot">
      <span className="card-foot__id">{id}</span>
      <span className="card-foot__stamp" data-stamp={day === 'CORE' ? 'core' : day === 'PROTO' ? 'proto' : 'day'}>
        {stampLabel(day)}
      </span>
    </span>
  );
}
