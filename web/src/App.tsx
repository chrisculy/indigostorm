import { contentDays, gameData } from './data/index.ts';

/** Placeholder shell — replaced by the app workstream (see PLAN.md, Phase 2). */
export function App() {
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
