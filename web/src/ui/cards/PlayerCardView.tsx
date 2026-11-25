import type { PlayerCard, Suit } from '../../data/types.ts';
import { AllyGlyph, GearGlyph, SpiralGlyph, SuitIcon } from '../art/icons.tsx';
import { CardFrame, type CardStateProps } from './CardFrame.tsx';
import { density, playerAccent, playerCardSummary, pretty } from './format.ts';
import { CardBand, CardFoot, SuitChip } from './parts.tsx';

export interface PlayerCardViewProps extends CardStateProps {
  card: PlayerCard;
  /** Hide the Awakened flashback teaser (spoiler-safe contexts). */
  hideFlashback?: boolean | undefined;
}

function bonusText(card: PlayerCard): string {
  const b = card.awakeningBonus;
  if (!b) return '';
  const parts: string[] = [];
  if (b.lead) parts.push(`${b.lead > 0 ? '+' : '−'}${Math.abs(b.lead)} Lead`);
  if (b.exposure) parts.push(`${b.exposure > 0 ? '+' : '−'}${Math.abs(b.exposure)} Exposure`);
  if (b.draw) parts.push(`Draw ${b.draw}`);
  return parts.join(', ');
}

/** Training / Conditioned / Awakened: power seal, suit, ability, and class extras. */
function SuitedBody({ card, hideFlashback }: { card: PlayerCard; hideFlashback: boolean }) {
  const suit = card.suit as Suit;
  return (
    <>
      <span className="pc-top">
        <span className="power-seal" data-big={card.power >= 5 || undefined}>
          <span className="power-seal__num">{card.power}</span>
          <span className="power-seal__label">Power</span>
        </span>
        <span className="pc-suit">
          <SuitIcon suit={suit} className="pc-suit__icon" />
          <span className="pc-suit__name">{suit}</span>
        </span>
      </span>
      <span className="pc-ability">
        <span className="section-rule">
          <span>Ability</span>
          <small>instead of tucking</small>
        </span>
        <span className="pc-text">{pretty(card.text)}</span>
      </span>
      {card.cls === 'Conditioned' && (
        <span className="pc-box pc-box--conditioned">
          <span className="pc-box__title">
            <SpiralGlyph /> Conditioned
          </span>
          <span className="pc-box__text">{pretty(card.triggerText)}</span>
          <span className="pc-box__note">If it hasn’t awakened by the end of the episode, it awakens then.</span>
        </span>
      )}
      {card.cls === 'Awakened' && (
        <span className="pc-box pc-box--awakened">
          {bonusText(card) && (
            <span className="pc-box__title">
              <SpiralGlyph /> Awakening bonus <strong className="pc-bonus">{bonusText(card)}</strong>
            </span>
          )}
          {card.flavor && !hideFlashback && <span className="pc-flashback">{card.flavor}</span>}
        </span>
      )}
      {card.cls === 'Training' && card.flavor && <span className="pc-flavor">{card.flavor}</span>}
    </>
  );
}

function GearBody({ card }: { card: PlayerCard }) {
  const bonus = card.effects.find((e) => e.op === 'power_bonus');
  return (
    <>
      <span className="pc-emblem">
        <span className="pc-emblem__glyph">
          <GearGlyph />
        </span>
        {bonus && bonus.op === 'power_bonus' && (
          <span className="pc-gear-bonus">
            <SuitChip suit={bonus.suit} />
            <span className="pc-gear-bonus__num">+{bonus.n}</span>
            <span className="pc-gear-bonus__label">Power per {bonus.suit} card tucked</span>
          </span>
        )}
      </span>
      <span className="pc-ability">
        <span className="section-rule">
          <span>Ongoing</span>
          <small>stays in play</small>
        </span>
        <span className="pc-text">{pretty(card.text.replace(/^Ongoing:\s*/i, ''))}</span>
      </span>
    </>
  );
}

function AllyBody({ card }: { card: PlayerCard }) {
  return (
    <>
      <span className="pc-ally-symbols" data-count={card.allySymbols.length}>
        {card.allySymbols.map((s, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: an Ally can show the same suit twice; order is fixed
          <span key={`${s}${i}`} className="pc-ally-symbol">
            <SuitChip suit={s} />
            <span className="pc-ally-symbol__name">{s}</span>
          </span>
        ))}
      </span>
      <span className="pc-ability">
        <span className="section-rule">
          <span>
            <AllyGlyph /> Ally
          </span>
          <small>stays in play</small>
        </span>
        <span className="pc-text">{pretty(card.text.replace(/^Ally:\s*/i, ''))}</span>
      </span>
      <span className="pc-box pc-box--cover">
        <span className="pc-box__title">Ally Cover</span>
        <span className="pc-box__text">Defeat it during Pressure to cancel one Pressure, Expiry or Strike effect.</span>
      </span>
    </>
  );
}

/** A player card: Training, Gear, Ally, Conditioned or Awakened. */
export function PlayerCardView({ card, hideFlashback = false, ...state }: PlayerCardViewProps) {
  const chars =
    card.text.length +
    (card.cls === 'Conditioned' ? card.triggerText.length + 70 : 0) +
    (card.cls === 'Awakened' && !hideFlashback ? card.flavor.length * 0.8 + 30 : 0) +
    (card.cls === 'Ally' ? 90 : 0);
  return (
    <CardFrame
      {...state}
      kind="player"
      accent={playerAccent(card)}
      label={playerCardSummary(card)}
      data={{ cls: card.cls.toLowerCase(), suit: card.suit?.toLowerCase(), density: density(chars, 110, 170) }}
      watermark={
        card.suit ? (
          <SuitIcon suit={card.suit} size="100%" />
        ) : card.cls === 'Ally' ? (
          <AllyGlyph size="100%" />
        ) : (
          <GearGlyph size="100%" />
        )
      }
    >
      <CardBand name={card.name} label={card.cls} />
      <span className="card-body">
        {card.cls === 'Gear' ? (
          <GearBody card={card} />
        ) : card.cls === 'Ally' ? (
          <AllyBody card={card} />
        ) : (
          <SuitedBody card={card} hideFlashback={hideFlashback} />
        )}
      </span>
      <CardFoot id={card.id} day={card.day} />
    </CardFrame>
  );
}
