// Full episodes played through the store with the engine's bot, up to and through the Debrief.

import { beforeEach, describe, expect, it } from 'vitest';
import type { StoreApi } from 'zustand/vanilla';
import { contentDays } from '../../data/index.ts';
import { DECK_SIZE, suggestAction } from '../../engine/index.ts';
import { cutError, debriefOf } from '../derive.ts';
import { emptySave, loadSave } from '../persistence.ts';
import type { GameStore } from '../store.ts';
import { attachAutosave, createGameStore } from '../store.ts';

beforeEach(() => localStorage.clear());

function playOut(store: StoreApi<GameStore>): number {
  let n = 0;
  for (; n < 500; n++) {
    const s = store.getState().episode?.state;
    if (!s || s.phase === 'over') break;
    const a = suggestAction(s);
    if (!a) throw new Error(`No suggestion in phase ${s.phase}`);
    expect(store.getState().act(a)).toBe(true);
  }
  return n;
}

describe('a full scripted episode through the store', () => {
  it.each(contentDays)('prototype Day %i: plays to the end, debriefs, records best Stars', (day) => {
    const store = createGameStore();
    store.getState().openBriefing('prototype', day);
    store.getState().beginEpisode(1000 + day);
    const n = playOut(store);
    const ep = store.getState().episode;
    expect(ep?.state.phase).toBe('over');
    expect(n).toBeGreaterThan(5);
    store.getState().go('debrief');
    expect(store.getState().screen).toBe('debrief');
    const d = debriefOf('prototype', ep?.state as never, null);
    expect(d.cards).toHaveLength(15);
    expect(d.retireCount).toBe(3);
    const best = store.getState().prototypeBest[day];
    expect(best?.starCount).toBe(ep?.state.result?.starCount);
    // Prototype mode may skip the cut.
    expect(store.getState().finishDebrief({ retire: [] })).toBe(true);
    expect(store.getState().screen).toBe('days');
    expect(store.getState().episode).toBeNull();
  });

  it('campaign Day 1 → cut to 12 → skip to Day 6 with a perk → Day 6 deck is 12 + 3', () => {
    const store = createGameStore();
    const detach = attachAutosave(store);
    store.getState().startCampaign();
    expect(store.getState().screen).toBe('campaign');
    store.getState().openBriefing('campaign', 1);
    store.getState().beginEpisode(77);
    playOut(store);
    store.getState().go('debrief');
    const ep = store.getState().episode;
    if (!ep) throw new Error('no episode');
    const d = debriefOf('campaign', ep.state, store.getState().campaign);
    // The cut is required and validated.
    expect(store.getState().finishDebrief({ retire: [] })).toBe(false);
    expect(store.getState().finishDebrief({ retire: d.cards.slice(0, 2) })).toBe(false);
    expect(store.getState().finishDebrief({ retire: d.cards.slice(0, 3) })).toBe(true);
    const c = store.getState().campaign;
    expect(c?.day).toBe(2);
    expect(c?.deck).toHaveLength(DECK_SIZE);
    expect(c?.retired).toEqual(d.cards.slice(0, 3));
    expect(c?.stars[1]).toEqual(d.stars);
    expect(store.getState().screen).toBe('campaign');
    // Day 3 unlocks a perk: skipping requires a choice for it.
    expect(store.getState().skipDays(6, { 3: 'vanish' })).toBe(true);
    expect(store.getState().campaign?.day).toBe(6);
    expect(store.getState().campaign?.perks).toEqual(['vanish']);
    expect(store.getState().campaign?.skipped).toEqual([2, 3, 4, 5]);
    store.getState().openBriefing('campaign', 6);
    store.getState().beginEpisode(5);
    const setup = store.getState().episode?.setup;
    expect(setup?.deck).toHaveLength(15);
    expect(setup?.perks).toEqual(['vanish']);
    detach();
    // The campaign survives a reload.
    const reloaded = createGameStore(loadSave());
    expect(reloaded.getState().campaign?.day).toBe(6);
    expect(reloaded.getState().episode?.state).toEqual(store.getState().episode?.state);
  });

  it('cannot skip a day that has content', () => {
    const store = createGameStore({ data: emptySave(), corrupt: false });
    store.getState().startCampaign();
    expect(store.getState().skipDays(2, {})).toBe(false);
    expect(store.getState().campaign?.day).toBe(1);
  });
});

describe('cut validation', () => {
  const cards = Array.from({ length: 15 }, (_, i) => `CORE-${String((i % 12) + 1).padStart(2, '0')}`).slice(0, 12);
  const all = [...cards, 'D01-P1', 'D01-P2', 'D01-P3'];
  it('requires exactly N distinct cards from the episode', () => {
    expect(cutError(all, [], 3)).toMatch(/Choose 3 more cards/);
    expect(cutError(all, ['CORE-01'], 3)).toMatch(/Choose 2 more cards/);
    expect(cutError(all, ['CORE-01', 'CORE-02'], 3)).toMatch(/Choose 1 more card to/);
    expect(cutError(all, ['CORE-01', 'CORE-01', 'CORE-02'], 3)).toMatch(/only be retired once/);
    expect(cutError(all, ['CORE-01', 'CORE-02', 'D06-P1'], 3)).toMatch(/not one of your cards/);
    expect(cutError(all, ['CORE-01', 'CORE-02', 'CORE-03', 'CORE-04'], 3)).toMatch(/exactly 3/);
    expect(cutError(all, ['CORE-01', 'CORE-02', 'D01-P3'], 3)).toBeNull();
  });
});
