// A greedy policy over legalActions, in the spirit of indigo_sim.py: 2-ply lookahead over the
// turn's plays plus the Pressure step, scored by the simulator's evaluation. Lookahead runs on
// "hypothetical" copies, so it never sees hidden cards drawn or Threats refilled.

import { threat, threatsForDay } from '../data/index.ts';
import { legalActions } from './actions.ts';
import { step } from './core.ts';
import { allySymbols, card, cloneState, faceUpSlots, perkAvailable, slotCounts } from './state.ts';
import type { Action, DecisionChoice, GameState } from './types.ts';

/** Evaluation weights (indigo_sim.py DEFAULT_CONFIG.ai). */
export const BOT_WEIGHTS = {
  lead: 12,
  exposure: 9,
  overThreshold: 10,
  progress: 0.6,
  pressure: 6,
  handCard: 2,
  allySymbol: 4,
  gear: 4,
  phantomDraw: 3,
  // A face-down Threat clogs a slot; the simulator's +4 relied on seeing hidden identities.
  faceDown: -8,
  wildMargin: 15,
} as const;
const W = BOT_WEIGHTS;
const NOMINAL_TURNS = 8;

function hypo(s: GameState): GameState {
  const c = cloneState(s, { keepLog: false });
  if (!c.hypothetical) c.hypothetical = { phantomDraws: 0 };
  return c;
}

/** Static evaluation of a state (higher is better). */
export function scoreState(s: GameState): number {
  if (s.phase === 'over' && s.result?.reason === 'coverBlown') return -1e6 + s.lead;
  if (s.lead >= s.leadTarget) return 1e6 - s.exposure * 10;
  let v = W.lead * s.lead - W.exposure * s.exposure - W.overThreshold * Math.max(0, s.exposure - s.coverThreshold);
  for (const sl of s.slots) {
    if (!sl) continue;
    if (sl.faceDown) {
      v += W.faceDown;
      continue;
    }
    const t = threat(sl.threatId);
    const c = slotCounts(s, sl);
    const prog =
      0.5 * Math.min(1, c.symbols / Math.max(1, t.symbols)) + 0.5 * Math.min(1, c.power / Math.max(1, t.power));
    const value = W.lead * t.reward.lead - W.exposure * t.reward.exposure + 4;
    v += W.progress * prog * value;
    v -= W.pressure * t.pressure.exposure + W.lead * -t.pressure.lead * 0.5;
    if (t.blocker) v -= 5;
    if (sl.die) {
      const hit = W.exposure * t.expiry.exposure + W.lead * -t.expiry.lead;
      v -= (hit * (1 - prog)) / sl.die;
    }
  }
  v += W.allySymbol * allySymbols(s).length + W.gear * s.gear.length;
  v += W.handCard * s.hand.length + W.phantomDraw * (s.hypothetical?.phantomDraws ?? 0);
  return v;
}

function threatValue(id: string): number {
  const t = threat(id);
  return 12 * t.reward.lead - 9 * t.pressure.exposure - 2 * t.power;
}

/** Exposure the coming Pressure step would add, and whether a timer or Strike fires. */
export function incoming(s: GameState): { exposure: number; fire: boolean } {
  let exposure = 0;
  let fire = false;
  if (s.mods.adrenaline) return { exposure, fire };
  for (const sl of s.slots) {
    if (!sl || sl.faceDown) continue;
    const t = threat(sl.threatId);
    if (!sl.cancelPressure) exposure += Math.max(0, t.pressure.exposure);
    if (sl.die === 1) {
      fire = true;
      exposure += Math.max(0, t.expiry.exposure);
    }
  }
  return { exposure, fire };
}

/** The bot's answer to the pending decision. */
export function chooseDecision(s: GameState): DecisionChoice {
  const d = s.pending;
  if (!d) throw new Error('No pending decision');
  switch (d.kind) {
    case 'chooseCard': {
      let best: string | null = null;
      for (const id of d.options) {
        const c = card(id);
        if (c.cls === 'Gear' || c.cls === 'Ally') continue;
        if (!best || c.power > card(best).power) best = id;
      }
      return best;
    }
    case 'reorderTop':
      return [...d.cards].sort((a, b) => threatValue(b) - threatValue(a));
    case 'satellite': {
      const hazards = d.cards
        .filter((id) => threat(id).reward.lead <= 0)
        .sort((a, b) => threatValue(a) - threatValue(b))
        .slice(0, d.maxDiscard);
      const order = d.cards.filter((id) => !hazards.includes(id)).sort((a, b) => threatValue(b) - threatValue(a));
      return { discard: hazards, order };
    }
    case 'allyCover': {
      if (s.mods.falseTrail) return null;
      const gain = Math.max(0, d.delta.exposure);
      const loss = Math.max(0, -d.delta.lead);
      const turnsLeft = Math.max(0, NOMINAL_TURNS - s.turn);
      const worth =
        gain >= 2 ||
        s.exposure + gain >= s.redline ||
        loss >= 1 ||
        (s.exposure + gain > s.coverThreshold && turnsLeft <= 2);
      if (!worth) return null;
      return [...d.allies].sort((a, b) => card(a).allySymbols.length - card(b).allySymbols.length)[0] ?? null;
    }
    case 'kineticTarget': {
      let best: number | null = null;
      let bestRatio = -1;
      for (const i of d.options) {
        const sl = s.slots[i];
        if (!sl) continue;
        const ratio = slotCounts(s, sl).power / Math.max(1, threat(sl.threatId).power);
        if (ratio > bestRatio) {
          best = i;
          bestRatio = ratio;
        }
      }
      return best;
    }
    case 'confirmHardenedResolve':
      return true;
  }
}

/** Answer decisions with the bot policy until none is pending. */
function settle(s: GameState): GameState {
  let g = s;
  let guard = 0;
  while (g.pending && g.phase !== 'over' && guard++ < 50)
    g = step(g, { type: 'decide', choice: chooseDecision(g) }).state;
  return g;
}

function finishTurn(s: GameState): GameState {
  if (s.phase !== 'play') return s;
  return settle(step(s, { type: 'endPlays' }).state);
}

/** Plays worth considering: drop "no target" ability plays when the card has a real target. */
function candidatePlays(s: GameState): Action[] {
  const plays = legalActions(s).filter((a) => a.type === 'play');
  const hasTarget = new Set<string>();
  for (const a of plays)
    if (a.type === 'play' && a.mode === 'ability' && a.slot !== undefined) hasTarget.add(a.cardUid);
  return plays.filter(
    (a) => !(a.type === 'play' && a.mode === 'ability' && a.slot === undefined && hasTarget.has(a.cardUid)),
  );
}

/** Encrypted Threats whose identity the player has not seen (candidates for any face-down card), sorted. */
export function unseenEncrypted(s: GameState): string[] {
  const seen = new Set<string>([...s.threatDiscard, ...s.knownTop]);
  for (const sl of s.slots) if (sl && !sl.faceDown) seen.add(sl.threatId);
  return threatsForDay(s.day)
    .filter((t) => t.type === 'Encrypted Threat' && !seen.has(t.id))
    .map((t) => t.id)
    .sort();
}

/** The states an action can lead to, as far as the player knows. A decrypt is resolved once per
 * unseen Encrypted Threat, never with the real (hidden) one. */
function outcomes(s: GameState, a: Action): GameState[] {
  if (a.type === 'play' && a.mode === 'decrypt' && a.slot !== undefined) {
    const slot = a.slot;
    const sl = s.slots[slot];
    const pool = unseenEncrypted(s);
    if (sl && pool.length > 0) {
      return pool.map((id) => {
        const c = cloneState(s, { keepLog: false });
        c.slots[slot] = { ...sl, threatId: id };
        return settle(step(c, a).state);
      });
    }
  }
  return [settle(step(s, a).state)];
}

const mean = (xs: number[]): number => xs.reduce((x, y) => x + y, 0) / Math.max(1, xs.length);

function plan(s: GameState, playsLeft: number): { action: Action | null; score: number } {
  let best: Action | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const a of candidatePlays(s)) {
    const sc = mean(
      outcomes(s, a).map((g) => {
        if (g.phase === 'over') return scoreState(g);
        if (playsLeft > 1 && g.phase === 'play' && g.hand.length > 0 && g.playsUsed < g.playsPerTurn) {
          let inner = Number.NEGATIVE_INFINITY;
          for (const b of candidatePlays(g)) {
            const v = mean(outcomes(g, b).map((h) => scoreState(h.phase === 'over' ? h : finishTurn(h))));
            inner = Math.max(inner, v);
          }
          return inner === Number.NEGATIVE_INFINITY ? scoreState(finishTurn(g)) : inner;
        }
        return scoreState(finishTurn(g));
      }),
    );
    if (sc > bestScore) {
      best = a;
      bestScore = sc;
    }
  }
  return { action: best, score: bestScore };
}

/** Suggest an action for the current state (a "Hint"). Returns null when the episode is over. */
export function suggestAction(state: GameState): Action | null {
  if (state.phase === 'over') return null;
  if (state.pending) return { type: 'decide', choice: chooseDecision(state) };
  if (state.phase !== 'play') return null;
  const s = state;
  if (s.playsUsed === 0 && s.turn === 1) {
    if (perkAvailable(s, 'satelliteOverwrite') && s.threatDeck.length > 0)
      return { type: 'perk', perk: 'satelliteOverwrite' };
    if (perkAvailable(s, 'contingencyPlan') && s.drawPile.length > 0) return { type: 'perk', perk: 'contingencyPlan' };
  }
  const playsLeft = Math.min(s.playsPerTurn - s.playsUsed, s.hand.length);
  if (playsLeft > 0) {
    const h = hypo(s);
    const base = plan(h, playsLeft);
    if (perkAvailable(s, 'masterDecryptor') && s.playsUsed === 0 && !s.mods.masterDecryptor) {
      const w = hypo(s);
      w.mods.masterDecryptor = true;
      const wild = plan(w, playsLeft);
      if (wild.score - base.score >= W.wildMargin) return { type: 'perk', perk: 'masterDecryptor' };
    }
    if (base.action) return base.action;
  }
  // Plays are done: spend Pressure-step perks like the simulator does.
  const inc = incoming(s);
  if (perkAvailable(s, 'adrenalineSurge') && !s.mods.adrenaline && (inc.exposure >= 2 || inc.fire))
    return { type: 'perk', perk: 'adrenalineSurge' };
  if (perkAvailable(s, 'vanish') && (inc.exposure >= 2 || s.exposure + inc.exposure > s.coverThreshold)) {
    for (const i of faceUpSlots(s)) {
      const sl = s.slots[i];
      if (!sl || s.pursuerSlot === i) continue;
      const t = threat(sl.threatId);
      if (t.noVanish || t.type === 'Pursuer') continue;
      const dangerous = t.pressure.exposure >= 1 || (sl.die === 1 && (t.expiry.exposure > 0 || t.expiry.lead < 0));
      if (dangerous && slotCounts(s, sl).power < t.power / 2) return { type: 'perk', perk: 'vanish', slot: i };
    }
  }
  if (perkAvailable(s, 'falseTrail') && !s.mods.falseTrail && inc.exposure >= 2)
    return { type: 'perk', perk: 'falseTrail' };
  return { type: 'endPlays' };
}
