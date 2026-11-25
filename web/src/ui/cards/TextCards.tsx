import { type ReactNode, useState } from 'react';
import { perksById, playerCardsById } from '../../data/index.ts';
import type { DayPlan, JumpIn, RuleCard, StoryCard } from '../../data/types.ts';
import { AllyGlyph, GearGlyph, PerkEmblem, StarIcon, SuitIcon, UiIcon } from '../art/icons.tsx';
import { CardFrame, type CardStateProps } from './CardFrame.tsx';
import { density, pretty, SUIT_COLOR } from './format.ts';
import { CardBand, CardFoot } from './parts.tsx';
import { RichText } from './RichText.tsx';

/* ------------------------------------------------------------------ Rule cards */

export type RuleSide = 'front' | 'back';

export interface RuleCardViewProps extends CardStateProps {
  rule: RuleCard;
  /** Controlled side. Omit to let the card manage it (with its flip button). */
  side?: RuleSide | undefined;
  defaultSide?: RuleSide | undefined;
  onSideChange?: ((side: RuleSide) => void) | undefined;
  /** Show the "Flip" button under the card. Default true. */
  flipButton?: boolean | undefined;
}

function RuleFace({
  rule,
  side,
  state,
}: {
  rule: RuleCard;
  side: RuleSide;
  state: CardStateProps & { inert?: boolean };
}) {
  const text = side === 'front' ? rule.front : rule.back;
  const { inert, ...rest } = state;
  return (
    <span className="flip__face" data-face={side} inert={inert}>
      <CardFrame
        {...rest}
        size="fluid"
        kind="rule"
        accent="var(--type-rule)"
        label={`Rule card: ${rule.title}, side ${side === 'front' ? 1 : 2} of 2. ${pretty(text).replace(/\n+/g, ' ')}`}
        data={{ density: density(text.length, 340, 440) }}
      >
        <CardBand
          name={side === 'front' ? rule.title : `${rule.title} (cont.)`}
          label={`Rules ${side === 'front' ? 1 : 2}/2`}
        />
        <span className="card-body text-body">
          <RichText text={text} />
        </span>
        <CardFoot id={rule.id} day={rule.day} />
      </CardFrame>
    </span>
  );
}

/** A double-sided Rule card. Flipping animates in 3D (cross-fades under reduced motion). */
export function RuleCardView({
  rule,
  side,
  defaultSide = 'front',
  onSideChange,
  flipButton = true,
  size = 'lg',
  className,
  style,
  ...state
}: RuleCardViewProps) {
  const [own, setOwn] = useState<RuleSide>(defaultSide);
  const current = side ?? own;
  const flip = () => {
    const next = current === 'front' ? 'back' : 'front';
    setOwn(next);
    onSideChange?.(next);
  };
  return (
    <span className={className ? `rule-card ${className}` : 'rule-card'} data-size={size} style={style}>
      <span className="flip" data-side={current}>
        <span className="flip__inner">
          <RuleFace rule={rule} side="front" state={{ ...state, inert: current !== 'front' }} />
          <RuleFace rule={rule} side="back" state={{ ...state, inert: current !== 'back' }} />
        </span>
      </span>
      {flipButton && (
        <button
          type="button"
          className="flip-btn"
          onClick={flip}
          aria-label={`Flip ${rule.title} to side ${current === 'front' ? 2 : 1}`}
        >
          <UiIcon name="flip" />
          <span>{current === 'front' ? 'Side 1 of 2' : 'Side 2 of 2'}</span>
        </button>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ Story cards */

export interface StoryCardViewProps extends CardStateProps {
  story: StoryCard;
  /** The day's plan: adds the setup block to Intros, and unlock/debrief lines to Outros. */
  plan?: DayPlan | undefined;
  /** The day has a Pursuer (adds the 4th-slot setup line). */
  hasPursuer?: boolean | undefined;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="story-stat">
      <span className="story-stat__label">{label}</span>
      <span className="story-stat__value">{children}</span>
    </span>
  );
}

/** Intro or Outro card, with the day's setup (Intro) or end-of-day steps (Outro) when `plan` is given. */
export function StoryCardView({ story, plan, hasPursuer, size = 'lg', ...state }: StoryCardViewProps) {
  const intro = story.type === 'Intro';
  const extraLen = plan ? (intro ? 140 + plan.bonusObjective.length + plan.episodeTwist.length : 60) : 0;
  const summary = [
    `${story.type} card: ${story.title}.`,
    pretty(story.text).replace(/\n+/g, ' '),
    plan && intro
      ? `Lead target ${plan.leadTarget}, start at ${plan.startLead}. Start Exposure ${plan.startExposure}, redline ${plan.redline}. Stars: reach the Lead target; finish at Exposure ${plan.coverThreshold} or less; ${plan.bonusObjective}${plan.episodeTwist ? ` Twist: ${plan.episodeTwist}` : ''}`
      : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <CardFrame
      {...state}
      size={size}
      kind="story"
      accent="var(--type-story)"
      label={summary}
      data={{ story: story.type.toLowerCase(), density: density(story.text.length + extraLen, 300, 420) }}
    >
      <CardBand name={story.title} label={story.type} />
      <span className="card-body text-body">
        <RichText text={story.text} />
        {plan && intro && (
          <span className="story-setup">
            <span className="story-stats">
              <Stat label="Lead target">
                {plan.leadTarget} <small>start {plan.startLead}</small>
              </Stat>
              <Stat label="Exposure">
                {plan.startExposure} <small>redline {plan.redline}</small>
              </Stat>
            </span>
            <span className="story-stars">
              <span className="rt-h">Today’s Stars</span>
              <span className="story-star">
                <StarIcon /> Reach the Lead target
              </span>
              <span className="story-star">
                <StarIcon /> Finish at Exposure {plan.coverThreshold} or less
              </span>
              <span className="story-star">
                <StarIcon /> {pretty(plan.bonusObjective)}
              </span>
            </span>
            {plan.episodeTwist && (
              <span className="story-twist">
                <strong>Twist:</strong> {pretty(plan.episodeTwist)}
              </span>
            )}
            {hasPursuer && (
              <span className="story-twist">
                <strong>Setup:</strong> place today’s Pursuer in a 4th Scene Row slot.
              </span>
            )}
          </span>
        )}
        {plan && !intro && (
          <span className="story-setup">
            {plan.perkUnlock && <span className="rt-h">Unlock 1 Clearance Perk</span>}
            {plan.debrief && <span className="rt-h">{plan.debrief}</span>}
            <span className="rt-p">Record today’s Stars. Then discard down to 12 cards.</span>
          </span>
        )}
      </span>
      <CardFoot id={story.id} day={story.day} />
    </CardFrame>
  );
}

/* ------------------------------------------------------------------ Jump-In */

export interface JumpInViewProps extends CardStateProps {
  jumpIn: JumpIn;
}

/** Prototype Jump-In summary: the preset 12-card deck and unlocked perks. */
export function JumpInView({ jumpIn, size = 'lg', ...state }: JumpInViewProps) {
  const cards = jumpIn.deck.map((id) => ({ id, card: playerCardsById.get(id) }));
  const perks = jumpIn.perks.map((id) => perksById.get(id)).filter((p) => p !== undefined);
  const summary = `Jump-in for Day ${jumpIn.day}. Set up as if you'd played Days 1 to ${jumpIn.day - 1}. Your 12-card deck: ${cards
    .map((c) => c.card?.name ?? c.id)
    .join(', ')}. Unlocked perks: ${perks.length ? perks.map((p) => p.name).join(', ') : 'none'}.`;
  return (
    <CardFrame
      {...state}
      size={size}
      kind="jumpin"
      accent="var(--type-jumpin)"
      label={summary}
      data={{ density: perks.length > 2 ? 'tight' : 'dense' }}
    >
      <CardBand name={`Jump-in: Day ${jumpIn.day}`} label="Prototype" />
      <span className="card-body text-body jump-body">
        <span className="rt-p">
          {jumpIn.day > 1
            ? `Set up as if you’d played Days 1–${jumpIn.day - 1}.`
            : 'Your starting deck for the campaign.'}
        </span>
        <span className="rt-h">Your 12-card deck</span>
        <span className="jump-deck">
          {cards.map(({ id, card }) => (
            <span key={id} className="jump-card">
              <span className="jump-card__icon" style={{ color: card?.suit ? SUIT_COLOR[card.suit] : 'var(--ink-2)' }}>
                {card?.suit ? <SuitIcon suit={card.suit} /> : card?.cls === 'Ally' ? <AllyGlyph /> : <GearGlyph />}
              </span>
              <span className="jump-card__power">{card?.suit ? card.power : '–'}</span>
              <span className="jump-card__name">{card?.name ?? id}</span>
            </span>
          ))}
        </span>
        <span className="rt-h">Unlocked perks</span>
        <span className="jump-perks">
          {perks.length === 0 && <span className="rt-p">None</span>}
          {perks.map((p) => (
            <span key={p.id} className="jump-perk" data-branch={p.branch.toLowerCase()}>
              <PerkEmblem branch={p.branch} />
              <span>{p.name}</span>
            </span>
          ))}
        </span>
      </span>
      <span className="card-foot">
        <span className="card-foot__id">JUMP-{jumpIn.day}</span>
        <span className="card-foot__stamp" data-stamp="proto">
          Day {jumpIn.day}
        </span>
      </span>
    </CardFrame>
  );
}
