import { useSyncExternalStore } from 'react';
import { contentDays, gameData } from './data/index.ts';
import { CardGallery } from './ui/dev/CardGallery.tsx';

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
/** `#gallery` (optionally followed by `&theme=light&motion=reduced&size=lg`) shows the dev card gallery. */
const isGallery = () => location.hash === '#gallery' || location.hash.startsWith('#gallery&');

/** Placeholder shell — replaced by the app workstream (see PLAN.md, Phase 2). */
export function App() {
  const gallery = useSyncExternalStore(subscribeHash, isGallery, () => false);
  if (gallery) return <CardGallery />;
  return (
    <main style={{ fontFamily: 'Inter Variable, system-ui, sans-serif', padding: '2rem' }}>
      <h1 style={{ fontFamily: 'Oswald Variable, sans-serif', letterSpacing: '0.08em' }}>INDIGO STORM</h1>
      <p>
        Data version {gameData.version} · {gameData.playerCards.length} player cards · {gameData.threats.length} Threats
        · playable days: {contentDays.join(', ')}
      </p>
    </main>
  );
}
