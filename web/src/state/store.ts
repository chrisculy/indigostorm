// The app store (Zustand). Every game state change goes through engine `apply`; the episode is
// kept as { setup, actions } and its state is rebuilt with `replay` when loaded.

import { useCallback } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { contentDays, dayPlan, playerCardsById, threat } from '../data/index.ts';

import type { PerkId } from '../data/types.ts';
import {
  type Action,
  apply,
  type CampaignState,
  campaignSetup,
  completeDay,
  createEpisode,
  type DecisionChoice,
  type EpisodeSetup,
  type GameEvent,
  type GameState,
  newCampaign,
  prototypeSetup,
  replay,
  type Stars,
  skipDay,
  suggestAction,
} from '../engine/index.ts';
import { briefingRules, debriefOf, type Selection } from './derive.ts';
import {
  type BestResult,
  type EpisodeMode,
  emptySave,
  type LoadResult,
  loadSave,
  type SaveData,
  type SavedEpisode,
  writeSave,
} from './persistence.ts';
import type { Settings } from './settings.ts';

const threatName = (id: string): string => threat(id).name;

export type Screen =
  | 'title'
  | 'days'
  | 'briefing'
  | 'table'
  | 'debrief'
  | 'campaign'
  | 'rulebook'
  | 'settings'
  | 'howto'
  | 'saves';

export const SCREENS: readonly Screen[] = [
  'title',
  'days',
  'briefing',
  'table',
  'debrief',
  'campaign',
  'rulebook',
  'settings',
  'howto',
  'saves',
];

export interface Briefing {
  mode: EpisodeMode;
  day: number;
}

export interface Episode extends SavedEpisode {
  state: GameState;
}

export interface Notice {
  id: number;
  message: string;
  title?: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
  /** 'episode' notices are about the table (Pressure summaries, auto-answers, rejected actions): they
   * are dismissed when the screen changes or the episode ends. */
  scope?: 'episode' | undefined;
}

export interface FlashbackNotice {
  conditioned: string;
  awakened: string;
  text: string;
}

export interface UiState {
  selection: Selection;
  /** Option list narrowed to one slot (after clicking a slot with several options). */
  targetSlot: number | null;
  /** actionKey of the hovered/focused option (board shows its preview). */
  hoverKey: string | null;
  /** actionKey waiting for confirmation (confirmPlays setting). */
  armedKey: string | null;
  /** The bot's suggestion (Hint). */
  hint: Action | null;
}

const EMPTY_UI: UiState = { selection: null, targetSlot: null, hoverKey: null, armedKey: null, hint: null };

export interface GameStore {
  screen: Screen;
  /** Where Back returns to from Rulebook / Settings / How to Play / Saves. */
  returnTo: Screen;
  settings: Settings;
  campaign: CampaignState | null;
  prototypeBest: Record<number, BestResult>;
  rulesSeen: string[];
  flashbacksSeen: string[];
  episode: Episode | null;
  briefing: Briefing | null;
  ui: UiState;
  /** Events of the last action (for narration and animation), with a sequence number. */
  lastEvents: GameEvent[];
  eventSeq: number;
  /** Flashbacks triggered during play, waiting to be shown. */
  flashbackQueue: FlashbackNotice[];
  notices: Notice[];

  go: (screen: Screen) => void;
  back: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  notify: (n: Omit<Notice, 'id'>) => void;
  dismissNotice: (id: number) => void;

  openBriefing: (mode: EpisodeMode, day: number) => void;
  beginEpisode: (seed?: number) => void;
  /** Apply a legal action (plus any automatic answers). Returns false if the engine rejected it. */
  act: (action: Action) => boolean;
  decide: (choice: DecisionChoice) => boolean;
  select: (sel: Selection) => void;
  setTargetSlot: (slot: number | null) => void;
  setHover: (key: string | null) => void;
  arm: (key: string | null) => void;
  clearUi: () => void;
  requestHint: () => Action | null;
  dismissFlashback: () => void;
  /** Record that this profile has read an Awakened card's flashback (e.g. revealed in the Debrief). */
  markFlashbackSeen: (awakenedId: string) => void;
  abandonEpisode: () => void;
  /** Finish the post-episode flow. Campaign: completeDay (validates the cut). */
  finishDebrief: (choices: { retire: string[]; perk?: PerkId | null }) => boolean;

  startCampaign: () => void;
  /** Skip days without content up to (not including) `toDay`, unlocking the chosen perks on perk days. */
  skipDays: (toDay: number, perkChoices: Record<number, PerkId | null>) => boolean;
  markRulesSeen: (ids: readonly string[]) => void;
  replaceData: (data: SaveData) => void;
  resetAll: () => void;
  snapshot: () => SaveData;
}

let noticeId = 1;

export function randomSeed(): number {
  const a = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(a);
  else a[0] = Math.floor(Math.random() * 2 ** 32);
  return a[0] ?? 1;
}

/** Rebuild a saved episode; null if it no longer replays (e.g. card data changed). */
export function restoreEpisode(saved: SavedEpisode | null): Episode | null {
  if (!saved) return null;
  try {
    return { ...saved, state: replay(saved.setup, saved.actions) };
  } catch {
    return null;
  }
}

const isSmallEffect = (d: { lead: number; exposure: number; draw: number }) =>
  Math.abs(d.lead) + Math.abs(d.exposure) + Math.abs(d.draw) <= 1;

/** The automatic answer for a pending decision under the current settings, if any. */
export function autoAnswer(s: GameState, settings: Settings): { choice: DecisionChoice; note: string } | null {
  const d = s.pending;
  if (!d) return null;
  if (d.kind === 'confirmHardenedResolve' && settings.autoHardenedResolve) {
    return { choice: true, note: `Hardened Resolve: Exposure stops at ${d.redline - 1} (auto-answered).` };
  }
  if (d.kind === 'allyCover' && settings.autoDeclineSmallCover && isSmallEffect(d.delta)) {
    return { choice: null, note: 'Ally Cover declined for a 1-point effect (auto-answered).' };
  }
  return null;
}

/** One-line summary of what the Pressure step did (shown as a toast after End plays). */
export function pressureSummary(events: readonly GameEvent[]): Omit<Notice, 'id'> | null {
  const start = events.findIndex((e) => e.type === 'pressureStep' || e.type === 'pressureSkipped');
  if (start < 0) return null;
  if (events[start]?.type === 'pressureSkipped')
    return { tone: 'info', title: 'Pressure step', message: 'Skipped (Adrenaline Surge).' };
  let lead = 0;
  let exposure = 0;
  const notes: string[] = [];
  for (const e of events.slice(start)) {
    if (e.type === 'turnStarted' || e.type === 'episodeEnded') break;
    if (e.type === 'lead') lead += e.delta;
    else if (e.type === 'exposure') exposure += e.delta;
    else if (e.type === 'escaped') notes.push(`${threatName(e.threatId)} escaped`);
    else if (e.type === 'strike') notes.push(`${threatName(e.threatId)} struck`);
    else if (e.type === 'allyCover') notes.push('Ally Cover used');
  }
  const parts: string[] = [];
  if (exposure) parts.push(`${exposure > 0 ? '+' : '−'}${Math.abs(exposure)} Exposure`);
  if (lead) parts.push(`${lead > 0 ? '+' : '−'}${Math.abs(lead)} Lead`);
  parts.push(...notes);
  if (parts.length === 0) return null;
  return {
    tone:
      exposure > 0 || lead < 0 || notes.some((n) => n.endsWith('escaped') || n.endsWith('struck')) ? 'warning' : 'info',
    title: 'Pressure step',
    message: `${parts.join(' · ')}.`,
  };
}

function bestOf(prev: BestResult | undefined, stars: Stars): BestResult {
  const starCount = Number(stars.objective) + Number(stars.cover) + Number(stars.bonus);
  if (!prev) return { stars: { ...stars }, starCount };
  if (starCount > prev.starCount) return { stars: { ...stars }, starCount };
  return prev;
}

export function createGameStore(initial: LoadResult = { data: emptySave(), corrupt: false }): StoreApi<GameStore> {
  const d = initial.data;
  const restored = restoreEpisode(d.episode);
  const startNotices: Notice[] = [];
  if (initial.message) startNotices.push({ id: noticeId++, tone: 'warning', message: initial.message });
  if (d.episode && !restored) {
    startNotices.push({
      id: noticeId++,
      tone: 'warning',
      message: 'The episode in progress could not be restored (the game data changed). It was discarded.',
    });
  }

  const store = createStore<GameStore>()((set, get) => {
    const notify = (n: Omit<Notice, 'id'>) =>
      set((st) => ({ notices: [...st.notices.slice(-4), { ...n, id: noticeId++ }] }));
    /** Events of a Pressure step that a decision (Ally Cover, Hardened Resolve) interrupted: the
     * summary toast waits until the step completes, so it covers everything that happened. */
    let pressureEvents: GameEvent[] | null = null;

    return {
      screen: 'title',
      returnTo: 'title',
      settings: d.settings,
      campaign: d.campaign,
      prototypeBest: d.prototypeBest,
      rulesSeen: d.rulesSeen,
      flashbacksSeen: d.flashbacksSeen,
      episode: restored,
      briefing: null,
      ui: EMPTY_UI,
      lastEvents: [],
      eventSeq: 0,
      flashbackQueue: [],
      notices: startNotices,

      go: (screen) => {
        const st = get();
        const aux: Screen[] = ['rulebook', 'settings', 'howto', 'saves'];
        let target = screen;
        if (target === 'table' && !st.episode) target = 'title';
        if (target === 'debrief' && st.episode?.state.phase !== 'over') target = st.episode ? 'table' : 'title';
        if (target === 'briefing' && !st.briefing) target = 'title';
        if (target === 'campaign' && !st.campaign) target = 'title';
        if (target === st.screen) return;
        set({
          screen: target,
          returnTo: aux.includes(target) && !aux.includes(st.screen) ? st.screen : st.returnTo,
          ui: target === 'table' ? st.ui : EMPTY_UI,
        });
      },
      back: () => get().go(get().returnTo),

      updateSettings: (patch) =>
        set((st) => ({
          settings: { ...st.settings, ...patch, ...(patch.theme !== undefined ? { themeChosen: true } : {}) },
        })),
      notify,
      dismissNotice: (id) => set((st) => ({ notices: st.notices.filter((n) => n.id !== id) })),

      openBriefing: (mode, day) => {
        if (!contentDays.includes(day)) {
          notify({ tone: 'warning', message: `Day ${day} has not been written yet.` });
          return;
        }
        if (mode === 'campaign' && get().campaign?.day !== day) {
          notify({ tone: 'warning', message: 'Campaign days are played in order.' });
          return;
        }
        set({ briefing: { mode, day } });
        get().go('briefing');
      },

      beginEpisode: (seed = randomSeed()) => {
        const st = get();
        const b = st.briefing;
        if (!b) return;
        let setup: EpisodeSetup;
        let state: GameState;
        try {
          if (b.mode === 'campaign') {
            if (!st.campaign) throw new Error('No campaign in progress');
            setup = campaignSetup(st.campaign, seed);
          } else setup = prototypeSetup(b.day, seed);
          state = createEpisode(setup);
        } catch (e) {
          // E.g. a damaged campaign deck (duplicate cards, a Conditioned card next to its Awakened card).
          const why = e instanceof Error ? e.message : 'unknown error';
          notify({
            tone: 'danger',
            title: 'Could not start the episode',
            message:
              b.mode === 'campaign'
                ? `Your campaign deck is invalid (${why}). Import a backup save or start a new campaign.`
                : `${why}.`,
          });
          set({ briefing: null });
          get().go(b.mode === 'campaign' && st.campaign ? 'campaign' : b.mode === 'prototype' ? 'days' : 'title');
          return;
        }
        pressureEvents = null;
        const rules = briefingRules(b.day, setup.perks).map((r) => r.id);
        set({
          episode: { mode: b.mode, setup, actions: [], state },
          ui: EMPTY_UI,
          lastEvents: state.log,
          eventSeq: st.eventSeq + 1,
          flashbackQueue: [],
          rulesSeen: [...new Set([...st.rulesSeen, ...rules])],
        });
        get().go('table');
      },

      act: (action) => {
        const st = get();
        const ep = st.episode;
        if (!ep) return false;
        let state = ep.state;
        const actions = [...ep.actions];
        const events: GameEvent[] = [];
        try {
          const r = apply(state, action);
          state = r.state;
          actions.push(action);
          events.push(...r.events);
          // Automatic answers (settings) are recorded like any other action, so replays match.
          for (let guard = 0; guard < 20; guard++) {
            const auto = autoAnswer(state, st.settings);
            if (!auto) break;
            const a: Action = { type: 'decide', choice: auto.choice };
            const r2 = apply(state, a);
            state = r2.state;
            actions.push(a);
            events.push(...r2.events);
            notify({ tone: 'info', message: auto.note, scope: 'episode' });
          }
        } catch (e) {
          notify({
            tone: 'danger',
            message: e instanceof Error ? e.message : 'That action is not allowed.',
            scope: 'episode',
          });
          return false;
        }
        // Pressure summary: once the step is complete (a decision may interrupt it; then the events of
        // the decide actions that finish it are added before summarizing).
        const startsPressure = events.some((e) => e.type === 'pressureStep' || e.type === 'pressureSkipped');
        const buffered = pressureEvents ? [...pressureEvents, ...events] : startsPressure ? events : null;
        pressureEvents = null;
        if (buffered) {
          const finished =
            !state.pending || buffered.some((e) => e.type === 'turnStarted' || e.type === 'episodeEnded');
          if (!finished) pressureEvents = buffered;
          else if (state.phase !== 'over') {
            // When the episode ends the End banner tells the story; no toast on top of it.
            const summary = pressureSummary(buffered);
            if (summary) notify({ ...summary, scope: 'episode' });
          }
        }
        const flashbacks: FlashbackNotice[] = events.flatMap((e) =>
          e.type === 'awakened' && e.duringPlay
            ? [{ conditioned: e.conditioned, awakened: e.awakened, text: e.flashback }]
            : [],
        );
        let prototypeBest = st.prototypeBest;
        if (state.phase === 'over' && state.result && ep.mode === 'prototype') {
          prototypeBest = { ...prototypeBest, [state.day]: bestOf(prototypeBest[state.day], state.result.stars) };
        }
        set({
          episode: { ...ep, actions, state },
          ui: { ...EMPTY_UI },
          lastEvents: events,
          eventSeq: st.eventSeq + 1,
          flashbackQueue: [...st.flashbackQueue, ...flashbacks],
          prototypeBest,
        });
        return true;
      },
      decide: (choice) => get().act({ type: 'decide', choice }),

      select: (sel) =>
        set((st) => ({ ui: { ...st.ui, selection: sel, targetSlot: null, armedKey: null, hoverKey: null } })),
      setTargetSlot: (slot) => set((st) => ({ ui: { ...st.ui, targetSlot: slot, armedKey: null } })),
      setHover: (key) => set((st) => (st.ui.hoverKey === key ? st : { ui: { ...st.ui, hoverKey: key } })),
      arm: (key) => set((st) => ({ ui: { ...st.ui, armedKey: key } })),
      clearUi: () => set({ ui: EMPTY_UI }),

      requestHint: () => {
        const ep = get().episode;
        if (!ep || ep.state.phase === 'over') return null;
        const a = suggestAction(ep.state);
        if (!a) return null;
        const sel: Selection =
          a.type === 'play'
            ? { kind: 'card', uid: a.cardUid }
            : a.type === 'perk' && a.slot !== undefined
              ? { kind: 'perk', perk: a.perk }
              : get().ui.selection;
        set((st) => ({ ui: { ...st.ui, selection: sel, targetSlot: null, armedKey: null, hint: a } }));
        return a;
      },

      dismissFlashback: () =>
        set((st) => {
          const [first, ...rest] = st.flashbackQueue;
          return {
            flashbackQueue: rest,
            flashbacksSeen: first ? [...new Set([...st.flashbacksSeen, first.awakened])] : st.flashbacksSeen,
          };
        }),

      markFlashbackSeen: (id) =>
        set((st) => (st.flashbacksSeen.includes(id) ? st : { flashbacksSeen: [...st.flashbacksSeen, id] })),

      abandonEpisode: () => {
        pressureEvents = null;
        set({ episode: null, ui: EMPTY_UI, lastEvents: [], flashbackQueue: [] });
      },

      finishDebrief: (choices) => {
        const st = get();
        const ep = st.episode;
        if (ep?.state.phase !== 'over') return false;
        const debrief = debriefOf(ep.mode, ep.state, st.campaign);
        const seen = [...new Set([...st.flashbacksSeen, ...debrief.flashbacks.map((f) => f.awakened)])];
        if (ep.mode === 'campaign') {
          if (!st.campaign) {
            // A campaign episode whose campaign is gone (damaged or replaced save): nothing to record it in.
            notify({
              tone: 'warning',
              title: 'Campaign not found',
              message:
                'This episode belongs to a campaign that is no longer saved on this device, so its result cannot be recorded. The episode was closed.',
            });
            set({ episode: null, flashbacksSeen: seen, ui: EMPTY_UI, briefing: null, flashbackQueue: [] });
            get().go('title');
            return false;
          }
          let next: CampaignState;
          try {
            next = completeDay(st.campaign, debrief, choices);
          } catch (e) {
            notify({ tone: 'danger', message: e instanceof Error ? e.message : 'Invalid choices.' });
            return false;
          }
          set({ campaign: next, episode: null, flashbacksSeen: seen, ui: EMPTY_UI, briefing: null });
          get().go('campaign');
          return true;
        }
        set({ episode: null, flashbacksSeen: seen, ui: EMPTY_UI, briefing: null });
        get().go('days');
        return true;
      },

      startCampaign: () => {
        set({ campaign: newCampaign('campaign'), episode: get().episode?.mode === 'campaign' ? null : get().episode });
        get().go('campaign');
      },

      skipDays: (toDay, perkChoices) => {
        let c = get().campaign;
        if (!c) return false;
        try {
          while (c.day < toDay) {
            const plan = dayPlan(c.day);
            if (plan.hasContent) throw new Error(`Day ${c.day} has content; play it`);
            c = skipDay(c, plan.perkUnlock ? (perkChoices[c.day] ?? null) : null);
          }
        } catch (e) {
          notify({ tone: 'danger', message: e instanceof Error ? e.message : 'Could not skip.' });
          return false;
        }
        set({ campaign: c });
        return true;
      },

      markRulesSeen: (ids) =>
        set((st) =>
          ids.every((i) => st.rulesSeen.includes(i)) ? st : { rulesSeen: [...new Set([...st.rulesSeen, ...ids])] },
        ),

      replaceData: (data) => {
        pressureEvents = null;
        const ep = restoreEpisode(data.episode);
        set({
          settings: data.settings,
          campaign: data.campaign,
          prototypeBest: data.prototypeBest,
          rulesSeen: data.rulesSeen,
          flashbacksSeen: data.flashbacksSeen,
          episode: ep,
          briefing: null,
          ui: EMPTY_UI,
          flashbackQueue: [],
        });
      },

      resetAll: () => {
        pressureEvents = null;
        const e = emptySave();
        set({
          settings: e.settings,
          campaign: null,
          prototypeBest: {},
          rulesSeen: [],
          flashbacksSeen: [],
          episode: null,
          briefing: null,
          ui: EMPTY_UI,
          flashbackQueue: [],
          screen: 'title',
          returnTo: 'title',
        });
      },

      snapshot: () => {
        const st = get();
        return {
          version: 1,
          savedAt: new Date().toISOString(),
          settings: st.settings,
          campaign: st.campaign,
          prototypeBest: st.prototypeBest,
          episode: st.episode ? { mode: st.episode.mode, setup: st.episode.setup, actions: st.episode.actions } : null,
          rulesSeen: st.rulesSeen,
          flashbacksSeen: st.flashbacksSeen,
        };
      },
    };
  });
  return store;
}

/** Autosave: write whenever a persisted slice changes (after every action). */
export function attachAutosave(store: StoreApi<GameStore>, write: (d: SaveData) => boolean = writeSave): () => void {
  let warned = false;
  return store.subscribe((st, prev) => {
    if (
      st.settings === prev.settings &&
      st.campaign === prev.campaign &&
      st.prototypeBest === prev.prototypeBest &&
      st.episode === prev.episode &&
      st.rulesSeen === prev.rulesSeen &&
      st.flashbacksSeen === prev.flashbacksSeen
    )
      return;
    const ok = write(st.snapshot());
    if (!ok && !warned) {
      warned = true;
      st.notify({ tone: 'warning', message: 'Progress cannot be saved in this browser (storage is unavailable).' });
    }
  });
}

// ---------------------------------------------------------------------------- singleton

let singleton: StoreApi<GameStore> | null = null;
let detach: (() => void) | null = null;

export function gameStore(): StoreApi<GameStore> {
  if (!singleton) {
    singleton = createGameStore(loadSave());
    detach = attachAutosave(singleton);
  }
  return singleton;
}

/** Replace the singleton (tests). */
export function resetGameStore(initial?: LoadResult, autosave = false): StoreApi<GameStore> {
  detach?.();
  singleton = createGameStore(initial);
  detach = autosave ? attachAutosave(singleton) : null;
  return singleton;
}

export function useGame<T>(selector: (s: GameStore) => T): T {
  return useStore(gameStore(), selector);
}

/** True when a card must be drawn without its flashback text: an Awakened card whose flashback this
 * profile has not seen yet (spoiler safety, everywhere a player card is shown). */
export function flashbackHidden(id: string, seen: readonly string[]): boolean {
  const c = playerCardsById.get(id);
  return c?.cls === 'Awakened' && !seen.includes(id);
}

/** `(id) => hideFlashback` for the current profile. */
export function useHideFlashback(): (id: string) => boolean {
  const seen = useGame((s) => s.flashbacksSeen);
  return useCallback((id: string) => flashbackHidden(id, seen), [seen]);
}
