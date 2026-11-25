// @vitest-environment node
// Plays, counting, Clean Clears, clearing and refills (PLAN 5.4 #1–4, #7).
import { describe, expect, it } from 'vitest';
import { apply, IllegalActionError, legalActions } from '../index.ts';
import { C, decide, endPlays, mk, ofType, run, T, tuck, types } from './helpers.ts';

describe('plays per turn', () => {
  it('requires exactly 2 plays before ending', () => {
    const s = mk({ hand: [C.patternRead, C.secondWind, C.shadowStep], drawPile: [C.muscle], slots: [T.records] });
    expect(legalActions(s).some((a) => a.type === 'endPlays')).toBe(false);
    expect(() => apply(s, endPlays)).toThrow(IllegalActionError);
    const one = run(s, { type: 'play', cardUid: C.shadowStep, mode: 'ability' }).state;
    expect(legalActions(one).some((a) => a.type === 'endPlays')).toBe(false);
    const two = run(one, { type: 'play', cardUid: C.secondWind, mode: 'ability' }).state;
    expect(legalActions(two)).toEqual([{ type: 'endPlays' }]);
    expect(() => apply(two, { type: 'play', cardUid: C.patternRead, mode: 'ability' })).toThrow(IllegalActionError);
  });

  it('allows ending after 1 play when the hand is empty', () => {
    const s = mk({ hand: [C.shadowStep], drawPile: [C.muscle], slots: [T.records] });
    const r = run(s, { type: 'play', cardUid: C.shadowStep, mode: 'ability' }).state;
    expect(legalActions(r)).toContainEqual({ type: 'endPlays' });
  });

  it('a Training card can always be played for its ability', () => {
    const s = mk({ hand: [C.strikeFirst], drawPile: [C.muscle], slots: [T.records] });
    // Strike First has no Force target: only the no-effect ability play remains (plus Recon-only tuck is illegal).
    expect(legalActions(s)).toEqual([{ type: 'play', cardUid: C.strikeFirst, mode: 'ability' }]);
    const r = run(s, legalActions(s)[0] as never);
    expect(types(r.events)).toContain('noEffect');
    expect(r.state.discard).toContain(C.strikeFirst);
  });

  it('rejects plays with cards not in hand and tucks to non-matching suits', () => {
    const s = mk({ hand: [C.muscle], slots: [T.records] });
    expect(() => apply(s, tuck(C.muscle, 0))).toThrow(IllegalActionError);
    expect(() => apply(s, tuck(C.secondWind, 0))).toThrow(IllegalActionError);
  });

  it('tucks under preferred or alternate suit only', () => {
    const s = mk({ hand: [C.muscle, C.patternRead, C.shadowStep], slots: [T.lockedDoor, T.records, T.orderly] });
    const tucks = legalActions(s).filter((a) => a.type === 'play' && a.mode === 'tuck');
    expect(tucks).toEqual([
      { type: 'play', cardUid: C.muscle, mode: 'tuck', slot: 0 }, // Locked Door alt Force
      { type: 'play', cardUid: C.muscle, mode: 'tuck', slot: 2 }, // Orderly pref Force
      { type: 'play', cardUid: C.patternRead, mode: 'tuck', slot: 1 },
      { type: 'play', cardUid: C.shadowStep, mode: 'tuck', slot: 0 },
      { type: 'play', cardUid: C.shadowStep, mode: 'tuck', slot: 2 },
    ]);
  });
});

describe('counting and clearing', () => {
  it('clears when symbols and Power are met; claims Reward; refills from the Threat Deck', () => {
    const s = mk({
      hand: [C.shadowStep, C.muscle],
      exposure: 2,
      slots: [T.lockedDoor],
      threatDeck: [T.records, T.gate],
    });
    const r = run(s, tuck(C.shadowStep, 0)); // 1 Power < 4
    expect(r.state.slots[0]?.tucked).toHaveLength(1);
    expect(types(r.events)).not.toContain('cleared');
    const r2 = run(r.state, tuck(C.muscle, 0)); // alternate suit Force: 2 symbols, 5 Power
    const cl = ofType(r2.events, 'cleared')[0];
    expect(cl?.clean).toBe(false);
    expect(cl?.excess).toBe(1);
    expect(r2.state.lead).toBe(1);
    expect(r2.state.exposure).toBe(2);
    expect(r2.state.slots[0]?.threatId).toBe(T.records);
    expect(r2.state.threatDeck).toEqual([T.gate]);
    expect(types(r2.events)).toEqual(['played', 'tucked', 'cleared', 'lead', 'threatEntered']);
  });

  it('Night Nurse (Stealth only) refuses Force; cards carry over across turns', () => {
    const s = mk({
      hand: [C.fragmented, C.shadowStep],
      drawPile: [C.quiet, C.muscle],
      slots: [T.nurse],
      threatDeck: [T.records],
    });
    const r = run(s, tuck(C.shadowStep, 0), tuck(C.fragmented, 0)).state; // 1 + 3 = 4 Power, 2 symbols
    expect(r.slots[0]?.threatId).toBe(T.records);
    expect(r.lead).toBe(1);
  });

  it('progress stays under a Threat across turns', () => {
    const s = mk({
      hand: [C.patternRead, C.shadowStep],
      drawPile: [C.decryptKey, C.halfCode],
      slots: [T.records],
      threatDeck: [T.gate],
    });
    const r = run(s, tuck(C.patternRead, 0), { type: 'play', cardUid: C.shadowStep, mode: 'ability' }, endPlays).state;
    expect(r.turn).toBe(2);
    expect(r.slots[0]?.tucked.map((x) => x.uid)).toEqual([C.patternRead]);
    const r2 = run(r, tuck(C.decryptKey, 0)).state; // 2 symbols, 5 Power < 6
    expect(r2.slots[0]?.threatId).toBe(T.records);
    const r3 = run(r2, tuck(C.halfCode, 0)).state; // 3 symbols, 7 Power
    expect(r3.slots[0]?.threatId).toBe(T.gate);
    expect(r3.lead).toBe(2);
    expect(r3.discard).toEqual(expect.arrayContaining([C.patternRead, C.decryptKey, C.halfCode]));
    expect(r3.threatDiscard).toContain(T.records);
  });

  it('Clean Clear needs every tucked card in the preferred suit', () => {
    // Locked Door: Stealth pref, Force alt, 1 symbol, 4 Power.
    const clean = run(mk({ hand: [C.uniform], exposure: 2, slots: [T.lockedDoor] }), tuck(C.uniform, 0));
    expect(ofType(clean.events, 'cleared')[0]?.clean).toBe(true);
    expect(clean.state.exposure).toBe(1);
    const dirty = run(mk({ hand: [C.muscle], exposure: 2, slots: [T.lockedDoor] }), tuck(C.muscle, 0));
    expect(ofType(dirty.events, 'cleared')[0]?.clean).toBe(false);
    expect(dirty.state.exposure).toBe(2);
  });

  it('Allies add symbols; preferred-suit symbols alone must meet the requirement for Clean', () => {
    // Patrol Guard: Force pref, Stealth alt, 2 symbols, 5 Power.
    const withFixer = run(
      mk({ hand: [C.muscle, C.secondWind], allies: [C.fixer], exposure: 3, slots: [T.patrol] }),
      tuck(C.muscle, 0), // 1 card + Fixer = 2 Force symbols, 4 Power
    );
    expect(withFixer.state.slots[0]?.threatId).toBe(T.patrol);
    const r = run(withFixer.state, tuck(C.secondWind, 0));
    const cl = ofType(r.events, 'cleared')[0];
    expect(cl?.clean).toBe(true);
    // Overwatch Team gives Force + Stealth: symbols count, but a Stealth ally symbol is not preferred.
    const s2 = mk({ hand: [C.uniform, C.muscle], allies: [C.overwatchTeam], slots: [T.gate] });
    // Loading Dock Gate is Force only: Overwatch Team gives 1 Force symbol.
    const r2 = run(s2, tuck(C.muscle, 0)); // 2 symbols (card + ally Force), 4 Power < 7
    expect(r2.state.slots[0]?.threatId).toBe(T.gate);
    const s3 = mk({ hand: [C.uniform], allies: [C.overwatchTeam], slots: [T.patrol] });
    // Patrol Guard: Overwatch Team = 2 symbols (Force + Stealth) already; Uniform Stealth 4 + ... 4 < 5 Power.
    const r3 = run(s3, tuck(C.uniform, 0));
    expect(r3.state.slots[0]?.tucked).toHaveLength(1);
  });

  it('a Clean Clear is lost when an alternate-suit card is tucked', () => {
    const s = mk({ hand: [C.uniform, C.muscle], slots: [T.patrol], exposure: 3 });
    const r = run(s, tuck(C.muscle, 0), tuck(C.uniform, 0));
    const cl = ofType(r.events, 'cleared')[0];
    expect(cl?.threatId).toBe(T.patrol);
    expect(cl?.clean).toBe(false);
    expect(r.state.exposure).toBe(2); // reward -1, no clean bonus
  });

  it('multiple clears resolve left to right (deploying an Ally completes two Threats)', () => {
    const s = mk({
      hand: [C.fixer],
      slots: [
        { id: T.patrol, tucked: [C.muscle], bonus: 2 },
        { id: T.gate, tucked: [C.secondWind], bonus: 4 },
      ],
      exposure: 3,
      threatDeck: [T.records, T.nurse],
    });
    const r = run(s, { type: 'play', cardUid: C.fixer, mode: 'deploy' });
    expect(ofType(r.events, 'cleared').map((e) => e.slot)).toEqual([0, 1]);
    // Refills come from the top of the Threat Deck in order.
    expect(r.state.slots[0]?.threatId).toBe(T.records);
    expect(r.state.slots[1]?.threatId).toBe(T.nurse);
  });

  it('an empty Threat Deck leaves the slot empty', () => {
    const s = mk({ hand: [C.uniform, C.shadowStep], slots: [T.lockedDoor, T.records], threatDeck: [] });
    const r = run(s, tuck(C.uniform, 0));
    expect(r.state.slots[0]).toBeNull();
    expect(types(r.events)).toContain('slotEmpty');
  });

  it('Gear power_bonus adds to each tucked card of its suit', () => {
    const s = mk({ hand: [C.secondWind], gear: [C.fieldKit], slots: [T.orderly] }); // 3 + 1 vs 3
    const r = run(s, tuck(C.secondWind, 0));
    const tk = ofType(r.events, 'tucked')[0];
    expect(tk?.gearBonus).toBe(1);
    expect(ofType(r.events, 'cleared')[0]?.excess).toBe(1);
  });

  it('Gear does not apply to other suits', () => {
    const s = mk({ hand: [C.secondWind], gear: [C.cloak], slots: [T.gate] });
    const r = run(s, tuck(C.secondWind, 0));
    expect(ofType(r.events, 'tucked')[0]?.gearBonus).toBe(0);
  });
});

describe('decisions block other actions', () => {
  it('only answers are legal while a decision is pending', () => {
    const s = mk({ hand: [C.overwatch, C.muscle], slots: [T.records], threatDeck: [T.gate, T.nurse, T.orderly] });
    const r = run(s, { type: 'play', cardUid: C.overwatch, mode: 'ability' }).state;
    expect(r.pending?.kind).toBe('reorderTop');
    expect(legalActions(r).every((a) => a.type === 'decide')).toBe(true);
    expect(() => apply(r, endPlays)).toThrow(IllegalActionError);
    const r2 = run(r, decide([T.nurse, T.gate])).state;
    expect(r2.threatDeck).toEqual([T.nurse, T.gate, T.orderly]);
    expect(r2.knownTop).toEqual([T.nurse, T.gate]);
  });
});
