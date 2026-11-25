import { contentDays, dayPlan, gameData } from '../../data/index.ts';
import { objectiveForDay } from '../../data/objectives.ts';
import { twistForDay, twistSummaries } from '../../data/twists.ts';
import { useGame } from '../../state/store.ts';
import { SuitIcon } from '../art/index.ts';
import { Badge, Button, StarRow } from '../components/index.ts';
import { ActArt } from './ActArt.tsx';
import { ScreenFrame } from './ScreenFrame.tsx';

const ROMAN = ['', 'I', 'II', 'III'];

export function DaySelectScreen() {
  const best = useGame((s) => s.prototypeBest);
  const episode = useGame((s) => s.episode);
  const openBriefing = useGame((s) => s.openBriefing);
  const go = useGame((s) => s.go);
  return (
    <ScreenFrame
      title="Prototype days"
      subtitle="Each rule day comes with a Jump-In deck and the perks you would have by then. Nothing carries over except your best Stars."
      onBack={() => go('title')}
      wide
    >
      <ul className="day-grid">
        {contentDays.map((day) => {
          const p = dayPlan(day);
          const b = best[day];
          const jump = gameData.jumpIns.find((j) => j.day === day);
          const inProgress = episode?.mode === 'prototype' && episode.setup.day === day;
          const twist = twistForDay(day);
          return (
            <li key={day} className="day-tile" data-act={p.act}>
              <div className="day-tile__art" aria-hidden="true">
                <ActArt act={p.act} />
                <span className="day-tile__num">Day {day}</span>
              </div>
              <div className="day-tile__body">
                <p className="day-tile__act">
                  Act {ROMAN[p.act]} · {p.actTitle}
                </p>
                <h2 className="day-tile__title">{p.newRules || 'Episode'}</h2>
                <ul className="day-tile__facts">
                  <li>
                    <SuitIcon suit={p.focusSuit} className={`suit-${p.focusSuit.toLowerCase()}-bright`} /> {p.focusSuit}{' '}
                    focus
                  </li>
                  <li>
                    Lead {p.leadTarget} · Cover ≤{p.coverThreshold}
                  </li>
                  <li>{jump ? `${jump.perks.length} perk${jump.perks.length === 1 ? '' : 's'}` : 'Core deck'}</li>
                </ul>
                <p className="day-tile__bonus">
                  <strong>Bonus:</strong> {objectiveForDay(day).text}
                </p>
                {twist && <p className="day-tile__bonus">Twist: {twistSummaries[twist]}</p>}
                <div className="day-tile__foot">
                  {b ? (
                    <StarRow size="sm" earned={b.starCount} total={3} />
                  ) : (
                    <span className="muted day-tile__unplayed">Not played yet</span>
                  )}
                  {inProgress && <Badge tone="accent">In progress</Badge>}
                  <Button
                    variant={inProgress ? 'secondary' : 'primary'}
                    onClick={() => (inProgress ? go('table') : openBriefing('prototype', day))}
                    aria-label={`${inProgress ? 'Resume' : 'Brief'} Day ${day}: ${p.newRules}`}
                  >
                    {inProgress ? 'Resume' : 'Brief'}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </ScreenFrame>
  );
}
