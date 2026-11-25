// Local persistence: one versioned JSON document in localStorage, plus file export/import.
// No network: export is a Blob download, import reads a user-chosen file.

import { contentDays, perksById, playerCardsById } from '../data/index.ts';
import type { Action, CampaignState, EpisodeSetup, Stars } from '../engine/index.ts';
import { DEFAULT_SETTINGS, type Settings, sanitizeSettings } from './settings.ts';

export const STORAGE_KEY = 'indigo-storm/v1';
export const CORRUPT_KEY = 'indigo-storm/v1.corrupt';
export const SAVE_VERSION = 1;

export type EpisodeMode = 'prototype' | 'campaign';

/** An episode in progress (or finished but not yet debriefed): rebuilt with engine `replay`. */
export interface SavedEpisode {
  mode: EpisodeMode;
  setup: EpisodeSetup;
  actions: Action[];
}

export interface BestResult {
  stars: Stars;
  starCount: number;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  /** ISO time of the last write (informational). */
  savedAt: string;
  settings: Settings;
  campaign: CampaignState | null;
  /** Prototype mode: best Stars per day. */
  prototypeBest: Record<number, BestResult>;
  episode: SavedEpisode | null;
  /** Rule Card ids the player has read (Rulebook). */
  rulesSeen: string[];
  /** Awakened card ids whose flashback the player has seen (any mode). */
  flashbacksSeen: string[];
}

export function emptySave(): SaveData {
  return {
    version: SAVE_VERSION,
    savedAt: new Date(0).toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    campaign: null,
    prototypeBest: {},
    episode: null,
    rulesSeen: [],
    flashbacksSeen: [],
  };
}

// ---------------------------------------------------------------------------- validation

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const isStars = (v: unknown): v is Stars =>
  isObj(v) && typeof v.objective === 'boolean' && typeof v.cover === 'boolean' && typeof v.bonus === 'boolean';

function sanitizeStarsMap(v: unknown): Record<number, Stars> {
  const out: Record<number, Stars> = {};
  if (!isObj(v)) return out;
  for (const [k, st] of Object.entries(v)) {
    const d = Number(k);
    if (Number.isInteger(d) && d >= 1 && d <= 30 && isStars(st)) out[d] = { ...st };
  }
  return out;
}

/** A campaign that references only known cards and perks, or null. */
export function sanitizeCampaign(v: unknown): CampaignState | null {
  if (!isObj(v)) return null;
  const deck = strings(v.deck);
  const day = Number(v.day);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;
  if (deck.length === 0 || deck.some((id) => !playerCardsById.has(id))) return null;
  const perks = strings(v.perks).filter((p) => perksById.has(p as never)) as CampaignState['perks'];
  return {
    version: 1,
    mode: v.mode === 'prototype' ? 'prototype' : 'campaign',
    day,
    deck,
    retired: strings(v.retired).filter((id) => playerCardsById.has(id)),
    perks,
    stars: sanitizeStarsMap(v.stars),
    flashbacksSeen: strings(v.flashbacksSeen),
    skipped: Array.isArray(v.skipped) ? v.skipped.filter((d): d is number => Number.isInteger(d)) : [],
  };
}

function sanitizeEpisode(v: unknown): SavedEpisode | null {
  if (!isObj(v) || !isObj(v.setup) || !Array.isArray(v.actions)) return null;
  const s = v.setup;
  const day = Number(s.day);
  if (!contentDays.includes(day) || typeof s.seed !== 'number') return null;
  const deck = strings(s.deck);
  if (deck.length === 0 || deck.some((id) => !playerCardsById.has(id))) return null;
  const setup: EpisodeSetup = {
    day,
    deck,
    perks: strings(s.perks).filter((p) => perksById.has(p as never)) as EpisodeSetup['perks'],
    seed: s.seed,
  };
  if (s.twist !== undefined) setup.twist = (s.twist ?? null) as NonNullable<EpisodeSetup['twist']> | null;
  const actions = v.actions.filter((a): a is Action => isObj(a) && typeof a.type === 'string');
  return { mode: v.mode === 'campaign' ? 'campaign' : 'prototype', setup, actions };
}

function sanitizeBest(v: unknown): Record<number, BestResult> {
  const out: Record<number, BestResult> = {};
  if (!isObj(v)) return out;
  for (const [k, b] of Object.entries(v)) {
    const d = Number(k);
    if (!Number.isInteger(d) || !isObj(b) || !isStars(b.stars)) continue;
    out[d] = {
      stars: { ...b.stars },
      starCount: Number(b.stars.objective) + Number(b.stars.cover) + Number(b.stars.bonus),
    };
  }
  return out;
}

// ---------------------------------------------------------------------------- migrations

/** Migrations from version N to N + 1. Version 0 = pre-release saves without a version field. */
const MIGRATIONS: Record<number, (raw: Record<string, unknown>) => Record<string, unknown>> = {
  0: (raw) => ({
    // v0 kept `best` instead of `prototypeBest` and had no flashback list.
    ...raw,
    prototypeBest: raw.prototypeBest ?? raw.best ?? {},
    flashbacksSeen: raw.flashbacksSeen ?? [],
    version: 1,
  }),
};

export class SaveFormatError extends Error {
  override name = 'SaveFormatError';
}

/** Bring any parsed save up to the current version and sanitize it. Throws SaveFormatError when
 * the document is not a save at all or comes from a newer version of the app. */
export function migrate(raw: unknown): SaveData {
  if (!isObj(raw)) throw new SaveFormatError('Not an Indigo Storm save');
  let doc: Record<string, unknown> = { ...raw };
  let v = typeof doc.version === 'number' ? doc.version : 0;
  if (v > SAVE_VERSION) throw new SaveFormatError(`This save comes from a newer version (v${v})`);
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new SaveFormatError(`No migration from save version ${v}`);
    doc = m(doc);
    v = typeof doc.version === 'number' ? doc.version : v + 1;
  }
  return {
    version: SAVE_VERSION,
    savedAt: typeof doc.savedAt === 'string' ? doc.savedAt : new Date(0).toISOString(),
    settings: sanitizeSettings(doc.settings),
    campaign: sanitizeCampaign(doc.campaign),
    prototypeBest: sanitizeBest(doc.prototypeBest),
    episode: sanitizeEpisode(doc.episode),
    rulesSeen: [...new Set(strings(doc.rulesSeen))],
    flashbacksSeen: [...new Set(strings(doc.flashbacksSeen))],
  };
}

// ---------------------------------------------------------------------------- storage

export interface LoadResult {
  data: SaveData;
  /** Something was stored but could not be read (it was moved to CORRUPT_KEY). */
  corrupt: boolean;
  /** Why loading fell back to defaults, for a toast. */
  message?: string;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // e.g. storage disabled by the browser
  }
}

export function loadSave(): LoadResult {
  const ls = storage();
  const raw = ls?.getItem(STORAGE_KEY) ?? null;
  if (raw === null) return { data: emptySave(), corrupt: false };
  try {
    return { data: migrate(JSON.parse(raw)), corrupt: false };
  } catch (e) {
    try {
      ls?.setItem(CORRUPT_KEY, raw);
    } catch {
      /* ignore */
    }
    return {
      data: emptySave(),
      corrupt: true,
      message: `Saved data could not be read (${e instanceof Error ? e.message : 'unknown error'}). A backup was kept; starting fresh.`,
    };
  }
}

/** Write the save. Returns false if storage is unavailable or full. */
export function writeSave(data: SaveData): boolean {
  const ls = storage();
  if (!ls) return false;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  const ls = storage();
  try {
    ls?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** The raw stored string (for the error screen's "copy save"). */
export function rawSave(): string {
  return storage()?.getItem(STORAGE_KEY) ?? '';
}

// ---------------------------------------------------------------------------- files

export const EXPORT_KIND = 'indigo-storm-save';

export function serializeExport(data: SaveData): string {
  return JSON.stringify({ kind: EXPORT_KIND, ...data, savedAt: new Date().toISOString() }, null, 2);
}

/** Parse an exported file's text into a save. Throws SaveFormatError with a readable message. */
export function parseImport(text: string): SaveData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveFormatError('The file is not valid JSON');
  }
  if (!isObj(raw) || (raw.kind !== undefined && raw.kind !== EXPORT_KIND)) {
    throw new SaveFormatError('The file is not an Indigo Storm save');
  }
  const { kind: _kind, ...rest } = raw;
  return migrate(rest);
}

/** Offer the save as a .json download (Blob + <a download>; no network). */
export function downloadSave(data: SaveData, now = new Date()): string {
  const name = `indigo-storm-save-${now.toISOString().slice(0, 10)}.json`;
  const blob = new Blob([serializeExport(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return name;
}

/** Read a user-chosen file as text. */
export function readFileText(file: Blob): Promise<string> {
  if (typeof file.text === 'function') return file.text();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}
