// Regression tests for the UI-fix pass: robustness, Pressure summaries, spoilers, settings migration.

import { beforeEach, describe, expect, it } from 'vitest';
import { gameData } from '../../data/index.ts';
import { campaignSetup, createEpisode, newCampaign, prototypeSetup, suggestAction } from '../../engine/index.ts';
import { unlockedRuleDays, visibleGlossary, visibleQuickReference } from '../../ui/screens/rulesText.ts';
import { emptySave, loadSave, migrate, STORAGE_KEY } from '../persistence.ts';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../settings.ts';
import { createGameStore, flashbackHidden } from '../store.ts';

beforeEach(() => localStorage.clear());

const episodeWith = (setup: Record<string, unknown>) => ({
  ...emptySave(),
  episode: { mode: 'prototype', setup: { ...prototypeSetup(1, 1), ...setup }, actions: [] },
});

describe('saved episode validation', () => {
  it('drops an episode with a non-number seed, with a notice', () => {
    for (const seed of ['1', null, 1.5, Number.POSITIVE_INFINITY]) {
      const warnings: string[] = [];
      const d = migrate(episodeWith({ seed }), warnings);
      expect(d.episode).toBeNull();
      expect(warnings.join(' ')).toMatch(/seed/);
    }
  });

  it('drops an episode with an unknown twist code, with a notice', () => {
    const warnings: string[] = [];
    expect(migrate(episodeWith({ twist: 'bogus' }), warnings).episode).toBeNull();
    expect(warnings.join(' ')).toMatch(/twist/);
    expect(migrate(episodeWith({ twist: 'four_slots' })).episode?.setup.twist).toBe('four_slots');
    expect(migrate(episodeWith({ twist: null })).episode).not.toBeNull();
  });

  it('turns the warning into a load message (shown as a toast)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(episodeWith({ seed: 'x' })));
    const r = loadSave();
    expect(r.corrupt).toBe(false);
    expect(r.data.episode).toBeNull();
    expect(r.message).toMatch(/discarded/);
    const store = createGameStore(r);
    expect(store.getState().notices.some((n) => /discarded/.test(n.message))).toBe(true);
  });
});

describe('store robustness', () => {
  it('a bad campaign deck shows a notice instead of throwing, and returns to the campaign map', () => {
    const campaign = { ...newCampaign('campaign'), deck: ['CORE-01', 'CORE-01', 'CORE-02'] };
    const store = createGameStore({ data: { ...emptySave(), campaign }, corrupt: false });
    store.getState().go('campaign');
    store.getState().openBriefing('campaign', 1);
    expect(store.getState().screen).toBe('briefing');
    expect(() => store.getState().beginEpisode(3)).not.toThrow();
    expect(store.getState().episode).toBeNull();
    expect(store.getState().screen).toBe('campaign');
    expect(store.getState().notices.some((n) => n.tone === 'danger')).toBe(true);
  });

  it('finishing the debrief of a campaign episode without a campaign recovers with a notice', () => {
    const setup = campaignSetup(newCampaign('campaign'), 5);
    let s = createEpisode(setup);
    const store = createGameStore({
      data: { ...emptySave(), episode: { mode: 'campaign', setup, actions: [] } },
      corrupt: false,
    });
    while (s.phase !== 'over') {
      const a = suggestAction(s);
      if (!a) break;
      expect(store.getState().act(a)).toBe(true);
      s = store.getState().episode?.state ?? s;
    }
    expect(s.phase).toBe('over');
    store.getState().go('debrief');
    expect(store.getState().finishDebrief({ retire: [] })).toBe(false);
    expect(store.getState().episode).toBeNull();
    expect(store.getState().screen).toBe('title');
    expect(store.getState().notices.some((n) => /Campaign not found/.test(n.title ?? ''))).toBe(true);
  });
});

describe('Pressure summary across a decision', () => {
  it('waits for the decision that completes the Pressure step, then summarizes everything', () => {
    // Find a game where End plays stops on an Ally Cover prompt.
    for (const day of [6, 21]) {
      for (let seed = 1; seed < 300; seed++) {
        const store = createGameStore();
        store.getState().openBriefing('prototype', day);
        store.getState().beginEpisode(seed);
        for (let i = 0; i < 200; i++) {
          const st = store.getState().episode?.state;
          if (!st || st.phase === 'over') break;
          if (st.pending) {
            store.getState().decide(st.pending.kind === 'allyCover' ? null : (suggestAction(st) as never));
            continue;
          }
          const a = suggestAction(st);
          if (!a) break;
          const before = store.getState().notices.length;
          store.getState().act(a);
          const after = store.getState().episode?.state;
          if (a.type === 'endPlays' && after?.pending?.kind === 'allyCover' && after.phase !== 'over') {
            const pressureNotices = () =>
              store.getState().notices.filter((n) => n.title === 'Pressure step' && n.scope === 'episode');
            expect(store.getState().notices.length).toBe(before); // no partial summary yet
            const delta = after.pending.delta;
            let guard = 0;
            while (store.getState().episode?.state.pending && guard++ < 10) store.getState().decide(null);
            const end = store.getState().episode?.state;
            if (end?.phase === 'over') return; // the summary gives way to the End banner
            const n = pressureNotices();
            expect(n).toHaveLength(1);
            if (delta.exposure > 0) expect(n[0]?.message).toMatch(/Exposure/);
            return;
          }
        }
      }
    }
    throw new Error('no Ally Cover prompt found during a Pressure step');
  });
});

describe('spoilers', () => {
  it('hides flashbacks the profile has not seen', () => {
    const awakened = gameData.playerCards.find((c) => c.cls === 'Awakened');
    const training = gameData.playerCards.find((c) => c.cls === 'Training');
    expect(awakened && training).toBeTruthy();
    if (!awakened || !training) return;
    expect(flashbackHidden(awakened.id, [])).toBe(true);
    expect(flashbackHidden(awakened.id, [awakened.id])).toBe(false);
    expect(flashbackHidden(training.id, [])).toBe(false);
  });

  it('the Rulebook describes a mechanic only after its Rule Card was read', () => {
    const text = (seen: string[]) => {
      const days = unlockedRuleDays(seen, gameData.rules);
      return JSON.stringify([visibleQuickReference(days), visibleGlossary(days)]);
    };
    const fresh = text([]);
    for (const word of ['Pursuer', 'Encrypted', 'Countermeasure', 'Two-Phase', 'Flashback', 'Gear', 'Ally', 'Perk']) {
      expect(fresh).not.toMatch(new RegExp(`\\b${word}`, 'i'));
    }
    expect(fresh).toMatch(/Clean Clear/);
    expect(text(['D21-R1'])).toMatch(/Pursuer/);
    expect(text(['D11-R1'])).toMatch(/Encrypted/);
    expect(text(['D06-R2'])).toMatch(/Ally Cover/);
    expect(text(['D26-R1'])).toMatch(/Countermeasure/);
    expect(text(['D16-R1'])).toMatch(/Flashback/);
    expect(text(['PROTO-R1'])).toMatch(/Clearance Perks/);
  });
});

describe('settings', () => {
  it('defaults to the system theme and migrates the old unchosen dark default', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('system');
    expect(sanitizeSettings({ theme: 'dark' }).theme).toBe('system');
    expect(sanitizeSettings({ theme: 'dark', themeChosen: true }).theme).toBe('dark');
    expect(sanitizeSettings({ theme: 'light' }).theme).toBe('light');
    const store = createGameStore();
    store.getState().updateSettings({ theme: 'dark' });
    expect(store.getState().settings).toMatchObject({ theme: 'dark', themeChosen: true });
    expect(sanitizeSettings(JSON.parse(JSON.stringify(store.getState().settings))).theme).toBe('dark');
  });

  it('has an animation speed setting', () => {
    expect(DEFAULT_SETTINGS.speed).toBe('normal');
    expect(sanitizeSettings({ speed: 'instant' }).speed).toBe('instant');
    expect(sanitizeSettings({ speed: 'warp' }).speed).toBe('normal');
  });
});
