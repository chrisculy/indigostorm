// @vitest-environment node
// Random legal play-outs for every content day. PROPERTY_SEEDS (default 300) sets the
// number of games per day, e.g. `PROPERTY_SEEDS=1000 npx vitest run property`.
import { describe, expect, it } from 'vitest';
import { contentDays, threatsForDay } from '../../data/index.ts';
import { TWIST_CODES } from '../../data/twists.ts';
import {
  ALL_PERKS,
  apply,
  createEpisode,
  describeAction,
  describeEvent,
  legalActions,
  nextInt,
  playerCardZones,
  prototypeSetup,
  replay,
  seedRng,
  threatZones,
  view,
} from '../index.ts';
import type { Action, EpisodeSetup, GameState } from '../types.ts';

const SEEDS = Number(process.env.PROPERTY_SEEDS ?? 300);
const MAX_TURNS = 12;

function setupFor(day: number, seed: number): EpisodeSetup {
  const base = prototypeSetup(day, seed);
  // Exercise every perk and twist on a share of the games.
  if (seed % 2 === 1) base.perks = [...ALL_PERKS];
  if (seed % 3 === 0) base.twist = TWIST_CODES[seed % TWIST_CODES.length] ?? null;
  return base;
}

function checkInvariants(s: GameState, playerCount: number, threatCount: number): void {
  const p = playerCardZones(s).map(([id]) => id);
  const t = threatZones(s).map(([id]) => id);
  if (new Set(p).size !== p.length || p.length !== playerCount)
    throw new Error(`player card conservation broken: ${p.length}/${playerCount}`);
  if (new Set(t).size !== t.length || t.length !== threatCount)
    throw new Error(`threat conservation broken: ${t.length}/${threatCount}`);
  if (s.lead < 0 || s.lead > s.leadTarget) throw new Error(`lead out of range: ${s.lead}`);
  if (s.exposure < 0 || s.exposure > s.redline) throw new Error(`exposure out of range: ${s.exposure}`);
  if (s.turn > MAX_TURNS) throw new Error(`episode too long: turn ${s.turn}`);
  if (s.phase !== 'over' && legalActions(s).length === 0) throw new Error('no legal action in a live state');
  if (s.phase === 'over' && !s.result) throw new Error('over without a result');
  if (s.playsUsed > s.playsPerTurn) throw new Error('too many plays');
}

function randomGame(day: number, seed: number): { setup: EpisodeSetup; actions: Action[]; final: GameState } {
  const setup = setupFor(day, seed);
  let s = createEpisode(setup);
  const playerCount = setup.deck.length + s.setAsideCards.length;
  const threatCount = threatsForDay(day).length;
  checkInvariants(s, playerCount, threatCount);
  const rng = seedRng(seed * 7919 + day);
  const actions: Action[] = [];
  for (let i = 0; i < 500 && s.phase !== 'over'; i++) {
    const acts = legalActions(s);
    const a = acts[nextInt(rng, acts.length)] as Action;
    describeAction(s, a);
    actions.push(a);
    const r = apply(s, a);
    for (const e of r.events) describeEvent(e);
    s = r.state;
    checkInvariants(s, playerCount, threatCount);
  }
  view(s);
  return { setup, actions, final: s };
}

describe.each(contentDays.map((d) => [d]))('day %i random play-outs', (day) => {
  it(`${SEEDS} random games: no throws, cards conserved, tracks in range, bounded length, replayable`, () => {
    const ends: Record<string, number> = {};
    for (let seed = 1; seed <= SEEDS; seed++) {
      const { setup, actions, final } = randomGame(day, seed);
      expect(final.phase).toBe('over');
      ends[final.result?.reason ?? '?'] = (ends[final.result?.reason ?? '?'] ?? 0) + 1;
      if (seed % 10 === 0) expect(JSON.stringify(replay(setup, actions))).toBe(JSON.stringify(final));
    }
    expect(Object.values(ends).reduce((a, b) => a + b, 0)).toBe(SEEDS);
  }, 120_000);
});
