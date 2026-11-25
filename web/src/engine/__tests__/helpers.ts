// Test helpers: hand-built states and small utilities.

import { expect } from 'vitest';
import { playerCard as cardData, threat } from '../../data/index.ts';
import { apply, legalActions } from '../actions.ts';
import { freshMods } from '../core.ts';
import { createEpisode } from '../setup.ts';
import { cloneState, playerCardZones, threatZones } from '../state.ts';
import { startingDie } from '../twists.ts';
import type { Action, GameEvent, GameState, PerkId, SlotState, TuckedCard, TwistCode } from '../types.ts';

export interface SlotSpec {
  id: string;
  tucked?: (string | (Partial<TuckedCard> & { uid: string }))[];
  die?: number | null;
  faceDown?: boolean;
  bonus?: number;
  cancel?: boolean;
}

export interface Arrange {
  day?: number;
  hand?: string[];
  drawPile?: string[];
  discard?: string[];
  slots?: (SlotSpec | string | null)[];
  pursuer?: SlotSpec | string | null;
  threatDeck?: string[];
  setAsideThreats?: string[];
  setAsideCards?: string[];
  gear?: string[];
  allies?: string[];
  lead?: number;
  exposure?: number;
  leadTarget?: number;
  redline?: number;
  coverThreshold?: number;
  perks?: PerkId[];
  used?: PerkId[];
  twist?: TwistCode | null;
  playsUsed?: number;
  turn?: number;
}

/** Card ids from the data, for readability. */
export const C = {
  overwatch: 'CORE-01', // Recon 1, peek 2
  signal: 'CORE-02', // Recon 2, stall 1
  patternRead: 'CORE-03', // Recon 2, draw 1
  coldRead: 'CORE-04', // Recon 3, swap
  shadowStep: 'CORE-05', // Stealth 1, -1 Exposure
  blendIn: 'CORE-06', // Stealth 2, cancel_pressure
  misdirection: 'CORE-07', // Stealth 2, move_card
  lockpick: 'CORE-08', // Stealth 3, clean_next
  strikeFirst: 'CORE-09', // Force 1, add_power 2 Force
  takedown: 'CORE-10', // Force 2, +1 Lead +1 Exposure
  breach: 'CORE-11', // Force 2, breach 3
  secondWind: 'CORE-12', // Force 3, draw 1
  fragmented: 'D01-P1', // Stealth 3, -1 Exposure
  muscle: 'D01-P2', // Force 4, draw 1
  halfCode: 'D01-P3', // Recon 2, stall 1
  fieldKit: 'D06-P1', // Gear: Force +1
  fixer: 'D06-P2', // Ally: Force
  handToHand: 'D06-P3', // Force 3, draw 1
  decryptKey: 'D11-P1', // Recon 3, draw 1
  codebreaker: 'D11-P2', // Ally: Recon
  sniffer: 'D11-P3', // Recon 2, stall
  dream: 'D16-P1', // Conditioned Stealth 2 (-1 Exp), awakens with an Ally in play
  remembered: 'D16-W1', // Awakened Stealth 4 (-2 Exp), bonus +1 Lead
  silent: 'D16-P2', // Stealth 3, clean_next
  cloak: 'D16-P3', // Gear: Stealth +1
  counterstrike: 'D21-P1', // Force 4, stall
  overwatchTeam: 'D21-P2', // Ally: Force + Stealth
  evasion: 'D21-P3', // Recon 3, cancel_pressure
  blueprint: 'D26-P1', // Recon 4, stall
  uniform: 'D26-P2', // Stealth 4, -1 Exposure
  spoofer: 'D26-P3', // Gear: Recon +1
  drill: 'PROTO-01', // Recon 3, draw
  quiet: 'PROTO-02', // Stealth 3, -1 Exp
  hardBreach: 'PROTO-03', // Force 4, +1 Lead +1 Exp
  counterSurv: 'PROTO-04', // Recon 4, cancel
  ghost: 'PROTO-05', // Stealth 4, clean_next
  signalGhost: 'PROTO-07', // Recon 4, draw
  oldReflexes: 'PROTO-W2', // Awakened Force 5
} as const;

export const T = {
  lockedDoor: 'D01-T01', // S/F 1 sym 4 pw, +1 Lead
  camera: 'D01-T02', // S/R 1 sym 2 pw, -1 Exp reward, +1 Exp pressure
  nurse: 'D01-T03', // S 1 sym 4 pw, +1 Lead
  records: 'D01-T04', // R 2 sym 6 pw, +2 Lead
  orderly: 'D01-T05', // F/S 1 sym 3 pw, +1 Lead
  fireAlarm: 'D01-T06', // R/S 1 sym 4 pw, timer 3, +2 Lead, expiry +2 Exp
  patrol: 'D01-T07', // F/S 2 sym 5 pw, -1 Exp, pressure +1 Exp
  elevator: 'D01-T08', // R/F 2 sym 5 pw, +2 Lead
  gate: 'D01-T09', // F 2 sym 7 pw, +2 Lead
  rivalBuyer: 'D06-T09', // F/S 2 sym 6 pw, timer 4, expiry +1
  encServer: 'D11-T02', // Encrypted R/F 2 sym 7 pw, +3 Lead, pressure +1
  encRelay: 'D11-T04', // Encrypted S/R 1 sym 5 pw, +2 Lead
  drone: 'D11-T06', // S/F 1 sym 4 pw, pressure +2
  hunter: 'D21-T10', // Pursuer F/S 3 sym 12 pw, Hunt 3, +3 Lead -1 Exp, Strike +2, Stealth -1
  stolenCar: 'D21-T04', // F 1 sym 5 pw, timer 3, expiry +2
  serverCore: 'D26-T03', // Two-Phase R 2 sym 9 pw -> D26-C1
  blastDoor: 'D26-T04', // Two-Phase F/R 2 sym 10 pw -> D26-C2
  coreLockdown: 'D26-C1', // Countermeasure R/S 1 sym 5 pw
  bulkhead: 'D26-C2', // Countermeasure F 2 sym 6 pw
  perimeter: 'D26-T01', // S/F 1 sym 6, +1 Lead
} as const;

function toSlot(spec: SlotSpec | string, twist: TwistCode | null): SlotState {
  const sp: SlotSpec = typeof spec === 'string' ? { id: spec } : spec;
  const t = threat(sp.id);
  const tucked: TuckedCard[] = (sp.tucked ?? []).map((x) => {
    if (typeof x === 'string') {
      const pc = cardData(x);
      return { uid: x, suit: pc.suit ?? 'Recon', power: pc.power, gearBonus: 0, wild: false };
    }
    const pc = cardData(x.uid);
    return {
      uid: x.uid,
      suit: x.suit ?? pc.suit ?? 'Recon',
      power: x.power ?? pc.power,
      gearBonus: x.gearBonus ?? 0,
      wild: x.wild ?? false,
    };
  });
  const faceDown = sp.faceDown ?? false;
  return {
    threatId: sp.id,
    faceDown,
    tucked,
    bonusPower: sp.bonus ?? 0,
    die: sp.die !== undefined ? sp.die : faceDown ? null : startingDie(t, twist),
    cancelPressure: sp.cancel ?? false,
    startedTurn: tucked.length ? 1 : null,
  };
}

/** A hand-built state in the PLAY step of turn 1 (default day 1, no perks, empty zones). */
export function mk(a: Arrange = {}): GameState {
  const day = a.day ?? 1;
  const twist = a.twist ?? null;
  const base = createEpisode({ day, deck: ['CORE-01'], perks: [], seed: 1, twist });
  const s = cloneState(base);
  s.log = [];
  s.phase = 'play';
  s.turn = a.turn ?? 1;
  s.playsUsed = a.playsUsed ?? 0;
  s.pending = null;
  s.queue = [];
  s.hand = [...(a.hand ?? [])];
  s.drawPile = [...(a.drawPile ?? [])];
  s.discard = [...(a.discard ?? [])];
  s.gear = [...(a.gear ?? [])];
  s.allies = [...(a.allies ?? [])];
  s.resolving = [];
  s.setAsideCards = [...(a.setAsideCards ?? [])];
  s.dormant = [];
  const normal = (a.slots ?? []).map((x) => (x ? toSlot(x, twist) : null));
  while (normal.length < 3) normal.push(null);
  s.slots = normal;
  s.pursuerSlot = null;
  if (a.pursuer) {
    s.slots.push(toSlot(a.pursuer, twist));
    s.pursuerSlot = s.slots.length - 1;
  }
  s.threatDeck = [...(a.threatDeck ?? [])];
  s.threatDiscard = [];
  s.setAsideThreats = [...(a.setAsideThreats ?? [])];
  s.knownTop = [];
  s.openingRow = s.slots.flatMap((x, i) => (x && i !== s.pursuerSlot ? [x.threatId] : []));
  s.lead = a.lead ?? 0;
  s.exposure = a.exposure ?? 0;
  s.startExposure = s.exposure;
  s.peakExposure = s.exposure;
  if (a.leadTarget !== undefined) s.leadTarget = a.leadTarget;
  if (a.redline !== undefined) s.redline = a.redline;
  if (a.coverThreshold !== undefined) s.coverThreshold = a.coverThreshold;
  s.perks = { unlocked: [...(a.perks ?? [])], used: [...(a.used ?? [])] };
  s.mods = freshMods();
  s.sceneCleared = false;
  s.result = null;
  return s;
}

/** Apply a list of actions (each must be legal). */
export function run(s: GameState, ...actions: Action[]): { state: GameState; events: GameEvent[] } {
  let cur = s;
  const events: GameEvent[] = [];
  for (const a of actions) {
    const r = apply(cur, a);
    cur = r.state;
    events.push(...r.events);
  }
  return { state: cur, events };
}

export const play = (
  cardUid: string,
  mode: Extract<Action, { type: 'play' }>['mode'],
  extra: { slot?: number; slot2?: number; moveFrom?: number; moveCard?: string } = {},
): Action => ({ type: 'play', cardUid, mode, ...extra });
export const tuck = (cardUid: string, slot: number): Action => ({ type: 'play', cardUid, mode: 'tuck', slot });
export const ability = (cardUid: string, slot?: number): Action =>
  slot === undefined ? { type: 'play', cardUid, mode: 'ability' } : { type: 'play', cardUid, mode: 'ability', slot };
export const decide = (choice: Extract<Action, { type: 'decide' }>['choice']): Action => ({ type: 'decide', choice });
export const perk = (p: PerkId, slot?: number): Action =>
  slot === undefined ? { type: 'perk', perk: p } : { type: 'perk', perk: p, slot };
export const endPlays: Action = { type: 'endPlays' };

export function types(events: readonly GameEvent[]): string[] {
  return events.map((e) => e.type);
}

export function ofType<K extends GameEvent['type']>(events: readonly GameEvent[], k: K) {
  return events.filter((e): e is Extract<GameEvent, { type: K }> => e.type === k);
}

/** Every card uid (player and Threat) is in exactly one zone. */
export function expectConservation(s: GameState, expectedPlayer: number, expectedThreats: number): void {
  const p = playerCardZones(s);
  const t = threatZones(s);
  const pIds = p.map(([id]) => id);
  const tIds = t.map(([id]) => id);
  expect(new Set(pIds).size).toBe(pIds.length);
  expect(new Set(tIds).size).toBe(tIds.length);
  expect(pIds.length).toBe(expectedPlayer);
  expect(tIds.length).toBe(expectedThreats);
}

export function legalKinds(s: GameState): string[] {
  return legalActions(s).map((a) => (a.type === 'play' ? `${a.mode}` : a.type));
}
