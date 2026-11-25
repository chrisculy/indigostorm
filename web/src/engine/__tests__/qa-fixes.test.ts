// @vitest-environment node
// Regression tests for the QA fix pass.
import { describe, expect, it } from 'vitest';
import {
  apply,
  createEpisode,
  describeAction,
  evaluateObjective,
  legalActions,
  nextInt,
  perkActions,
  previewAction,
  prototypeSetup,
  seedRng,
  shuffle,
  suggestAction,
} from '../index.ts';
import type { Action, GameState } from '../types.ts';
import { ability, C, mk, ofType, perk, play, run, T, tuck } from './helpers.ts';

/** Same player information: swap face-down identities and shuffle the hidden piles. */
function scramble(s: GameState, seed: number): GameState {
  const t = structuredClone(s);
  const rng = seedRng(seed);
  const fd = t.slots.flatMap((x, i) => (x?.faceDown ? [i] : []));
  const ids = shuffle(
    rng,
    fd.map((i) => t.slots[i]?.threatId as string),
  ).items;
  fd.forEach((i, k) => {
    const sl = t.slots[i];
    if (sl) sl.threatId = ids[k] as string;
  });
  t.drawPile = shuffle(rng, t.drawPile).items;
  const known = t.knownTop.length;
  const head = t.threatDeck.slice(0, Math.max(1, known)); // the top card's back is visible
  t.threatDeck = [...head, ...shuffle(rng, t.threatDeck.slice(head.length)).items];
  return t;
}

describe('hints never depend on hidden information', () => {
  it('QA repro: Day 11 seed 2 hint is the same when the face-down cards are swapped', () => {
    let s = createEpisode(prototypeSetup(11, 2));
    const steps: Action[] = [
      play('CORE-12', 'tuck', { slot: 2 }),
      play('PROTO-04', 'tuck', { slot: 2 }),
      { type: 'endPlays' },
      play('CORE-04', 'ability', { slot: 2 }),
    ];
    for (const a of steps) s = apply(s, a).state;
    const fd = s.slots.flatMap((x, i) => (x?.faceDown ? [i] : []));
    expect(fd.length).toBeGreaterThanOrEqual(2);
    const t = structuredClone(s);
    const [i, j] = fd as [number, number];
    const a = t.slots[i]?.threatId as string;
    (t.slots[i] as { threatId: string }).threatId = t.slots[j]?.threatId as string;
    (t.slots[j] as { threatId: string }).threatId = a;
    expect(suggestAction(t)).toEqual(suggestAction(s));
  });

  it('hints are identical for information-equivalent states (Day 11, many positions)', () => {
    let checked = 0;
    for (let seed = 1; seed <= 25; seed++) {
      let s = createEpisode(prototypeSetup(11, seed));
      const rng = seedRng(seed);
      for (let n = 0; n < 60 && s.phase !== 'over'; n++) {
        if (s.phase === 'play' && !s.pending && s.slots.some((x) => x?.faceDown)) {
          expect(suggestAction(scramble(s, seed * 31 + n))).toEqual(suggestAction(s));
          checked++;
        }
        const acts = legalActions(s);
        // Mostly bot moves, sometimes random, to reach varied positions.
        const a = nextInt(rng, 3) === 0 ? (acts[nextInt(rng, acts.length)] as Action) : (suggestAction(s) as Action);
        s = apply(s, a).state;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('Two-Phase Countermeasure never appears after its Threat leaves uncleared', () => {
  it('swapped away, re-entered and cleared: no Countermeasure', () => {
    const s = mk({
      day: 26,
      hand: [C.coldRead, C.blueprint],
      drawPile: [C.signalGhost],
      slots: [{ id: T.serverCore, tucked: [{ uid: C.drill, power: 5 }] }],
      setAsideThreats: [T.coreLockdown],
      threatDeck: [T.perimeter],
      leadTarget: 8,
    });
    const r = run(s, ability(C.coldRead, 0)).state;
    expect(r.setAsideThreats).toEqual([]);
    expect(r.voidThreats).toEqual([T.coreLockdown]);
    // Bring Server Core back (Vanish-free: hand-place it) and clear it.
    const back = structuredClone(r);
    back.slots[1] = {
      threatId: T.serverCore,
      faceDown: false,
      tucked: [{ uid: C.drill, suit: 'Recon', power: 5, gearBonus: 0, wild: false }],
      bonusPower: 0,
      die: null,
      cancelPressure: false,
      startedTurn: 1,
    };
    back.threatDeck = [];
    back.discard = back.discard.filter((x) => x !== C.drill);
    const r2 = run(back, tuck(C.blueprint, 1));
    expect(ofType(r2.events, 'cleared')[0]?.threatId).toBe(T.serverCore);
    expect(ofType(r2.events, 'threatEntered')).toEqual([]);
  });

  it('escaped or Vanished: Countermeasure is void', () => {
    const s = mk({
      day: 26,
      hand: [C.signal],
      perks: ['vanish'],
      slots: [T.serverCore],
      setAsideThreats: [T.coreLockdown],
      threatDeck: [T.perimeter],
    });
    const r = run(s, perk('vanish', 0)).state;
    expect(r.voidThreats).toEqual([T.coreLockdown]);
    expect(r.setAsideThreats).toEqual([]);
  });
});

describe('previews', () => {
  it('show Scene Cleared (+1 Lead and the end) for the last clear', () => {
    const s = mk({ hand: [C.uniform], slots: [T.lockedDoor], threatDeck: [], lead: 3 });
    const p = previewAction(s, tuck(C.uniform, 0));
    expect(p.lead).toBe(2);
    expect(p.ends).toBe('sceneCleared');
    const s2 = mk({ hand: [C.uniform], slots: [T.lockedDoor], threatDeck: [], lead: 5, leadTarget: 7 });
    expect(previewAction(s2, tuck(C.uniform, 0)).ends).toBe('objective');
  });

  it('no Scene Cleared while a Countermeasure is about to enter', () => {
    const s = mk({
      day: 26,
      hand: [C.blueprint],
      gear: [C.spoofer],
      slots: [{ id: T.serverCore, tucked: [C.signalGhost] }],
      setAsideThreats: [T.coreLockdown],
    });
    const p = previewAction(s, tuck(C.blueprint, 0));
    expect(p.clears).toHaveLength(1);
    expect(p.ends).toBeNull();
  });
});

describe('Day 11 decryptAll', () => {
  it('is met when no Encrypted Threat entered', () => {
    const s = { ...mk(), phase: 'over' as const };
    expect(evaluateObjective({ code: 'decryptAll' }, s)).toEqual({
      status: 'met',
      progress: 'No Encrypted Threats entered',
    });
  });
});

describe('Pursuer suit penalty uses the printed suit', () => {
  it('a Stealth card tucked with Improvised Weapon still gets −1 Power; a Force card tucked as Stealth does not', () => {
    const s = mk({
      day: 21,
      hand: [C.uniform, C.muscle],
      perks: ['improvisedWeapon', 'masterDecryptor'],
      slots: [T.gate, T.nurse],
      pursuer: T.hunter,
    });
    const r = run(s, play(C.uniform, 'improvisedWeapon', { slot: 0 })).state; // Force, 8 - 1 = 7 Power
    expect(r.slots[0]?.tucked[0]).toMatchObject({ suit: 'Force', power: 8 });
    expect(r.slots[0]?.threatId).toBe(T.gate); // 1 symbol < 2
    const md = run(
      mk({
        day: 21,
        hand: [C.muscle, C.signal],
        perks: ['masterDecryptor'],
        slots: [T.nurse],
        pursuer: T.hunter,
        threatDeck: [T.gate],
      }),
      perk('masterDecryptor'),
      tuck(C.muscle, 0),
    );
    // Muscle Memory (printed Force 4) counts as Stealth under Night Nurse and is not penalized: clears 4/4.
    expect(ofType(md.events, 'cleared')[0]?.threatId).toBe(T.nurse);
  });
});

describe('Contingency Plan', () => {
  it('is not offered with an empty draw pile', () => {
    expect(perkActions(mk({ hand: [C.signal], perks: ['contingencyPlan'], slots: [T.records] }))).toEqual([]);
  });
});

describe('Awakened Cards stay secret until played', () => {
  const s = mk({
    day: 16,
    hand: [C.dream],
    allies: [C.fixer],
    setAsideCards: [C.remembered],
    slots: [T.nurse, T.records],
    threatDeck: [T.gate],
  });

  it('labels and previews do not reveal the Awakened Card', () => {
    const acts = legalActions(s).filter((a) => a.type === 'play');
    for (const a of acts) {
      const label = describeAction(s, a);
      expect(label).toContain('it will awaken');
      expect(label).not.toContain('Remembered');
      const p = previewAction(s, a);
      expect(p).toMatchObject({ hidden: true, awakens: true, lead: 0, exposure: 0, clears: [] });
    }
    expect(describeAction(s, tuck(C.dream, 0))).toBe('Tuck Recurring Dream under Night Nurse — it will awaken');
  });

  it('legal plays come from the Conditioned Card itself', () => {
    expect(
      legalActions(s)
        .filter((a) => a.type === 'play')
        .map((a) => (a as { mode: string }).mode),
    ).toEqual(['tuck', 'ability']);
  });

  it('after the play the awakened event reveals it', () => {
    const r = run(s, ability(C.dream));
    expect(ofType(r.events, 'awakened')[0]?.awakened).toBe(C.remembered);
  });
});
