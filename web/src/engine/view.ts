// PlayerView: what the player may see. Hidden: draw-pile order, Threat Deck order (except
// cards seen through peek / Satellite Overwrite), face-down Threats, set-aside cards, RNG.

import { threat } from '../data/index.ts';
import { perkActions } from './actions.ts';
import { objectiveProgress } from './objectives.ts';
import { leadBlocked, slotCounts } from './state.ts';
import type { GameState, PerkId, PlayerView, SlotView } from './types.ts';

export function slotView(s: GameState, i: number): SlotView {
  const sl = s.slots[i];
  const base = {
    index: i,
    isPursuerSlot: s.pursuerSlot === i,
    tucked: [],
    bonusPower: 0,
    die: null,
    cancelPressure: false,
    symbols: 0,
    symbolsNeeded: 0,
    power: 0,
    powerNeeded: 0,
    cleanIfCleared: false,
  };
  if (!sl) return { ...base, state: 'empty', threatId: null };
  if (sl.faceDown) return { ...base, state: 'faceDown', threatId: null };
  const t = threat(sl.threatId);
  const c = slotCounts(s, sl);
  return {
    ...base,
    state: 'faceUp',
    threatId: sl.threatId,
    tucked: sl.tucked.map((x) => ({ ...x })),
    bonusPower: sl.bonusPower,
    die: sl.die,
    cancelPressure: sl.cancelPressure,
    symbols: c.symbols,
    symbolsNeeded: t.symbols,
    power: c.power,
    powerNeeded: t.power,
    cleanIfCleared: c.clean,
  };
}

export function view(s: GameState): PlayerView {
  const free = new Set<PerkId>(
    s.phase === 'play' && !s.pending ? perkActions(s).map((a) => (a as { perk: PerkId }).perk) : [],
  );
  const top = s.threatDeck[0];
  return {
    day: s.day,
    turn: s.turn,
    phase: s.phase,
    playsUsed: s.playsUsed,
    playsPerTurn: s.playsPerTurn,
    twist: s.twist,
    lead: s.lead,
    exposure: s.exposure,
    startExposure: s.startExposure,
    leadTarget: s.leadTarget,
    redline: s.redline,
    coverThreshold: s.coverThreshold,
    leadBlocked: leadBlocked(s),
    hand: [...s.hand],
    drawPileCount: s.drawPile.length,
    discard: [...s.discard],
    gear: [...s.gear],
    allies: [...s.allies],
    resolving: [...s.resolving],
    dormant: [...s.dormant],
    awakenedSetAside: s.setAsideCards.length,
    slots: s.slots.map((_, i) => slotView(s, i)),
    pursuerSlot: s.pursuerSlot,
    threatDeckCount: s.threatDeck.length,
    threatDeckKnownTop: [...s.knownTop],
    threatDeckTopEncrypted: top !== undefined && threat(top).type === 'Encrypted Threat',
    threatDiscard: [...s.threatDiscard],
    countermeasuresSetAside: s.setAsideThreats.length,
    perks: {
      unlocked: [...s.perks.unlocked],
      used: [...s.perks.used],
      available: s.perks.unlocked.filter((p) => !s.perks.used.includes(p)),
      usableNow: [...free],
    },
    modifiers: { ...s.mods },
    bonusObjective: objectiveProgress(s),
    pending: s.pending ? structuredClone(s.pending) : null,
    log: [...s.log],
    result: s.result ? { ...s.result, stars: { ...s.result.stars } } : null,
  };
}
