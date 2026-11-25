import { beforeEach, describe, expect, it } from 'vitest';
import { contentDays } from '../../data/index.ts';
import { newCampaign, prototypeSetup, suggestAction } from '../../engine/index.ts';
import {
  CORRUPT_KEY,
  emptySave,
  loadSave,
  migrate,
  parseImport,
  SaveFormatError,
  STORAGE_KEY,
  serializeExport,
  writeSave,
} from '../persistence.ts';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../settings.ts';
import { attachAutosave, createGameStore, restoreEpisode } from '../store.ts';

beforeEach(() => localStorage.clear());

describe('persistence', () => {
  it('loads defaults when nothing is stored', () => {
    const r = loadSave();
    expect(r.corrupt).toBe(false);
    expect(r.data).toEqual(emptySave());
  });

  it('round-trips a save through localStorage', () => {
    const d = emptySave();
    d.settings = { ...DEFAULT_SETTINGS, theme: 'light', textSize: 'lg', confirmPlays: true };
    d.campaign = { ...newCampaign(), day: 6, stars: { 1: { objective: true, cover: false, bonus: true } } };
    d.prototypeBest = { 11: { stars: { objective: true, cover: true, bonus: false }, starCount: 2 } };
    d.episode = { mode: 'prototype', setup: prototypeSetup(21, 42), actions: [{ type: 'endPlays' }] };
    d.rulesSeen = ['D01-R1', 'D01-R2'];
    d.flashbacksSeen = ['D16-W1'];
    expect(writeSave(d)).toBe(true);
    const back = loadSave().data;
    expect({ ...back, savedAt: '' }).toEqual({ ...d, savedAt: '' });
  });

  it('round-trips an episode in progress: the replayed state matches the live one', () => {
    const store = createGameStore();
    const detach = attachAutosave(store);
    store.getState().openBriefing('prototype', 6);
    store.getState().beginEpisode(1234);
    for (let i = 0; i < 9; i++) {
      const s = store.getState().episode?.state;
      if (!s || s.phase === 'over') break;
      const a = suggestAction(s);
      if (a) store.getState().act(a);
    }
    detach();
    const live = store.getState().episode?.state;
    const reloaded = createGameStore(loadSave());
    expect(reloaded.getState().episode?.state).toEqual(live);
    expect(reloaded.getState().episode?.actions.length).toBe(store.getState().episode?.actions.length);
  });

  it('keeps corrupt data aside and starts fresh', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    const r = loadSave();
    expect(r.corrupt).toBe(true);
    expect(r.message).toMatch(/could not be read/);
    expect(r.data).toEqual(emptySave());
    expect(localStorage.getItem(CORRUPT_KEY)).toBe('{not json');
  });

  it('rejects saves from a newer version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadSave().corrupt).toBe(true);
    expect(() => migrate({ version: 2 })).toThrow(SaveFormatError);
  });

  it('migrates a version-0 save (no version field, `best` instead of `prototypeBest`)', () => {
    const v0 = {
      settings: { theme: 'contrast', bogus: 1 },
      best: { 1: { stars: { objective: true, cover: true, bonus: true } } },
      rulesSeen: ['D01-R1', 'D01-R1'],
    };
    const d = migrate(v0);
    expect(d.version).toBe(1);
    expect(d.settings.theme).toBe('contrast');
    expect(d.settings).not.toHaveProperty('bogus');
    expect(d.prototypeBest[1]?.starCount).toBe(3);
    expect(d.rulesSeen).toEqual(['D01-R1']);
    expect(d.flashbacksSeen).toEqual([]);
  });

  it('sanitizes bad fields instead of failing', () => {
    const d = migrate({
      version: 1,
      settings: { theme: 'neon', textSize: 'huge', confirmPlays: 'yes' },
      campaign: { day: 3, deck: ['NOT-A-CARD'] },
      episode: { mode: 'campaign', setup: { day: 2, deck: [], seed: 1 }, actions: [] },
      prototypeBest: { 1: { stars: { objective: 'x' } } },
    });
    expect(d.settings).toEqual(DEFAULT_SETTINGS);
    expect(d.campaign).toBeNull();
    expect(d.episode).toBeNull();
    expect(d.prototypeBest).toEqual({});
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('drops an episode that no longer replays', () => {
    const setup = prototypeSetup(1, 7);
    expect(restoreEpisode({ mode: 'prototype', setup, actions: [{ type: 'endPlays' }] })).toBeNull();
    const store = createGameStore({
      data: { ...emptySave(), episode: { mode: 'prototype', setup, actions: [{ type: 'endPlays' }] } },
      corrupt: false,
    });
    expect(store.getState().episode).toBeNull();
    expect(store.getState().notices.some((n) => /could not be restored/.test(n.message))).toBe(true);
  });

  it('exports and imports a save file', () => {
    const d = { ...emptySave(), rulesSeen: ['D06-R1'] };
    const text = serializeExport(d);
    expect(JSON.parse(text).kind).toBe('indigo-storm-save');
    const back = parseImport(text);
    expect(back.rulesSeen).toEqual(['D06-R1']);
    expect(() => parseImport('nope')).toThrow(/not valid JSON/);
    expect(() => parseImport(JSON.stringify({ kind: 'something-else' }))).toThrow(/not an Indigo Storm save/);
  });

  it('every content day has a valid prototype setup that survives sanitizing', () => {
    for (const day of contentDays) {
      const d = migrate({ version: 1, episode: { mode: 'prototype', setup: prototypeSetup(day, 5), actions: [] } });
      expect(d.episode?.setup.day).toBe(day);
    }
  });
});
