// Hash routing (#/table, #/days, …): works from file:// and under any GitHub Pages subpath.
// The store's `screen` is the source of truth; the hash mirrors it and Back/Forward drive it.

import type { StoreApi } from 'zustand/vanilla';
import { type GameStore, SCREENS, type Screen } from './store.ts';

export const isGalleryHash = (hash: string): boolean => hash === '#gallery' || hash.startsWith('#gallery&');

export function parseHash(hash: string): Screen | null {
  const m = /^#\/?([a-z]+)/.exec(hash);
  const name = m?.[1];
  return name && (SCREENS as readonly string[]).includes(name) ? (name as Screen) : null;
}

export const hashFor = (screen: Screen): string => `#/${screen}`;

export function attachRouter(store: StoreApi<GameStore>): () => void {
  if (typeof window === 'undefined') return () => {};
  const initial = parseHash(location.hash);
  if (initial && !isGalleryHash(location.hash)) store.getState().go(initial);
  const sync = () => {
    if (isGalleryHash(location.hash)) return;
    const want = hashFor(store.getState().screen);
    if (location.hash !== want) history.replaceState(history.state, '', want);
  };
  sync();
  const unsub = store.subscribe((st, prev) => {
    if (st.screen === prev.screen || isGalleryHash(location.hash)) return;
    const want = hashFor(st.screen);
    if (location.hash !== want) history.pushState(null, '', want);
  });
  const onNav = () => {
    if (isGalleryHash(location.hash)) return;
    const s = parseHash(location.hash);
    store.getState().go(s ?? 'title');
    sync(); // the store may have refused (e.g. #/table without an episode)
  };
  window.addEventListener('popstate', onNav);
  window.addEventListener('hashchange', onNav);
  return () => {
    unsub();
    window.removeEventListener('popstate', onNav);
    window.removeEventListener('hashchange', onNav);
  };
}
