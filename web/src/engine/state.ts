// State helpers shared by the engine modules: cloning, card lookups, counting.

import { playerCard, threat } from '../data/index.ts';
import type { PerkId, PlayerCard, Suit, ThreatCard } from '../data/types.ts';
import type { GameState, SlotState, TuckedCard } from './types.ts';

export class IllegalActionError extends Error {
  override name = 'IllegalActionError';
}

/** Deep copy of the mutable parts of a state. Events and Task objects are immutable and shared. */
export function cloneState(s: GameState, opts: { keepLog?: boolean } = {}): GameState {
  const c: GameState = {
    ...s,
    drawPile: [...s.drawPile],
    hand: [...s.hand],
    discard: [...s.discard],
    gear: [...s.gear],
    allies: [...s.allies],
    resolving: [...s.resolving],
    setAsideCards: [...s.setAsideCards],
    dormant: [...s.dormant],
    slots: s.slots.map((sl) => (sl ? { ...sl, tucked: sl.tucked.map((t) => ({ ...t })) } : null)),
    threatDeck: [...s.threatDeck],
    threatDiscard: [...s.threatDiscard],
    setAsideThreats: [...s.setAsideThreats],
    knownTop: [...s.knownTop],
    openingRow: [...s.openingRow],
    perks: { unlocked: [...s.perks.unlocked], used: [...s.perks.used] },
    mods: { ...s.mods },
    queue: [...s.queue],
    rng: [...s.rng],
    log: opts.keepLog === false ? [] : [...s.log],
    // Decisions are never mutated after creation, so they can be shared.
    pending: s.pending,
    result: s.result ? { ...s.result, stars: { ...s.result.stars } } : null,
  };
  if (s.hypothetical) c.hypothetical = { ...s.hypothetical };
  return c;
}

export const card = (uid: string): PlayerCard => playerCard(uid);
export const threatOf = (sl: SlotState): ThreatCard => threat(sl.threatId);

export function perkAvailable(s: GameState, p: PerkId): boolean {
  return s.perks.unlocked.includes(p) && !s.perks.used.includes(p);
}

export function isPursuerSlot(s: GameState, i: number): boolean {
  return s.pursuerSlot === i;
}

export function faceUp(s: GameState, i: number): SlotState | null {
  const sl = s.slots[i];
  return sl && !sl.faceDown ? sl : null;
}

export function faceUpSlots(s: GameState): number[] {
  const out: number[] = [];
  s.slots.forEach((sl, i) => {
    if (sl && !sl.faceDown) out.push(i);
  });
  return out;
}

export function suitMatches(t: ThreatCard, suit: Suit): boolean {
  return t.pref === suit || t.alt === suit;
}

/** A face-up Blocker is in the Scene Row. */
export function leadBlocked(s: GameState): boolean {
  return s.slots.some((sl) => sl && !sl.faceDown && threat(sl.threatId).blocker);
}

/** Power penalty for a suit from face-up Threats' ongoing effects (Pursuer counters). */
export function suitPenalty(s: GameState, suit: Suit): number {
  let pen = 0;
  for (const sl of s.slots) {
    if (!sl || sl.faceDown) continue;
    for (const e of threat(sl.threatId).effects) if (e.op === 'suit_penalty' && e.suit === suit) pen += e.n;
  }
  return pen;
}

export function allySymbols(s: GameState): Suit[] {
  return s.allies.flatMap((a) => playerCard(a).allySymbols);
}

export function tuckedPower(s: GameState, c: TuckedCard): number {
  return Math.max(0, c.power - suitPenalty(s, c.suit)) + c.gearBonus;
}

export interface Counts {
  symbols: number;
  prefSymbols: number;
  power: number;
  /** Clean if cleared now (without clean_next). */
  clean: boolean;
  met: boolean;
}

export function slotCounts(s: GameState, sl: SlotState): Counts {
  const t = threat(sl.threatId);
  const allies = allySymbols(s);
  const symbols = sl.tucked.length + allies.filter((x) => suitMatches(t, x)).length;
  const prefSymbols = sl.tucked.filter((c) => c.suit === t.pref).length + allies.filter((x) => x === t.pref).length;
  let power = sl.bonusPower;
  for (const c of sl.tucked) power += tuckedPower(s, c);
  const clean = sl.tucked.every((c) => c.suit === t.pref) && prefSymbols >= t.symbols;
  return { symbols, prefSymbols, power, clean, met: symbols >= t.symbols && power >= t.power };
}

export function gearBonusFor(s: GameState, suit: Suit): number {
  let n = 0;
  for (const g of s.gear)
    for (const e of playerCard(g).effects) if (e.op === 'power_bonus' && e.suit === suit) n += e.n;
  return n;
}

/** The card that will actually be played for `uid`: its Awakened Card if it is a Conditioned
 * Card whose trigger is met right now (and the Awakened Card is set aside), else itself. */
export function effectiveCard(s: GameState, uid: string): PlayerCard {
  const c = playerCard(uid);
  if (c.cls === 'Conditioned' && c.pairsWith && s.setAsideCards.includes(c.pairsWith) && triggerMet(s, c)) {
    return playerCard(c.pairsWith);
  }
  return c;
}

export function triggerMet(s: GameState, c: PlayerCard): boolean {
  if (!c.trigger) return false;
  const v =
    c.trigger.kind === 'exposure'
      ? s.exposure
      : c.trigger.kind === 'lead'
        ? s.lead
        : c.trigger.kind === 'allies'
          ? s.allies.length
          : s.gear.length;
  return v >= c.trigger.n;
}

export function isSuitCard(c: PlayerCard): boolean {
  return c.cls === 'Training' || c.cls === 'Conditioned' || c.cls === 'Awakened';
}

/** Every player card uid in the state with the zone it is in (for conservation checks). */
export function playerCardZones(s: GameState): [string, string][] {
  const out: [string, string][] = [];
  const add = (zone: string, ids: readonly string[]) => {
    for (const id of ids) out.push([id, zone]);
  };
  add('drawPile', s.drawPile);
  add('hand', s.hand);
  add('discard', s.discard);
  add('gear', s.gear);
  add('allies', s.allies);
  add('resolving', s.resolving);
  add('setAsideCards', s.setAsideCards);
  add('dormant', s.dormant);
  s.slots.forEach((sl, i) => {
    if (sl)
      add(
        `slot${i}`,
        sl.tucked.map((t) => t.uid),
      );
  });
  return out;
}

export function threatZones(s: GameState): [string, string][] {
  const out: [string, string][] = [];
  const add = (zone: string, ids: readonly string[]) => {
    for (const id of ids) out.push([id, zone]);
  };
  add('threatDeck', s.threatDeck);
  add('threatDiscard', s.threatDiscard);
  add('setAsideThreats', s.setAsideThreats);
  s.slots.forEach((sl, i) => {
    if (sl) out.push([sl.threatId, `slot${i}`]);
  });
  return out;
}

export function removeOne(arr: string[], id: string): boolean {
  const i = arr.indexOf(id);
  if (i < 0) return false;
  arr.splice(i, 1);
  return true;
}
