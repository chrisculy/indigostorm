// Plain-language labels for actions and events, and side-effect-free action previews.

import { perksById, playerCard, threat } from '../data/index.ts';
import type { Delta, Effect, PerkId } from '../data/types.ts';
import { isLegal } from './actions.ts';
import { step } from './core.ts';
import { cloneState, IllegalActionError, slotCounts, willAwaken } from './state.ts';
import type { Action, ActionPreview, GameEvent, GameState, Source } from './types.ts';

const cardName = (uid: string): string => playerCard(uid).name;
const threatName = (id: string): string => threat(id).name;
const perkName = (p: PerkId): string => perksById.get(p)?.name ?? p;
const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`);

export function deltaText(d: Delta): string {
  const parts: string[] = [];
  if (d.lead) parts.push(`${signed(d.lead)} Lead`);
  if (d.exposure) parts.push(`${signed(d.exposure)} Exposure`);
  if (d.draw) parts.push(`draw ${d.draw}`);
  return parts.join(', ') || 'no effect';
}

export function slotLabel(s: GameState, i: number | undefined): string {
  if (i === undefined) return 'nothing';
  const sl = s.slots[i];
  if (!sl) return `empty slot ${i + 1}`;
  if (sl.faceDown) return `the face-down Threat in slot ${i + 1}`;
  return threatName(sl.threatId);
}

function effectText(s: GameState, e: Effect, a: Extract<Action, { type: 'play' }>): string {
  const tgt = slotLabel(s, a.slot);
  const none = a.slot === undefined;
  switch (e.op) {
    case 'draw':
      return `draw ${e.n}`;
    case 'exposure':
      return `${signed(e.n)} Exposure`;
    case 'lead':
      return `${signed(e.n)} Lead`;
    case 'stall':
      return none ? 'stall (no target)' : `stall ${tgt} +${e.n}`;
    case 'cancel_pressure':
      return none ? 'cancel Pressure (no target)' : `cancel ${tgt}'s Pressure`;
    case 'add_power':
      return none ? 'add Power (no target)' : `+${e.n} Power to ${tgt}`;
    case 'clean_next':
      return 'next clear this turn is Clean';
    case 'breach':
      return none ? 'breach (no target)' : `breach ${tgt}`;
    case 'swap':
      return none ? 'swap (no target)' : `swap ${tgt}`;
    case 'peek':
      return `look at the top ${e.n} Threats`;
    case 'move_card':
      return none || !a.moveCard
        ? 'move a card (no target)'
        : `move ${cardName(a.moveCard)} from ${slotLabel(s, a.moveFrom)} to ${tgt}`;
    case 'power_bonus':
      return '';
  }
}

/** Short label for an action, e.g. "Tuck Muscle Memory under Roadblock". */
export function describeAction(s: GameState, a: Action): string {
  switch (a.type) {
    case 'play': {
      // Spoiler-safe: a Conditioned Card about to awaken is named as itself, and nothing about its
      // Awakened Card (name, text, bonus) is shown until the play happens.
      const pc = playerCard(a.cardUid);
      const awakens = willAwaken(s, a.cardUid);
      const suffix = awakens ? ' — it will awaken' : '';
      const name = pc.name;
      switch (a.mode) {
        case 'deploy':
          return `Deploy ${name} (${pc.cls})`;
        case 'tuck':
          return `Tuck ${name} under ${slotLabel(s, a.slot)}${suffix}`;
        case 'improvisedWeapon':
          return `Improvised Weapon: tuck ${name} under ${slotLabel(s, a.slot)} (any suit, double Power)${suffix}`;
        case 'decrypt':
          return `Decrypt ${slotLabel(s, a.slot)} with ${name}${suffix}`;
        case 'ability':
        case 'sleeperInstinct': {
          let body: string;
          if (s.twist === 'no_abilities') body = `play ${name} (no abilities today)`;
          else if (awakens) body = `use ${name}'s ability${a.slot !== undefined ? ` on ${slotLabel(s, a.slot)}` : ''}`;
          else {
            const parts = pc.effects.map((e) => effectText(s, e, a)).filter(Boolean);
            body = `${name}: ${parts.join(', ') || 'no effect'}`;
          }
          if (a.mode === 'sleeperInstinct')
            return `Sleeper Instinct: ${body}, then tuck it under ${slotLabel(s, a.slot2)}${suffix}`;
          return `${body}${suffix}`;
        }
      }
      return name;
    }
    case 'perk':
      switch (a.perk) {
        case 'vanish':
          return `Vanish ${slotLabel(s, a.slot)}`;
        case 'falseTrail':
          return 'False Trail: ignore up to 2 Exposure this turn';
        case 'satelliteOverwrite':
          return 'Satellite Overwrite: look at the top 4 Threats';
        case 'contingencyPlan':
          return 'Contingency Plan: draw 2';
        case 'masterDecryptor':
          return 'Master Decryptor: your cards count as any suit this turn';
        case 'adrenalineSurge':
          return "Adrenaline Surge: skip this turn's Pressure step";
        default:
          return perkName(a.perk);
      }
    case 'endPlays':
      return s.hand.length === 0 && s.drawPile.length === 0 ? 'End plays (out of cards: episode ends)' : 'End plays';
    case 'decide': {
      const d = s.pending;
      const ch = a.choice;
      if (!d) return 'Decide';
      switch (d.kind) {
        case 'chooseCard':
          return typeof ch === 'string' ? `Start with ${cardName(ch)} in hand` : 'Skip Cloned Credentials';
        case 'reorderTop':
          return `Put back top to bottom: ${(ch as string[]).map(threatName).join(', ')}`;
        case 'satellite': {
          const c = ch as { discard: string[]; order: string[] };
          const disc = c.discard.length ? `Discard ${c.discard.map(threatName).join(', ')}; ` : 'Discard none; ';
          return `${disc}top to bottom: ${c.order.map(threatName).join(', ') || '—'}`;
        }
        case 'allyCover': {
          const what = `${deltaText(d.delta)} (${d.effect} from ${threatName(d.threatId)})`;
          return typeof ch === 'string' ? `Defeat ${cardName(ch)} to cancel ${what}` : `Take ${what}`;
        }
        case 'kineticTarget':
          return typeof ch === 'number'
            ? `Kinetic Momentum: carry ${d.excess} Power to ${slotLabel(s, ch)}`
            : 'Keep Kinetic Momentum for later';
        case 'confirmHardenedResolve':
          return ch === true
            ? `Hardened Resolve: stop at ${d.redline - 1} Exposure`
            : `Let Exposure reach ${d.exposure + d.amount} (Cover Blown)`;
      }
      return 'Decide';
    }
  }
}

/** Run an action on a lookahead copy and summarize what it would do. Never reveals hidden
 * information: draws are counted, not shown; refills are not simulated; decrypts are not previewed. */
export function previewAction(s: GameState, a: Action): ActionPreview {
  if (!isLegal(s, a)) throw new IllegalActionError('Cannot preview an illegal action');
  const empty: ActionPreview = {
    lead: 0,
    exposure: 0,
    cardsDrawn: 0,
    clears: [],
    slots: [],
    ends: null,
    decision: null,
    hidden: false,
    awakens: false,
  };
  if (a.type === 'play' && a.mode === 'decrypt') return { ...empty, hidden: true };
  // The Awakened Card is secret until played: no numbers for a play that awakens a card.
  if (a.type === 'play' && willAwaken(s, a.cardUid)) return { ...empty, hidden: true, awakens: true };
  if (a.type === 'perk' && a.perk === 'satelliteOverwrite') return { ...empty, decision: 'satellite' };
  const hyp = cloneState(s, { keepLog: false });
  hyp.hypothetical = { phantomDraws: 0 };
  const { state: after, events } = step(hyp, a);
  const peeked = events.some((e) => e.type === 'peeked' && e.count > 0);
  const slots: ActionPreview['slots'] = [];
  after.slots.forEach((sl, i) => {
    if (!sl || sl.faceDown) return;
    const c = slotCounts(after, sl);
    const t = threat(sl.threatId);
    slots.push({ slot: i, symbols: c.symbols, symbolsNeeded: t.symbols, power: c.power, powerNeeded: t.power });
  });
  return {
    lead: after.lead - s.lead,
    exposure: after.exposure - s.exposure,
    cardsDrawn: after.hypothetical?.phantomDraws ?? 0,
    clears: events.flatMap((e) =>
      e.type === 'cleared' ? [{ slot: e.slot, threatId: e.threatId, clean: e.clean }] : [],
    ),
    slots,
    ends: after.phase === 'over' ? (after.result?.reason ?? null) : null,
    decision: after.pending?.kind ?? (peeked ? 'reorderTop' : null),
    hidden: false,
    awakens: false,
  };
}

function srcText(x: Source): string {
  const id = x.id;
  switch (x.kind) {
    case 'reward':
      return id ? `${threatName(id)} reward` : 'reward';
    case 'clean':
      return id ? `Clean bonus (${threatName(id)})` : 'Clean bonus';
    case 'twist':
      return 'Episode Twist';
    case 'pressure':
      return id ? `${threatName(id)} Pressure` : 'Pressure';
    case 'expiry':
      return id ? `${threatName(id)} escaped` : 'Expiry';
    case 'strike':
      return id ? `${threatName(id)} Strike` : 'Strike';
    case 'ability':
      return id ? cardName(id) : 'ability';
    case 'awakening':
      return 'Awakening bonus';
    case 'falseTrail':
      return 'False Trail';
    case 'sceneCleared':
      return 'Scene Cleared bonus';
    case 'perk':
      return id ? perkName(id as PerkId) : 'perk';
  }
}

const END_TEXT = {
  objective: 'Objective Secured',
  coverBlown: 'Cover Blown',
  outOfTime: 'Out of Time',
  sceneCleared: 'Scene Cleared',
} as const;

/** One plain-language log line for an event. */
export function describeEvent(e: GameEvent): string {
  switch (e.type) {
    case 'episodeStarted':
      return `Day ${e.day} begins.`;
    case 'turnStarted':
      return `Turn ${e.turn}.`;
    case 'drew':
      return e.cards.length === 0
        ? 'No cards left to draw.'
        : `Drew ${e.cards.length === 1 ? '1 card' : `${e.cards.length} cards`}: ${e.cards.map(cardName).join(', ')}.`;
    case 'perkUsed':
      return `Perk used: ${perkName(e.perk)}.`;
    case 'played':
      return `Played ${cardName(e.card)}.`;
    case 'awakened':
      return e.duringPlay
        ? `${cardName(e.conditioned)} awakens as ${cardName(e.awakened)}!`
        : `${cardName(e.conditioned)} awakens as ${cardName(e.awakened)}.`;
    case 'deployed':
      return `${cardName(e.card)} is now in play (${e.cls}).`;
    case 'tucked':
      return `Tucked ${cardName(e.card)} under ${threatName(e.threatId)} (${e.suit}, ${e.power + e.gearBonus} Power${e.gearBonus ? ` incl. +${e.gearBonus} Gear` : ''}).`;
    case 'abilityUsed':
      return `Used ${cardName(e.card)}'s ability.`;
    case 'abilityBlocked':
      return `${cardName(e.card)} has no effect (no Tactical Abilities today).`;
    case 'noEffect':
      return `${cardName(e.card)} has no effect.`;
    case 'decrypted':
      return `Decrypted ${threatName(e.threatId)} with ${cardName(e.card)}${e.tucked ? '' : ' (card discarded)'}.`;
    case 'stalled':
      return `Stalled ${threatName(e.threatId)}: die now ${e.die}.`;
    case 'pressureCancelled':
      return `${threatName(e.threatId)}'s Pressure is cancelled this turn.`;
    case 'powerAdded':
      return `${e.source === 'kinetic' ? 'Kinetic Momentum: ' : ''}+${e.n} Power on ${threatName(e.threatId)}.`;
    case 'cleanNext':
      return 'The next Threat cleared this turn is a Clean Clear.';
    case 'breach':
      return `Breach! ${threatName(e.threatId)} is cleared outright.`;
    case 'swapped':
      return e.threatId
        ? `Swapped ${threatName(e.threatId)} to the bottom of the Threat Deck.`
        : `Swapped the face-down Threat in slot ${e.slot + 1} to the bottom of the Threat Deck.`;
    case 'peeked':
      return e.count ? `Looked at the top ${e.count} Threats.` : 'The Threat Deck is empty.';
    case 'reordered':
      return e.discarded.length
        ? `Discarded ${e.discarded.map(threatName).join(', ')} from the Threat Deck and reordered the top ${e.count}.`
        : `Reordered the top ${e.count} Threats.`;
    case 'cardMoved':
      return `Moved ${cardName(e.card)} from ${threatName(e.fromThreat)} to ${threatName(e.toThreat)}.`;
    case 'sleeperFizzled':
      return `Sleeper Instinct: the target is gone, ${cardName(e.card)} is discarded.`;
    case 'cleared':
      return `Cleared ${threatName(e.threatId)}${e.clean ? ' (Clean Clear)' : ''}${e.breach ? ' by Breach' : ''}.`;
    case 'lead':
      return e.delta === 0
        ? `Lead stays at ${e.value} (${srcText(e.src)}).`
        : `${signed(e.delta)} Lead (${srcText(e.src)}): now ${e.value}.`;
    case 'leadBlocked':
      return `A Blocker stops +${e.amount} Lead (${srcText(e.src)}).`;
    case 'exposure':
      return e.delta === 0
        ? `Exposure stays at ${e.value} (${srcText(e.src)}).`
        : `${signed(e.delta)} Exposure (${srcText(e.src)}): now ${e.value}.`;
    case 'exposureAbsorbed':
      return `False Trail ignores ${e.amount} Exposure.`;
    case 'hardenedResolve':
      return `Hardened Resolve: you stop 1 below the redline (${e.prevented} Exposure ignored).`;
    case 'threatEntered':
      if (e.faceDown) return `An Encrypted Threat enters slot ${e.slot + 1} face-down.`;
      return `${e.countermeasure ? 'Countermeasure ' : ''}${threatName(e.threatId as string)} enters slot ${e.slot + 1}${e.die != null ? ` (die ${e.die})` : ''}.`;
    case 'slotEmpty':
      return `Slot ${e.slot + 1} stays empty (Threat Deck is empty).`;
    case 'pressureStep':
      return 'Pressure step.';
    case 'pressureSkipped':
      return 'Adrenaline Surge: the Pressure step is skipped.';
    case 'pressureIgnored':
      return `${threatName(e.threatId)}'s Pressure is cancelled.`;
    case 'pressureApplied':
      return `${threatName(e.threatId)} applies Pressure.`;
    case 'allyCover':
      return `${cardName(e.ally)} is defeated to cancel ${threatName(e.threatId)}'s ${e.effect === 'strike' ? 'Strike' : e.effect === 'expiry' ? 'Expiry effect' : 'Pressure'}.`;
    case 'timerTick':
      return `${threatName(e.threatId)}: die ${e.die}.`;
    case 'escaped':
      return `${threatName(e.threatId)} escapes!`;
    case 'strike':
      return `${threatName(e.threatId)} Strikes! Hunt die resets to ${e.die}.`;
    case 'vanished':
      return `Vanish: ${threatName(e.threatId)} is discarded.`;
    case 'sceneCleared':
      return 'Scene Cleared!';
    case 'episodeEnded':
      return `Episode over: ${END_TEXT[e.reason]} (Lead ${e.lead}, Exposure ${e.exposure}).`;
  }
}

export const endReasonText = (r: keyof typeof END_TEXT): string => END_TEXT[r];
