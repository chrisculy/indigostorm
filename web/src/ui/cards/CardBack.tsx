import { BACKS, type BackKind, CardBackArt } from '../art/CardBackArt.tsx';
import { CardFrame, type CardStateProps } from './CardFrame.tsx';

export interface CardBackProps extends CardStateProps {
  kind: BackKind;
  /** Show the back's instruction note (e.g. "Don't read until…"). Default true. */
  showNote?: boolean | undefined;
  /** Small count badge, e.g. cards left in a deck. */
  count?: number | undefined;
}

/** The back of any card: operative, threat, encrypted, briefing, outro, flashback, countermeasure, jump-in. */
export function CardBack({ kind, showNote = true, count, ...state }: CardBackProps) {
  const spec = BACKS[kind];
  const label = `${spec.label} card back${count !== undefined ? `, ${count} ${count === 1 ? 'card' : 'cards'}` : ''}.${
    showNote && spec.note ? ` ${spec.note}` : ''
  }`;
  return (
    <CardFrame
      {...state}
      kind="back"
      accent={spec.accent}
      label={label}
      data={{ back: kind }}
      faceClassName="card__face--back"
      overlay={count !== undefined ? <span className="back-count">{count}</span> : undefined}
    >
      <CardBackArt kind={kind} className="back-art" />
      <span className="back-text" style={{ color: spec.accent }}>
        <span className="back-text__brand">Indigo Storm</span>
        <span className="back-text__label" data-long={spec.label.length > 14 || undefined}>
          {spec.label}
        </span>
        {showNote && spec.note && <span className="back-text__note">{spec.note}</span>}
      </span>
    </CardFrame>
  );
}
