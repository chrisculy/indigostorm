import { beforeEach, describe, expect, it } from 'vitest';
import { actionKey, createEpisode, legalActions, prototypeSetup } from '../../engine/index.ts';
import { canEndPlays, optionsFor, playableCards, pressureForecast, viewOf } from '../derive.ts';
import { emptySave } from '../persistence.ts';
import { hashFor, parseHash } from '../router.ts';
import { autoAnswer, createGameStore, pressureSummary } from '../store.ts';

beforeEach(() => localStorage.clear());

function started(day = 1, seed = 99) {
  const store = createGameStore();
  store.getState().openBriefing('prototype', day);
  store.getState().beginEpisode(seed);
  return store;
}

describe('store: navigation', () => {
  it('starts on the title and refuses screens that need context', () => {
    const store = createGameStore();
    expect(store.getState().screen).toBe('title');
    store.getState().go('table');
    expect(store.getState().screen).toBe('title');
    store.getState().go('campaign');
    expect(store.getState().screen).toBe('title');
    store.getState().go('debrief');
    expect(store.getState().screen).toBe('title');
  });

  it('remembers where Back goes from auxiliary screens', () => {
    const store = started();
    expect(store.getState().screen).toBe('table');
    store.getState().go('settings');
    store.getState().go('rulebook');
    store.getState().back();
    expect(store.getState().screen).toBe('table');
  });

  it('only briefs written days, and campaign days in order', () => {
    const store = createGameStore();
    store.getState().openBriefing('prototype', 2);
    expect(store.getState().screen).toBe('title');
    store.getState().startCampaign();
    store.getState().openBriefing('campaign', 6);
    expect(store.getState().screen).toBe('campaign');
    store.getState().openBriefing('campaign', 1);
    expect(store.getState().screen).toBe('briefing');
  });

  it('parses and formats hashes', () => {
    expect(parseHash('#/table')).toBe('table');
    expect(parseHash('#days')).toBe('days');
    expect(parseHash('#/nope')).toBeNull();
    expect(parseHash('#gallery')).toBeNull();
    expect(hashFor('debrief')).toBe('#/debrief');
  });
});

describe('store: episode', () => {
  it('begins an episode from the briefing and marks its Rule Cards read', () => {
    const store = started(6);
    const st = store.getState();
    expect(st.episode?.setup.day).toBe(6);
    expect(st.episode?.state).toEqual(createEpisode(prototypeSetup(6, 99)));
    expect(st.rulesSeen).toEqual(expect.arrayContaining(['D06-R1', 'D06-R2', 'PROTO-R1']));
  });

  it('applies legal actions through the engine and records them', () => {
    const store = started();
    const s0 = store.getState().episode?.state;
    if (!s0) throw new Error('no episode');
    const a = legalActions(s0)[0];
    if (!a) throw new Error('no action');
    expect(store.getState().act(a)).toBe(true);
    const ep = store.getState().episode;
    expect(ep?.actions).toEqual([a]);
    expect(ep?.state.playsUsed).toBe(1);
    expect(store.getState().lastEvents.length).toBeGreaterThan(0);
    expect(store.getState().eventSeq).toBe(2);
  });

  it('rejects illegal actions without changing state', () => {
    const store = started();
    const before = store.getState().episode;
    expect(store.getState().act({ type: 'endPlays' })).toBe(false);
    expect(store.getState().episode).toBe(before);
    expect(store.getState().notices.at(-1)?.tone).toBe('danger');
  });

  it('selection drives options; acting clears the selection', () => {
    const store = started();
    const s = store.getState().episode?.state;
    if (!s) throw new Error('no episode');
    const uid = [...playableCards(s)][0] as string;
    store.getState().select({ kind: 'card', uid });
    const opts = optionsFor(s, store.getState().ui.selection);
    expect(opts.length).toBeGreaterThan(0);
    for (const o of opts) {
      expect(o.label).toBeTruthy();
      expect(legalActions(s).some((a) => actionKey(a) === o.key)).toBe(true);
    }
    store.getState().setTargetSlot(0);
    expect(store.getState().ui.targetSlot).toBe(0);
    store.getState().act((opts[0] as (typeof opts)[0]).action);
    expect(store.getState().ui.selection).toBeNull();
  });

  it('hint selects the suggested card and stores the suggestion', () => {
    const store = started(11, 3);
    const a = store.getState().requestHint();
    expect(a).not.toBeNull();
    expect(store.getState().ui.hint).toEqual(a);
    if (a?.type === 'play') expect(store.getState().ui.selection).toEqual({ kind: 'card', uid: a.cardUid });
  });

  it('view never exposes the draw pile order', () => {
    const store = started();
    const s = store.getState().episode?.state;
    if (!s) throw new Error('no episode');
    const v = viewOf(s);
    expect(v).not.toHaveProperty('drawPile');
    expect(v.drawPileCount).toBe(s.drawPile.length);
    expect(canEndPlays(s)).toBe(false);
    expect(Array.isArray(pressureForecast(v))).toBe(true);
  });

  it('abandoning clears the episode', () => {
    const store = started();
    store.getState().abandonEpisode();
    expect(store.getState().episode).toBeNull();
  });
});

describe('store: automatic answers', () => {
  it('auto-answers Hardened Resolve and small Ally Cover only when enabled', () => {
    const s = createEpisode(prototypeSetup(21, 1));
    const hr = {
      ...s,
      pending: {
        kind: 'confirmHardenedResolve' as const,
        amount: 2,
        exposure: 5,
        redline: 6,
        source: { kind: 'pressure' as const },
      },
    };
    const cover = {
      ...s,
      pending: {
        kind: 'allyCover' as const,
        effect: 'pressure' as const,
        slot: 0,
        threatId: 'D21-T01',
        delta: { lead: 0, exposure: 1, draw: 0 },
        allies: ['D06-P2'],
      },
    };
    const big = { ...cover, pending: { ...cover.pending, delta: { lead: 0, exposure: 2, draw: 0 } } };
    const off = emptySave().settings;
    const on = { ...off, autoHardenedResolve: true, autoDeclineSmallCover: true };
    expect(autoAnswer(hr, off)).toBeNull();
    expect(autoAnswer(hr, on)?.choice).toBe(true);
    expect(autoAnswer(cover, off)).toBeNull();
    expect(autoAnswer(cover, on)?.choice).toBeNull();
    expect(autoAnswer(big, on)).toBeNull();
  });
});

describe('store: settings and data', () => {
  it('updates settings and resets everything', () => {
    const store = started();
    store.getState().updateSettings({ theme: 'contrast', textSize: 'xl' });
    expect(store.getState().settings.theme).toBe('contrast');
    store.getState().resetAll();
    expect(store.getState().settings.theme).toBe('system');
    expect(store.getState().episode).toBeNull();
    expect(store.getState().screen).toBe('title');
  });

  it('snapshot / replaceData round-trip', () => {
    const store = started(16, 5);
    const snap = store.getState().snapshot();
    const other = createGameStore();
    other.getState().replaceData(snap);
    expect(other.getState().episode?.state).toEqual(store.getState().episode?.state);
  });
});

describe('pressure summary', () => {
  it('summarizes the Pressure step events after End plays', () => {
    expect(pressureSummary([])).toBeNull();
    expect(pressureSummary([{ type: 'pressureSkipped' }])?.message).toMatch(/Skipped/);
    const s = pressureSummary([
      { type: 'pressureStep' },
      { type: 'exposure', delta: 1, value: 2, src: { kind: 'pressure', id: 'D01-T02' } },
      { type: 'escaped', slot: 1, threatId: 'D01-T06' },
      { type: 'exposure', delta: 2, value: 4, src: { kind: 'expiry', id: 'D01-T06' } },
      { type: 'turnStarted', turn: 3 },
      { type: 'exposure', delta: -1, value: 3, src: { kind: 'ability' } },
    ]);
    expect(s?.tone).toBe('warning');
    expect(s?.message).toBe('+3 Exposure · Fire Alarm escaped.');
    expect(pressureSummary([{ type: 'pressureStep' }, { type: 'turnStarted', turn: 2 }])).toBeNull();
  });
});
