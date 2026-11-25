// Public API of the Indigo Storm rules engine. See README.md in this folder.

export {
  type AbilityTarget,
  abilityTargets,
  actionKey,
  apply,
  decisionChoices,
  isLegal,
  legalActions,
  perkActions,
  playActionsFor,
} from './actions.ts';
export { BOT_WEIGHTS, chooseDecision, incoming, scoreState, suggestAction, unseenEncrypted } from './bot.ts';
export {
  ALL_PERKS,
  actStars,
  awakenRemaining,
  campaignFinished,
  completeDay,
  computeStars,
  DECK_SIZE,
  debriefEpisode,
  finalPlayerCards,
  LAST_DAY,
  newCampaign,
  nextContentDay,
  perkUnlockOptions,
  skipDay,
  skipToNextContentDay,
  starCount,
} from './campaign.ts';
export { deltaText, describeAction, describeEvent, endReasonText, previewAction, slotLabel } from './describe.ts';
export { evaluateObjective, NOMINAL_TURNS, objectiveProgress } from './objectives.ts';
export { nextFloat, nextInt, nextUint32, seedRng, shuffle } from './rng.ts';
export { campaignSetup, createEpisode, dayCards, prototypeSetup } from './setup.ts';
export {
  type Counts,
  effectiveCard,
  IllegalActionError,
  leadBlocked,
  playerCardZones,
  slotCounts,
  threatZones,
  willAwaken,
} from './state.ts';
export {
  abilitiesDisabled,
  cleanBonus,
  cleanClearLeadBonus,
  openingHandSize,
  sceneSlotCount,
  startExposureBonus,
  startingDie,
} from './twists.ts';
export type * from './types.ts';
export { slotView, view } from './view.ts';

import { apply } from './actions.ts';
import { createEpisode } from './setup.ts';
import type { Action, EpisodeSetup, GameState } from './types.ts';

/** Rebuild a state from its setup and the actions taken (saves and replays). */
export function replay(setup: EpisodeSetup, actions: readonly Action[]): GameState {
  let s = createEpisode(setup);
  for (const a of actions) s = apply(s, a).state;
  return s;
}
