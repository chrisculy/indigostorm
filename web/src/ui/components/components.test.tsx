import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, Dialog, IconButton, StarRow, Tabs, ToastProvider, Track, useToast } from './index.ts';

afterEach(cleanup);

function Pusher() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.push({ message: 'Locked Door cleared.', tone: 'success' })}>
      push
    </button>
  );
}

describe('Button / IconButton', () => {
  it('defaults to type=button and shows a key hint', () => {
    render(<Button kbd="Enter">End plays</Button>);
    const btn = screen.getByRole('button', { name: /End plays/ });
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.querySelector('kbd')?.textContent).toBe('Enter');
  });

  it('IconButton is named by its label', () => {
    render(<IconButton label="Open menu" icon={<span />} />);
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy();
  });
});

describe('Track', () => {
  it('exposes a meter with a full text value', () => {
    render(<Track kind="exposure" value={2} max={6} threshold={2} redline={6} />);
    const meter = screen.getByRole('meter', { name: 'Exposure' });
    expect(meter.getAttribute('aria-valuetext')).toBe('Exposure 2 of 6. Cover at 2 or less. Redline 6.');
  });
});

describe('StarRow', () => {
  it('summarises earned Stars', () => {
    render(
      <StarRow
        stars={[
          { label: 'Objective', earned: true },
          { label: 'Cover', earned: false },
          { label: 'Bonus', earned: true },
        ]}
      />,
    );
    expect(
      screen.getByRole('img', { name: '2 of 3 Stars: Objective earned, Cover not earned, Bonus earned' }),
    ).toBeTruthy();
  });
});

describe('Tabs', () => {
  it('moves selection with arrow keys (roving focus)', () => {
    render(
      <Tabs
        label="Sections"
        items={[
          { id: 'a', label: 'Alpha', content: 'A panel' },
          { id: 'b', label: 'Beta', content: 'B panel' },
        ]}
      />,
    );
    const alpha = screen.getByRole('tab', { name: 'Alpha' });
    expect(alpha.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel').textContent).toBe('A panel');
    fireEvent.keyDown(alpha, { key: 'ArrowRight' });
    const beta = screen.getByRole('tab', { name: 'Beta' });
    expect(beta.getAttribute('aria-selected')).toBe('true');
    expect(beta.getAttribute('tabindex')).toBe('0');
    expect(alpha.getAttribute('tabindex')).toBe('-1');
  });
});

describe('Dialog', () => {
  it('is named by its title and closes from the close button and Escape', () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="End your plays?">
        Body
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'End your plays?' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('Toast', () => {
  it('announces toasts in a polite live region', () => {
    render(
      <ToastProvider>
        <Pusher />
      </ToastProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'push' }));
    });
    const region = screen.getByRole('region', { name: 'Notifications' });
    const live = region.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain('Locked Door cleared.');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(live?.textContent).not.toContain('Locked Door cleared.');
  });
});
