// Bonus Objective evaluators. Each objective is judged from the event log plus a few state
// fields, so the same function gives the live progress line during play and the final verdict
// once the episode is over.

import { dayObjectives } from '../data/objectives.ts';
import type { Suit } from '../data/types.ts';
import type { BonusObjective, GameEvent, GameState, ObjectiveProgress, ObjectiveStatus } from './types.ts';

/** Nominal episode length: 15 cards, 2 plays a turn. Used by "turns to spare". */
export const NOMINAL_TURNS = 8;

type Cleared = Extract<GameEvent, { type: 'cleared' }>;

function ofType<T extends GameEvent['type']>(log: readonly GameEvent[], type: T): Extract<GameEvent, { type: T }>[] {
  return log.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

function perTurnMax(events: readonly Cleared[]): number {
  const by = new Map<number, number>();
  let best = 0;
  for (const e of events) {
    const n = (by.get(e.turn) ?? 0) + 1;
    by.set(e.turn, n);
    best = Math.max(best, n);
  }
  return best;
}

export interface ObjectiveEvaluation {
  status: ObjectiveStatus;
  progress: string;
}

/** Evaluate a Bonus Objective against a state (live during play, final once `phase === 'over'`). */
export function evaluateObjective(obj: BonusObjective, s: GameState): ObjectiveEvaluation {
  const over = s.phase === 'over';
  const log = s.log;
  const cleared = ofType(log, 'cleared');
  /** Achievement objectives: met as soon as achieved, failed if the episode ends without it. */
  const achieved = (ok: boolean, progress: string): ObjectiveEvaluation => ({
    status: ok ? 'met' : over ? 'failed' : 'pending',
    progress,
  });
  /** Finish objectives: judged when the episode ends; `broken` fails them early. */
  const atEnd = (ok: boolean, broken: boolean, progress: string): ObjectiveEvaluation => ({
    status: broken ? 'failed' : over ? (ok ? 'met' : 'failed') : 'pending',
    progress,
  });
  const yesNo = (ok: boolean) => (ok ? 'Done' : 'Not yet');
  const objectiveReached = s.lead >= s.leadTarget;

  switch (obj.code) {
    case 'cleanClears': {
      const k = cleared.filter((e) => e.clean).length;
      return achieved(k >= obj.n, `Clean Clears: ${Math.min(k, obj.n)}/${obj.n}`);
    }
    case 'clearTimedWithDie':
      return achieved(
        cleared.some((e) => e.timed && e.die != null && e.die >= obj.minDie),
        yesNo(cleared.some((e) => e.timed && e.die != null && e.die >= obj.minDie)),
      );
    case 'clearMultiSymbolInOneTurn': {
      const ok = cleared.some(
        (e) => e.symbolsRequired >= obj.minSymbols && (e.startedTurn == null || e.startedTurn === e.turn),
      );
      return achieved(ok, yesNo(ok));
    }
    case 'maxExposure':
      return atEnd(true, s.peakExposure > obj.max, `Highest Exposure: ${s.peakExposure} (limit ${obj.max})`);
    case 'useAbilities': {
      const k = ofType(log, 'abilityUsed').length;
      return achieved(k >= obj.n, `Tactical Abilities used: ${Math.min(k, obj.n)}/${obj.n}`);
    }
    case 'gearAndAlly': {
      const ok = ofType(log, 'deployed').some((e) => e.gearCount >= 1 && e.allyCount >= 1);
      return achieved(ok, `Gear ${s.gear.length > 0 ? '✓' : '✗'} · Ally ${s.allies.length > 0 ? '✓' : '✗'}`);
    }
    case 'allyCoverExpiry': {
      const k = ofType(log, 'allyCover').filter((e) => e.effect === 'expiry').length;
      return achieved(k >= obj.n, `Expiry effects cancelled: ${Math.min(k, obj.n)}/${obj.n}`);
    }
    case 'clearOpeningRow': {
      const ids = new Set(cleared.map((e) => e.threatId));
      const k = s.openingRow.filter((id) => ids.has(id)).length;
      return achieved(k === s.openingRow.length, `Opening Threats cleared: ${k}/${s.openingRow.length}`);
    }
    case 'objectiveTurnsToSpare': {
      const limit = NOMINAL_TURNS - obj.turns;
      const ok = objectiveReached && s.turn <= limit;
      return {
        status: ok ? 'met' : over || s.turn > limit ? 'failed' : 'pending',
        progress: `Reach ${s.leadTarget} Lead by the end of turn ${limit}`,
      };
    }
    case 'decryptAll': {
      const entered = ofType(log, 'threatEntered').filter((e) => e.faceDown).length;
      const done = ofType(log, 'decrypted').length;
      return atEnd(entered > 0 && done >= entered, false, `Decrypted: ${done}/${entered}`);
    }
    case 'clearsInOneTurn': {
      const best = perTurnMax(cleared);
      const now = cleared.filter((e) => e.turn === s.turn).length;
      return achieved(best >= obj.n, `Clears this turn: ${Math.min(now, obj.n)}/${obj.n}`);
    }
    case 'noEscapes': {
      const k = ofType(log, 'escaped').length;
      return atEnd(k === 0, k > 0, k === 0 ? 'No escapes so far' : `${k} escaped`);
    }
    case 'clearWithSingleCard': {
      const ok = cleared.some((e) =>
        e.breach ? e.tuckedCount === 0 && e.bonusPower === 0 : e.tuckedCount === 1 && e.bonusPower === 0,
      );
      return achieved(ok, yesNo(ok));
    }
    case 'alliesAtEnd':
      return atEnd(s.allies.length >= obj.n, false, `Allies in play: ${s.allies.length}/${obj.n}`);
    case 'awakenDuringPlay': {
      const ok = ofType(log, 'awakened').some((e) => e.duringPlay);
      return achieved(ok, yesNo(ok));
    }
    case 'cleanClearEachSuit': {
      const suits = new Set<Suit>(cleared.filter((e) => e.clean).map((e) => e.pref));
      const ok = suits.size === 3;
      const mark = (x: Suit) => `${x} ${suits.has(x) ? '✓' : '✗'}`;
      return achieved(ok, [mark('Recon'), mark('Stealth'), mark('Force')].join(' · '));
    }
    case 'clearPowerAtLeast': {
      const ok = cleared.some((e) => e.powerRequired >= obj.n);
      return achieved(ok, yesNo(ok));
    }
    case 'objectiveWithoutPerks': {
      const used = ofType(log, 'perkUsed').filter((e) => e.perk !== 'patternRecognition').length;
      return {
        status: used > 0 ? 'failed' : objectiveReached ? 'met' : over ? 'failed' : 'pending',
        progress: used > 0 ? 'A perk was used' : 'No perks used',
      };
    }
    case 'neutralizePursuer': {
      const hit = cleared.find((e) => e.threatType === 'Pursuer');
      const before = obj.beforeTurn;
      const ok = !!hit && (before == null || hit.turn < before);
      const late = before != null && !ok && s.turn >= before;
      return {
        status: ok ? 'met' : over || late ? 'failed' : 'pending',
        progress: before == null ? yesNo(ok) : `${yesNo(ok)} (before turn ${before})`,
      };
    }
    case 'allyCovers': {
      const k = ofType(log, 'allyCover').length;
      return achieved(k >= obj.n, `Ally Cover used: ${Math.min(k, obj.n)}/${obj.n}`);
    }
    case 'exposureBelowStart':
      return atEnd(s.exposure < s.startExposure, false, `Exposure ${s.exposure} (started at ${s.startExposure})`);
    case 'clearCountermeasures': {
      const k = cleared.filter((e) => e.threatType === 'Countermeasure').length;
      return achieved(k >= obj.n, `Countermeasures cleared: ${Math.min(k, obj.n)}/${obj.n}`);
    }
    case 'cleanClearsInOneTurn': {
      const clean = cleared.filter((e) => e.clean);
      const now = clean.filter((e) => e.turn === s.turn).length;
      return achieved(perTurnMax(clean) >= obj.n, `Clean Clears this turn: ${Math.min(now, obj.n)}/${obj.n}`);
    }
    case 'sceneCleared':
      return achieved(s.sceneCleared, yesNo(s.sceneCleared));
  }
}

export function objectiveText(day: number): string {
  return dayObjectives[day]?.text ?? '';
}

/** Live Bonus Objective status for the UI. */
export function objectiveProgress(s: GameState): ObjectiveProgress {
  const e = evaluateObjective(s.objective, s);
  return { code: s.objective.code, text: objectiveText(s.day), status: e.status, progress: e.progress };
}
