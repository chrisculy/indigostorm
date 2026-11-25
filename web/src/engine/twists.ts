// Episode Twist modifiers (PLAN.md 5.4 #16). Each helper answers one question the rules ask,
// so the rest of the engine never switches on twist codes directly.

import type { Delta, ThreatCard } from '../data/types.ts';
import type { TwistCode } from './types.ts';

export const BASE_SCENE_SLOTS = 3;
export const BASE_OPENING_HAND = 4;

/** Number of normal Scene Row slots (the Pursuer slot comes on top of these). */
export function sceneSlotCount(twist: TwistCode | null): number {
  return twist === 'four_slots' ? 4 : BASE_SCENE_SLOTS;
}

export function openingHandSize(twist: TwistCode | null): number {
  return twist === 'extra_opening_card' ? BASE_OPENING_HAND + 1 : BASE_OPENING_HAND;
}

export function startExposureBonus(twist: TwistCode | null): number {
  return twist === 'alarm_raised' ? 1 : 0;
}

export function abilitiesDisabled(twist: TwistCode | null): boolean {
  return twist === 'no_abilities';
}

/** Die value a Threat gets when it enters (or is decrypted). Pursuer Hunt dice are not timers
 * and are never modified. */
export function startingDie(t: ThreatCard, twist: TwistCode | null): number | null {
  if (t.timer == null) return null;
  if (t.type === 'Pursuer') return t.timer;
  return twist === 'timers_minus_one' ? Math.max(1, t.timer - 1) : t.timer;
}

/** The Clean bonus actually gained for a Clean Clear of `t`. */
export function cleanBonus(t: ThreatCard, twist: TwistCode | null): Delta {
  if (twist === 'alarm_raised') return { ...t.clean, exposure: -2 };
  return t.clean;
}

/** Extra Lead for a Clean Clear (Crowded station: Stealth Clean Clears +1 Lead). */
export function cleanClearLeadBonus(t: ThreatCard, twist: TwistCode | null): number {
  return twist === 'stealth_clean_lead' && t.pref === 'Stealth' ? 1 : 0;
}
