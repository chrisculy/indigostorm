// The decision sheet renders every kind of state.pending with the exact effect and its choices.

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../../App.tsx';
import type { Decision } from '../../../engine/index.ts';
import { resetGameStore } from '../../../state/store.ts';

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

function withPending(pending: Decision) {
  const store = resetGameStore();
  act(() => {
    store.getState().openBriefing('prototype', 21);
    store.getState().beginEpisode(8);
  });
  const ep = store.getState().episode;
  if (!ep) throw new Error('no episode');
  act(() => store.setState({ episode: { ...ep, state: { ...ep.state, pending } } }));
  render(<App />);
  return store;
}

describe('DecisionSheet', () => {
  it('Ally Cover shows the effect, one button per Ally and a decline', () => {
    withPending({
      kind: 'allyCover',
      effect: 'strike',
      slot: 3,
      threatId: 'D21-T10',
      delta: { lead: 0, exposure: 2, draw: 0 },
      allies: ['D06-P2', 'D11-P2'],
    });
    expect(screen.getByRole('heading', { name: 'Ally Cover?' })).toBeTruthy();
    expect(screen.getByText(/Strike · Hunter-Killer Team/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Defeat .* to cancel/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Take it \(\+2 Exposure\)/ })).toBeTruthy();
  });

  it('Hardened Resolve explains the redline', () => {
    withPending({ kind: 'confirmHardenedResolve', amount: 2, exposure: 5, redline: 6, source: { kind: 'pressure' } });
    expect(screen.getByRole('button', { name: /Yes, stop at 5/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /let it reach 7/ })).toBeTruthy();
  });

  it('reorder and Satellite list the Threats with move buttons', () => {
    withPending({ kind: 'satellite', cards: ['D21-T01', 'D21-T02', 'D21-T03'], maxDiscard: 2 });
    expect(screen.getByRole('heading', { name: 'Satellite Overwrite' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Move .* up$/ })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Discard' })).toHaveLength(3);
    cleanup();
    withPending({ kind: 'reorderTop', cards: ['D21-T01', 'D21-T02'], card: 'CORE-01' });
    expect(screen.getByRole('heading', { name: 'Reorder the Threat Deck' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Put back/ })).toBeTruthy();
  });

  it('Cloned Credentials offers the deck and a skip; Kinetic Momentum offers slots', () => {
    withPending({ kind: 'chooseCard', options: ['CORE-01', 'CORE-02'] });
    expect(screen.getByRole('button', { name: /Skip/ })).toBeTruthy();
    cleanup();
    withPending({ kind: 'kineticTarget', excess: 3, options: [1] });
    expect(screen.getByRole('button', { name: /\+3 Power to/ })).toBeTruthy();
    expect(document.querySelectorAll('.slot[data-target]').length).toBe(1);
  });
});
