// The rules engine core: a small interpreter over a serializable task queue.
//
// Every effect that can pause for a decision (Ally Cover, Hardened Resolve, Kinetic Momentum,
// peek, …) is a queued task, so resolution can stop at `state.pending` and resume exactly
// where it left off after the player answers. `step` mutates a fresh copy of the state.

import { threat } from '../data/index.ts';
import type { Delta, Effect, PerkId } from '../data/types.ts';
import { evaluateObjective } from './objectives.ts';
import {
  card,
  cloneState,
  faceUp,
  faceUpSlots,
  gearBonusFor,
  leadBlocked,
  perkAvailable,
  removeOne,
  slotCounts,
  suitMatches,
  triggerMet,
} from './state.ts';
import { cleanBonus, cleanClearLeadBonus, openingHandSize, startingDie } from './twists.ts';
import type { Action, EndReason, GameEvent, GameState, Modifiers, Source, Task } from './types.ts';

export interface Ctx {
  s: GameState;
  ev: GameEvent[];
}

const MAX_LOOP = 20000;

export const freshMods = (): Modifiers => ({
  falseTrail: false,
  falseTrailAbsorbLeft: 0,
  falseTrailLeadGiven: false,
  masterDecryptor: false,
  adrenaline: false,
  cleanNext: false,
});

export function src(kind: Source['kind'], id?: string): Source {
  return id === undefined ? { kind } : { kind, id };
}

export const isZeroDelta = (d: Delta): boolean => !d.lead && !d.exposure && !d.draw;
/** An effect worth spending Ally Cover on: it costs Lead or adds Exposure. */
export const isHarmful = (d: Delta): boolean => d.lead < 0 || d.exposure > 0;

const TARGETED_OPS: ReadonlySet<Effect['op']> = new Set([
  'stall',
  'cancel_pressure',
  'add_power',
  'breach',
  'swap',
  'move_card',
]);
export const isTargeted = (e: Effect): boolean => TARGETED_OPS.has(e.op);

export function emit(c: Ctx, e: GameEvent): void {
  c.ev.push(e);
  if (!c.s.hypothetical) c.s.log.push(e);
}

function pushFront(s: GameState, ...tasks: Task[]): void {
  s.queue.unshift(...tasks);
}

function markUsed(c: Ctx, p: PerkId): void {
  if (!c.s.perks.used.includes(p)) c.s.perks.used.push(p);
  emit(c, { type: 'perkUsed', perk: p });
}

/** Process queued tasks until the queue is empty, a decision is pending, or the episode is over. */
export function run(c: Ctx): void {
  let guard = 0;
  while (c.s.phase !== 'over' && !c.s.pending && c.s.queue.length > 0) {
    if (++guard > MAX_LOOP) throw new Error('Engine loop did not terminate');
    const task = c.s.queue.shift() as Task;
    exec(c, task);
  }
}

// ---------------------------------------------------------------------------- tracks & cards

function deltaTasks(d: Delta, source: Source): Task[] {
  const out: Task[] = [];
  if (d.lead) out.push({ t: 'lead', n: d.lead, src: source });
  if (d.exposure) out.push({ t: 'exposure', n: d.exposure, src: source });
  if (d.draw) out.push({ t: 'draw', n: d.draw });
  return out;
}

function gainLead(c: Ctx, n: number, source: Source): void {
  const s = c.s;
  if (n > 0 && leadBlocked(s)) {
    emit(c, { type: 'leadBlocked', amount: n, src: source });
    return;
  }
  // The Lead track runs from 0 to the day's target.
  const v = Math.min(s.leadTarget, Math.max(0, s.lead + n));
  const delta = v - s.lead;
  s.lead = v;
  emit(c, { type: 'lead', delta, value: v, src: source });
  if (s.lead >= s.leadTarget) end(c, 'objective');
}

export function setExposure(c: Ctx, v: number, source: Source): void {
  const s = c.s;
  // The Exposure track runs from 0 to the redline.
  const value = Math.min(s.redline, Math.max(0, v));
  const delta = value - s.exposure;
  s.exposure = value;
  if (value > s.peakExposure) s.peakExposure = value;
  emit(c, { type: 'exposure', delta, value, src: source });
  if (s.exposure >= s.redline) end(c, 'coverBlown');
}

function gainExposure(c: Ctx, n: number, source: Source): void {
  const s = c.s;
  if (n <= 0) {
    setExposure(c, s.exposure + n, source);
    return;
  }
  if (s.mods.falseTrail && s.mods.falseTrailAbsorbLeft > 0) {
    const absorbed = Math.min(n, s.mods.falseTrailAbsorbLeft);
    s.mods.falseTrailAbsorbLeft -= absorbed;
    const rest = n - absorbed;
    emit(c, { type: 'exposureAbsorbed', amount: absorbed });
    const tasks: Task[] = [];
    if (!s.mods.falseTrailLeadGiven) {
      s.mods.falseTrailLeadGiven = true;
      tasks.push({ t: 'lead', n: 1, src: src('falseTrail') });
    }
    if (rest > 0) tasks.push({ t: 'exposure', n: rest, src: source });
    pushFront(s, ...tasks);
    return;
  }
  if (s.exposure + n >= s.redline && perkAvailable(s, 'hardenedResolve')) {
    s.pending = {
      kind: 'confirmHardenedResolve',
      amount: n,
      exposure: s.exposure,
      redline: s.redline,
      source,
    };
    return;
  }
  setExposure(c, s.exposure + n, source);
}

function draw(c: Ctx, n: number): void {
  const s = c.s;
  if (n <= 0) return;
  if (s.hypothetical) {
    s.hypothetical.phantomDraws += Math.min(n, Math.max(0, s.drawPile.length - s.hypothetical.phantomDraws));
    return;
  }
  const cards = s.drawPile.splice(0, n);
  s.hand.push(...cards);
  emit(c, { type: 'drew', cards, requested: n });
}

export function end(c: Ctx, reason: EndReason): void {
  const s = c.s;
  if (s.phase === 'over') return;
  s.phase = 'over';
  s.queue = [];
  s.pending = null;
  emit(c, { type: 'episodeEnded', reason, lead: s.lead, exposure: s.exposure });
  const objective = s.lead >= s.leadTarget;
  const cover = s.exposure <= s.coverThreshold && reason !== 'coverBlown';
  const bonus = s.hypothetical ? false : evaluateObjective(s.objective, s).status === 'met';
  s.result = {
    reason,
    turn: s.turn,
    lead: s.lead,
    exposure: s.exposure,
    stars: { objective, cover, bonus },
    starCount: Number(objective) + Number(cover) + Number(bonus),
    sceneCleared: s.sceneCleared,
  };
}

// ---------------------------------------------------------------------------- scene row

export function enter(c: Ctx, slot: number, id: string, countermeasure = false): void {
  const s = c.s;
  const t = threat(id);
  const faceDown = t.type === 'Encrypted Threat';
  const die = faceDown ? null : startingDie(t, s.twist);
  s.slots[slot] = { threatId: id, faceDown, tucked: [], bonusPower: 0, die, cancelPressure: false, startedTurn: null };
  emit(c, { type: 'threatEntered', slot, threatId: faceDown ? null : id, faceDown, die, countermeasure });
}

function refill(c: Ctx, slot: number): void {
  const s = c.s;
  if (s.slots[slot] || s.pursuerSlot === slot || s.hypothetical) return;
  const id = s.threatDeck.shift();
  if (id === undefined) {
    emit(c, { type: 'slotEmpty', slot });
    return;
  }
  if (s.knownTop[0] === id) s.knownTop.shift();
  else s.knownTop = [];
  enter(c, slot, id);
}

/** A Two-Phase Threat left the row without being cleared: its Countermeasure never appears. */
function voidCountermeasure(s: GameState, threatId: string): void {
  const t = threat(threatId);
  if (t.type === 'Two-Phase Threat' && t.pairsWith && removeOne(s.setAsideThreats, t.pairsWith)) {
    s.voidThreats.push(t.pairsWith);
  }
}

/** Remove the Threat in `slot`: its tucked cards go to the discard pile, the Threat to the Threat discard. */
function removeThreat(s: GameState, slot: number): void {
  const sl = s.slots[slot];
  if (!sl) return;
  for (const t of sl.tucked) s.discard.push(t.uid);
  s.threatDiscard.push(sl.threatId);
  s.slots[slot] = null;
}

function tuck(c: Ctx, task: Extract<Task, { t: 'tuck' }>): void {
  const s = c.s;
  const sl = faceUp(s, task.slot);
  if (!sl || sl.threatId !== task.threatId) {
    finishPlay(c, task.card);
    return;
  }
  removeOne(s.resolving, task.card);
  const gearBonus = gearBonusFor(s, task.suit);
  sl.tucked.push({ uid: task.card, suit: task.suit, power: task.power, gearBonus, wild: task.wild });
  if (sl.startedTurn == null) sl.startedTurn = s.turn;
  emit(c, {
    type: 'tucked',
    card: task.card,
    slot: task.slot,
    threatId: sl.threatId,
    suit: task.suit,
    power: task.power,
    gearBonus,
    wild: task.wild,
  });
  pushFront(s, { t: 'checkClears' });
}

function finishPlay(c: Ctx, uid: string): void {
  if (removeOne(c.s.resolving, uid)) c.s.discard.push(uid);
}

// ---------------------------------------------------------------------------- effects

function applyEffect(c: Ctx, task: Extract<Task, { t: 'effect' }>): void {
  const s = c.s;
  const e = task.effect;
  const abilitySrc = src('ability', task.card);
  const target = task.slot != null ? s.slots[task.slot] : null;
  const targetOk = !!target && target.threatId === task.threatId;
  switch (e.op) {
    case 'draw':
      pushFront(s, { t: 'draw', n: e.n });
      return;
    case 'exposure':
      pushFront(s, { t: 'exposure', n: e.n, src: abilitySrc });
      return;
    case 'lead':
      pushFront(s, { t: 'lead', n: e.n, src: abilitySrc });
      return;
    case 'clean_next':
      s.mods.cleanNext = true;
      emit(c, { type: 'cleanNext' });
      return;
    case 'power_bonus':
      return;
    case 'peek': {
      const cards = s.threatDeck.slice(0, e.n);
      emit(c, { type: 'peeked', count: cards.length });
      if (cards.length > 0 && !s.hypothetical) s.pending = { kind: 'reorderTop', cards, card: task.card };
      return;
    }
    default:
      break;
  }
  if (!target || !targetOk || task.slot == null) {
    emit(c, { type: 'noEffect', card: task.card });
    return;
  }
  const slot = task.slot;
  const t = threat(target.threatId);
  switch (e.op) {
    case 'stall':
      if (target.faceDown || target.die == null) break;
      target.die += e.n;
      emit(c, { type: 'stalled', slot, threatId: t.id, n: e.n, die: target.die });
      return;
    case 'cancel_pressure':
      if (target.faceDown) break;
      target.cancelPressure = true;
      emit(c, { type: 'pressureCancelled', slot, threatId: t.id });
      return;
    case 'add_power':
      if (target.faceDown || (e.suit && !suitMatches(t, e.suit))) break;
      target.bonusPower += e.n;
      if (target.startedTurn == null) target.startedTurn = s.turn;
      emit(c, { type: 'powerAdded', slot, threatId: t.id, n: e.n, source: 'ability' });
      pushFront(s, { t: 'checkClears' });
      return;
    case 'breach':
      if (target.faceDown || s.pursuerSlot === slot || t.symbols > 1 || t.power > e.max) break;
      emit(c, { type: 'breach', slot, threatId: t.id });
      pushFront(s, { t: 'clear', slot, clean: false, breach: true }, { t: 'checkClears' });
      return;
    case 'swap': {
      if (s.pursuerSlot === slot || s.threatDeck.length === 0) break;
      const wasFaceDown = target.faceDown;
      for (const x of target.tucked) s.discard.push(x.uid);
      if (!wasFaceDown && s.knownTop.length === s.threatDeck.length) s.knownTop.push(t.id);
      s.threatDeck.push(t.id);
      s.slots[slot] = null;
      voidCountermeasure(s, t.id);
      emit(c, { type: 'swapped', slot, threatId: wasFaceDown ? null : t.id });
      pushFront(s, { t: 'refill', slot }, { t: 'checkScene' });
      return;
    }
    case 'move_card': {
      const from = task.moveFrom != null ? faceUp(s, task.moveFrom) : null;
      if (target.faceDown || !from || task.moveFrom === slot || task.moveFrom == null) break;
      const i = from.tucked.findIndex((x) => x.uid === task.moveCard);
      const moved = from.tucked[i];
      if (!moved || !(moved.wild || suitMatches(t, moved.suit))) break;
      from.tucked.splice(i, 1);
      target.tucked.push(moved.wild ? { ...moved, suit: t.pref } : moved);
      if (target.startedTurn == null) target.startedTurn = s.turn;
      emit(c, {
        type: 'cardMoved',
        card: moved.uid,
        from: task.moveFrom,
        to: slot,
        fromThreat: from.threatId,
        toThreat: t.id,
      });
      pushFront(s, { t: 'checkClears' });
      return;
    }
  }
  emit(c, { type: 'noEffect', card: task.card });
}

// ---------------------------------------------------------------------------- task dispatch

function exec(c: Ctx, task: Task): void {
  const s = c.s;
  switch (task.t) {
    case 'lead':
      gainLead(c, task.n, task.src);
      return;
    case 'exposure':
      gainExposure(c, task.n, task.src);
      return;
    case 'draw':
      draw(c, task.n);
      return;
    case 'delta':
      pushFront(s, ...deltaTasks(task.d, task.src));
      return;
    case 'effect':
      applyEffect(c, task);
      return;
    case 'tuck':
      tuck(c, task);
      return;
    case 'decrypt': {
      const sl = s.slots[task.slot];
      if (!sl?.faceDown || sl.threatId !== task.threatId) {
        finishPlay(c, task.card);
        return;
      }
      const t = threat(sl.threatId);
      sl.faceDown = false;
      sl.die = startingDie(t, s.twist);
      const md = s.mods.masterDecryptor;
      const keeps = md || suitMatches(t, 'Recon');
      emit(c, { type: 'decrypted', card: task.card, slot: task.slot, threatId: t.id, tucked: keeps });
      if (keeps) {
        pushFront(s, {
          t: 'tuck',
          card: task.card,
          slot: task.slot,
          threatId: t.id,
          suit: md ? t.pref : 'Recon',
          power: card(task.card).power,
          wild: false,
        });
      } else finishPlay(c, task.card);
      return;
    }
    case 'finishPlay':
      finishPlay(c, task.card);
      return;
    case 'sleeperTuck': {
      const sl = faceUp(s, task.slot);
      const md = s.mods.masterDecryptor;
      if (!sl || sl.threatId !== task.threatId || !(md || suitMatches(threat(sl.threatId), 'Stealth'))) {
        emit(c, { type: 'sleeperFizzled', card: task.card });
        finishPlay(c, task.card);
        return;
      }
      pushFront(s, {
        t: 'tuck',
        card: task.card,
        slot: task.slot,
        threatId: sl.threatId,
        suit: md ? threat(sl.threatId).pref : 'Stealth',
        power: card(task.card).power,
        wild: false,
      });
      return;
    }
    case 'checkClears': {
      for (let i = 0; i < s.slots.length; i++) {
        const sl = faceUp(s, i);
        if (!sl) continue;
        const cnt = slotCounts(s, sl);
        if (!cnt.met) continue;
        const clean = cnt.clean || s.mods.cleanNext;
        s.mods.cleanNext = false;
        pushFront(s, { t: 'clear', slot: i, clean, breach: false }, { t: 'checkClears' });
        return;
      }
      return;
    }
    case 'clear': {
      const sl = s.slots[task.slot];
      if (!sl) return;
      const t = threat(sl.threatId);
      const cnt = slotCounts(s, sl);
      const excess = task.breach ? 0 : Math.max(0, cnt.power - t.power);
      const forceUsed = sl.tucked.some((x) => x.suit === 'Force');
      emit(c, {
        type: 'cleared',
        slot: task.slot,
        threatId: t.id,
        threatType: t.type,
        pref: t.pref,
        clean: task.clean,
        breach: task.breach,
        excess,
        turn: s.turn,
        symbolsRequired: t.symbols,
        powerRequired: t.power,
        die: sl.die,
        timed: t.timer != null && t.type !== 'Pursuer',
        startedTurn: sl.startedTurn,
        tuckedCount: sl.tucked.length,
        bonusPower: sl.bonusPower,
      });
      removeThreat(s, task.slot);
      const tasks: Task[] = deltaTasks(t.reward, src('reward', t.id));
      if (task.clean) {
        tasks.push(...deltaTasks(cleanBonus(t, s.twist), src('clean', t.id)));
        const extra = cleanClearLeadBonus(t, s.twist);
        if (extra) tasks.push({ t: 'lead', n: extra, src: src('twist', t.id) });
      }
      if (excess >= 3) tasks.push({ t: 'patternRecognition', excess });
      if (excess > 0 && forceUsed) tasks.push({ t: 'kinetic', excess });
      tasks.push({ t: 'placeAfterClear', slot: task.slot, threatId: t.id }, { t: 'checkScene' });
      pushFront(s, ...tasks);
      return;
    }
    case 'patternRecognition':
      if (perkAvailable(s, 'patternRecognition')) {
        markUsed(c, 'patternRecognition');
        pushFront(s, { t: 'draw', n: 1 });
      }
      return;
    case 'kinetic': {
      if (!perkAvailable(s, 'kineticMomentum')) return;
      const options = faceUpSlots(s);
      if (options.length > 0) s.pending = { kind: 'kineticTarget', excess: task.excess, options };
      return;
    }
    case 'placeAfterClear': {
      if (s.slots[task.slot]) return;
      const t = threat(task.threatId);
      if (t.type === 'Two-Phase Threat' && t.pairsWith && s.setAsideThreats.includes(t.pairsWith)) {
        if (s.hypothetical) {
          // Its identity is hidden, but the slot is not empty: no Scene Cleared on this lookahead.
          s.hypothetical.countermeasurePending = true;
          return;
        }
        removeOne(s.setAsideThreats, t.pairsWith);
        enter(c, task.slot, t.pairsWith, true);
        return;
      }
      refill(c, task.slot);
      return;
    }
    case 'refill':
      refill(c, task.slot);
      return;
    case 'checkScene':
      // Lookahead copies may check it too: the Threat Deck count is public, and refills only
      // happen when the deck is not empty.
      if (s.sceneCleared || s.hypothetical?.countermeasurePending) return;
      if (s.threatDeck.length === 0 && s.slots.every((x) => x === null)) {
        s.sceneCleared = true;
        emit(c, { type: 'sceneCleared' });
        pushFront(s, { t: 'lead', n: 1, src: src('sceneCleared') }, { t: 'end', reason: 'sceneCleared' });
      }
      return;
    case 'pressureSlot': {
      const sl = faceUp(s, task.slot);
      if (!sl) return;
      const t = threat(sl.threatId);
      const tasks: Task[] = [];
      if (!isZeroDelta(t.pressure)) {
        if (sl.cancelPressure) emit(c, { type: 'pressureIgnored', slot: task.slot, threatId: t.id });
        else tasks.push({ t: 'cover', effect: 'pressure', slot: task.slot, threatId: t.id, d: t.pressure });
      }
      tasks.push({ t: 'tick', slot: task.slot, threatId: t.id });
      pushFront(s, ...tasks);
      return;
    }
    case 'cover':
      if (isHarmful(task.d) && s.allies.length > 0) {
        s.pending = {
          kind: 'allyCover',
          effect: task.effect,
          slot: task.slot,
          threatId: task.threatId,
          delta: task.d,
          allies: [...s.allies],
        };
        return;
      }
      resolveCovered(c, task.effect, task.slot, task.threatId, task.d);
      return;
    case 'tick': {
      const sl = faceUp(s, task.slot);
      if (!sl || sl.threatId !== task.threatId || sl.die == null) return;
      const t = threat(sl.threatId);
      sl.die -= 1;
      emit(c, { type: 'timerTick', slot: task.slot, threatId: t.id, die: sl.die });
      if (sl.die > 0) return;
      if (t.type === 'Pursuer') {
        emit(c, { type: 'strike', slot: task.slot, threatId: t.id, die: t.timer ?? 0 });
        pushFront(
          s,
          { t: 'cover', effect: 'strike', slot: task.slot, threatId: t.id, d: t.expiry },
          { t: 'resetHunt', slot: task.slot, threatId: t.id },
        );
      } else {
        emit(c, { type: 'escaped', slot: task.slot, threatId: t.id });
        pushFront(
          s,
          { t: 'cover', effect: 'expiry', slot: task.slot, threatId: t.id, d: t.expiry },
          { t: 'escape', slot: task.slot, threatId: t.id },
        );
      }
      return;
    }
    case 'escape': {
      const sl = s.slots[task.slot];
      if (!sl || sl.threatId !== task.threatId) return;
      voidCountermeasure(s, sl.threatId);
      removeThreat(s, task.slot);
      pushFront(s, { t: 'refill', slot: task.slot }, { t: 'checkScene' });
      return;
    }
    case 'resetHunt': {
      const sl = s.slots[task.slot];
      if (sl && sl.threatId === task.threatId) sl.die = threat(sl.threatId).timer;
      return;
    }
    case 'endPressure':
      for (const sl of s.slots) if (sl) sl.cancelPressure = false;
      pushFront(s, { t: 'drawStep' });
      return;
    case 'drawStep':
      s.phase = 'draw';
      if (s.hypothetical) {
        s.queue = [];
        return;
      }
      pushFront(s, { t: 'draw', n: 2 }, { t: 'startTurn' });
      return;
    case 'startTurn':
      s.turn += 1;
      s.playsUsed = 0;
      s.mods = freshMods();
      s.phase = 'play';
      emit(c, { type: 'turnStarted', turn: s.turn });
      if (s.hand.length === 0 && s.drawPile.length === 0) end(c, 'outOfTime');
      return;
    case 'openingDraw':
      draw(c, openingHandSize(s.twist) - s.hand.length);
      pushFront(s, { t: 'startTurn' });
      return;
    case 'end':
      end(c, task.reason);
      return;
  }
}

function resolveCovered(c: Ctx, effect: 'pressure' | 'expiry' | 'strike', slot: number, threatId: string, d: Delta) {
  if (effect === 'pressure') emit(c, { type: 'pressureApplied', slot, threatId });
  pushFront(c.s, ...deltaTasks(d, src(effect, threatId)));
}

// ---------------------------------------------------------------------------- actions

function doPlay(c: Ctx, a: Extract<Action, { type: 'play' }>): void {
  const s = c.s;
  s.playsUsed += 1;
  removeOne(s.hand, a.cardUid);
  emit(c, { type: 'played', card: a.cardUid, mode: a.mode });
  const tasks: Task[] = [];
  let uid = a.cardUid;
  const orig = card(uid);
  if (orig.cls === 'Conditioned' && orig.pairsWith && s.setAsideCards.includes(orig.pairsWith) && triggerMet(s, orig)) {
    const aw = card(orig.pairsWith);
    removeOne(s.setAsideCards, aw.id);
    s.dormant.push(uid);
    uid = aw.id;
    emit(c, { type: 'awakened', conditioned: orig.id, awakened: aw.id, duringPlay: true, flashback: aw.flavor });
    if (aw.awakeningBonus) tasks.push(...deltaTasks(aw.awakeningBonus, src('awakening', aw.id)));
  }
  const pc = card(uid);
  s.resolving.push(uid);
  const md = s.mods.masterDecryptor;
  const slotThreat = a.slot != null ? (s.slots[a.slot]?.threatId ?? null) : null;
  switch (a.mode) {
    case 'deploy': {
      removeOne(s.resolving, uid);
      if (pc.cls === 'Gear') s.gear.push(uid);
      else s.allies.push(uid);
      emit(c, {
        type: 'deployed',
        card: uid,
        cls: pc.cls === 'Gear' ? 'Gear' : 'Ally',
        gearCount: s.gear.length,
        allyCount: s.allies.length,
      });
      tasks.push({ t: 'checkClears' });
      break;
    }
    case 'tuck':
    case 'improvisedWeapon': {
      const slot = a.slot as number;
      const t = threat(slotThreat as string);
      const iw = a.mode === 'improvisedWeapon';
      if (iw) markUsed(c, 'improvisedWeapon');
      // An Awakened Card keeps the tuck the player chose with the Conditioned Card: if its own suit
      // does not match the Threat, it counts as the Conditioned Card's suit.
      const own = pc.suit as NonNullable<typeof pc.suit>;
      const suit = iw || md ? t.pref : suitMatches(t, own) ? own : (orig.suit ?? own);
      tasks.push({ t: 'tuck', card: uid, slot, threatId: t.id, suit, power: iw ? pc.power * 2 : pc.power, wild: iw });
      break;
    }
    case 'decrypt':
      tasks.push({ t: 'decrypt', card: uid, slot: a.slot as number, threatId: slotThreat as string });
      break;
    case 'ability':
    case 'sleeperInstinct': {
      const sleeper = a.mode === 'sleeperInstinct';
      if (sleeper) markUsed(c, 'sleeperInstinct');
      if (s.twist === 'no_abilities') emit(c, { type: 'abilityBlocked', card: uid });
      else {
        emit(c, { type: 'abilityUsed', card: uid });
        for (const e of pc.effects) {
          if (e.op === 'power_bonus') continue;
          const targeted = isTargeted(e);
          tasks.push({
            t: 'effect',
            card: uid,
            effect: e,
            slot: targeted ? (a.slot ?? null) : null,
            threatId: targeted ? slotThreat : null,
            moveFrom: targeted ? (a.moveFrom ?? null) : null,
            moveCard: targeted ? (a.moveCard ?? null) : null,
          });
        }
      }
      if (sleeper) {
        const slot2 = a.slot2 as number;
        tasks.push({ t: 'sleeperTuck', card: uid, slot: slot2, threatId: s.slots[slot2]?.threatId ?? '' });
      } else tasks.push({ t: 'finishPlay', card: uid });
      break;
    }
  }
  pushFront(s, ...tasks);
}

function doPerk(c: Ctx, a: Extract<Action, { type: 'perk' }>): void {
  const s = c.s;
  markUsed(c, a.perk);
  switch (a.perk) {
    case 'vanish': {
      const slot = a.slot as number;
      const sl = s.slots[slot];
      if (!sl) return;
      emit(c, { type: 'vanished', slot, threatId: sl.threatId });
      voidCountermeasure(s, sl.threatId);
      removeThreat(s, slot);
      pushFront(s, { t: 'refill', slot }, { t: 'checkScene' });
      return;
    }
    case 'falseTrail':
      s.mods.falseTrail = true;
      s.mods.falseTrailAbsorbLeft = 2;
      s.mods.falseTrailLeadGiven = false;
      return;
    case 'satelliteOverwrite':
      if (s.hypothetical) return;
      s.pending = { kind: 'satellite', cards: s.threatDeck.slice(0, 4), maxDiscard: 2 };
      return;
    case 'contingencyPlan':
      pushFront(s, { t: 'draw', n: 2 });
      return;
    case 'masterDecryptor':
      s.mods.masterDecryptor = true;
      return;
    case 'adrenalineSurge':
      s.mods.adrenaline = true;
      return;
    default:
      return;
  }
}

function doEndPlays(c: Ctx): void {
  const s = c.s;
  if (s.hand.length === 0 && s.drawPile.length === 0) {
    end(c, 'outOfTime');
    return;
  }
  s.phase = 'pressure';
  emit(c, { type: 'pressureStep' });
  if (s.mods.adrenaline) {
    emit(c, { type: 'pressureSkipped' });
    pushFront(s, { t: 'endPressure' });
    return;
  }
  pushFront(s, ...s.slots.map((_, i): Task => ({ t: 'pressureSlot', slot: i })), { t: 'endPressure' });
}

function doDecide(c: Ctx, choice: Extract<Action, { type: 'decide' }>['choice']): void {
  const s = c.s;
  const d = s.pending;
  if (!d) return;
  s.pending = null;
  switch (d.kind) {
    case 'chooseCard':
      if (typeof choice === 'string') {
        markUsed(c, 'clonedCredentials');
        removeOne(s.drawPile, choice);
        s.hand.push(choice);
      }
      pushFront(s, { t: 'openingDraw' });
      return;
    case 'reorderTop': {
      const order = choice as string[];
      s.threatDeck.splice(0, order.length, ...order);
      s.knownTop = [...order];
      emit(c, { type: 'reordered', count: order.length, discarded: [] });
      return;
    }
    case 'satellite': {
      const { discard, order } = choice as { discard: string[]; order: string[] };
      s.threatDeck = [...order, ...s.threatDeck.slice(d.cards.length)];
      s.threatDiscard.push(...discard);
      s.knownTop = [...order];
      emit(c, { type: 'reordered', count: order.length, discarded: [...discard] });
      pushFront(s, { t: 'checkScene' });
      return;
    }
    case 'allyCover':
      if (typeof choice === 'string') {
        removeOne(s.allies, choice);
        s.discard.push(choice);
        emit(c, { type: 'allyCover', ally: choice, effect: d.effect, slot: d.slot, threatId: d.threatId });
      } else resolveCovered(c, d.effect, d.slot, d.threatId, d.delta);
      return;
    case 'kineticTarget': {
      if (typeof choice !== 'number') return;
      const sl = faceUp(s, choice);
      if (!sl) return;
      markUsed(c, 'kineticMomentum');
      sl.bonusPower += d.excess;
      if (sl.startedTurn == null) sl.startedTurn = s.turn;
      emit(c, { type: 'powerAdded', slot: choice, threatId: sl.threatId, n: d.excess, source: 'kinetic' });
      // No checkClears here: the clear that triggered this is always followed by one, after its
      // own slot has been refilled.
      return;
    }
    case 'confirmHardenedResolve':
      if (choice === true) {
        markUsed(c, 'hardenedResolve');
        const target = Math.max(s.exposure, s.redline - 1);
        emit(c, { type: 'hardenedResolve', prevented: s.exposure + d.amount - target });
        setExposure(c, target, d.source);
      } else setExposure(c, s.exposure + d.amount, d.source);
      return;
  }
}

/** Apply an action WITHOUT checking legality. Use `apply` from the public API instead. */
export function step(state: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  const s = cloneState(state);
  const c: Ctx = { s, ev: [] };
  switch (action.type) {
    case 'play':
      doPlay(c, action);
      break;
    case 'perk':
      doPerk(c, action);
      break;
    case 'endPlays':
      doEndPlays(c);
      break;
    case 'decide':
      doDecide(c, action.choice);
      break;
  }
  run(c);
  return { state: s, events: c.ev };
}
