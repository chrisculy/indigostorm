// @vitest-environment node
// Bonus Objective evaluators.
import { describe, expect, it } from 'vitest';
import { dayObjectives } from '../../data/objectives.ts';
import { evaluateObjective, objectiveProgress } from '../index.ts';
import type { BonusObjective, GameEvent, GameState } from '../types.ts';
import { C, mk, run, T, tuck } from './helpers.ts';

type Cleared = Extract<GameEvent, { type: 'cleared' }>;
const cleared = (o: Partial<Cleared> = {}): Cleared => ({
  type: 'cleared',
  slot: 0,
  threatId: T.records,
  threatType: 'Threat',
  pref: 'Recon',
  clean: false,
  breach: false,
  excess: 0,
  turn: 1,
  symbolsRequired: 1,
  powerRequired: 4,
  die: null,
  timed: false,
  startedTurn: 1,
  tuckedCount: 2,
  bonusPower: 0,
  ...o,
});

function st(log: GameEvent[], o: Partial<GameState> = {}): GameState {
  return { ...mk(), ...o, log };
}
const over = { phase: 'over' as const };
const ev = (obj: BonusObjective, s: GameState) => evaluateObjective(obj, s).status;

describe('Bonus Objective evaluators', () => {
  it('cleanClears', () => {
    const o: BonusObjective = { code: 'cleanClears', n: 3 };
    expect(ev(o, st([cleared({ clean: true }), cleared({ clean: true })]))).toBe('pending');
    expect(ev(o, st([cleared({ clean: true }), cleared({ clean: true })], over))).toBe('failed');
    expect(ev(o, st([cleared({ clean: true }), cleared({ clean: true }), cleared({ clean: true })]))).toBe('met');
    expect(evaluateObjective(o, st([cleared({ clean: true })])).progress).toBe('Clean Clears: 1/3');
  });

  it('clearTimedWithDie', () => {
    const o: BonusObjective = { code: 'clearTimedWithDie', minDie: 2 };
    expect(ev(o, st([cleared({ timed: true, die: 1 })], over))).toBe('failed');
    expect(ev(o, st([cleared({ timed: true, die: 2 })]))).toBe('met');
    expect(ev(o, st([cleared({ timed: false, die: 3 })], over))).toBe('failed');
  });

  it('clearMultiSymbolInOneTurn', () => {
    const o: BonusObjective = { code: 'clearMultiSymbolInOneTurn', minSymbols: 2 };
    expect(ev(o, st([cleared({ symbolsRequired: 2, startedTurn: 1, turn: 2 })], over))).toBe('failed');
    expect(ev(o, st([cleared({ symbolsRequired: 2, startedTurn: 2, turn: 2 })]))).toBe('met');
    expect(ev(o, st([cleared({ symbolsRequired: 1, startedTurn: 2, turn: 2 })], over))).toBe('failed');
  });

  it('maxExposure fails as soon as Exposure goes above the limit', () => {
    const o: BonusObjective = { code: 'maxExposure', max: 2 };
    expect(ev(o, st([], { peakExposure: 2 }))).toBe('pending');
    expect(ev(o, st([], { peakExposure: 2, phase: 'over' }))).toBe('met');
    expect(ev(o, st([], { peakExposure: 3 }))).toBe('failed');
  });

  it('useAbilities counts abilities used (not blocked ones)', () => {
    const o: BonusObjective = { code: 'useAbilities', n: 3 };
    const used: GameEvent = { type: 'abilityUsed', card: C.signal };
    const blocked: GameEvent = { type: 'abilityBlocked', card: C.signal };
    expect(ev(o, st([used, used, blocked], over))).toBe('failed');
    expect(ev(o, st([used, used, used]))).toBe('met');
  });

  it('gearAndAlly', () => {
    const o: BonusObjective = { code: 'gearAndAlly' };
    const d = (g: number, a: number): GameEvent => ({
      type: 'deployed',
      card: C.fixer,
      cls: 'Ally',
      gearCount: g,
      allyCount: a,
    });
    expect(ev(o, st([d(0, 1), d(0, 2)], over))).toBe('failed');
    expect(ev(o, st([d(0, 1), d(1, 1)]))).toBe('met');
  });

  it('allyCoverExpiry and allyCovers', () => {
    const cov = (effect: 'pressure' | 'expiry' | 'strike'): GameEvent => ({
      type: 'allyCover',
      ally: C.fixer,
      effect,
      slot: 0,
      threatId: T.camera,
    });
    expect(ev({ code: 'allyCoverExpiry', n: 1 }, st([cov('pressure')], over))).toBe('failed');
    expect(ev({ code: 'allyCoverExpiry', n: 1 }, st([cov('expiry')]))).toBe('met');
    expect(ev({ code: 'allyCovers', n: 2 }, st([cov('pressure')]))).toBe('pending');
    expect(ev({ code: 'allyCovers', n: 2 }, st([cov('pressure'), cov('strike')]))).toBe('met');
  });

  it('clearOpeningRow', () => {
    const o: BonusObjective = { code: 'clearOpeningRow' };
    const base = { openingRow: [T.records, T.nurse] };
    expect(ev(o, st([cleared({ threatId: T.records })], { ...base, phase: 'over' }))).toBe('failed');
    expect(ev(o, st([cleared({ threatId: T.records }), cleared({ threatId: T.nurse })], base))).toBe('met');
  });

  it('objectiveTurnsToSpare', () => {
    const o: BonusObjective = { code: 'objectiveTurnsToSpare', turns: 2 };
    expect(ev(o, st([], { lead: 8, leadTarget: 8, turn: 6 }))).toBe('met');
    expect(ev(o, st([], { lead: 8, leadTarget: 8, turn: 7, phase: 'over' }))).toBe('failed');
    expect(ev(o, st([], { lead: 3, turn: 7 }))).toBe('failed');
    expect(ev(o, st([], { lead: 3, turn: 4 }))).toBe('pending');
  });

  it('decryptAll: every Encrypted Threat that entered was decrypted (met when none entered)', () => {
    const o: BonusObjective = { code: 'decryptAll' };
    const enter: GameEvent = {
      type: 'threatEntered',
      slot: 0,
      threatId: null,
      faceDown: true,
      die: null,
      countermeasure: false,
    };
    const dec: GameEvent = { type: 'decrypted', card: C.signal, slot: 0, threatId: T.encServer, tucked: true };
    expect(ev(o, st([], over))).toBe('met');
    expect(ev(o, st([enter, enter, dec], over))).toBe('failed');
    expect(ev(o, st([enter, dec], over))).toBe('met');
    expect(ev(o, st([enter, dec]))).toBe('pending');
  });

  it('clearsInOneTurn and cleanClearsInOneTurn', () => {
    expect(ev({ code: 'clearsInOneTurn', n: 2 }, st([cleared({ turn: 1 }), cleared({ turn: 2 })], over))).toBe(
      'failed',
    );
    expect(ev({ code: 'clearsInOneTurn', n: 2 }, st([cleared({ turn: 2 }), cleared({ turn: 2 })]))).toBe('met');
    expect(
      ev({ code: 'cleanClearsInOneTurn', n: 2 }, st([cleared({ turn: 2, clean: true }), cleared({ turn: 2 })], over)),
    ).toBe('failed');
    expect(
      ev(
        { code: 'cleanClearsInOneTurn', n: 2 },
        st([cleared({ turn: 2, clean: true }), cleared({ turn: 2, clean: true })]),
      ),
    ).toBe('met');
  });

  it('noEscapes', () => {
    const o: BonusObjective = { code: 'noEscapes' };
    expect(ev(o, st([]))).toBe('pending');
    expect(ev(o, st([], over))).toBe('met');
    expect(ev(o, st([{ type: 'escaped', slot: 0, threatId: T.fireAlarm }]))).toBe('failed');
  });

  it('clearWithSingleCard (one tucked card, or a Breach)', () => {
    const o: BonusObjective = { code: 'clearWithSingleCard' };
    expect(ev(o, st([cleared({ tuckedCount: 2 })], over))).toBe('failed');
    expect(ev(o, st([cleared({ tuckedCount: 1, bonusPower: 2 })], over))).toBe('failed');
    expect(ev(o, st([cleared({ tuckedCount: 1 })]))).toBe('met');
    expect(ev(o, st([cleared({ breach: true, tuckedCount: 0 })]))).toBe('met');
  });

  it('alliesAtEnd', () => {
    const o: BonusObjective = { code: 'alliesAtEnd', n: 2 };
    expect(ev(o, st([], { allies: [C.fixer, C.codebreaker] }))).toBe('pending');
    expect(ev(o, st([], { allies: [C.fixer, C.codebreaker], phase: 'over' }))).toBe('met');
    expect(ev(o, st([], { allies: [C.fixer], phase: 'over' }))).toBe('failed');
  });

  it('awakenDuringPlay', () => {
    const o: BonusObjective = { code: 'awakenDuringPlay' };
    const aw: GameEvent = {
      type: 'awakened',
      conditioned: C.dream,
      awakened: C.remembered,
      duringPlay: true,
      flashback: '',
    };
    expect(ev(o, st([], over))).toBe('failed');
    expect(ev(o, st([aw]))).toBe('met');
  });

  it('cleanClearEachSuit', () => {
    const o: BonusObjective = { code: 'cleanClearEachSuit' };
    const two = [cleared({ clean: true, pref: 'Recon' }), cleared({ clean: true, pref: 'Force' })];
    expect(ev(o, st(two, over))).toBe('failed');
    expect(ev(o, st([...two, cleared({ clean: true, pref: 'Stealth' })]))).toBe('met');
  });

  it('clearPowerAtLeast', () => {
    expect(ev({ code: 'clearPowerAtLeast', n: 7 }, st([cleared({ powerRequired: 6 })], over))).toBe('failed');
    expect(ev({ code: 'clearPowerAtLeast', n: 7 }, st([cleared({ powerRequired: 7 })]))).toBe('met');
  });

  it('objectiveWithoutPerks (automatic Pattern Recognition does not count)', () => {
    const o: BonusObjective = { code: 'objectiveWithoutPerks' };
    const win = { lead: 8, leadTarget: 8 };
    expect(ev(o, st([{ type: 'perkUsed', perk: 'patternRecognition' }], win))).toBe('met');
    expect(ev(o, st([{ type: 'perkUsed', perk: 'vanish' }], win))).toBe('failed');
    expect(ev(o, st([], { lead: 3, phase: 'over' }))).toBe('failed');
  });

  it('neutralizePursuer (optionally before a turn)', () => {
    const hit = (turn: number) => cleared({ threatType: 'Pursuer', turn });
    expect(ev({ code: 'neutralizePursuer', beforeTurn: null }, st([hit(7)]))).toBe('met');
    expect(ev({ code: 'neutralizePursuer', beforeTurn: 5 }, st([hit(4)]))).toBe('met');
    expect(ev({ code: 'neutralizePursuer', beforeTurn: 5 }, st([hit(5)], { turn: 5 }))).toBe('failed');
    expect(ev({ code: 'neutralizePursuer', beforeTurn: 5 }, st([], { turn: 5 }))).toBe('failed');
    expect(ev({ code: 'neutralizePursuer', beforeTurn: 5 }, st([], { turn: 4 }))).toBe('pending');
  });

  it('exposureBelowStart', () => {
    const o: BonusObjective = { code: 'exposureBelowStart' };
    expect(ev(o, st([], { startExposure: 1, exposure: 0, phase: 'over' }))).toBe('met');
    expect(ev(o, st([], { startExposure: 1, exposure: 1, phase: 'over' }))).toBe('failed');
  });

  it('clearCountermeasures', () => {
    const o: BonusObjective = { code: 'clearCountermeasures', n: 2 };
    const cm = cleared({ threatType: 'Countermeasure' });
    expect(ev(o, st([cm], over))).toBe('failed');
    expect(ev(o, st([cm, cm]))).toBe('met');
  });

  it('sceneCleared', () => {
    expect(ev({ code: 'sceneCleared' }, st([], { sceneCleared: true }))).toBe('met');
    expect(ev({ code: 'sceneCleared' }, st([], over))).toBe('failed');
  });

  it('every mapped objective evaluates without throwing', () => {
    for (const { objective } of Object.values(dayObjectives)) {
      expect(['pending', 'met', 'failed']).toContain(ev(objective, st([])));
    }
  });

  it('end to end: Day 1 Bonus Star for a Clean Clear', () => {
    const s = mk({ hand: [C.uniform], slots: [T.lockedDoor], threatDeck: [T.gate] });
    expect(objectiveProgress(s)).toMatchObject({ code: 'cleanClears', status: 'pending', text: 'Make a Clean Clear.' });
    const r = run(s, tuck(C.uniform, 0)).state;
    expect(objectiveProgress(r).status).toBe('met');
  });
});
