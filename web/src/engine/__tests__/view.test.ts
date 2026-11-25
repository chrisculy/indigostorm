// @vitest-environment node
// PlayerView hides what the player may not see; previews and labels never leak it.
import { describe, expect, it } from 'vitest';
import {
  createEpisode,
  describeAction,
  describeEvent,
  IllegalActionError,
  legalActions,
  previewAction,
  prototypeSetup,
  view,
} from '../index.ts';
import { ability, C, mk, perk, play, run, T, tuck } from './helpers.ts';

describe('view', () => {
  it('hides draw-pile order, Threat Deck order and face-down identities', () => {
    const s = createEpisode(prototypeSetup(11, 8));
    const v = view(s);
    const text = JSON.stringify(v);
    for (const id of s.drawPile) expect(text).not.toContain(id);
    for (const id of s.threatDeck) expect(text).not.toContain(id);
    for (const sl of s.slots) if (sl?.faceDown) expect(text).not.toContain(sl.threatId);
    expect(v.drawPileCount).toBe(s.drawPile.length);
    expect(v.threatDeckCount).toBe(s.threatDeck.length);
  });

  it('shows the Threat Deck top the player has seen and whether the top card is Encrypted', () => {
    const s = mk({ day: 11, hand: [C.overwatch], slots: [T.records], threatDeck: [T.encServer, T.gate, T.nurse] });
    expect(view(s).threatDeckTopEncrypted).toBe(true);
    const r = run(s, ability(C.overwatch)).state;
    expect(view(r).pending).toEqual({ kind: 'reorderTop', cards: [T.encServer, T.gate], card: C.overwatch });
    const r2 = run(r, { type: 'decide', choice: [T.gate, T.encServer] }).state;
    expect(view(r2).threatDeckKnownTop).toEqual([T.gate, T.encServer]);
  });

  it('counts symbols and Power for the meters', () => {
    const s = mk({ hand: [C.muscle], allies: [C.fixer], slots: [{ id: T.patrol, tucked: [C.secondWind] }] });
    expect(view(s).slots[0]).toMatchObject({
      state: 'faceUp',
      symbols: 2,
      symbolsNeeded: 2,
      power: 3,
      powerNeeded: 5,
      cleanIfCleared: true,
    });
  });

  it('describes every event without throwing', () => {
    const s = createEpisode(prototypeSetup(26, 4));
    for (const e of s.log) expect(describeEvent(e)).toBeTruthy();
  });
});

describe('describeAction', () => {
  it('labels plays, perks and decisions', () => {
    const s = mk({ hand: [C.muscle, C.signal], perks: ['vanish'], slots: [T.orderly, { id: T.fireAlarm, die: 2 }] });
    const labels = legalActions(s).map((a) => describeAction(s, a));
    expect(labels).toContain('Tuck Muscle Memory under Orderly');
    expect(labels).toContain('Signal Intercept: stall Fire Alarm +1');
    expect(labels).toContain('Signal Intercept: stall (no target)');
    expect(labels).toContain('Vanish Orderly');
  });
});

describe('previewAction', () => {
  it('summarizes a clear without simulating the refill', () => {
    const s = mk({ hand: [C.uniform], exposure: 2, slots: [T.lockedDoor], threatDeck: [T.gate] });
    const p = previewAction(s, tuck(C.uniform, 0));
    expect(p).toMatchObject({
      lead: 1,
      exposure: -1,
      clears: [{ slot: 0, threatId: T.lockedDoor, clean: true }],
      ends: null,
    });
    expect(JSON.stringify(p)).not.toContain(T.gate);
  });

  it('counts draws without revealing them', () => {
    const s = mk({ hand: [C.patternRead], drawPile: [C.muscle], slots: [T.records] });
    const p = previewAction(s, ability(C.patternRead));
    expect(p.cardsDrawn).toBe(1);
    expect(JSON.stringify(p)).not.toContain(C.muscle);
  });

  it('does not preview decrypts', () => {
    const s = mk({ day: 11, hand: [C.signal], slots: [{ id: T.encServer, faceDown: true }] });
    const p = previewAction(s, play(C.signal, 'decrypt', { slot: 0 }));
    expect(p.hidden).toBe(true);
    expect(JSON.stringify(p)).not.toContain(T.encServer);
  });

  it('reports decisions and episode ends, and rejects illegal actions', () => {
    const s = mk({
      hand: [C.overwatch, C.takedown],
      lead: 6,
      leadTarget: 7,
      slots: [T.records],
      threatDeck: [T.gate, T.nurse],
    });
    expect(previewAction(s, ability(C.overwatch)).decision).toBe('reorderTop');
    expect(previewAction(s, ability(C.takedown)).ends).toBe('objective');
    expect(() => previewAction(s, tuck(C.muscle, 0))).toThrow(IllegalActionError);
    const sat = mk({ hand: [C.signal], perks: ['satelliteOverwrite'], slots: [T.records], threatDeck: [T.gate] });
    expect(previewAction(sat, perk('satelliteOverwrite')).decision).toBe('satellite');
  });

  it('does not change the state', () => {
    const s = mk({ hand: [C.uniform], exposure: 2, slots: [T.lockedDoor], threatDeck: [T.gate] });
    const before = JSON.stringify(s);
    previewAction(s, tuck(C.uniform, 0));
    expect(JSON.stringify(s)).toBe(before);
  });
});
