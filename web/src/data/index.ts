import raw from './game-data.json';
import type { DayPlan, GameData, PerkId, PerkInfo, PlayerCard, RuleCard, StoryCard, ThreatCard } from './types.ts';

export * from './types.ts';

/** All game content, exported from the workbooks by `npm run data`. */
export const gameData = raw as unknown as GameData;

export const playerCardsById: ReadonlyMap<string, PlayerCard> = new Map(gameData.playerCards.map((c) => [c.id, c]));
export const threatsById: ReadonlyMap<string, ThreatCard> = new Map(gameData.threats.map((t) => [t.id, t]));
export const perksById: ReadonlyMap<PerkId, PerkInfo> = new Map(gameData.perks.map((p) => [p.id, p]));

export function playerCard(id: string): PlayerCard {
  const c = playerCardsById.get(id);
  if (!c) throw new Error(`Unknown player card ${id}`);
  return c;
}

export function threat(id: string): ThreatCard {
  const t = threatsById.get(id);
  if (!t) throw new Error(`Unknown Threat ${id}`);
  return t;
}

export function dayPlan(day: number): DayPlan {
  const d = gameData.days.find((x) => x.day === day);
  if (!d) throw new Error(`Unknown day ${day}`);
  return d;
}

export const contentDays: readonly number[] = gameData.days.filter((d) => d.hasContent).map((d) => d.day);

export const threatsForDay = (day: number): ThreatCard[] => gameData.threats.filter((t) => t.day === day);
export const playerCardsForDay = (day: number): PlayerCard[] => gameData.playerCards.filter((c) => c.day === day);
export const rulesForDay = (day: number | 'PROTO'): RuleCard[] => gameData.rules.filter((r) => r.day === day);
export const storyForDay = (day: number): StoryCard[] => gameData.story.filter((s) => s.day === day);
export const coreDeck = (): PlayerCard[] => gameData.playerCards.filter((c) => c.day === 'CORE');
