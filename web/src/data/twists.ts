// Episode Twists: one-line, one-day rule changes printed on some Intro Cards.
// The Episode Plan keeps them as text; this file maps each day to a machine code the
// rules engine understands (src/engine/twists.ts). twists.test.ts fails if a plan text
// changes without this mapping changing with it.

export type TwistCode =
  | 'stealth_clean_lead'
  | 'four_slots'
  | 'no_abilities'
  | 'extra_opening_card'
  | 'timers_minus_one'
  | 'alarm_raised';

export const TWIST_CODES: readonly TwistCode[] = [
  'stealth_clean_lead',
  'four_slots',
  'no_abilities',
  'extra_opening_card',
  'timers_minus_one',
  'alarm_raised',
];

export interface DayTwist {
  code: TwistCode;
  /** The Episode Plan text this code was written for (must match `days[].episodeTwist`). */
  text: string;
}

/** Day -> Episode Twist. Days not listed have no twist. */
export const dayTwists: Readonly<Record<number, DayTwist>> = {
  4: { code: 'stealth_clean_lead', text: 'Crowded station: Stealth Clean Clears also give +1 Lead.' },
  8: { code: 'four_slots', text: 'Night op: the Scene Row has 4 slots today.' },
  13: { code: 'no_abilities', text: 'Comms blackout: no Tactical Abilities today.' },
  18: { code: 'extra_opening_card', text: 'Handler on the line: draw 1 extra card at the start.' },
  24: { code: 'timers_minus_one', text: 'Lockdown: timers start 1 lower.' },
  28: { code: 'alarm_raised', text: 'Alarm raised: start at +1 Exposure, but Clean Clears give -2 Exposure.' },
};

export function twistForDay(day: number): TwistCode | null {
  return dayTwists[day]?.code ?? null;
}

/** Short player-facing description of each twist code (for tooltips and logs). */
export const twistSummaries: Readonly<Record<TwistCode, string>> = {
  stealth_clean_lead: 'Stealth Clean Clears also give +1 Lead.',
  four_slots: 'The Scene Row has 4 slots.',
  no_abilities: 'No Tactical Abilities: cards played for their ability have no effect.',
  extra_opening_card: 'Draw 1 extra card at the start (opening hand of 5).',
  timers_minus_one: 'Threat timers start 1 lower (minimum 1).',
  alarm_raised: 'Start at +1 Exposure; Clean Clears give -2 Exposure.',
};
