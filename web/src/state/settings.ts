// Player settings (persisted with the save). Applied to <html> as data-* attributes by the app shell.

export type ThemeSetting = 'system' | 'dark' | 'light' | 'contrast';
export type MotionSetting = 'system' | 'full' | 'reduced';
export type TextSize = 'sm' | 'md' | 'lg' | 'xl';

export interface Settings {
  theme: ThemeSetting;
  motion: MotionSetting;
  textSize: TextSize;
  /** High-contrast suit colors. */
  hcSuits: boolean;
  /** Ask before ending the PLAY step (the Pressure step follows). */
  confirmEndPlays: boolean;
  /** Clicking an option arms it; a second click / Enter confirms it. */
  confirmPlays: boolean;
  /** Answer the Hardened Resolve prompt with "yes" automatically. */
  autoHardenedResolve: boolean;
  /** Decline Ally Cover automatically when the effect is worth a single point. */
  autoDeclineSmallCover: boolean;
  /** Show the hover preview of cards (larger copy beside the pointer). */
  hoverPreview: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  motion: 'system',
  textSize: 'md',
  hcSuits: false,
  confirmEndPlays: false,
  confirmPlays: false,
  autoHardenedResolve: false,
  autoDeclineSmallCover: false,
  hoverPreview: true,
};

const THEMES: readonly ThemeSetting[] = ['system', 'dark', 'light', 'contrast'];
const MOTIONS: readonly MotionSetting[] = ['system', 'full', 'reduced'];
const SIZES: readonly TextSize[] = ['sm', 'md', 'lg', 'xl'];

/** Coerce anything (old saves, imported files) into valid settings; unknown keys are dropped. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = <T>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  const d = DEFAULT_SETTINGS;
  return {
    theme: pick(r.theme, THEMES, d.theme),
    motion: pick(r.motion, MOTIONS, d.motion),
    textSize: pick(r.textSize, SIZES, d.textSize),
    hcSuits: bool(r.hcSuits, d.hcSuits),
    confirmEndPlays: bool(r.confirmEndPlays, d.confirmEndPlays),
    confirmPlays: bool(r.confirmPlays, d.confirmPlays),
    autoHardenedResolve: bool(r.autoHardenedResolve, d.autoHardenedResolve),
    autoDeclineSmallCover: bool(r.autoDeclineSmallCover, d.autoDeclineSmallCover),
    hoverPreview: bool(r.hoverPreview, d.hoverPreview),
  };
}

/** Reflect settings on the root element (theme, motion, suits, text size). */
export function applySettingsToRoot(s: Settings, root: HTMLElement = document.documentElement): void {
  if (s.theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = s.theme;
  if (s.motion === 'system') delete root.dataset.motion;
  else root.dataset.motion = s.motion;
  if (s.hcSuits) root.dataset.suits = 'hc';
  else delete root.dataset.suits;
  root.dataset.textSize = s.textSize;
}

/** True when animations should run (setting, else the OS preference). */
export function motionEnabled(s: Settings): boolean {
  if (s.motion === 'reduced') return false;
  if (s.motion === 'full') return true;
  return !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
}
