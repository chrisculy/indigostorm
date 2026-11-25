// View Transitions for card moves (hand → Threat, Threat refills …), with a plain fallback.

import { flushSync } from 'react-dom';

type StartVT = (cb: () => void) => { finished: Promise<void> };
type VTDocument = Document & { startViewTransition?: StartVT };

const queue: (() => void)[] = [];
let running = false;

function pump(d: VTDocument, start: StartVT): void {
  const root = document.documentElement;
  const fn = queue.shift();
  if (!fn) {
    running = false;
    delete root.dataset.transitioning;
    return;
  }
  running = true;
  root.dataset.transitioning = '';
  try {
    start
      .call(d, () => flushSync(fn))
      .finished.catch(() => {})
      .finally(() => pump(d, start));
  } catch {
    fn();
    pump(d, start);
  }
}

/**
 * Run a state update inside a View Transition when supported and motion is enabled. Updates are
 * serialized, so actions keep their order. <html data-transitioning> is set while one runs.
 */
export function withTransition(enabled: boolean, fn: () => void): void {
  const d = typeof document === 'undefined' ? null : (document as VTDocument);
  const start = d?.startViewTransition;
  if (!d || typeof start !== 'function' || document.hidden || (!enabled && !running)) {
    fn();
    return;
  }
  queue.push(fn);
  if (!running) pump(d, start);
}

/** A stable view-transition-name for a card (ids may contain characters that need escaping). */
export const vtName = (prefix: string, id: string): string => `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
