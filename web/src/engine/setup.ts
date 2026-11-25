// Building an episode: EpisodeSetup -> initial GameState.

import { coreDeck, dayPlan, gameData, playerCard, playerCardsForDay, threatsForDay } from '../data/index.ts';
import { objectiveForDay } from '../data/objectives.ts';
import { twistForDay } from '../data/twists.ts';
import { type Ctx, emit, enter, freshMods, run } from './core.ts';
import { seedRng, shuffleInPlace } from './rng.ts';
import { perkAvailable } from './state.ts';
import { sceneSlotCount, startExposureBonus } from './twists.ts';
import type { CampaignState, EpisodeSetup, GameState } from './types.ts';

/** The 3 player cards a day adds to the deck (Awakened cards are set aside, not added). */
export function dayCards(day: number): string[] {
  return playerCardsForDay(day)
    .filter((c) => c.cls !== 'Awakened')
    .map((c) => c.id);
}

/** Prototype mode: the day's Jump-In deck and perks (Day 1: the Core deck, no perks) + the day's 3 cards. */
export function prototypeSetup(day: number, seed: number): EpisodeSetup {
  const jump = gameData.jumpIns.find((j) => j.day === day);
  const base = jump ? [...jump.deck] : coreDeck().map((c) => c.id);
  return { day, deck: [...base, ...dayCards(day)], perks: jump ? [...jump.perks] : [], seed, twist: twistForDay(day) };
}

/** Campaign mode: the campaign's 12-card deck and unlocked perks + the day's 3 cards. */
export function campaignSetup(campaign: CampaignState, seed: number): EpisodeSetup {
  const day = campaign.day;
  if (!dayPlan(day).hasContent) throw new Error(`Day ${day} has no content yet`);
  return { day, deck: [...campaign.deck, ...dayCards(day)], perks: [...campaign.perks], seed, twist: twistForDay(day) };
}

/** Create a new episode. Runs setup up to the first PLAY step, or to the Cloned Credentials choice. */
export function createEpisode(setup: EpisodeSetup): GameState {
  const plan = dayPlan(setup.day);
  const threats = threatsForDay(setup.day);
  if (threats.length === 0) throw new Error(`Day ${setup.day} has no Threats`);
  const twist = setup.twist ?? null;

  const seen = new Set<string>();
  for (const id of setup.deck) {
    playerCard(id);
    if (seen.has(id)) throw new Error(`Card ${id} appears twice in the deck`);
    seen.add(id);
  }
  // Awakened Cards for Conditioned Cards in the deck wait out of play.
  const setAsideCards: string[] = [];
  for (const id of setup.deck) {
    const c = playerCard(id);
    if (c.cls === 'Conditioned' && c.pairsWith) {
      if (seen.has(c.pairsWith)) throw new Error(`Deck holds both ${id} and its Awakened Card ${c.pairsWith}`);
      setAsideCards.push(c.pairsWith);
    }
  }

  const rng = seedRng(setup.seed);
  const pursuer = threats.find((t) => t.type === 'Pursuer') ?? null;
  const countermeasures = threats.filter((t) => t.type === 'Countermeasure').map((t) => t.id);
  const threatDeck = shuffleInPlace(
    rng,
    threats.filter((t) => t.type !== 'Pursuer' && t.type !== 'Countermeasure').map((t) => t.id),
  );
  const drawPile = shuffleInPlace(rng, [...setup.deck]);
  const normalSlots = sceneSlotCount(twist);
  const slotCount = normalSlots + (pursuer ? 1 : 0);
  const startExposure = plan.startExposure + startExposureBonus(twist);

  const s: GameState = {
    version: 1,
    day: setup.day,
    setup: { ...setup, deck: [...setup.deck], perks: [...setup.perks], twist },
    twist,
    objective: objectiveForDay(setup.day).objective,
    lead: plan.startLead,
    exposure: startExposure,
    startLead: plan.startLead,
    startExposure,
    leadTarget: plan.leadTarget,
    redline: plan.redline,
    coverThreshold: plan.coverThreshold,
    peakExposure: startExposure,
    phase: 'setup',
    turn: 0,
    playsUsed: 0,
    playsPerTurn: 2,
    drawPile,
    hand: [],
    discard: [],
    gear: [],
    allies: [],
    resolving: [],
    setAsideCards,
    dormant: [],
    slots: Array.from({ length: slotCount }, () => null),
    pursuerSlot: pursuer ? slotCount - 1 : null,
    threatDeck,
    threatDiscard: [],
    setAsideThreats: countermeasures,
    knownTop: [],
    openingRow: [],
    perks: { unlocked: [...new Set(setup.perks)], used: [] },
    mods: freshMods(),
    sceneCleared: false,
    pending: null,
    queue: [],
    rng,
    log: [],
    result: null,
  };
  const c: Ctx = { s, ev: [] };
  emit(c, { type: 'episodeStarted', day: setup.day, twist });
  if (pursuer && s.pursuerSlot != null) enter(c, s.pursuerSlot, pursuer.id);
  for (let i = 0; i < normalSlots; i++) {
    const id = s.threatDeck.shift();
    if (id === undefined) break;
    enter(c, i, id);
    s.openingRow.push(id);
  }
  if (perkAvailable(s, 'clonedCredentials')) {
    s.pending = { kind: 'chooseCard', options: [...s.drawPile].sort() }; // sorted: never leak deck order
  } else {
    s.queue.push({ t: 'openingDraw' });
    run(c);
  }
  return s;
}
