// Text helpers shared by the card renderers: labels, stamps, accessible summaries.
// Pure functions of card data — no game rules.

import type { CardDay, PlayerCard, Suit, ThreatCard, ThreatType } from '../../data/types.ts';
import type { BadgeKind } from '../art/icons.tsx';

/** Footer stamp text, same as the print cards. */
export function stampLabel(day: CardDay): string {
  if (day === 'CORE') return 'Core';
  if (day === 'PROTO') return 'Prototype stand-in';
  return `Day ${day}`;
}

/** Typographic minus for "-1 Exposure" style deltas. */
export function pretty(text: string): string {
  return text.replace(/(^|[\s(,])-(\d)/g, '$1−$2');
}

export const THREAT_TYPE: Record<ThreatType, { label: string; badge: BadgeKind; color: string }> = {
  Threat: { label: 'Threat', badge: 'threat', color: 'var(--type-threat)' },
  'Encrypted Threat': { label: 'Encrypted', badge: 'encrypted', color: 'var(--type-encrypted)' },
  Pursuer: { label: 'Pursuer', badge: 'pursuer', color: 'var(--type-pursuer)' },
  'Two-Phase Threat': { label: 'Two-phase', badge: 'twophase', color: 'var(--type-twophase)' },
  Countermeasure: { label: 'Countermeasure', badge: 'countermeasure', color: 'var(--type-countermeasure)' },
};

export const SUIT_COLOR: Record<Suit, string> = {
  Recon: 'var(--suit-recon)',
  Stealth: 'var(--suit-stealth)',
  Force: 'var(--suit-force)',
};

export function playerAccent(card: PlayerCard): string {
  if (card.suit) return SUIT_COLOR[card.suit];
  return card.cls === 'Ally' ? 'var(--type-ally)' : 'var(--type-gear)';
}

/** Text density bucket from the amount of body text, so long cards shrink their type a step. */
export type Density = 'normal' | 'dense' | 'tight';
export function density(chars: number, normalMax: number, denseMax: number): Density {
  if (chars <= normalMax) return 'normal';
  if (chars <= denseMax) return 'dense';
  return 'tight';
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function deltaWords(d: { lead: number; exposure: number; draw: number }): string {
  const parts: string[] = [];
  if (d.lead) parts.push(`${d.lead > 0 ? '+' : '−'}${Math.abs(d.lead)} Lead`);
  if (d.exposure) parts.push(`${d.exposure > 0 ? '+' : '−'}${Math.abs(d.exposure)} Exposure`);
  if (d.draw) parts.push(`draw ${d.draw}`);
  return parts.join(', ');
}

/** Spoken summary of a player card (used as the accessible name). */
export function playerCardSummary(card: PlayerCard): string {
  const out: string[] = [`${card.name}.`];
  if (card.cls === 'Gear') out.push('Gear, stays in play.');
  else if (card.cls === 'Ally') out.push(`Ally, stays in play. Symbols: ${card.allySymbols.join(' and ')}.`);
  else out.push(`${card.suit ?? ''} ${card.cls} card, Power ${card.power}.`);
  if (card.cls === 'Gear' || card.cls === 'Ally') out.push(pretty(card.text));
  else out.push(`Ability: ${pretty(card.text)}`);
  if (card.cls === 'Conditioned' && card.triggerText) out.push(`Conditioned: ${card.triggerText}`);
  if (card.cls === 'Awakened' && card.awakeningBonus) {
    const b = deltaWords(card.awakeningBonus);
    if (b) out.push(`Awakening bonus: ${b}.`);
  }
  out.push(`${stampLabel(card.day)}.`);
  return out.map((s) => s.trim()).join(' ');
}

export interface ThreatProgress {
  symbols: number;
  symbolsNeeded: number;
  power: number;
  powerNeeded: number;
  wouldBeClean?: boolean | undefined;
}

export interface ThreatLiveState {
  progress?: ThreatProgress | undefined;
  die?: number | undefined;
  tuckedCount?: number | undefined;
  cancelled?: boolean | undefined;
}

/** Spoken summary of a Threat card, including live table state when given. */
export function threatCardSummary(card: ThreatCard, live: ThreatLiveState = {}): string {
  const t = THREAT_TYPE[card.type];
  const out: string[] = [`${card.name}. ${t.label === 'Threat' ? 'Threat' : `${t.label} Threat`}.`];
  out.push(
    `Needs ${plural(card.symbols, `${card.pref} symbol`)}${card.alt ? ` (${card.alt} also counts)` : ''} and ${card.power} Power.`,
  );
  if (card.timer !== null) {
    out.push(
      card.type === 'Pursuer'
        ? `Hunt ${card.timer}, Strike ${pretty(card.expiryText) || 'none'}.`
        : `Timer ${card.timer}, Expiry ${pretty(card.expiryText) || 'none'}.`,
    );
  }
  out.push(`Reward ${pretty(card.rewardText) || 'none'}.`);
  if (card.cleanText) out.push(`Clean bonus ${pretty(card.cleanText)}.`);
  if (card.pressureText) out.push(`Pressure ${pretty(card.pressureText)}.`);
  if (card.blocker) out.push('Blocker: Lead cannot increase while this is face-up.');
  if (card.rulesText) out.push(pretty(card.rulesText));
  const p = live.progress;
  if (p) {
    out.push(
      `Progress ${p.symbols} of ${plural(p.symbolsNeeded, 'symbol')}, ${p.power} of ${p.powerNeeded} Power${p.wouldBeClean ? ', on track for a Clean Clear' : ''}.`,
    );
  }
  if (live.die !== undefined) out.push(`${card.type === 'Pursuer' ? 'Hunt' : 'Timer'} die at ${live.die}.`);
  if (live.tuckedCount) out.push(`${plural(live.tuckedCount, 'card')} tucked under it.`);
  if (live.cancelled) out.push('Pressure cancelled this turn.');
  return out.join(' ');
}
