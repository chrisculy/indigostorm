// @vitest-environment node
// Every ability op (PLAN 5.4 #5).
import { describe, expect, it } from 'vitest';
import { apply, IllegalActionError, legalActions } from '../index.ts';
import { ability, C, decide, endPlays, mk, ofType, run, T, tuck, types } from './helpers.ts';

describe('abilities', () => {
  it('draw N', () => {
    const s = mk({ hand: [C.patternRead], drawPile: [C.muscle, C.quiet], slots: [T.records] });
    const r = run(s, ability(C.patternRead));
    expect(r.state.hand).toEqual([C.muscle]);
    expect(r.state.drawPile).toEqual([C.quiet]);
    expect(r.state.discard).toEqual([C.patternRead]);
    expect(ofType(r.events, 'drew')[0]?.cards).toEqual([C.muscle]);
  });

  it('draw from an empty pile draws nothing', () => {
    const r = run(mk({ hand: [C.patternRead], slots: [T.records] }), ability(C.patternRead));
    expect(r.state.hand).toEqual([]);
  });

  it('exposure -N floors at 0', () => {
    const r = run(mk({ hand: [C.shadowStep, C.uniform], exposure: 1, slots: [T.records] }), ability(C.shadowStep));
    expect(r.state.exposure).toBe(0);
    const r2 = run(r.state, ability(C.uniform));
    expect(r2.state.exposure).toBe(0);
  });

  it('lead +N and exposure +N (Takedown)', () => {
    const r = run(mk({ hand: [C.takedown], slots: [T.records] }), ability(C.takedown));
    expect(r.state.lead).toBe(1);
    expect(r.state.exposure).toBe(1);
    expect(types(r.events)).toEqual(['played', 'abilityUsed', 'lead', 'exposure']);
  });

  it('stall N on a timed Threat or Pursuer', () => {
    const s = mk({ hand: [C.signal], slots: [T.fireAlarm, T.records], pursuer: T.hunter });
    const targets = legalActions(s).filter((a) => a.type === 'play' && a.mode === 'ability');
    expect(targets.map((a) => (a as { slot?: number }).slot)).toEqual([0, 3, undefined]);
    const r = run(s, ability(C.signal, 3));
    expect(r.state.slots[3]?.die).toBe(4);
    const r2 = run(s, ability(C.signal, 0));
    expect(r2.state.slots[0]?.die).toBe(4);
    expect(() => apply(s, ability(C.signal, 1))).toThrow(IllegalActionError);
  });

  it('cancel_pressure stops one Threat’s Pressure this turn; its timer still ticks', () => {
    const s = mk({
      hand: [C.blendIn, C.shadowStep],
      drawPile: [C.muscle],
      slots: [T.camera, { id: T.stolenCar, die: 2 }],
    });
    // Stolen Car has no Pressure, so it is not a target.
    const targets = legalActions(s).filter((a) => a.type === 'play' && a.cardUid === C.blendIn && a.mode === 'ability');
    expect(targets.map((a) => (a as { slot?: number }).slot)).toEqual([0, undefined]);
    const r = run(s, ability(C.blendIn, 0), ability(C.shadowStep), endPlays);
    expect(r.state.exposure).toBe(0);
    expect(types(r.events)).toContain('pressureIgnored');
    expect(r.state.slots[1]?.die).toBe(1);
    expect(r.state.slots[0]?.cancelPressure).toBe(false); // flag clears for next turn
  });

  it('add_power N:Suit only on Threats with that suit, and may clear', () => {
    const s = mk({
      hand: [C.strikeFirst],
      slots: [{ id: T.orderly, tucked: [C.shadowStep] }, T.records, T.nurse],
      threatDeck: [T.gate],
    });
    const targets = legalActions(s).filter((a) => a.type === 'play' && a.mode === 'ability');
    expect(targets.map((a) => (a as { slot?: number }).slot)).toEqual([0, undefined]);
    const r = run(s, ability(C.strikeFirst, 0)); // 1 + 2 = 3 Power, 1 symbol: clears
    const cl = ofType(r.events, 'cleared')[0];
    expect(cl?.threatId).toBe(T.orderly);
    expect(cl?.clean).toBe(false); // Stealth card under a Force-preferred Threat
    expect(r.state.slots[0]?.threatId).toBe(T.gate);
  });

  it('clean_next makes the next clear this turn Clean, then expires', () => {
    const s = mk({ hand: [C.lockpick, C.muscle], exposure: 2, slots: [T.lockedDoor], threatDeck: [T.nurse] });
    const r = run(s, ability(C.lockpick), tuck(C.muscle, 0));
    expect(ofType(r.events, 'cleared')[0]?.clean).toBe(true);
    expect(r.state.exposure).toBe(1);
    expect(r.state.mods.cleanNext).toBe(false);
    // Expires at end of turn.
    const s2 = mk({ hand: [C.lockpick, C.shadowStep], drawPile: [C.muscle, C.quiet], slots: [T.lockedDoor] });
    const r2 = run(s2, ability(C.lockpick), ability(C.shadowStep), endPlays);
    expect(r2.state.mods.cleanNext).toBe(false);
  });

  it('breach clears a 1-symbol Threat with ≤ P Power outright, never Clean, never a Pursuer', () => {
    const s = mk({
      hand: [C.breach],
      exposure: 2,
      slots: [T.orderly, T.nurse, T.camera],
      pursuer: T.hunter,
      threatDeck: [T.gate],
    });
    const targets = legalActions(s).filter((a) => a.type === 'play' && a.mode === 'ability');
    // Orderly (3 Power) and Security Camera (2) qualify; Night Nurse needs 4; the Pursuer never.
    expect(targets.map((a) => (a as { slot?: number }).slot)).toEqual([0, 2, undefined]);
    const r = run(s, ability(C.breach, 2));
    const cl = ofType(r.events, 'cleared')[0];
    expect(cl?.breach).toBe(true);
    expect(cl?.clean).toBe(false);
    expect(r.state.exposure).toBe(1); // reward -1 only
    expect(r.state.slots[2]?.threatId).toBe(T.gate);
  });

  it('breach does not consume clean_next', () => {
    const s = mk({ hand: [C.lockpick, C.breach], slots: [T.orderly], threatDeck: [T.nurse] });
    const r = run(s, ability(C.lockpick), ability(C.breach, 0));
    expect(r.state.mods.cleanNext).toBe(true);
  });

  it('swap sends a Threat (and its cards) to the bottom; the top card enters', () => {
    const s = mk({
      hand: [C.coldRead],
      slots: [{ id: T.records, tucked: [C.patternRead] }, T.nurse],
      pursuer: T.hunter,
      threatDeck: [T.gate, T.orderly],
    });
    const targets = legalActions(s).filter((a) => a.type === 'play' && a.mode === 'ability');
    expect(targets.map((a) => (a as { slot?: number }).slot)).toEqual([0, 1, undefined]);
    const r = run(s, ability(C.coldRead, 0));
    expect(r.state.slots[0]?.threatId).toBe(T.gate);
    expect(r.state.threatDeck).toEqual([T.orderly, T.records]);
    expect(r.state.discard).toEqual([C.patternRead, C.coldRead]);
  });

  it('swap needs a card in the Threat Deck', () => {
    const s = mk({ hand: [C.coldRead], slots: [T.records] });
    expect(legalActions(s).filter((a) => a.type === 'play' && a.mode === 'ability')).toEqual([
      { type: 'play', cardUid: C.coldRead, mode: 'ability' },
    ]);
  });

  it('swap can target a face-down Threat without revealing it', () => {
    const s = mk({ day: 11, hand: [C.coldRead], slots: [{ id: T.encServer, faceDown: true }], threatDeck: [T.drone] });
    const r = run(s, ability(C.coldRead, 0));
    expect(ofType(r.events, 'swapped')[0]?.threatId).toBeNull();
    expect(r.state.threatDeck).toEqual([T.encServer]);
  });

  it('peek N lets you reorder the top N', () => {
    const s = mk({ hand: [C.overwatch], slots: [T.records], threatDeck: [T.gate, T.nurse, T.orderly] });
    const r = run(s, ability(C.overwatch));
    expect(r.state.pending).toEqual({ kind: 'reorderTop', cards: [T.gate, T.nurse], card: C.overwatch });
    expect(legalActions(r.state)).toHaveLength(2);
    const r2 = run(r.state, decide([T.nurse, T.gate]));
    expect(r2.state.threatDeck).toEqual([T.nurse, T.gate, T.orderly]);
    expect(r2.state.discard).toEqual([C.overwatch]);
  });

  it('peek with an empty Threat Deck has no decision', () => {
    const r = run(mk({ hand: [C.overwatch], slots: [T.records] }), ability(C.overwatch));
    expect(r.state.pending).toBeNull();
  });

  it('move_card moves a tucked card to another matching face-up Threat and may clear it', () => {
    const s = mk({
      hand: [C.misdirection],
      slots: [{ id: T.records, tucked: [C.decryptKey] }, { id: T.camera }, { id: T.gate }],
      threatDeck: [T.nurse],
      exposure: 2,
    });
    const moves = legalActions(s).filter((a) => a.type === 'play' && a.mode === 'ability' && a.moveCard);
    // Decryption Key (Recon) can go to Security Camera (alt Recon) but not to the Force-only Gate.
    expect(moves).toEqual([
      { type: 'play', cardUid: C.misdirection, mode: 'ability', slot: 1, moveFrom: 0, moveCard: C.decryptKey },
    ]);
    const r = run(s, moves[0] as never);
    expect(ofType(r.events, 'cardMoved')).toHaveLength(1);
    expect(ofType(r.events, 'cleared')[0]?.threatId).toBe(T.camera);
    expect(r.state.slots[0]?.tucked).toEqual([]);
  });

  it('a no-target ability play is always offered for targeted abilities', () => {
    const s = mk({ hand: [C.signal], slots: [T.fireAlarm] });
    const r = run(s, ability(C.signal));
    expect(types(r.events)).toContain('noEffect');
    expect(r.state.slots[0]?.die).toBe(3);
  });
});
