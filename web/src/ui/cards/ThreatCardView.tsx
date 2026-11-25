import type { CSSProperties, ReactNode } from 'react';
import { threatsById } from '../../data/index.ts';
import type { ThreatCard } from '../../data/types.ts';
import { DieFace } from '../art/Die.tsx';
import { SuitIcon, ThreatGlyph } from '../art/icons.tsx';
import { CardBack } from './CardBack.tsx';
import { CardFrame, type CardStateProps } from './CardFrame.tsx';
import { density, pretty, SUIT_COLOR, THREAT_TYPE, type ThreatProgress, threatCardSummary } from './format.ts';
import { CardBand, CardFoot, SuitChip } from './parts.tsx';

export interface ThreatCardViewProps extends CardStateProps {
  card: ThreatCard;
  /** Live progress toward clearing (symbols and Power), shown in the requirement panel. */
  progress?: ThreatProgress | undefined;
  /** Current Timer/Hunt die value; shows a die on the card corner. */
  die?: number | undefined;
  /** Encrypted Threat waiting face-down: renders the Encrypted back. */
  faceDown?: boolean | undefined;
  /** Number of player cards tucked under it (drawn as a stack behind the card). */
  tuckedCount?: number | undefined;
  /** Its Pressure is cancelled this turn (stamp + struck-through Pressure line). */
  cancelled?: boolean | undefined;
}

function Row({
  label,
  children,
  kind,
  strike,
}: {
  label: string;
  children: ReactNode;
  kind?: string;
  strike?: boolean | undefined;
}) {
  return (
    <span className="tc-row" data-row={kind} data-strike={strike || undefined}>
      <span className="tc-row__label">{label}</span>
      <span className="tc-row__value">{children}</span>
    </span>
  );
}

function Requirement({ card, progress }: { card: ThreatCard; progress: ThreatProgress | undefined }) {
  const met = progress ? Math.min(progress.symbols, card.symbols) : 0;
  const powerMet = progress ? progress.power >= progress.powerNeeded : false;
  const symbolsMet = progress ? progress.symbols >= progress.symbolsNeeded : false;
  const ready = progress && powerMet && symbolsMet;
  return (
    <span className="tc-req" data-live={progress ? '' : undefined} data-ready={ready || undefined}>
      <span className="tc-req__symbols" data-count={card.symbols}>
        {Array.from({ length: card.symbols }, (_, i) => i).map((i) => (
          <SuitChip key={i} suit={card.pref} hollow={progress ? i >= met : false} />
        ))}
      </span>
      <span className="tc-req__power">
        {progress ? (
          <span className="tc-req__num">
            {progress.power}
            <small>/{progress.powerNeeded}</small>
          </span>
        ) : (
          <span className="tc-req__num">+{card.power}</span>
        )}
        <span className="tc-req__plabel">Power</span>
      </span>
      <span className="tc-req__suits">
        <span className="tc-req__pref" style={{ color: SUIT_COLOR[card.pref] }}>
          {card.pref}
        </span>
        {card.alt && (
          <span className="tc-req__alt">
            also <SuitIcon suit={card.alt} style={{ color: SUIT_COLOR[card.alt] }} />{' '}
            <span style={{ color: SUIT_COLOR[card.alt] }}>{card.alt}</span>
          </span>
        )}
        {progress?.wouldBeClean && <span className="tc-req__clean">Clean</span>}
      </span>
      {progress && (
        <span className="tc-req__bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (progress.power / Math.max(1, progress.powerNeeded)) * 100)}%` }} />
        </span>
      )}
    </span>
  );
}

/** A Threat card (any type), optionally with live table state. */
export function ThreatCardView({
  card,
  progress,
  die,
  faceDown,
  tuckedCount,
  cancelled,
  ...state
}: ThreatCardViewProps) {
  if (faceDown) {
    return <CardBack kind="encrypted" {...state} aria-label={state['aria-label'] ?? 'Encrypted Threat, face-down.'} />;
  }
  const t = THREAT_TYPE[card.type];
  const pursuer = card.type === 'Pursuer';
  const pair = card.pairsWith ? threatsById.get(card.pairsWith) : undefined;
  const pairName = pair ? pair.name : (card.pairsWith ?? '');
  const chars =
    card.rulesText.length +
    card.flavor.length +
    (card.timer !== null ? 30 : 0) +
    (card.cleanText ? 22 : 0) +
    (card.pressureText ? 22 : 0) +
    (card.blocker ? 60 : 0) +
    (card.pairsWith ? 60 : 0) +
    22;
  const stack = Math.min(tuckedCount ?? 0, 4);
  return (
    <CardFrame
      {...state}
      kind="threat"
      accent={t.color}
      label={threatCardSummary(card, { progress, die, tuckedCount, cancelled })}
      data={{ type: t.badge, density: density(chars, 110, 170), tucked: stack || undefined }}
      watermark={<ThreatGlyph kind={t.badge} size="100%" />}
      under={
        stack > 0
          ? Array.from({ length: stack }, (_, i) => i).map((i) => (
              <span key={i} className="tuck-edge" style={{ '--i': i + 1 } as CSSProperties} />
            ))
          : undefined
      }
      overlay={
        <>
          {die !== undefined && (
            <span key={`die-${die}`} className="card-die" data-variant={pursuer ? 'hunt' : 'timer'}>
              <DieFace value={die} variant={pursuer ? 'hunt' : 'timer'} decorative size="100%" />
            </span>
          )}
          {(tuckedCount ?? 0) > 0 && (
            <span className="tuck-count">
              <span className="tuck-count__n">{tuckedCount}</span> tucked
            </span>
          )}
          {cancelled && <span className="card-stamp">Pressure cancelled</span>}
        </>
      }
    >
      <CardBand name={card.name} label={t.label} icon={<ThreatGlyph kind={t.badge} className="card-band__glyph" />} />
      <span className="card-body tc-body">
        <Requirement card={card} progress={progress} />
        <span className="tc-rows">
          {card.timer !== null && (
            <span className="tc-timer">
              <DieFace value={card.timer} variant={pursuer ? 'hunt' : 'timer'} decorative className="tc-timer__die" />
              <span className="tc-timer__text">
                <strong>
                  {pursuer ? 'Hunt' : 'Timer'} {card.timer}
                </strong>
                <span>
                  {pursuer ? 'Strike' : 'Expiry'}: {pretty(card.expiryText) || '—'}
                </span>
              </span>
            </span>
          )}
          <Row label="Reward" kind="reward">
            {pretty(card.rewardText) || '—'}
          </Row>
          {card.cleanText && (
            <Row label="Clean" kind="clean">
              {pretty(card.cleanText)}
            </Row>
          )}
          {card.pressureText && (
            <Row label="Pressure" kind="pressure" strike={cancelled}>
              {pretty(card.pressureText)}
            </Row>
          )}
          {card.blocker && (
            <span className="tc-note tc-note--blocker">
              <ThreatGlyph kind="blocker" />
              <span>
                <strong>Blocker.</strong> Lead can’t increase while this is face-up.
              </span>
            </span>
          )}
          {card.type === 'Two-Phase Threat' && (
            <span className="tc-note tc-note--phase">
              <ThreatGlyph kind="twophase" />
              <span>
                <strong>When cleared:</strong> Countermeasure {pairName} enters this slot.
              </span>
            </span>
          )}
          {card.type === 'Countermeasure' && (
            <span className="tc-note tc-note--phase">
              <ThreatGlyph kind="countermeasure" />
              <span>Follows {pairName} into the same slot.</span>
            </span>
          )}
          {card.rulesText && <span className="tc-rules">{pretty(card.rulesText)}</span>}
        </span>
        {card.flavor && <span className="tc-flavor">{card.flavor}</span>}
      </span>
      <CardFoot id={card.id} day={card.day} />
    </CardFrame>
  );
}
