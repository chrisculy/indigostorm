// Integration: the real App rendered in happy-dom, driven through the UI.

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../../App.tsx';
import { suggestAction } from '../../../engine/index.ts';
import { resetGameStore } from '../../../state/store.ts';

beforeEach(() => {
  localStorage.clear();
  location.hash = '';
});
afterEach(() => cleanup());

function startDay(day: number, seed = 11) {
  const store = resetGameStore();
  act(() => {
    store.getState().openBriefing('prototype', day);
    store.getState().beginEpisode(seed);
  });
  return store;
}

describe('Table', () => {
  it('renders the board from the player view', () => {
    const store = startDay(1);
    render(<App />);
    expect(screen.getByText('Day 1', { selector: '.topbar__dayno' })).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Scene Row' })).toBeTruthy();
    const hand = screen.getByRole('region', { name: 'Your hand' });
    const cards = within(hand).getAllByRole('button');
    expect(cards).toHaveLength(store.getState().episode?.state.hand.length ?? -1);
    expect(screen.getByRole('button', { name: /End plays/ }).hasAttribute('disabled')).toBe(true);
  });

  it('select a hand card → labeled options → play one', () => {
    const store = startDay(1);
    render(<App />);
    const hand = screen.getByRole('region', { name: 'Your hand' });
    fireEvent.click(within(hand).getAllByRole('button')[0] as HTMLElement);
    const list = screen.getByRole('list', { name: 'Ways to play it' });
    const options = within(list).getAllByRole('button');
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]?.textContent).toMatch(/→/);
    fireEvent.click(options[0] as HTMLElement);
    expect(store.getState().episode?.state.playsUsed).toBe(1);
    expect(screen.getByRole('img', { name: '1 of 2 plays used' })).toBeTruthy();
  });

  it('keyboard: number keys select, Escape cancels, H hints', () => {
    const store = startDay(6, 4);
    render(<App />);
    fireEvent.keyDown(window, { key: '2' });
    const uid = store.getState().episode?.state.hand[1];
    expect(store.getState().ui.selection).toEqual({ kind: 'card', uid });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(store.getState().ui.selection).toBeNull();
    fireEvent.keyDown(window, { key: 'h' });
    expect(store.getState().ui.hint).not.toBeNull();
  });

  it('plays a whole episode with the Hint button and shows the end banner, then the Debrief', () => {
    const store = startDay(11, 21);
    render(<App />);
    for (let i = 0; i < 300; i++) {
      const s = store.getState().episode?.state;
      if (!s || s.phase === 'over') break;
      if (s.pending) {
        const a = suggestAction(s);
        if (!a) throw new Error('no answer');
        act(() => {
          store.getState().act(a);
        });
        continue;
      }
      fireEvent.click(screen.getByRole('button', { name: /^Hint/ }));
      const hinted = document.querySelector<HTMLElement>(
        '.option[data-hint], .end-plays[data-hint], .perk[data-hint] button',
      );
      if (!hinted) throw new Error('hint highlighted nothing');
      fireEvent.click(hinted);
    }
    expect(store.getState().episode?.state.phase).toBe('over');
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Debrief/ }));
    expect(store.getState().screen).toBe('debrief');
    expect(screen.getByText('Day 11 debrief')).toBeTruthy();
  });
});

describe('Screens', () => {
  it('title → prototype days → briefing', () => {
    const store = resetGameStore();
    render(<App />);
    expect(screen.getByRole('button', { name: /Continue/ }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Prototype days' }));
    expect(store.getState().screen).toBe('days');
    fireEvent.click(screen.getByRole('button', { name: /Brief Day 16/ }));
    expect(store.getState().screen).toBe('briefing');
    expect(screen.getByText('Day 16 briefing')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Begin episode/ }).length).toBeGreaterThan(0);
  });

  it('settings change the root attributes', () => {
    const store = resetGameStore();
    render(<App />);
    act(() => store.getState().go('settings'));
    fireEvent.click(screen.getByRole('radio', { name: /Light/ }));
    expect(document.documentElement.dataset.theme).toBe('light');
    fireEvent.click(screen.getByRole('radio', { name: 'Extra large' }));
    expect(document.documentElement.dataset.textSize).toBe('xl');
  });

  it('rulebook search filters the glossary', () => {
    const store = resetGameStore();
    render(<App />);
    act(() => store.getState().go('rulebook'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Pursuer' } });
    expect(screen.getAllByText(/Pursuer/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Lead', { selector: 'dt' })).toBeNull();
  });
});
