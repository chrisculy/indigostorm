import './ui/screens/screens.css';
import { useEffect, useSyncExternalStore } from 'react';
import { dayPlan } from './data/index.ts';
import { isGalleryHash } from './state/router.ts';
import { applySettingsToRoot } from './state/settings.ts';
import { gameStore, type Screen, useGame } from './state/store.ts';
import { ToastProvider, useToast } from './ui/components/index.ts';
import { CardGallery } from './ui/dev/CardGallery.tsx';
import { BriefingScreen } from './ui/screens/Briefing.tsx';
import { CampaignMapScreen } from './ui/screens/CampaignMap.tsx';
import { DaySelectScreen } from './ui/screens/DaySelect.tsx';
import { DebriefScreen } from './ui/screens/Debrief.tsx';
import { ErrorBoundary } from './ui/screens/ErrorBoundary.tsx';
import { HowToPlayScreen } from './ui/screens/HowToPlay.tsx';
import { RulebookScreen } from './ui/screens/Rulebook.tsx';
import { SavesScreen } from './ui/screens/Saves.tsx';
import { SettingsScreen } from './ui/screens/Settings.tsx';
import { TitleScreen } from './ui/screens/Title.tsx';
import { Table } from './ui/table/Table.tsx';

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};
/** `#gallery` (optionally followed by `&theme=light&motion=reduced&size=lg`) shows the dev card gallery. */
const isGallery = () => isGalleryHash(location.hash);

/** Mirrors store notices into toasts. */
function NoticeBridge() {
  const notices = useGame((s) => s.notices);
  const dismiss = useGame((s) => s.dismissNotice);
  const toast = useToast();
  useEffect(() => {
    for (const n of notices) {
      toast.push({
        message: n.message,
        title: n.title,
        tone: n.tone,
        duration: n.tone === 'danger' ? 8000 : n.title === 'Pressure step' ? 3500 : 5000,
      });
      dismiss(n.id);
    }
  }, [notices, toast, dismiss]);
  return null;
}

/** Theme / motion / suits / text size on <html>. */
function RootAttributes() {
  const settings = useGame((s) => s.settings);
  useEffect(() => applySettingsToRoot(settings), [settings]);
  return null;
}

function titleFor(screen: Screen, day: number | null, turn: number | null): string {
  const base = 'Indigo Storm';
  switch (screen) {
    case 'table':
      return day ? `Day ${day} · Turn ${Math.max(1, turn ?? 1)} — ${base}` : base;
    case 'briefing':
      return day ? `Day ${day} briefing — ${base}` : base;
    case 'debrief':
      return day ? `Day ${day} debrief — ${base}` : base;
    case 'days':
      return `Prototype days — ${base}`;
    case 'campaign':
      return `Campaign — ${base}`;
    case 'rulebook':
      return `Rulebook — ${base}`;
    case 'settings':
      return `Settings — ${base}`;
    case 'howto':
      return `How to play — ${base}`;
    case 'saves':
      return `Import / export — ${base}`;
    default:
      return base;
  }
}

function DocumentTitle() {
  const screen = useGame((s) => s.screen);
  const epDay = useGame((s) => s.episode?.state.day ?? null);
  const turn = useGame((s) => s.episode?.state.turn ?? null);
  const briefDay = useGame((s) => s.briefing?.day ?? null);
  const day = screen === 'briefing' ? briefDay : epDay;
  useEffect(() => {
    document.title = titleFor(screen, day, turn);
  }, [screen, day, turn]);
  return null;
}

function CurrentScreen() {
  const screen = useGame((s) => s.screen);
  const briefDay = useGame((s) => s.briefing?.day);
  // Validate the day exists before rendering a day-specific screen.
  if (screen === 'briefing' && briefDay) dayPlan(briefDay);
  switch (screen) {
    case 'days':
      return <DaySelectScreen />;
    case 'briefing':
      return <BriefingScreen />;
    case 'table':
      return <Table />;
    case 'debrief':
      return <DebriefScreen />;
    case 'campaign':
      return <CampaignMapScreen />;
    case 'rulebook':
      return <RulebookScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'howto':
      return <HowToPlayScreen />;
    case 'saves':
      return <SavesScreen />;
    default:
      return <TitleScreen />;
  }
}

export function App() {
  const gallery = useSyncExternalStore(subscribeHash, isGallery, () => false);
  if (gallery) return <CardGallery />;
  return (
    <ToastProvider>
      <RootAttributes />
      <DocumentTitle />
      <NoticeBridge />
      <ErrorBoundary
        onResetEpisode={() => {
          const st = gameStore().getState();
          st.abandonEpisode();
          st.go('title');
        }}
      >
        <CurrentScreen />
      </ErrorBoundary>
    </ToastProvider>
  );
}
