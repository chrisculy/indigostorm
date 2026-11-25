import { useGame } from '../../state/store.ts';
import { ExposureIcon, LeadIcon, SuitIcon, UiIcon } from '../art/index.ts';
import { Button, Kbd } from '../components/index.ts';
import { ScreenFrame } from './ScreenFrame.tsx';

export function HowToPlayScreen() {
  const go = useGame((s) => s.go);
  const openBriefing = useGame((s) => s.openBriefing);
  return (
    <ScreenFrame title="How to play" subtitle="A two-minute primer. The Rulebook has every detail.">
      <div className="howto">
        <section className="howto__card">
          <h2>The goal</h2>
          <p>
            Each episode is a race between two tracks. Push <LeadIcon className="inline-icon lead" />{' '}
            <strong>Lead</strong> up to today's target before <ExposureIcon className="inline-icon exposure" />{' '}
            <strong>Exposure</strong> reaches the redline. You always move on to the next day; Stars measure how well it
            went.
          </p>
        </section>
        <section className="howto__card">
          <h2>Your turn</h2>
          <ol>
            <li>
              <strong>Play 2 cards.</strong> Tuck a card under a Threat to add its suit symbol and Power, or play it for
              its ability instead.
            </li>
            <li>
              <strong>End plays.</strong> Every live Threat applies its Pressure and its timer ticks down. At 0 it
              escapes.
            </li>
            <li>
              <strong>Draw 2.</strong> Your 15-card deck lasts about 8 turns.
            </li>
          </ol>
        </section>
        <section className="howto__card">
          <h2>Clearing Threats</h2>
          <p>
            A Threat shows symbols of its preferred suit plus a Power number. Meet both and it clears: take the Reward,
            and if everything was the preferred suit, the Clean bonus too.
          </p>
          <p className="howto__suits">
            <span>
              <SuitIcon suit="Recon" className="suit-recon-bright" /> Recon
            </span>
            <span>
              <SuitIcon suit="Stealth" className="suit-stealth-bright" /> Stealth
            </span>
            <span>
              <SuitIcon suit="Force" className="suit-force-bright" /> Force
            </span>
          </p>
        </section>
        <section className="howto__card">
          <h2>On the table</h2>
          <ul>
            <li>Select a hand card: every legal way to play it is listed, with what it will do.</li>
            <li>Highlighted Threats are legal targets. Click one, or drag the card onto it.</li>
            <li>Stuck? The Hint button suggests a move.</li>
            <li>Right-click or long-press any card to inspect it.</li>
            <li>
              Keys: <Kbd>1</Kbd>–<Kbd>9</Kbd> select, <Kbd>Enter</Kbd> choose, <Kbd>E</Kbd> end plays, <Kbd>H</Kbd>{' '}
              hint, <Kbd>R</Kbd> rulebook, <Kbd>?</Kbd> all shortcuts.
            </li>
          </ul>
        </section>
        <section className="howto__card">
          <h2>After the episode</h2>
          <p>
            Earn up to 3 Stars: Objective, Cover and the day's Bonus. Then retire 3 of your 15 cards so your deck is
            back to 12 for tomorrow.
          </p>
        </section>
        <div className="howto__actions">
          <Button
            variant="primary"
            size="lg"
            onClick={() => openBriefing('prototype', 1)}
            iconEnd={<UiIcon name="play" />}
          >
            Try Day 1
          </Button>
          <Button size="lg" onClick={() => go('rulebook')} icon={<UiIcon name="book" />}>
            Open the Rulebook
          </Button>
        </div>
      </div>
    </ScreenFrame>
  );
}
