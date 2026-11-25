// Memoized derivations from engine state: the player's view, legal actions, labeled options.
// GameState objects are immutable, so caching by identity (WeakMap) is safe.

import { dayPlan, gameData, playerCard, rulesForDay, threat } from '../data/index.ts';
import type { PerkId, RuleCard } from '../data/types.ts';
import {
  type Action,
  type ActionPreview,
  actionKey,
  type CampaignState,
  type Debrief,
  debriefEpisode,
  describeAction,
  type GameState,
  legalActions,
  newCampaign,
  type PlayerView,
  previewAction,
  view,
} from '../engine/index.ts';

const viewCache = new WeakMap<GameState, PlayerView>();
export function viewOf(s: GameState): PlayerView {
  let v = viewCache.get(s);
  if (!v) {
    v = view(s);
    viewCache.set(s, v);
  }
  return v;
}

const legalCache = new WeakMap<GameState, Action[]>();
export function legalOf(s: GameState): Action[] {
  let v = legalCache.get(s);
  if (!v) {
    v = legalActions(s);
    legalCache.set(s, v);
  }
  return v;
}

/** What the player is choosing for: a hand card, or a perk that needs a target. */
export type Selection = { kind: 'card'; uid: string } | { kind: 'perk'; perk: PerkId } | null;

export interface Option {
  key: string;
  action: Action;
  label: string;
  preview: ActionPreview | null;
  /** Short consequence text, e.g. "CLEARS (Clean) · +2 Lead, −1 Exposure". */
  outcome: string;
  /** Board slots this option targets (highlighted). */
  slots: number[];
  /** Deploys a Gear/Ally (highlights the In-play zone). */
  deploy: boolean;
  /** Primary verb for grouping: tuck, ability, deploy, decrypt, improvised, sleeper, perk. */
  verb: string;
}

const sgn = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

export function outcomeText(a: Action, p: ActionPreview | null): string {
  if (!p) return '';
  if (p.hidden) return 'Reveals the Threat (outcome hidden)';
  const parts: string[] = [];
  for (const c of p.clears) parts.push(`CLEARS ${threat(c.threatId).name}${c.clean ? ' (Clean)' : ''}`);
  if (p.lead) parts.push(`${sgn(p.lead)} Lead`);
  if (p.exposure) parts.push(`${sgn(p.exposure)} Exposure`);
  if (p.cardsDrawn) parts.push(`draw ${p.cardsDrawn}`);
  if (a.type === 'play' && (a.mode === 'tuck' || a.mode === 'improvisedWeapon') && a.slot !== undefined) {
    const cleared = p.clears.some((c) => c.slot === a.slot);
    const m = p.slots.find((x) => x.slot === a.slot);
    if (!cleared && m) parts.push(`${m.symbols}/${m.symbolsNeeded} symbols · ${m.power}/${m.powerNeeded} Power`);
  }
  if (p.decision === 'reorderTop') parts.push('then reorder the top of the Threat Deck');
  else if (p.decision === 'satellite') parts.push('then choose what to discard and reorder');
  else if (p.decision === 'kineticTarget') parts.push('then choose where excess Power goes');
  else if (p.decision === 'allyCover') parts.push('then decide on Ally Cover');
  else if (p.decision === 'confirmHardenedResolve') parts.push('then Hardened Resolve');
  if (p.ends) {
    const t = {
      objective: 'Objective Secured',
      coverBlown: 'Cover Blown',
      outOfTime: 'Out of Time',
      sceneCleared: 'Scene Cleared',
    };
    parts.push(`ENDS: ${t[p.ends]}`);
  }
  if (parts.length === 0) return 'No immediate effect';
  return parts.join(' · ');
}

function verbOf(a: Action): string {
  if (a.type === 'perk') return 'perk';
  if (a.type !== 'play') return a.type;
  switch (a.mode) {
    case 'improvisedWeapon':
      return 'improvised';
    case 'sleeperInstinct':
      return 'sleeper';
    default:
      return a.mode;
  }
}

function slotsOf(a: Action): number[] {
  if (a.type === 'play') {
    const out: number[] = [];
    if (a.slot !== undefined) out.push(a.slot);
    if (a.slot2 !== undefined && a.slot2 !== a.slot) out.push(a.slot2);
    return out;
  }
  if (a.type === 'perk' && a.slot !== undefined) return [a.slot];
  return [];
}

export function makeOption(s: GameState, a: Action): Option {
  let preview: ActionPreview | null = null;
  try {
    preview = previewAction(s, a);
  } catch {
    preview = null;
  }
  return {
    key: actionKey(a),
    action: a,
    label: describeAction(s, a),
    preview,
    outcome: outcomeText(a, preview),
    slots: slotsOf(a),
    deploy: a.type === 'play' && a.mode === 'deploy',
    verb: verbOf(a),
  };
}

const VERB_ORDER = ['deploy', 'tuck', 'decrypt', 'improvised', 'ability', 'sleeper', 'perk'];

const optionCache = new WeakMap<GameState, Map<string, Option[]>>();
/** Every legal option for the current selection, labeled and previewed. */
export function optionsFor(s: GameState, sel: Selection): Option[] {
  if (!sel || s.pending || s.phase !== 'play') return [];
  const key = sel.kind === 'card' ? `c:${sel.uid}` : `p:${sel.perk}`;
  let byState = optionCache.get(s);
  if (!byState) {
    byState = new Map();
    optionCache.set(s, byState);
  }
  const hit = byState.get(key);
  if (hit) return hit;
  const actions = legalOf(s).filter((a) =>
    sel.kind === 'card' ? a.type === 'play' && a.cardUid === sel.uid : a.type === 'perk' && a.perk === sel.perk,
  );
  const opts = actions.map((a) => makeOption(s, a));
  opts.sort((x, y) => {
    const v = VERB_ORDER.indexOf(x.verb) - VERB_ORDER.indexOf(y.verb);
    if (v) return v;
    // Clears first, then by slot.
    const cx = x.preview?.clears.length ?? 0;
    const cy = y.preview?.clears.length ?? 0;
    if (cx !== cy) return cy - cx;
    const sx = x.slots[0] ?? 99;
    const sy = y.slots[0] ?? 99;
    return sx - sy;
  });
  byState.set(key, opts);
  return opts;
}

/** Hand cards that have at least one legal play right now. */
export function playableCards(s: GameState): Set<string> {
  const out = new Set<string>();
  for (const a of legalOf(s)) if (a.type === 'play') out.add(a.cardUid);
  return out;
}

export function canEndPlays(s: GameState): boolean {
  return legalOf(s).some((a) => a.type === 'endPlays');
}

/** Only End plays (and maybe free perk actions) remain. */
export function onlyEndPlaysLeft(s: GameState): boolean {
  const l = legalOf(s);
  return l.some((a) => a.type === 'endPlays') && !l.some((a) => a.type === 'play');
}

/** Exposure/Lead the coming Pressure step would apply from face-up Threats (no hidden info). */
export interface ForecastItem {
  slot: number;
  name: string;
  text: string;
  kind: 'pressure' | 'expiry' | 'strike' | 'cancelled';
}
export function pressureForecast(v: PlayerView): ForecastItem[] {
  if (v.modifiers.adrenaline) return [];
  const out: ForecastItem[] = [];
  for (const sl of v.slots) {
    if (sl.state !== 'faceUp' || !sl.threatId) continue;
    const t = threat(sl.threatId);
    const p = t.pressure;
    if (p.lead || p.exposure || p.draw) {
      out.push({
        slot: sl.index,
        name: t.name,
        text: sl.cancelPressure ? `${t.pressureText} (cancelled)` : t.pressureText,
        kind: sl.cancelPressure ? 'cancelled' : 'pressure',
      });
    }
    if (sl.die === 1) {
      const strike = t.type === 'Pursuer';
      out.push({
        slot: sl.index,
        name: t.name,
        text: strike ? `Strikes: ${t.expiryText}` : `Escapes: ${t.expiryText}`,
        kind: strike ? 'strike' : 'expiry',
      });
    }
    if (t.blocker && !(p.lead || p.exposure || p.draw)) {
      out.push({ slot: sl.index, name: t.name, text: 'Blocker: Lead cannot increase', kind: 'pressure' });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------- briefing & debrief

/** Rule Cards shown in a day's briefing (the day's cards, plus the perk card when perks are in play). */
export function briefingRules(day: number, perks: readonly PerkId[]): RuleCard[] {
  const out = [...rulesForDay(day)];
  if (perks.length > 0) out.push(...rulesForDay('PROTO'));
  return out;
}

/** Days whose Conditioned card brings a flashback (data + the design's story days 16/19/22). */
export const FLASHBACK_DAYS: ReadonlySet<number> = new Set([
  16,
  19,
  22,
  ...gameData.playerCards
    .filter((c) => c.cls === 'Conditioned' && typeof c.day === 'number')
    .map((c) => c.day as number),
]);

export function isRuleDay(day: number): boolean {
  return dayPlan(day).newRules.trim() !== '' || rulesForDay(day).length > 0;
}

/** The campaign the Debrief is computed against (prototype mode uses a stand-in). */
export function debriefCampaign(
  mode: 'prototype' | 'campaign',
  s: GameState,
  campaign: CampaignState | null,
): CampaignState {
  if (mode === 'campaign' && campaign) return campaign;
  return { ...newCampaign('prototype'), day: s.day, perks: [...s.setup.perks], deck: s.setup.deck.slice(0, 12) };
}

const debriefCache = new WeakMap<GameState, Debrief>();
export function debriefOf(mode: 'prototype' | 'campaign', s: GameState, campaign: CampaignState | null): Debrief {
  let d = debriefCache.get(s);
  if (!d) {
    d = debriefEpisode(debriefCampaign(mode, s, campaign), s);
    debriefCache.set(s, d);
  }
  return d;
}

/** Validate a cut: exactly `count` distinct cards, all from `cards`. Returns an error message or null. */
export function cutError(cards: readonly string[], retire: readonly string[], count: number): string | null {
  const set = new Set(retire);
  if (set.size !== retire.length) return 'Each card can only be retired once.';
  for (const id of retire) if (!cards.includes(id)) return `${playerCard(id).name} is not one of your cards.`;
  if (retire.length < count)
    return `Choose ${count - retire.length} more card${count - retire.length === 1 ? '' : 's'} to retire.`;
  if (retire.length > count) return `Retire exactly ${count} cards.`;
  return null;
}

/** Act-debrief tier (1–3) from a Star total out of `max`. */
export function debriefTier(stars: number, max: number): 1 | 2 | 3 {
  const f = stars / max;
  if (f >= 2 / 3) return 3;
  if (f >= 1 / 3) return 2;
  return 1;
}
