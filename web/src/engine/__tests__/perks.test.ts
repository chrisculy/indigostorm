// @vitest-environment node
// All 12 Clearance Perks (PLAN 5.4 #15): timing, once per episode, only when unlocked.
import { describe, expect, it } from 'vitest';
import { apply, createEpisode, IllegalActionError, legalActions, prototypeSetup } from '../index.ts';
import type { Action } from '../types.ts';
import { ability, C, decide, endPlays, mk, ofType, perk, play, run, T, tuck, types } from './helpers.ts';

const dummies = { hand: [C.signal, C.sniffer], drawPile: [C.muscle, C.secondWind, C.patternRead] };
const pass = [ability(C.signal), ability(C.sniffer)] as const;

const perkActs = (s: Parameters<typeof legalActions>[0]) =>
  legalActions(s).filter((a): a is Extract<Action, { type: 'perk' }> => a.type === 'perk');

describe('perks need to be unlocked and are once per episode', () => {
  it('no perk actions without unlocks', () => {
    const s = mk({ ...dummies, slots: [T.camera], threatDeck: [T.gate] });
    expect(perkActs(s)).toEqual([]);
    expect(() => apply(s, perk('contingencyPlan'))).toThrow(IllegalActionError);
  });

  it('a used perk is gone for the episode', () => {
    const s = mk({ ...dummies, perks: ['contingencyPlan'], slots: [T.camera] });
    const r = run(s, perk('contingencyPlan')).state;
    expect(r.perks.used).toEqual(['contingencyPlan']);
    expect(perkActs(r)).toEqual([]);
  });
});

describe('each perk', () => {
  it('Vanish: discard a face-up non-Pursuer Threat, no Reward, refill', () => {
    const s = mk({
      day: 21,
      ...dummies,
      perks: ['vanish'],
      slots: [{ id: T.camera, tucked: [C.uniform] }, T.records],
      pursuer: T.hunter,
      threatDeck: [T.gate],
    });
    expect(perkActs(s).map((a) => a.slot)).toEqual([0, 1]); // never the Pursuer
    const r = run(s, perk('vanish', 0));
    expect(r.state.slots[0]?.threatId).toBe(T.gate);
    expect(r.state.discard).toContain(C.uniform);
    expect(r.state.exposure).toBe(0);
    expect(types(r.events)).not.toContain('cleared');
  });

  it('Cloned Credentials: choose a card for the opening hand, then draw to 4', () => {
    const setup = { ...prototypeSetup(1, 5), perks: ['clonedCredentials' as const] };
    const s = createEpisode(setup);
    expect(s.phase).toBe('setup');
    expect(s.pending?.kind).toBe('chooseCard');
    expect(s.hand).toEqual([]);
    const r = run(s, decide(C.muscle)).state;
    expect(r.hand[0]).toBe(C.muscle);
    expect(r.hand).toHaveLength(4);
    expect(r.phase).toBe('play');
    expect(r.perks.used).toEqual(['clonedCredentials']);
    const declined = run(s, decide(null)).state;
    expect(declined.hand).toHaveLength(4);
    expect(declined.perks.used).toEqual([]);
  });

  it('False Trail: ignore up to 2 Exposure this turn, +1 Lead the first time it absorbs', () => {
    const s = mk({ ...dummies, perks: ['falseTrail'], slots: [T.camera, T.drone] });
    const r = run(s, ...pass, perk('falseTrail'), endPlays);
    expect(ofType(r.events, 'exposureAbsorbed').map((e) => e.amount)).toEqual([1, 1]);
    expect(r.state.lead).toBe(1);
    expect(r.state.exposure).toBe(1); // 3 incoming, 2 ignored
    expect(r.state.mods.falseTrail).toBe(false); // ends with the turn
  });

  it('Sleeper Instinct: a Stealth card used for its ability is also tucked', () => {
    const s = mk({
      hand: [C.uniform, C.muscle],
      exposure: 2,
      perks: ['sleeperInstinct'],
      slots: [T.lockedDoor, T.records],
    });
    const modes = legalActions(s).filter((a) => a.type === 'play' && a.mode === 'sleeperInstinct');
    expect(modes).toEqual([play(C.uniform, 'sleeperInstinct', { slot2: 0 })]);
    const r = run(s, modes[0] as Action);
    expect(r.state.exposure).toBe(0); // -1 ability, then the tuck clears Locked Door cleanly (-1)
    expect(ofType(r.events, 'cleared')[0]?.clean).toBe(true);
    expect(r.state.lead).toBe(1);
    expect(r.state.perks.used).toEqual(['sleeperInstinct']);
  });

  it('Satellite Overwrite: look at the top 4, discard up to 2, reorder the rest', () => {
    const s = mk({
      ...dummies,
      perks: ['satelliteOverwrite'],
      slots: [T.records],
      threatDeck: [T.gate, T.nurse, T.orderly, T.camera, T.patrol],
    });
    const r = run(s, perk('satelliteOverwrite')).state;
    expect(r.pending).toEqual({ kind: 'satellite', cards: [T.gate, T.nurse, T.orderly, T.camera], maxDiscard: 2 });
    expect(legalActions(r)).toHaveLength(24 + 4 * 6 + 6 * 2);
    expect(() => apply(r, decide({ discard: [T.gate, T.nurse, T.orderly], order: [T.camera] }))).toThrow();
    const r2 = run(r, decide({ discard: [T.camera, T.gate], order: [T.orderly, T.nurse] })).state;
    expect(r2.threatDeck).toEqual([T.orderly, T.nurse, T.patrol]);
    expect(r2.threatDiscard).toEqual([T.camera, T.gate]);
    expect(r2.knownTop).toEqual([T.orderly, T.nurse]);
  });

  it('Contingency Plan: draw 2', () => {
    const s = mk({ ...dummies, perks: ['contingencyPlan'], slots: [T.records] });
    const r = run(s, perk('contingencyPlan')).state;
    expect(r.hand).toEqual([C.signal, C.sniffer, C.muscle, C.secondWind]);
  });

  it('Pattern Recognition: draw 1 on a clear with 3+ excess Power, first time only', () => {
    const s = mk({
      hand: [C.oldReflexes, C.counterstrike],
      drawPile: [C.quiet, C.ghost],
      perks: ['patternRecognition'],
      slots: [T.orderly, T.lockedDoor],
      threatDeck: [T.gate, T.nurse],
    });
    const r = run(s, tuck(C.oldReflexes, 0)); // 5 vs 3: excess 2
    expect(r.state.perks.used).toEqual([]);
    const r2 = run(r.state, tuck(C.counterstrike, 1)); // 4 vs 4: excess 0
    expect(r2.state.perks.used).toEqual([]);
    // Access Spoofer: Blueprint Analysis is 4 + 1 Power against Security Camera's 2: excess 3.
    const s3 = mk({
      hand: [C.blueprint],
      gear: [C.spoofer],
      drawPile: [C.quiet],
      perks: ['patternRecognition'],
      slots: [T.camera],
    });
    const r3 = run(s3, tuck(C.blueprint, 0));
    expect(ofType(r3.events, 'cleared')[0]?.excess).toBe(3);
    expect(r3.state.perks.used).toEqual(['patternRecognition']);
    expect(r3.state.hand).toEqual([C.quiet]);
  });

  it('Master Decryptor: before the first play; every card counts as any suit this turn', () => {
    const s = mk({ ...dummies, hand: [C.muscle, C.signal], perks: ['masterDecryptor'], slots: [T.nurse] });
    expect(perkActs(s).map((a) => a.perk)).toEqual(['masterDecryptor']);
    const r = run(s, perk('masterDecryptor')).state;
    expect(legalActions(r)).toContainEqual(play(C.muscle, 'tuck', { slot: 0 }));
    const r2 = run(r, play(C.muscle, 'tuck', { slot: 0 }));
    const cl = ofType(r2.events, 'cleared')[0];
    expect(cl?.clean).toBe(true); // counts as the preferred suit
    // Not available after the first play.
    const s2 = mk({ ...dummies, perks: ['masterDecryptor'], slots: [T.nurse] });
    const after = run(s2, ability(C.signal)).state;
    expect(perkActs(after)).toEqual([]);
  });

  it('Master Decryptor: any card decrypts and stays under the Threat', () => {
    const s = mk({
      day: 11,
      hand: [C.muscle, C.signal],
      perks: ['masterDecryptor'],
      slots: [{ id: T.encRelay, faceDown: true }],
    });
    expect(legalActions(s).some((a) => a.type === 'play' && a.mode === 'decrypt' && a.cardUid === C.muscle)).toBe(
      false,
    );
    const r = run(s, perk('masterDecryptor'), play(C.muscle, 'decrypt', { slot: 0 }));
    expect(ofType(r.events, 'decrypted')[0]?.tucked).toBe(true);
    expect(r.state.slots[0]?.tucked).toEqual([{ uid: C.muscle, suit: 'Stealth', power: 4, gearBonus: 0, wild: false }]);
  });

  it('Adrenaline Surge: skip this turn’s Pressure step entirely (no ticks)', () => {
    const s = mk({ ...dummies, perks: ['adrenalineSurge'], slots: [T.drone, { id: T.fireAlarm, die: 1 }] });
    const r = run(s, ...pass, perk('adrenalineSurge'), endPlays);
    expect(types(r.events)).toContain('pressureSkipped');
    expect(r.state.exposure).toBe(0);
    expect(r.state.slots[1]?.die).toBe(1);
    expect(r.state.turn).toBe(2);
  });

  it('Improvised Weapon: tuck as the preferred suit with double Power', () => {
    const s = mk({ hand: [C.signal, C.muscle], perks: ['improvisedWeapon'], slots: [T.gate] });
    const iw = legalActions(s).filter((a) => a.type === 'play' && a.mode === 'improvisedWeapon');
    expect(iw.length).toBe(2); // any card, any face-up Threat
    const r = run(s, play(C.signal, 'improvisedWeapon', { slot: 0 }));
    const tk = ofType(r.events, 'tucked')[0];
    expect(tk).toMatchObject({ suit: 'Force', power: 4, wild: true });
    expect(r.state.perks.used).toEqual(['improvisedWeapon']);
    expect(legalActions(r.state).some((a) => a.type === 'play' && a.mode === 'improvisedWeapon')).toBe(false);
  });

  it('Hardened Resolve: asks; yes stops 1 below the redline', () => {
    const s = mk({ ...dummies, exposure: 4, perks: ['hardenedResolve'], slots: [T.drone] });
    const r = run(s, ...pass, endPlays).state;
    expect(r.pending).toMatchObject({ kind: 'confirmHardenedResolve', amount: 2, exposure: 4, redline: 6 });
    const yes = run(r, decide(true)).state;
    expect(yes.exposure).toBe(5);
    expect(yes.phase).toBe('play');
    expect(yes.perks.used).toEqual(['hardenedResolve']);
    const no = run(r, decide(false)).state;
    expect(no.result?.reason).toBe('coverBlown');
  });

  it('Kinetic Momentum: after a clear with Force cards and excess Power, carry it to another Threat', () => {
    const s = mk({
      hand: [C.oldReflexes],
      perks: ['kineticMomentum'],
      slots: [T.orderly, { id: T.records, tucked: [C.decryptKey, C.drill] }],
      threatDeck: [T.nurse],
    });
    const r = run(s, tuck(C.oldReflexes, 0)).state; // 5 vs 3: excess 2
    expect(r.pending).toEqual({ kind: 'kineticTarget', excess: 2, options: [1] });
    const r2 = run(r, decide(1));
    expect(ofType(r2.events, 'cleared').map((e) => e.threatId)).toEqual([T.records]); // 6 + 2 = 8 ≥ 6
    expect(r2.state.slots[0]?.threatId).toBe(T.nurse);
    const keep = run(r, decide(null)).state;
    expect(keep.perks.used).toEqual([]);
    expect(keep.slots[0]?.threatId).toBe(T.nurse);
  });
});
