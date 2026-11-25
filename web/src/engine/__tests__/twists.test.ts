// @vitest-environment node
// Episode Twists (PLAN 5.4 #16).
import { describe, expect, it } from 'vitest';
import { createEpisode, legalActions, prototypeSetup } from '../index.ts';
import { ability, C, mk, ofType, run, T, tuck, types } from './helpers.ts';

describe('Episode Twists', () => {
  it('stealth_clean_lead: Stealth Clean Clears also give +1 Lead', () => {
    const s = mk({
      twist: 'stealth_clean_lead',
      hand: [C.uniform, C.muscle],
      slots: [T.lockedDoor, T.orderly],
      threatDeck: [T.gate, T.records],
    });
    const r = run(s, tuck(C.uniform, 0)); // Stealth-preferred, Clean: +1 reward +1 twist
    expect(r.state.lead).toBe(2);
    expect(ofType(r.events, 'lead').map((e) => e.src.kind)).toEqual(['reward', 'twist']);
    const r2 = run(r.state, tuck(C.muscle, 1)); // Force-preferred Clean: no twist bonus
    expect(r2.state.lead).toBe(3);
  });

  it('four_slots: the Scene Row has 4 slots', () => {
    const s = createEpisode({ ...prototypeSetup(1, 2), twist: 'four_slots' });
    expect(s.slots).toHaveLength(4);
    expect(s.slots.every(Boolean)).toBe(true);
    const p = createEpisode({ ...prototypeSetup(21, 2), twist: 'four_slots' });
    expect(p.slots).toHaveLength(5);
    expect(p.pursuerSlot).toBe(4);
  });

  it('no_abilities: ability plays have no effect (but remain legal plays); no Sleeper Instinct', () => {
    const s = mk({
      twist: 'no_abilities',
      hand: [C.takedown, C.coldRead],
      perks: ['sleeperInstinct'],
      slots: [T.records],
      threatDeck: [T.gate],
    });
    expect(legalActions(s).filter((a) => a.type === 'play' && a.mode === 'ability')).toEqual([
      { type: 'play', cardUid: C.takedown, mode: 'ability' },
      { type: 'play', cardUid: C.coldRead, mode: 'ability' },
    ]);
    const r = run(s, ability(C.takedown));
    expect(types(r.events)).toContain('abilityBlocked');
    expect(r.state.lead).toBe(0);
    expect(r.state.discard).toEqual([C.takedown]);
  });

  it('extra_opening_card: opening hand of 5', () => {
    const s = createEpisode({ ...prototypeSetup(6, 2), twist: 'extra_opening_card' });
    expect(s.hand).toHaveLength(5);
  });

  it('timers_minus_one: timers start 1 lower (not Pursuer Hunt dice)', () => {
    const s = mk({
      day: 21,
      twist: 'timers_minus_one',
      hand: [C.breach],
      slots: [T.orderly],
      pursuer: T.hunter,
      threatDeck: [T.fireAlarm],
    });
    expect(s.slots[3]?.die).toBe(3);
    const r = run(s, ability(C.breach, 0));
    expect(r.state.slots[0]).toMatchObject({ threatId: T.fireAlarm, die: 2 });
  });

  it('alarm_raised: start +1 Exposure; Clean bonus becomes −2 Exposure', () => {
    const s = createEpisode({ ...prototypeSetup(1, 2), twist: 'alarm_raised' });
    expect(s.exposure).toBe(1);
    expect(s.startExposure).toBe(1);
    const h = mk({
      twist: 'alarm_raised',
      hand: [C.uniform],
      exposure: 3,
      slots: [T.lockedDoor],
      threatDeck: [T.gate],
    });
    const r = run(h, tuck(C.uniform, 0));
    expect(r.state.exposure).toBe(1);
  });
});
