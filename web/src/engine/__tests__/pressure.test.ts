// @vitest-environment node
// Pressure step, timers, Ally Cover, Blockers, Pursuers and end conditions (PLAN 5.4 #8–12).
import { describe, expect, it } from 'vitest';
import { threat } from '../../data/index.ts';
import { legalActions } from '../index.ts';
import { ability, C, decide, endPlays, mk, ofType, run, T, tuck, types } from './helpers.ts';

// Two stall cards played with no target: no effect at all.
const twoDummies = { hand: [C.signal, C.sniffer], drawPile: [C.muscle, C.secondWind, C.patternRead] };
const passTurn = [ability(C.signal), ability(C.sniffer), endPlays] as const;

describe('pressure step', () => {
  it('applies Pressure left to right, then ticks timers, then draws 2 and starts the next turn', () => {
    const s = mk({ ...twoDummies, slots: [T.camera, T.drone, { id: T.fireAlarm, die: 3 }] });
    const r = run(s, ...passTurn);
    const seq = r.events
      .filter((e) => ['pressureApplied', 'timerTick', 'exposure', 'drew', 'turnStarted'].includes(e.type))
      .map((e) => e.type);
    expect(seq).toEqual([
      'pressureApplied',
      'exposure',
      'pressureApplied',
      'exposure',
      'timerTick',
      'drew',
      'turnStarted',
    ]);
    expect(r.state.exposure).toBe(3);
    expect(r.state.slots[2]?.die).toBe(2);
    expect(r.state.hand).toEqual([C.muscle, C.secondWind]);
    expect(r.state.turn).toBe(2);
    expect(r.state.phase).toBe('play');
  });

  it('a timer reaching 0 escapes: Expiry, discard with tucked cards, refill', () => {
    const s = mk({
      ...twoDummies,
      slots: [{ id: T.fireAlarm, die: 1, tucked: [C.halfCode] }],
      threatDeck: [T.records],
    });
    const r = run(s, ...passTurn);
    expect(types(r.events)).toContain('escaped');
    expect(r.state.exposure).toBe(2);
    expect(r.state.discard).toContain(C.halfCode);
    expect(r.state.threatDiscard).toContain(T.fireAlarm);
    expect(r.state.slots[0]?.threatId).toBe(T.records);
  });

  it('face-down Threats have no Pressure and no timer', () => {
    const s = mk({ day: 11, ...twoDummies, slots: [{ id: T.encServer, faceDown: true }] });
    const r = run(s, ...passTurn);
    expect(r.state.exposure).toBe(0);
    expect(types(r.events)).not.toContain('pressureApplied');
  });

  it('Pursuer goes last, Strikes at 0 and resets to its Hunt number; never escapes', () => {
    const s = mk({ day: 21, ...twoDummies, slots: [T.camera], pursuer: { id: T.hunter, die: 1 } });
    const r = run(s, ...passTurn);
    const seq = r.events.filter((e) => ['pressureApplied', 'strike'].includes(e.type)).map((e) => e.type);
    expect(seq).toEqual(['pressureApplied', 'strike']);
    expect(r.state.exposure).toBe(3);
    expect(r.state.slots[3]?.threatId).toBe(T.hunter);
    expect(r.state.slots[3]?.die).toBe(3);
  });

  it('Pursuer suit penalty: Stealth cards get −1 Power (minimum 0) everywhere', () => {
    const s = mk({ day: 21, hand: [C.shadowStep, C.uniform], slots: [T.lockedDoor], pursuer: T.hunter });
    const r = run(s, tuck(C.uniform, 0)); // 4 - 1 = 3 < 4
    expect(r.state.slots[0]?.threatId).toBe(T.lockedDoor);
    const r2 = run(r.state, tuck(C.shadowStep, 0)); // 3 + max(0, 1 - 1) = 3
    expect(r2.state.slots[0]?.tucked).toHaveLength(2);
    expect(types(r2.events)).not.toContain('cleared');
  });

  it('Pursuer cleared: slot stays empty; Scene Cleared needs it gone', () => {
    const s = mk({
      day: 21,
      hand: [C.oldReflexes],
      slots: [],
      pursuer: { id: T.hunter, tucked: [C.muscle, C.counterstrike], die: 2 },
      exposure: 2,
    });
    const r = run(s, tuck(C.oldReflexes, 3)); // 3 symbols, 13 Power
    const cl = ofType(r.events, 'cleared')[0];
    expect(cl?.threatType).toBe('Pursuer');
    expect(r.state.slots[3]).toBeNull();
    // Scene Row + Threat Deck empty: Scene Cleared, +1 Lead.
    expect(r.state.sceneCleared).toBe(true);
    expect(r.state.result?.reason).toBe('sceneCleared');
    expect(r.state.lead).toBe(4); // +3 reward, +1 Scene Cleared
    expect(r.state.exposure).toBe(1);
  });
});

describe('Ally Cover', () => {
  it('asks before a Pressure effect; defeating an Ally cancels it', () => {
    const s = mk({ ...twoDummies, allies: [C.fixer, C.codebreaker], slots: [T.drone] });
    const r = run(s, ...passTurn);
    expect(r.state.pending).toMatchObject({ kind: 'allyCover', effect: 'pressure', threatId: T.drone });
    expect(legalActions(r.state)).toEqual([decide(C.fixer), decide(C.codebreaker), decide(null)]);
    const r2 = run(r.state, decide(C.codebreaker));
    expect(r2.state.exposure).toBe(0);
    expect(r2.state.allies).toEqual([C.fixer]);
    expect(r2.state.discard).toContain(C.codebreaker);
    expect(r2.state.turn).toBe(2);
    const r3 = run(r.state, decide(null));
    expect(r3.state.exposure).toBe(2);
  });

  it('covers Expiry effects and Strikes', () => {
    const s = mk({
      day: 21,
      ...twoDummies,
      allies: [C.fixer],
      slots: [{ id: T.stolenCar, die: 1 }],
      pursuer: { id: T.hunter, die: 1 },
      threatDeck: [T.records],
    });
    const r = run(s, ...passTurn);
    expect(r.state.pending).toMatchObject({ kind: 'allyCover', effect: 'expiry' });
    const r2 = run(r.state, decide(C.fixer));
    expect(ofType(r2.events, 'allyCover')[0]?.effect).toBe('expiry');
    // No Ally left: the Strike applies without asking.
    expect(r2.state.exposure).toBe(2);
    expect(r2.state.slots[0]?.threatId).toBe(T.records);
  });

  it('is not offered for harmless effects', () => {
    const s = mk({ ...twoDummies, allies: [C.fixer], slots: [{ id: T.fireAlarm, die: 2 }] });
    const r = run(s, ...passTurn);
    expect(r.state.pending).toBeNull();
  });
});

describe('Blockers', () => {
  it('while a face-up Blocker is in the Scene Row, Lead cannot increase', () => {
    const blocker = threat(T.patrol);
    const was = blocker.blocker;
    blocker.blocker = true;
    try {
      const s = mk({ hand: [C.takedown, C.uniform], slots: [T.patrol, T.lockedDoor], threatDeck: [T.gate] });
      const r = run(s, ability(C.takedown));
      expect(r.state.lead).toBe(0);
      expect(types(r.events)).toContain('leadBlocked');
      expect(r.state.exposure).toBe(1);
      const r2 = run(r.state, tuck(C.uniform, 1)); // clears Locked Door (+1 Lead) — blocked
      expect(r2.state.lead).toBe(0);
    } finally {
      blocker.blocker = was;
    }
  });
});

describe('end conditions', () => {
  it('Objective Secured ends immediately, even mid-play', () => {
    const s = mk({ hand: [C.takedown, C.patternRead], lead: 6, leadTarget: 7, slots: [T.records] });
    const r = run(s, ability(C.takedown));
    expect(r.state.phase).toBe('over');
    expect(r.state.result?.reason).toBe('objective');
    expect(r.state.exposure).toBe(0); // the +1 Exposure after the Lead never resolved
    expect(legalActions(r.state)).toEqual([]);
  });

  it('Cover Blown at the redline', () => {
    const s = mk({ ...twoDummies, exposure: 4, slots: [T.drone] });
    const r = run(s, ...passTurn);
    expect(r.state.result?.reason).toBe('coverBlown');
    expect(r.state.result?.stars.cover).toBe(false);
    expect(r.state.exposure).toBe(6);
  });

  it('Out of Time: no Pressure step when hand and draw pile are empty after plays', () => {
    const s = mk({ hand: [C.shadowStep], slots: [T.drone] });
    const r = run(s, ability(C.shadowStep), endPlays);
    expect(r.state.result?.reason).toBe('outOfTime');
    expect(r.state.exposure).toBe(0);
    expect(types(r.events)).not.toContain('pressureStep');
  });

  it('Lead never goes below 0', () => {
    const lossy = threat(T.camera);
    const was = lossy.pressure;
    lossy.pressure = { lead: -2, exposure: 0, draw: 0 };
    try {
      const s = mk({ ...twoDummies, lead: 1, slots: [T.camera] });
      const r = run(s, ...passTurn);
      expect(r.state.lead).toBe(0);
    } finally {
      lossy.pressure = was;
    }
  });

  it('Stars: Objective, Cover (≤ threshold and not Cover Blown), Bonus', () => {
    const s = mk({ hand: [C.uniform], lead: 6, leadTarget: 7, exposure: 3, coverThreshold: 2, slots: [T.lockedDoor] });
    const r = run(s, tuck(C.uniform, 0)); // +1 Lead ends it before the Clean bonus
    expect(r.state.result?.stars).toEqual({ objective: true, cover: false, bonus: true });
    expect(r.state.result?.starCount).toBe(2);
  });
});
