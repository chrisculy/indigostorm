// Serializable engine state and the contracts between the engine and the UI.
// Everything here is plain JSON data: no classes, no Maps, no functions.

import type { BonusObjective, ObjectiveCode } from '../data/objectives.ts';
import type { TwistCode } from '../data/twists.ts';
import type { Delta, Effect, PerkId, PlayerClass, Suit } from '../data/types.ts';

export type { BonusObjective, Delta, Effect, PerkId, Suit, TwistCode };

export type Phase = 'setup' | 'play' | 'pressure' | 'draw' | 'over';
export type PlayMode = 'tuck' | 'ability' | 'deploy' | 'decrypt' | 'improvisedWeapon' | 'sleeperInstinct';
export type EndReason = 'objective' | 'coverBlown' | 'outOfTime' | 'sceneCleared';
/** sfc32 state: four unsigned 32-bit integers. */
export type RngState = [number, number, number, number];

// ---------------------------------------------------------------------------- setup

export interface EpisodeSetup {
  day: number;
  /** Player card ids for this episode (normally 15: a 12-card deck + the day's 3 cards). */
  deck: string[];
  /** Unlocked Clearance Perks. */
  perks: PerkId[];
  seed: number;
  /** Episode Twist; prototypeSetup/campaignSetup fill in the day's twist. */
  twist?: TwistCode | null;
}

// ---------------------------------------------------------------------------- zones

/** A player card tucked under a Threat. `suit` is the suit it counts as (Improvised Weapon /
 * Master Decryptor make it the Threat's preferred suit); `power` already includes Improvised
 * Weapon doubling; `gearBonus` is the Gear power_bonus it received when tucked. */
export interface TuckedCard {
  uid: string;
  suit: Suit;
  power: number;
  gearBonus: number;
  /** Tucked with Improvised Weapon (counts as any suit; may be moved anywhere). */
  wild: boolean;
}

export interface SlotState {
  threatId: string;
  faceDown: boolean;
  tucked: TuckedCard[];
  /** Power added by abilities (add_power) and Kinetic Momentum. */
  bonusPower: number;
  /** Timer / Hunt die, null when the Threat has none or is face-down. */
  die: number | null;
  /** cancel_pressure was played on it this turn. */
  cancelPressure: boolean;
  /** Turn on which progress (a tucked card or bonus Power) was first added; null if none. */
  startedTurn: number | null;
}

export interface Modifiers {
  /** False Trail is active this turn. */
  falseTrail: boolean;
  falseTrailAbsorbLeft: number;
  falseTrailLeadGiven: boolean;
  /** Master Decryptor is active this turn. */
  masterDecryptor: boolean;
  /** Adrenaline Surge: skip this turn's Pressure step. */
  adrenaline: boolean;
  /** clean_next: the next clear this turn is Clean. */
  cleanNext: boolean;
}

export interface Source {
  kind:
    | 'reward'
    | 'clean'
    | 'twist'
    | 'pressure'
    | 'expiry'
    | 'strike'
    | 'ability'
    | 'awakening'
    | 'falseTrail'
    | 'sceneCleared'
    | 'perk';
  /** Card or Threat id the change came from, when there is one. */
  id?: string;
}

// ---------------------------------------------------------------------------- decisions

export type Decision =
  | {
      kind: 'chooseCard';
      /** Cloned Credentials: any card of the deck may start in hand (or decline). */
      options: string[];
    }
  | {
      kind: 'reorderTop';
      /** peek N: the top Threats, top first. Choose their new order (top first). */
      cards: string[];
      card: string;
    }
  | {
      kind: 'satellite';
      /** Satellite Overwrite: the top (up to) 4 Threats, top first. Discard up to `maxDiscard`, order the rest. */
      cards: string[];
      maxDiscard: number;
    }
  | {
      kind: 'allyCover';
      effect: 'pressure' | 'expiry' | 'strike';
      slot: number;
      threatId: string;
      delta: Delta;
      /** Allies that may be defeated to cancel the effect. */
      allies: string[];
    }
  | {
      kind: 'kineticTarget';
      excess: number;
      /** Slots of face-up Threats that may receive the excess Power. */
      options: number[];
    }
  | {
      kind: 'confirmHardenedResolve';
      /** Exposure about to be gained. */
      amount: number;
      exposure: number;
      redline: number;
      source: Source;
    };

export type DecisionKind = Decision['kind'];

/** Answers, by decision kind:
 * - chooseCard: card uid, or null to decline (perk stays unused)
 * - reorderTop: card uids, top first (a permutation of `cards`)
 * - satellite: { discard: uids (≤ maxDiscard), order: the rest, top first }
 * - allyCover: ally uid to defeat, or null to let the effect resolve
 * - kineticTarget: slot index, or null to decline (perk stays unused)
 * - confirmHardenedResolve: true to stop 1 below the redline, false to let it hit */
export type DecisionChoice = string | number | boolean | null | string[] | { discard: string[]; order: string[] };

// ---------------------------------------------------------------------------- actions

export type Action =
  | {
      type: 'play';
      cardUid: string;
      mode: PlayMode;
      /** tuck / improvisedWeapon / decrypt target, or the ability's target slot. */
      slot?: number;
      /** sleeperInstinct: the Threat to tuck the card under after its ability. */
      slot2?: number;
      /** move_card: slot the tucked card is moved from (target is `slot`). */
      moveFrom?: number;
      /** move_card: uid of the tucked card to move. */
      moveCard?: string;
    }
  | { type: 'perk'; perk: PerkId; slot?: number }
  | { type: 'endPlays' }
  | { type: 'decide'; choice: DecisionChoice };

// ---------------------------------------------------------------------------- events

export type GameEvent =
  | { type: 'episodeStarted'; day: number; twist: TwistCode | null }
  | { type: 'turnStarted'; turn: number }
  | { type: 'drew'; cards: string[]; requested: number }
  | { type: 'perkUsed'; perk: PerkId }
  | { type: 'played'; card: string; mode: PlayMode }
  | { type: 'awakened'; conditioned: string; awakened: string; duringPlay: boolean; flashback: string }
  | { type: 'deployed'; card: string; cls: 'Gear' | 'Ally'; gearCount: number; allyCount: number }
  | {
      type: 'tucked';
      card: string;
      slot: number;
      threatId: string;
      suit: Suit;
      power: number;
      gearBonus: number;
      wild: boolean;
    }
  | { type: 'abilityUsed'; card: string }
  | { type: 'abilityBlocked'; card: string }
  | { type: 'noEffect'; card: string }
  | { type: 'decrypted'; card: string; slot: number; threatId: string; tucked: boolean }
  | { type: 'stalled'; slot: number; threatId: string; n: number; die: number }
  | { type: 'pressureCancelled'; slot: number; threatId: string }
  | { type: 'powerAdded'; slot: number; threatId: string; n: number; source: 'ability' | 'kinetic' }
  | { type: 'cleanNext' }
  | { type: 'breach'; slot: number; threatId: string }
  | { type: 'swapped'; slot: number; threatId: string | null }
  | { type: 'peeked'; count: number }
  | { type: 'reordered'; count: number; discarded: string[] }
  | { type: 'cardMoved'; card: string; from: number; to: number; fromThreat: string; toThreat: string }
  | { type: 'sleeperFizzled'; card: string }
  | {
      type: 'cleared';
      slot: number;
      threatId: string;
      threatType: string;
      pref: Suit;
      clean: boolean;
      breach: boolean;
      excess: number;
      turn: number;
      symbolsRequired: number;
      powerRequired: number;
      /** Die value at the moment of the clear (null if none). */
      die: number | null;
      /** True for a Threat with a timer (not a Pursuer's Hunt die). */
      timed: boolean;
      startedTurn: number | null;
      tuckedCount: number;
      bonusPower: number;
    }
  | { type: 'lead'; delta: number; value: number; src: Source }
  | { type: 'leadBlocked'; amount: number; src: Source }
  | { type: 'exposure'; delta: number; value: number; src: Source }
  | { type: 'exposureAbsorbed'; amount: number }
  | { type: 'hardenedResolve'; prevented: number }
  | {
      type: 'threatEntered';
      slot: number;
      /** null when it entered face-down (identity hidden). */
      threatId: string | null;
      faceDown: boolean;
      die: number | null;
      countermeasure: boolean;
    }
  | { type: 'slotEmpty'; slot: number }
  | { type: 'pressureStep' }
  | { type: 'pressureSkipped' }
  | { type: 'pressureIgnored'; slot: number; threatId: string }
  | { type: 'allyCover'; ally: string; effect: 'pressure' | 'expiry' | 'strike'; slot: number; threatId: string }
  | { type: 'pressureApplied'; slot: number; threatId: string }
  | { type: 'timerTick'; slot: number; threatId: string; die: number }
  | { type: 'escaped'; slot: number; threatId: string }
  | { type: 'strike'; slot: number; threatId: string; die: number }
  | { type: 'vanished'; slot: number; threatId: string }
  | { type: 'sceneCleared' }
  | { type: 'episodeEnded'; reason: EndReason; lead: number; exposure: number };

export type GameEventType = GameEvent['type'];

// ---------------------------------------------------------------------------- internal task queue

/** Pending steps of the resolution queue. Internal, but serializable (it is part of GameState). */
export type Task =
  | { t: 'lead'; n: number; src: Source }
  | { t: 'exposure'; n: number; src: Source }
  | { t: 'draw'; n: number }
  | { t: 'delta'; d: Delta; src: Source }
  | {
      t: 'effect';
      card: string;
      effect: Effect;
      slot: number | null;
      threatId: string | null;
      moveFrom: number | null;
      moveCard: string | null;
    }
  | { t: 'tuck'; card: string; slot: number; threatId: string; suit: Suit; power: number; wild: boolean }
  | { t: 'decrypt'; card: string; slot: number; threatId: string }
  | { t: 'finishPlay'; card: string }
  | { t: 'sleeperTuck'; card: string; slot: number; threatId: string }
  | { t: 'checkClears' }
  | { t: 'clear'; slot: number; clean: boolean; breach: boolean }
  | { t: 'patternRecognition'; excess: number }
  | { t: 'kinetic'; excess: number }
  | { t: 'placeAfterClear'; slot: number; threatId: string }
  | { t: 'refill'; slot: number }
  | { t: 'checkScene' }
  | { t: 'pressureSlot'; slot: number }
  | { t: 'cover'; effect: 'pressure' | 'expiry' | 'strike'; slot: number; threatId: string; d: Delta }
  | { t: 'tick'; slot: number; threatId: string }
  | { t: 'escape'; slot: number; threatId: string }
  | { t: 'resetHunt'; slot: number; threatId: string }
  | { t: 'endPressure' }
  | { t: 'drawStep' }
  | { t: 'startTurn' }
  | { t: 'openingDraw' }
  | { t: 'end'; reason: EndReason };

// ---------------------------------------------------------------------------- state

export interface Stars {
  objective: boolean;
  cover: boolean;
  bonus: boolean;
}

export interface EpisodeResult {
  reason: EndReason;
  /** Turn on which the episode ended. */
  turn: number;
  lead: number;
  exposure: number;
  stars: Stars;
  starCount: number;
  /** The Scene Row and Threat Deck were emptied (even if the Lead target was reached at the same time). */
  sceneCleared: boolean;
}

export interface GameState {
  version: 1;
  day: number;
  setup: EpisodeSetup;
  twist: TwistCode | null;
  objective: BonusObjective;
  // tracks
  lead: number;
  exposure: number;
  startLead: number;
  startExposure: number;
  leadTarget: number;
  redline: number;
  coverThreshold: number;
  peakExposure: number;
  // turn
  phase: Phase;
  turn: number;
  playsUsed: number;
  playsPerTurn: number;
  // player card zones (all hold card uids; draw pile and threat deck are top-first)
  drawPile: string[];
  hand: string[];
  discard: string[];
  gear: string[];
  allies: string[];
  /** The card currently being played (between being played and reaching its destination). */
  resolving: string[];
  /** Awakened Cards set aside for Conditioned Cards in the deck. */
  setAsideCards: string[];
  /** Conditioned Cards replaced by their Awakened Card during play. */
  dormant: string[];
  // threat zones
  slots: (SlotState | null)[];
  /** Index of the Pursuer slot (always the last slot), or null on days without a Pursuer. */
  pursuerSlot: number | null;
  threatDeck: string[];
  threatDiscard: string[];
  /** Countermeasures waiting for their Two-Phase Threat to be cleared. */
  setAsideThreats: string[];
  /** Prefix of the Threat Deck (top first) the player has legitimately seen (peek / Satellite). */
  knownTop: string[];
  /** Threats dealt into the Scene Row at setup (for Bonus Objectives). */
  openingRow: string[];
  // perks & modifiers
  perks: { unlocked: PerkId[]; used: PerkId[] };
  mods: Modifiers;
  sceneCleared: boolean;
  // flow
  pending: Decision | null;
  queue: Task[];
  rng: RngState;
  log: GameEvent[];
  result: EpisodeResult | null;
  /** Internal: set on lookahead copies (bot, previews). Draws and refills are not revealed. */
  hypothetical?: { phantomDraws: number };
}

// ---------------------------------------------------------------------------- view

export interface SlotView {
  index: number;
  isPursuerSlot: boolean;
  state: 'empty' | 'faceDown' | 'faceUp';
  /** null when empty or face-down. */
  threatId: string | null;
  tucked: TuckedCard[];
  bonusPower: number;
  die: number | null;
  cancelPressure: boolean;
  symbols: number;
  symbolsNeeded: number;
  power: number;
  powerNeeded: number;
  /** Whether a clear right now would be Clean (ignoring clean_next). */
  cleanIfCleared: boolean;
}

export type ObjectiveStatus = 'pending' | 'met' | 'failed';

export interface ObjectiveProgress {
  code: ObjectiveCode;
  text: string;
  status: ObjectiveStatus;
  /** Short live progress line, e.g. "Clean Clears: 1/3". */
  progress: string;
}

export interface PlayerView {
  day: number;
  turn: number;
  phase: Phase;
  playsUsed: number;
  playsPerTurn: number;
  twist: TwistCode | null;
  lead: number;
  exposure: number;
  startExposure: number;
  leadTarget: number;
  redline: number;
  coverThreshold: number;
  /** A face-up Blocker is in the Scene Row: Lead cannot increase. */
  leadBlocked: boolean;
  hand: string[];
  drawPileCount: number;
  discard: string[];
  gear: string[];
  allies: string[];
  resolving: string[];
  dormant: string[];
  awakenedSetAside: number;
  slots: SlotView[];
  pursuerSlot: number | null;
  threatDeckCount: number;
  /** Top of the Threat Deck the player has seen (top first). */
  threatDeckKnownTop: string[];
  /** The top Threat Deck card shows an Encrypted back. */
  threatDeckTopEncrypted: boolean;
  threatDiscard: string[];
  countermeasuresSetAside: number;
  /** available: unlocked and not yet used; usableNow: free perk actions legal right now. */
  perks: { unlocked: PerkId[]; used: PerkId[]; available: PerkId[]; usableNow: PerkId[] };
  modifiers: Modifiers;
  bonusObjective: ObjectiveProgress;
  pending: Decision | null;
  log: GameEvent[];
  result: EpisodeResult | null;
}

export interface ActionPreview {
  /** Change in Lead / Exposure. */
  lead: number;
  exposure: number;
  /** Cards that would be drawn (count only). */
  cardsDrawn: number;
  /** Threats that would be cleared. */
  clears: { slot: number; threatId: string; clean: boolean }[];
  /** Symbols/Power on each face-up slot afterwards (for meters). */
  slots: { slot: number; symbols: number; symbolsNeeded: number; power: number; powerNeeded: number }[];
  /** The episode would end immediately. */
  ends: EndReason | null;
  /** The action stops at a decision. */
  decision: DecisionKind | null;
  /** The outcome depends on hidden information (e.g. decrypting) and is not shown. */
  hidden: boolean;
}

// ---------------------------------------------------------------------------- campaign

export interface Flashback {
  conditioned: string;
  awakened: string;
  text: string;
  duringPlay: boolean;
}

export interface CampaignState {
  version: 1;
  mode: 'campaign' | 'prototype';
  /** Day to play next. */
  day: number;
  /** 12-card Operative Deck. */
  deck: string[];
  retired: string[];
  perks: PerkId[];
  /** Stars earned per day (days played). */
  stars: Record<number, Stars>;
  /** Awakened card ids whose flashback has been read. */
  flashbacksSeen: string[];
  /** Days skipped because they have no content yet. */
  skipped: number[];
}

export interface Debrief {
  day: number;
  result: EpisodeResult;
  stars: Stars;
  starCount: number;
  /** Flashbacks that happened during play and at cleanup, in order. */
  flashbacks: Flashback[];
  /** The 15 cards after cleanup awakenings, to cut down to 12. */
  cards: string[];
  /** How many cards must be retired. */
  retireCount: number;
  /** Perks the player may unlock (empty unless the day's Outro unlocks one). */
  perkOptions: PerkId[];
  /** Act Debrief / Epilogue on days 10, 20, 30: Stars earned in the act (or campaign) incl. today. */
  actDebrief: { kind: 'act' | 'epilogue'; act: 1 | 2 | 3; stars: number; maxStars: number } | null;
}

export type { PlayerClass };
