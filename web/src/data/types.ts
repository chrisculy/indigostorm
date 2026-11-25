// Data schema shared by the export script, the rules engine and the UI.
// Generated data lives in game-data.json (see scripts/export-data.ts).

export type Suit = 'Recon' | 'Stealth' | 'Force';
export const SUITS: readonly Suit[] = ['Recon', 'Stealth', 'Force'];

export type PlayerClass = 'Training' | 'Gear' | 'Ally' | 'Conditioned' | 'Awakened';
export type ThreatType = 'Threat' | 'Encrypted Threat' | 'Pursuer' | 'Two-Phase Threat' | 'Countermeasure';

/** Lead/Exposure/draw changes, e.g. a Reward of "+2 Lead, -1 Exposure". */
export interface Delta {
  lead: number;
  exposure: number;
  draw: number;
}

/** Player card effects (abilities and passive Gear effects), parsed from the "Sim Effect" column. */
export type Effect =
  | { op: 'draw'; n: number }
  | { op: 'exposure'; n: number }
  | { op: 'lead'; n: number }
  | { op: 'stall'; n: number }
  | { op: 'cancel_pressure' }
  | { op: 'add_power'; n: number; suit: Suit | null }
  | { op: 'clean_next' }
  | { op: 'breach'; max: number }
  | { op: 'swap' }
  | { op: 'peek'; n: number }
  | { op: 'move_card' }
  | { op: 'power_bonus'; suit: Suit; n: number };

/** Ongoing Threat effects (Pursuer counters). */
export type ThreatEffect = { op: 'suit_penalty'; suit: Suit; n: number };

/** When a Conditioned Card awakens if played. */
export type Trigger = { kind: 'exposure' | 'lead' | 'allies' | 'gear'; n: number };

export type CardDay = number | 'CORE' | 'PROTO';

export interface PlayerCard {
  id: string;
  name: string;
  day: CardDay;
  cls: PlayerClass;
  /** null for Gear and Allies */
  suit: Suit | null;
  /** 0 for Gear and Allies */
  power: number;
  /** Ally symbols (one entry per symbol) */
  allySymbols: Suit[];
  /** Printed ability / effect text */
  text: string;
  effects: Effect[];
  /** Conditioned Cards only */
  trigger: Trigger | null;
  triggerText: string;
  /** Awakened Cards only */
  awakeningBonus: Delta | null;
  /** Conditioned <-> Awakened pairing */
  pairsWith: string | null;
  flavor: string;
}

export interface ThreatCard {
  id: string;
  name: string;
  day: number;
  type: ThreatType;
  pref: Suit;
  alt: Suit | null;
  symbols: number;
  power: number;
  /** Timer, or the Hunt number for Pursuers */
  timer: number | null;
  reward: Delta;
  rewardText: string;
  clean: Delta;
  cleanText: string;
  pressure: Delta;
  pressureText: string;
  blocker: boolean;
  /** Expiry effect, or the Strike effect for Pursuers */
  expiry: Delta;
  expiryText: string;
  /** Two-Phase Threat -> its Countermeasure id; Countermeasure -> its Two-Phase Threat id */
  pairsWith: string | null;
  rulesText: string;
  noVanish: boolean;
  effects: ThreatEffect[];
  flavor: string;
}

export type PerkId =
  | 'vanish'
  | 'clonedCredentials'
  | 'falseTrail'
  | 'sleeperInstinct'
  | 'satelliteOverwrite'
  | 'contingencyPlan'
  | 'patternRecognition'
  | 'masterDecryptor'
  | 'adrenalineSurge'
  | 'improvisedWeapon'
  | 'hardenedResolve'
  | 'kineticMomentum';

export interface PerkInfo {
  id: PerkId;
  name: string;
  branch: 'GHOST' | 'ANALYST' | 'OPERATIVE';
  text: string;
}

export interface JumpIn {
  day: number;
  /** The 12-card deck before today's cards are added */
  deck: string[];
  perks: PerkId[];
  notes: string;
}

export interface RuleCard {
  id: string;
  day: number | 'PROTO';
  title: string;
  front: string;
  back: string;
}

export interface StoryCard {
  id: string;
  day: number;
  type: 'Intro' | 'Outro';
  title: string;
  text: string;
}

export interface DayPlan {
  day: number;
  act: 1 | 2 | 3;
  actTitle: string;
  focusSuit: Suit;
  newRules: string;
  episodeTitle: string;
  startLead: number;
  leadTarget: number;
  startExposure: number;
  redline: number;
  coverThreshold: number;
  threatCount: number;
  pursuers: number;
  countermeasures: number;
  bonusObjective: string;
  episodeTwist: string;
  perkUnlock: boolean;
  debrief: string;
  /** True when the day has player cards and Threats written */
  hasContent: boolean;
}

export interface GameData {
  /** Content hash of everything below */
  version: string;
  storySource: 'spoilers' | 'placeholder';
  playerCards: PlayerCard[];
  threats: ThreatCard[];
  jumpIns: JumpIn[];
  rules: RuleCard[];
  story: StoryCard[];
  days: DayPlan[];
  perks: PerkInfo[];
}
