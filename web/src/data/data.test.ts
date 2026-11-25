import { describe, expect, it } from 'vitest';
import { contentDays, coreDeck, gameData, playerCard } from './index.ts';

describe('game data', () => {
  it('has the six prototype days', () => {
    expect(contentDays).toEqual([1, 6, 11, 16, 21, 26]);
  });
  it('has a 12-card Core deck', () => {
    expect(coreDeck()).toHaveLength(12);
  });
  it('resolves every Jump-In card', () => {
    for (const j of gameData.jumpIns) for (const id of j.deck) expect(() => playerCard(id)).not.toThrow();
  });
});
