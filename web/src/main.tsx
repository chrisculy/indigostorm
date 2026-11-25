import './ui/styles/fonts.css';
import './ui/styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { attachRouter } from './state/router.ts';
import { applySettingsToRoot } from './state/settings.ts';
import { gameStore } from './state/store.ts';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

// Load the save (and apply its theme) before the first paint, then mirror the screen in the URL hash.
const store = gameStore();
applySettingsToRoot(store.getState().settings);
attachRouter(store);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
