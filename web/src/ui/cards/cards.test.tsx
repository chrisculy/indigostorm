import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameData, playerCard, threat } from '../../data/index.ts';
import { CardBack, JumpInView, PlayerCardView, RuleCardView, StoryCardView, ThreatCardView } from './index.ts';

afterEach(cleanup);

describe('PlayerCardView', () => {
  it('is a labelled image summarising the card when not interactive', () => {
    render(<PlayerCardView card={playerCard('CORE-01')} />);
    const card = screen.getByRole('img', {
      name: /^Overwatch\. Recon Training card, Power 1\. Ability: Look at the top 2/,
    });
    expect(card.getAttribute('aria-label')).toMatch(/Core\.$/);
    expect(card.getAttribute('tabindex')).toBeNull();
  });

  it('becomes a toggle button with pressed state when clickable', () => {
    const onClick = vi.fn();
    render(<PlayerCardView card={playerCard('CORE-06')} selected onClick={onClick} />);
    const btn = screen.getByRole('button', { name: /^Blend In\./ });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('stays focusable but ignores clicks when disabled, and says so', () => {
    const onClick = vi.fn();
    render(<PlayerCardView card={playerCard('CORE-02')} disabled onClick={onClick} />);
    const btn = screen.getByRole('button', { name: /Unavailable\./ });
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(btn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('announces legal targets', () => {
    render(<PlayerCardView card={playerCard('CORE-02')} highlighted onClick={() => undefined} />);
    expect(screen.getByRole('button', { name: /Legal target\./ })).toBeTruthy();
  });

  it('describes Allies by their symbols and Conditioned cards by their trigger', () => {
    render(
      <>
        <PlayerCardView card={playerCard('D21-P2')} />
        <PlayerCardView card={playerCard('D16-P1')} />
      </>,
    );
    expect(
      screen.getByRole('img', { name: /Overwatch Team\. Ally, stays in play\. Symbols: Force and Stealth\./ }),
    ).toBeTruthy();
    expect(
      screen.getByRole('img', { name: /Conditioned: If you play this while you have an Ally in play/ }),
    ).toBeTruthy();
  });

  it('can hide Awakened flashback text', () => {
    const awakened = playerCard('D16-W1');
    const { container } = render(<PlayerCardView card={awakened} hideFlashback />);
    expect(container.textContent).not.toContain(awakened.flavor);
  });
});

describe('ThreatCardView', () => {
  it('summarises requirement, timer, reward and pressure', () => {
    render(<ThreatCardView card={threat('D21-T10')} />);
    const name = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(name).toMatch(/^Hunter-Killer Team\. Pursuer Threat\./);
    expect(name).toContain('Needs 3 Force symbols (Stealth also counts) and 12 Power.');
    expect(name).toContain('Hunt 3, Strike +2 Exposure.');
    expect(name).toContain('Cannot be Vanished.');
  });

  it('includes live table state', () => {
    render(
      <ThreatCardView
        card={threat('D01-T04')}
        progress={{ symbols: 1, symbolsNeeded: 2, power: 3, powerNeeded: 6, wouldBeClean: true }}
        die={2}
        tuckedCount={2}
        cancelled
      />,
    );
    const name = screen.getByRole('img').getAttribute('aria-label') ?? '';
    expect(name).toContain('Progress 1 of 2 symbols, 3 of 6 Power, on track for a Clean Clear.');
    expect(name).toContain('Timer die at 2.');
    expect(name).toContain('2 cards tucked under it.');
    expect(name).toContain('Pressure cancelled this turn.');
    expect(screen.getByText('Pressure cancelled')).toBeTruthy();
  });

  it('renders face-down Encrypted Threats as their back without revealing them', () => {
    const t = gameData.threats.find((x) => x.type === 'Encrypted Threat');
    if (!t) throw new Error('no Encrypted Threat in data');
    const { container } = render(<ThreatCardView card={t} faceDown />);
    expect(screen.getByRole('img', { name: 'Encrypted Threat, face-down.' })).toBeTruthy();
    expect(container.textContent).not.toContain(t.name);
  });
});

describe('other cards', () => {
  it('labels card backs with their instruction note and count', () => {
    render(<CardBack kind="outro" count={3} />);
    expect(screen.getByRole('img', { name: /^Read after the episode card back, 3 cards\. Don’t read/ })).toBeTruthy();
  });

  it('flips rule cards and keeps the hidden side out of the accessibility tree', () => {
    const rule = gameData.rules[0];
    if (!rule) throw new Error('no rules');
    render(<RuleCardView rule={rule} />);
    const flip = screen.getByRole('button', { name: `Flip ${rule.title} to side 2` });
    const faces = document.querySelectorAll('.flip__face');
    expect(faces[0]?.hasAttribute('inert')).toBe(false);
    expect(faces[1]?.hasAttribute('inert')).toBe(true);
    fireEvent.click(flip);
    expect(faces[0]?.hasAttribute('inert')).toBe(true);
    expect(faces[1]?.hasAttribute('inert')).toBe(false);
    expect(screen.getByRole('button', { name: `Flip ${rule.title} to side 1` })).toBeTruthy();
  });

  it('adds the day setup to Intro cards', () => {
    const story = gameData.story.find((s) => s.type === 'Intro');
    const plan = gameData.days.find((d) => d.day === story?.day);
    if (!story || !plan) throw new Error('no intro');
    render(<StoryCardView story={story} plan={plan} />);
    expect(screen.getByRole('img', { name: new RegExp(`Lead target ${plan.leadTarget}`) })).toBeTruthy();
  });

  it('lists the jump-in deck by name', () => {
    const j = gameData.jumpIns[0];
    if (!j) throw new Error('no jump-ins');
    render(<JumpInView jumpIn={j} />);
    const first = playerCard(j.deck[0] as string);
    expect(screen.getByRole('img', { name: new RegExp(first.name) })).toBeTruthy();
  });

  it('renders every card in the data without throwing', () => {
    const { container } = render(
      <>
        {gameData.playerCards.map((c) => (
          <PlayerCardView key={c.id} card={c} />
        ))}
        {gameData.threats.map((t) => (
          <ThreatCardView key={t.id} card={t} />
        ))}
      </>,
    );
    expect(container.querySelectorAll('.card')).toHaveLength(gameData.playerCards.length + gameData.threats.length);
  });
});
