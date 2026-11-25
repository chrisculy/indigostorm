// legalActions / apply: the only way the UI changes the game.

import { threat } from '../data/index.ts';
import type { Effect, PlayerCard } from '../data/types.ts';
import { isTargeted, step } from './core.ts';
import { card, faceUp, faceUpSlots, IllegalActionError, isSuitCard, perkAvailable, suitMatches } from './state.ts';
import { abilitiesDisabled } from './twists.ts';
import type { Action, Decision, DecisionChoice, GameEvent, GameState } from './types.ts';

/** Target options for a card's ability: one entry per valid target, plus `{}` (no target / no effect). */
export interface AbilityTarget {
  slot?: number;
  moveFrom?: number;
  moveCard?: string;
}

export function targetedEffect(c: PlayerCard): Effect | null {
  return c.effects.find(isTargeted) ?? null;
}

export function abilityTargets(s: GameState, c: PlayerCard): AbilityTarget[] {
  if (abilitiesDisabled(s.twist)) return [{}];
  const e = targetedEffect(c);
  if (!e) return [{}];
  const out: AbilityTarget[] = [];
  const up = faceUpSlots(s);
  switch (e.op) {
    case 'stall':
      for (const i of up) if (s.slots[i]?.die != null) out.push({ slot: i });
      break;
    case 'cancel_pressure':
      for (const i of up) {
        const p = threat(s.slots[i]?.threatId as string).pressure;
        if (p.lead || p.exposure || p.draw) out.push({ slot: i });
      }
      break;
    case 'add_power':
      for (const i of up) {
        const t = threat(s.slots[i]?.threatId as string);
        if (!e.suit || suitMatches(t, e.suit)) out.push({ slot: i });
      }
      break;
    case 'breach':
      for (const i of up) {
        const t = threat(s.slots[i]?.threatId as string);
        if (s.pursuerSlot !== i && t.symbols <= 1 && t.power <= e.max) out.push({ slot: i });
      }
      break;
    case 'swap':
      if (s.threatDeck.length > 0)
        s.slots.forEach((sl, i) => {
          if (sl && s.pursuerSlot !== i) out.push({ slot: i });
        });
      break;
    case 'move_card':
      for (const from of up) {
        for (const x of s.slots[from]?.tucked ?? []) {
          for (const to of up) {
            if (to === from) continue;
            const t = threat(s.slots[to]?.threatId as string);
            if (x.wild || suitMatches(t, x.suit)) out.push({ slot: to, moveFrom: from, moveCard: x.uid });
          }
        }
      }
      break;
    default:
      break;
  }
  out.push({});
  return out;
}

function withTarget(base: Extract<Action, { type: 'play' }>, tg: AbilityTarget): Extract<Action, { type: 'play' }> {
  const a = { ...base };
  if (tg.slot !== undefined) a.slot = tg.slot;
  if (tg.moveFrom !== undefined) a.moveFrom = tg.moveFrom;
  if (tg.moveCard !== undefined) a.moveCard = tg.moveCard;
  return a;
}

/** Every legal play of one hand card. */
export function playActionsFor(s: GameState, uid: string): Action[] {
  const out: Action[] = [];
  // Legality comes from the card the player can see (a Conditioned Card's Awakened Card is
  // secret until it is played).
  const pc = card(uid);
  if (card(uid).cls === 'Gear' || card(uid).cls === 'Ally') return [{ type: 'play', cardUid: uid, mode: 'deploy' }];
  if (!isSuitCard(pc) || !pc.suit) return out;
  const md = s.mods.masterDecryptor;
  const suit = pc.suit;
  const iw = perkAvailable(s, 'improvisedWeapon');
  s.slots.forEach((sl, i) => {
    if (!sl) return;
    if (sl.faceDown) {
      if (suit === 'Recon' || md) out.push({ type: 'play', cardUid: uid, mode: 'decrypt', slot: i });
      return;
    }
    const t = threat(sl.threatId);
    if (md || suitMatches(t, suit)) out.push({ type: 'play', cardUid: uid, mode: 'tuck', slot: i });
    if (iw) out.push({ type: 'play', cardUid: uid, mode: 'improvisedWeapon', slot: i });
  });
  const targets = abilityTargets(s, pc);
  for (const tg of targets) out.push(withTarget({ type: 'play', cardUid: uid, mode: 'ability' }, tg));
  if (perkAvailable(s, 'sleeperInstinct') && !abilitiesDisabled(s.twist) && (suit === 'Stealth' || md)) {
    const op = targetedEffect(pc)?.op;
    const tuckTargets = faceUpSlots(s).filter(
      (j) => md || suitMatches(threat(s.slots[j]?.threatId as string), 'Stealth'),
    );
    for (const tg of targets) {
      for (const j of tuckTargets) {
        if (tg.slot === j && (op === 'swap' || op === 'breach')) continue;
        out.push(withTarget({ type: 'play', cardUid: uid, mode: 'sleeperInstinct', slot2: j }, tg));
      }
    }
  }
  return out;
}

/** Free perk actions available in the PLAY step right now. */
export function perkActions(s: GameState): Action[] {
  const out: Action[] = [];
  if (perkAvailable(s, 'vanish')) {
    for (const i of faceUpSlots(s)) {
      const sl = faceUp(s, i);
      if (sl && s.pursuerSlot !== i && !threat(sl.threatId).noVanish && threat(sl.threatId).type !== 'Pursuer')
        out.push({ type: 'perk', perk: 'vanish', slot: i });
    }
  }
  if (perkAvailable(s, 'falseTrail') && !s.mods.falseTrail) out.push({ type: 'perk', perk: 'falseTrail' });
  if (perkAvailable(s, 'satelliteOverwrite') && s.threatDeck.length > 0)
    out.push({ type: 'perk', perk: 'satelliteOverwrite' });
  if (perkAvailable(s, 'contingencyPlan') && s.drawPile.length > 0) out.push({ type: 'perk', perk: 'contingencyPlan' });
  if (perkAvailable(s, 'masterDecryptor') && s.playsUsed === 0 && !s.mods.masterDecryptor)
    out.push({ type: 'perk', perk: 'masterDecryptor' });
  if (perkAvailable(s, 'adrenalineSurge') && !s.mods.adrenaline) out.push({ type: 'perk', perk: 'adrenalineSurge' });
  return out;
}

function permutations<T>(xs: readonly T[]): T[][] {
  if (xs.length <= 1) return [[...xs]];
  const out: T[][] = [];
  xs.forEach((x, i) => {
    const rest = [...xs.slice(0, i), ...xs.slice(i + 1)];
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}

function combinations<T>(xs: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  xs.forEach((x, i) => {
    for (const c of combinations(xs.slice(i + 1), k - 1)) out.push([x, ...c]);
  });
  return out;
}

/** Every valid answer to a pending decision. */
export function decisionChoices(d: Decision): DecisionChoice[] {
  switch (d.kind) {
    case 'chooseCard':
      return [...d.options, null];
    case 'reorderTop':
      return permutations(d.cards);
    case 'satellite': {
      const out: DecisionChoice[] = [];
      for (let k = 0; k <= Math.min(d.maxDiscard, d.cards.length); k++) {
        for (const discard of combinations(d.cards, k)) {
          const rest = d.cards.filter((x) => !discard.includes(x));
          for (const order of permutations(rest)) out.push({ discard, order });
        }
      }
      return out;
    }
    case 'allyCover':
      return [...d.allies, null];
    case 'kineticTarget':
      return [...d.options, null];
    case 'confirmHardenedResolve':
      return [true, false];
  }
}

/** Every legal action in this state (empty when the episode is over). */
export function legalActions(s: GameState): Action[] {
  if (s.phase === 'over') return [];
  if (s.pending) return decisionChoices(s.pending).map((choice) => ({ type: 'decide', choice }));
  if (s.phase !== 'play') return [];
  const out: Action[] = [];
  if (s.playsUsed < s.playsPerTurn) for (const uid of s.hand) out.push(...playActionsFor(s, uid));
  out.push(...perkActions(s));
  if (s.playsUsed >= s.playsPerTurn || s.hand.length === 0) out.push({ type: 'endPlays' });
  return out;
}

function choiceKey(c: DecisionChoice): string {
  if (c !== null && typeof c === 'object' && !Array.isArray(c))
    return JSON.stringify({ discard: [...c.discard].sort(), order: c.order });
  return JSON.stringify(c);
}

/** Canonical key of an action (for comparing actions). */
export function actionKey(a: Action): string {
  switch (a.type) {
    case 'play':
      return ['play', a.cardUid, a.mode, a.slot ?? '', a.slot2 ?? '', a.moveFrom ?? '', a.moveCard ?? ''].join('|');
    case 'perk':
      return ['perk', a.perk, a.slot ?? ''].join('|');
    case 'endPlays':
      return 'endPlays';
    case 'decide':
      return `decide|${choiceKey(a.choice)}`;
  }
}

export function isLegal(s: GameState, a: Action): boolean {
  const k = actionKey(a);
  return legalActions(s).some((x) => actionKey(x) === k);
}

/** Apply a legal action. Pure: returns a new state and the events it produced.
 * Throws IllegalActionError for anything `legalActions` does not list. */
export function apply(state: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  if (state.hypothetical) throw new IllegalActionError('Cannot apply actions to a lookahead state');
  if (!isLegal(state, action)) throw new IllegalActionError(`Illegal action: ${actionKey(action)}`);
  return step(state, action);
}
