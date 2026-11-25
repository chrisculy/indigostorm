// Bonus Objectives: the Episode Plan keeps each day's Bonus Objective as text; this file
// maps every day to a machine code + parameters evaluated by src/engine/objectives.ts.
// objectives.test.ts fails if a plan text changes without this mapping changing with it.

export type BonusObjective =
  | { code: 'cleanClears'; n: number }
  | { code: 'clearTimedWithDie'; minDie: number }
  | { code: 'clearMultiSymbolInOneTurn'; minSymbols: number }
  | { code: 'maxExposure'; max: number }
  | { code: 'useAbilities'; n: number }
  | { code: 'gearAndAlly' }
  | { code: 'allyCoverExpiry'; n: number }
  | { code: 'clearOpeningRow' }
  | { code: 'objectiveTurnsToSpare'; turns: number }
  | { code: 'decryptAll' }
  | { code: 'clearsInOneTurn'; n: number }
  | { code: 'noEscapes' }
  | { code: 'clearWithSingleCard' }
  | { code: 'alliesAtEnd'; n: number }
  | { code: 'awakenDuringPlay' }
  | { code: 'cleanClearEachSuit' }
  | { code: 'clearPowerAtLeast'; n: number }
  | { code: 'objectiveWithoutPerks' }
  | { code: 'neutralizePursuer'; beforeTurn: number | null }
  | { code: 'allyCovers'; n: number }
  | { code: 'exposureBelowStart' }
  | { code: 'clearCountermeasures'; n: number }
  | { code: 'cleanClearsInOneTurn'; n: number }
  | { code: 'sceneCleared' };

export type ObjectiveCode = BonusObjective['code'];

export interface DayObjective {
  /** The Episode Plan text this code was written for (must match `days[].bonusObjective`). */
  text: string;
  objective: BonusObjective;
}

/** Day -> Bonus Objective, for all 30 days. */
export const dayObjectives: Readonly<Record<number, DayObjective>> = {
  1: { text: 'Make a Clean Clear.', objective: { code: 'cleanClears', n: 1 } },
  2: {
    text: 'Clear a timed Threat while its timer is 2 or higher.',
    objective: { code: 'clearTimedWithDie', minDie: 2 },
  },
  3: {
    text: 'Clear a Threat that needs 2+ symbols in a single turn.',
    objective: { code: 'clearMultiSymbolInOneTurn', minSymbols: 2 },
  },
  4: { text: 'Never let Exposure go above 2.', objective: { code: 'maxExposure', max: 2 } },
  5: { text: 'Use 3 Tactical Abilities this episode.', objective: { code: 'useAbilities', n: 3 } },
  6: { text: 'Have a Gear and an Ally in play at the same time.', objective: { code: 'gearAndAlly' } },
  7: { text: 'Use Ally Cover to cancel an Expiry effect.', objective: { code: 'allyCoverExpiry', n: 1 } },
  8: { text: 'Clear every Threat in the opening Scene Row.', objective: { code: 'clearOpeningRow' } },
  9: { text: 'Make 3 Clean Clears.', objective: { code: 'cleanClears', n: 3 } },
  10: {
    text: 'Reach the Lead target with at least 2 turns to spare.',
    objective: { code: 'objectiveTurnsToSpare', turns: 2 },
  },
  11: { text: 'Decrypt every Encrypted Threat that enters the Scene Row.', objective: { code: 'decryptAll' } },
  12: { text: 'Clear 2 Threats in one turn.', objective: { code: 'clearsInOneTurn', n: 2 } },
  13: { text: 'Finish without any Threat escaping.', objective: { code: 'noEscapes' } },
  14: { text: 'Clear a Threat with a single card.', objective: { code: 'clearWithSingleCard' } },
  15: { text: 'End the episode with 2 Allies in play.', objective: { code: 'alliesAtEnd', n: 2 } },
  16: { text: 'Awaken the Conditioned Card during play.', objective: { code: 'awakenDuringPlay' } },
  17: { text: 'Make a Clean Clear in each suit.', objective: { code: 'cleanClearEachSuit' } },
  18: { text: 'Clear a Threat that needs 7+ Power.', objective: { code: 'clearPowerAtLeast', n: 7 } },
  19: { text: 'Awaken the Conditioned Card during play.', objective: { code: 'awakenDuringPlay' } },
  20: { text: 'Reach the Lead target without using any perks.', objective: { code: 'objectiveWithoutPerks' } },
  21: { text: 'Neutralize the Pursuer.', objective: { code: 'neutralizePursuer', beforeTurn: null } },
  22: { text: 'Awaken the Conditioned Card during play.', objective: { code: 'awakenDuringPlay' } },
  23: { text: 'Neutralize the Pursuer before turn 5.', objective: { code: 'neutralizePursuer', beforeTurn: 5 } },
  24: { text: 'Use Ally Cover twice.', objective: { code: 'allyCovers', n: 2 } },
  25: { text: 'Finish with lower Exposure than you started with.', objective: { code: 'exposureBelowStart' } },
  26: { text: 'Clear a Countermeasure.', objective: { code: 'clearCountermeasures', n: 1 } },
  27: { text: 'Clear both Countermeasures.', objective: { code: 'clearCountermeasures', n: 2 } },
  28: { text: 'Make 2 Clean Clears in one turn.', objective: { code: 'cleanClearsInOneTurn', n: 2 } },
  29: { text: 'Finish without any Threat escaping.', objective: { code: 'noEscapes' } },
  30: { text: 'Clear every Threat (Scene Cleared).', objective: { code: 'sceneCleared' } },
};

export function objectiveForDay(day: number): DayObjective {
  const o = dayObjectives[day];
  if (!o) throw new Error(`No Bonus Objective mapped for day ${day}`);
  return o;
}
