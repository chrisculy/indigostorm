// Campaign progression and the post-episode flow, as pure functions.
//
//   const debrief = debriefEpisode(campaign, finalState);   // flashbacks, stars, perk options, the 15 cards
//   const next = completeDay(campaign, debrief, { retire: [a, b, c], perk });  // cut to 12, record, advance

import { coreDeck, dayPlan, gameData, playerCard } from '../data/index.ts';
import type { PerkId } from '../data/types.ts';
import type { CampaignState, Debrief, Flashback, GameState, Stars } from './types.ts';

export const ALL_PERKS: readonly PerkId[] = gameData.perks.map((p) => p.id);
export const LAST_DAY = 30;
export const DECK_SIZE = 12;

export function newCampaign(mode: 'campaign' | 'prototype' = 'campaign'): CampaignState {
  return {
    version: 1,
    mode,
    day: 1,
    deck: coreDeck().map((c) => c.id),
    retired: [],
    perks: [],
    stars: {},
    flashbacksSeen: [],
    skipped: [],
  };
}

/** Every player card the episode ends with (hand, piles, tucked, in play, mid-play), excluding
 * set-aside Awakened cards and dormant Conditioned cards. */
export function finalPlayerCards(s: GameState): string[] {
  const tucked = s.slots.flatMap((sl) => (sl ? sl.tucked.map((t) => t.uid) : []));
  const all = [...s.hand, ...s.drawPile, ...s.discard, ...s.gear, ...s.allies, ...s.resolving, ...tucked];
  // Keep the original deck order for a stable presentation.
  const order = new Map(s.setup.deck.map((id, i) => [id, i]));
  return all.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99) || a.localeCompare(b));
}

/** Cleanup awakening: every Conditioned card still dormant awakens now (no bonus). */
export function awakenRemaining(cards: readonly string[]): { cards: string[]; flashbacks: Flashback[] } {
  const flashbacks: Flashback[] = [];
  const out = cards.map((id) => {
    const c = playerCard(id);
    if (c.cls !== 'Conditioned' || !c.pairsWith) return id;
    const aw = playerCard(c.pairsWith);
    flashbacks.push({ conditioned: id, awakened: aw.id, text: aw.flavor, duringPlay: false });
    return aw.id;
  });
  return { cards: out, flashbacks };
}

export function computeStars(s: GameState): Stars {
  if (s.result) return { ...s.result.stars };
  return { objective: false, cover: false, bonus: false };
}

export const starCount = (st: Stars): number => Number(st.objective) + Number(st.cover) + Number(st.bonus);

/** Perks that may be unlocked after `day` (empty unless the day's Outro unlocks one). */
export function perkUnlockOptions(campaign: CampaignState, day = campaign.day): PerkId[] {
  if (!dayPlan(day).perkUnlock) return [];
  return ALL_PERKS.filter((p) => !campaign.perks.includes(p));
}

/** Stars earned in an act (1–3), using `extra` for a day not recorded yet. */
export function actStars(campaign: CampaignState, act: 1 | 2 | 3, extra?: { day: number; stars: Stars }): number {
  let n = 0;
  for (const d of gameData.days) {
    if (d.act !== act) continue;
    const st = extra && extra.day === d.day ? extra.stars : campaign.stars[d.day];
    if (st) n += starCount(st);
  }
  return n;
}

/** Everything the Debrief screen needs, computed from the finished episode. */
export function debriefEpisode(campaign: CampaignState, s: GameState): Debrief {
  if (s.phase !== 'over' || !s.result) throw new Error('The episode is not over');
  const during: Flashback[] = s.log.flatMap((e) =>
    e.type === 'awakened'
      ? [{ conditioned: e.conditioned, awakened: e.awakened, text: e.flashback, duringPlay: true }]
      : [],
  );
  const { cards, flashbacks } = awakenRemaining(finalPlayerCards(s));
  const stars = computeStars(s);
  const plan = dayPlan(s.day);
  let actDebrief: Debrief['actDebrief'] = null;
  if (s.day === 10 || s.day === 20) {
    actDebrief = {
      kind: 'act',
      act: plan.act,
      stars: actStars(campaign, plan.act, { day: s.day, stars }),
      maxStars: 30,
    };
  } else if (s.day === LAST_DAY) {
    const total =
      actStars(campaign, 1, { day: s.day, stars }) +
      actStars(campaign, 2, { day: s.day, stars }) +
      actStars(campaign, 3, { day: s.day, stars });
    actDebrief = { kind: 'epilogue', act: 3, stars: total, maxStars: 90 };
  }
  return {
    day: s.day,
    result: { ...s.result, stars: { ...s.result.stars } },
    stars,
    starCount: starCount(stars),
    flashbacks: [...during, ...flashbacks],
    cards,
    retireCount: Math.max(0, cards.length - DECK_SIZE),
    perkOptions: perkUnlockOptions(campaign, s.day),
    actDebrief,
  };
}

/** The next day with content after `day` (null after Day 30). */
export function nextContentDay(day: number): number | null {
  for (let d = day + 1; d <= LAST_DAY; d++) if (dayPlan(d).hasContent) return d;
  return null;
}

/** Finish the post-episode flow: unlock the chosen perk, retire cards down to 12, record Stars
 * and flashbacks, and advance to the next day. Throws on an invalid choice. */
export function completeDay(
  campaign: CampaignState,
  debrief: Debrief,
  choices: { retire: string[]; perk?: PerkId | null },
): CampaignState {
  if (debrief.day !== campaign.day)
    throw new Error(`Debrief is for day ${debrief.day}, campaign is on ${campaign.day}`);
  const retire = [...new Set(choices.retire)];
  if (retire.length !== choices.retire.length) throw new Error('Retire each card only once');
  if (retire.length !== debrief.retireCount)
    throw new Error(`Retire exactly ${debrief.retireCount} cards (got ${retire.length})`);
  for (const id of retire) if (!debrief.cards.includes(id)) throw new Error(`${id} is not in this episode's cards`);
  const perks = [...campaign.perks];
  if (debrief.perkOptions.length > 0) {
    if (!choices.perk || !debrief.perkOptions.includes(choices.perk))
      throw new Error('Choose one of the offered perks to unlock');
    perks.push(choices.perk);
  } else if (choices.perk) throw new Error('No perk unlock today');
  const deck = debrief.cards.filter((id) => !retire.includes(id));
  return {
    ...campaign,
    day: Math.min(LAST_DAY + 1, campaign.day + 1),
    deck,
    retired: [...campaign.retired, ...retire],
    perks,
    stars: { ...campaign.stars, [debrief.day]: { ...debrief.stars } },
    flashbacksSeen: [...new Set([...campaign.flashbacksSeen, ...debrief.flashbacks.map((f) => f.awakened)])],
    skipped: [...campaign.skipped],
  };
}

/** Skip a day that has no content yet (deck and stars unchanged). If the skipped day's Outro
 * would unlock a perk, `perk` (any locked perk) may be unlocked so the campaign stays balanced. */
export function skipDay(campaign: CampaignState, perk?: PerkId | null): CampaignState {
  if (dayPlan(campaign.day).hasContent) throw new Error(`Day ${campaign.day} has content; play it`);
  const perks = [...campaign.perks];
  if (perk) {
    if (!perkUnlockOptions(campaign).includes(perk)) throw new Error(`Cannot unlock ${perk} on day ${campaign.day}`);
    perks.push(perk);
  }
  return {
    ...campaign,
    day: Math.min(LAST_DAY + 1, campaign.day + 1),
    perks,
    skipped: [...campaign.skipped, campaign.day],
  };
}

/** Skip forward over every day without content. On skipped perk days, `pickPerk` chooses the
 * perk to unlock from the locked ones (return null, or omit it, to unlock nothing). */
export function skipToNextContentDay(
  campaign: CampaignState,
  pickPerk?: (campaign: CampaignState, options: PerkId[]) => PerkId | null,
): CampaignState {
  let c = campaign;
  while (c.day <= LAST_DAY && !dayPlan(c.day).hasContent) {
    const options = perkUnlockOptions(c);
    c = skipDay(c, options.length && pickPerk ? pickPerk(c, options) : null);
  }
  return c;
}

export const campaignFinished = (c: CampaignState): boolean => c.day > LAST_DAY;
