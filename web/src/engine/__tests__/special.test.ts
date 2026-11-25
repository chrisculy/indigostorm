// @vitest-environment node
// Setup, Encrypted Threats, Two-Phase Threats, Conditioned Cards (PLAN 5.4 #4, #6, #14).
import { describe, expect, it } from 'vitest';
import { contentDays, threat } from '../../data/index.ts';
import { createEpisode, legalActions, prototypeSetup, view } from '../index.ts';
import { ability, C, mk, ofType, play, run, T, tuck, types } from './helpers.ts';

describe('setup', () => {
  it('prototype setups: Jump-In deck + the day’s 3 cards; Day 1 = Core + Day 1', () => {
    for (const day of contentDays) {
      const s = prototypeSetup(day, 1);
      expect(s.deck).toHaveLength(15);
      expect(new Set(s.deck).size).toBe(15);
    }
    expect(prototypeSetup(1, 1).perks).toEqual([]);
    expect(prototypeSetup(26, 1).perks).toHaveLength(7);
  });

  it('deals 3 Threats, draws 4, sets the tracks', () => {
    const s = createEpisode(prototypeSetup(1, 3));
    expect(s.phase).toBe('play');
    expect(s.turn).toBe(1);
    expect(s.hand).toHaveLength(4);
    expect(s.drawPile).toHaveLength(11);
    expect(s.slots.filter(Boolean)).toHaveLength(3);
    expect(s.threatDeck).toHaveLength(6);
    expect(s.openingRow).toHaveLength(3);
    expect([s.lead, s.exposure, s.leadTarget, s.redline, s.coverThreshold]).toEqual([0, 0, 7, 6, 3]);
  });

  it('Day 21: the Pursuer takes a 4th slot with its Hunt die and is not in the Threat Deck', () => {
    const s = createEpisode(prototypeSetup(21, 3));
    expect(s.slots).toHaveLength(4);
    expect(s.pursuerSlot).toBe(3);
    expect(s.slots[3]).toMatchObject({ threatId: T.hunter, die: 3 });
    expect(s.threatDeck).not.toContain(T.hunter);
    expect(s.exposure).toBe(1);
  });

  it('Day 26: Countermeasures are set aside', () => {
    const s = createEpisode(prototypeSetup(26, 3));
    expect(s.setAsideThreats.sort()).toEqual([T.coreLockdown, T.bulkhead]);
    expect(s.threatDeck).not.toContain(T.coreLockdown);
  });

  it('Day 16: the Awakened card is set aside', () => {
    const s = createEpisode(prototypeSetup(16, 3));
    expect(s.setAsideCards).toEqual([C.remembered]);
    expect([...s.hand, ...s.drawPile]).toContain(C.dream);
  });

  it('is deterministic per seed and varies across seeds', () => {
    const a = createEpisode(prototypeSetup(6, 99));
    const b = createEpisode(prototypeSetup(6, 99));
    const c = createEpisode(prototypeSetup(6, 100));
    expect(a).toEqual(b);
    expect([a.drawPile, a.threatDeck]).not.toEqual([c.drawPile, c.threatDeck]);
  });

  it('rejects duplicate cards', () => {
    expect(() => createEpisode({ day: 1, deck: [C.muscle, C.muscle], perks: [], seed: 1 })).toThrow();
  });
});

describe('Encrypted Threats', () => {
  it('enter face-down: no identity in the view or the event', () => {
    const s = mk({ day: 11, hand: [C.uniform], slots: [T.records], threatDeck: [T.encServer] });
    const r = run(s, ability(C.uniform));
    expect(r.state.slots[0]?.threatId).toBe(T.records);
    const s2 = mk({ day: 11, hand: [C.breach], slots: [T.orderly], threatDeck: [T.encServer] });
    const r2 = run(s2, ability(C.breach, 0));
    const entered = ofType(r2.events, 'threatEntered')[0];
    expect(entered).toMatchObject({ faceDown: true, threatId: null, die: null });
    expect(view(r2.state).slots[0]).toMatchObject({ state: 'faceDown', threatId: null });
  });

  it('cannot be tucked under or targeted while face-down', () => {
    const s = mk({ day: 11, hand: [C.uniform, C.signal], slots: [{ id: T.encRelay, faceDown: true }] });
    const acts = legalActions(s);
    expect(acts.some((a) => a.type === 'play' && a.mode === 'tuck')).toBe(false);
    expect(acts.filter((a) => a.type === 'play' && a.mode === 'decrypt')).toEqual([
      play(C.signal, 'decrypt', { slot: 0 }),
    ]);
  });

  it('decrypt with Recon: flips, places its die, and the card stays if Recon is its suit', () => {
    const s = mk({ day: 11, hand: [C.signal], slots: [{ id: T.encServer, faceDown: true }] });
    const r = run(s, play(C.signal, 'decrypt', { slot: 0 }));
    expect(r.state.slots[0]?.faceDown).toBe(false);
    expect(r.state.slots[0]?.tucked.map((x) => x.uid)).toEqual([C.signal]);
    expect(ofType(r.events, 'decrypted')[0]?.tucked).toBe(true);
  });

  it('decrypt discards the Recon card when Recon is not its suit', () => {
    const relay = threat(T.encRelay);
    const was = relay.alt;
    relay.alt = 'Force';
    try {
      const s = mk({ day: 11, hand: [C.signal], slots: [{ id: T.encRelay, faceDown: true }] });
      const r = run(s, play(C.signal, 'decrypt', { slot: 0 }));
      expect(r.state.slots[0]?.tucked).toEqual([]);
      expect(r.state.discard).toEqual([C.signal]);
    } finally {
      relay.alt = was;
    }
  });
});

describe('Two-Phase Threats', () => {
  it('clearing one claims its Reward, then its Countermeasure takes the slot', () => {
    const s = mk({
      day: 26,
      hand: [C.blueprint],
      slots: [{ id: T.serverCore, tucked: [C.signalGhost] }],
      setAsideThreats: [T.coreLockdown, T.bulkhead],
      threatDeck: [T.gate],
    });
    const r = run(s, tuck(C.blueprint, 0)); // 2 symbols, 8 Power < 9
    expect(r.state.slots[0]?.threatId).toBe(T.serverCore);
    const s2 = { ...s, gear: [C.spoofer] };
    const r2 = run(s2, tuck(C.blueprint, 0)); // 4 + 1 + 4 = 9
    expect(r2.state.lead).toBe(2);
    expect(r2.state.slots[0]?.threatId).toBe(T.coreLockdown);
    expect(ofType(r2.events, 'threatEntered')[0]?.countermeasure).toBe(true);
    expect(r2.state.setAsideThreats).toEqual([T.bulkhead]);
    expect(r2.state.threatDeck).toEqual([T.gate]);
  });

  it('a swapped-away Two-Phase Threat voids its Countermeasure (it never appears)', () => {
    const s = mk({
      day: 26,
      hand: [C.coldRead],
      slots: [T.serverCore],
      setAsideThreats: [T.coreLockdown],
      threatDeck: [T.gate],
    });
    const r = run(s, ability(C.coldRead, 0));
    expect(r.state.slots[0]?.threatId).toBe(T.gate);
    expect(r.state.setAsideThreats).toEqual([]);
    expect(r.state.voidThreats).toEqual([T.coreLockdown]);
  });
});

describe('Conditioned Cards', () => {
  it('awaken when played with the trigger met: Awakened card is played instead, bonus applies', () => {
    const s = mk({
      day: 16,
      hand: [C.dream],
      allies: [C.fixer],
      exposure: 3,
      setAsideCards: [C.remembered],
      slots: [T.records],
    });
    const r = run(s, ability(C.dream));
    const aw = ofType(r.events, 'awakened')[0];
    expect(aw).toMatchObject({ conditioned: C.dream, awakened: C.remembered, duringPlay: true });
    expect(aw?.flashback).toBeTruthy();
    expect(r.state.lead).toBe(1); // Awakening bonus
    expect(r.state.exposure).toBe(1); // Remembered Training: -2 Exposure
    expect(r.state.dormant).toEqual([C.dream]);
    expect(r.state.discard).toEqual([C.remembered]);
    expect(r.state.setAsideCards).toEqual([]);
  });

  it('awakens in any mode (tuck uses the Awakened card’s Power)', () => {
    const s = mk({
      day: 16,
      hand: [C.dream],
      allies: [C.fixer],
      setAsideCards: [C.remembered],
      slots: [T.nurse],
      threatDeck: [T.gate],
    });
    const r = run(s, tuck(C.dream, 0)); // Remembered Training: Stealth 4 clears Night Nurse
    expect(ofType(r.events, 'cleared')[0]?.threatId).toBe(T.nurse);
    expect(r.state.lead).toBe(2);
  });

  it('stays dormant when the trigger is not met', () => {
    const s = mk({ day: 16, hand: [C.dream], exposure: 2, setAsideCards: [C.remembered], slots: [T.records] });
    const r = run(s, ability(C.dream));
    expect(types(r.events)).not.toContain('awakened');
    expect(r.state.exposure).toBe(1);
    expect(r.state.discard).toEqual([C.dream]);
  });
});
