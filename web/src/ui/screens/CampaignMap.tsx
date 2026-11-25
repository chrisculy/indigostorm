import { type CSSProperties, useMemo, useState } from 'react';
import { dayPlan, gameData, perksById, playerCard } from '../../data/index.ts';
import type { PerkId } from '../../data/types.ts';
import { ALL_PERKS, campaignFinished, LAST_DAY, nextContentDay, starCount } from '../../engine/index.ts';
import { FLASHBACK_DAYS, isRuleDay } from '../../state/derive.ts';
import { useGame } from '../../state/store.ts';
import { PerkEmblem, SpiralGlyph, UiIcon } from '../art/index.ts';
import { PlayerCardView } from '../cards/index.ts';
import { Badge, Button, Dialog, StarRow } from '../components/index.ts';
import { ActArt } from './ActArt.tsx';
import { ScreenFrame } from './ScreenFrame.tsx';

const ROMAN = ['', 'I', 'II', 'III'];

function SkipDialog({ open, onClose, from, to }: { open: boolean; onClose: () => void; from: number; to: number }) {
  const campaign = useGame((s) => s.campaign);
  const skipDays = useGame((s) => s.skipDays);
  const perkDays = useMemo(() => {
    const out: number[] = [];
    for (let d = from; d < to; d++) if (dayPlan(d).perkUnlock) out.push(d);
    return out;
  }, [from, to]);
  const [choices, setChoices] = useState<Record<number, PerkId | null>>({});
  const owned = campaign?.perks ?? [];
  const taken = (except: number) =>
    new Set<PerkId>([...owned, ...Object.entries(choices).flatMap(([d, p]) => (Number(d) !== except && p ? [p] : []))]);
  const complete = perkDays.every((d) => choices[d]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={to > LAST_DAY ? `Skip Days ${from}–${LAST_DAY}` : `Skip to Day ${to}`}
      description="These days are not written yet. Your deck and Stars stay as they are."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!complete}
            onClick={() => {
              if (skipDays(to, choices)) onClose();
            }}
          >
            {complete ? 'Skip' : 'Choose the perks first'}
          </Button>
        </>
      }
    >
      {perkDays.length === 0 ? (
        <p>No perk unlocks on the skipped days.</p>
      ) : (
        <div className="skip-perks">
          {perkDays.map((d) => {
            const t = taken(d);
            return (
              <fieldset key={d} className="skip-perks__day">
                <legend>Day {d} unlocks a perk</legend>
                <div className="skip-perks__opts">
                  {ALL_PERKS.filter((p) => !owned.includes(p)).map((p) => {
                    const info = perksById.get(p);
                    const disabled = t.has(p) && choices[d] !== p;
                    return (
                      <label key={p} className="radio-chip" data-disabled={disabled || undefined}>
                        <input
                          type="radio"
                          name={`perk-${d}`}
                          checked={choices[d] === p}
                          disabled={disabled}
                          onChange={() => setChoices((c) => ({ ...c, [d]: p }))}
                        />
                        <PerkEmblem branch={info?.branch ?? 'GHOST'} />
                        <span title={info?.text}>{info?.name}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}

export function CampaignMapScreen() {
  const campaign = useGame((s) => s.campaign);
  const episode = useGame((s) => s.episode);
  const openBriefing = useGame((s) => s.openBriefing);
  const go = useGame((s) => s.go);
  const [skipOpen, setSkipOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  if (!campaign) return null;
  const finished = campaignFinished(campaign);
  const day = campaign.day;
  const plan = finished ? null : dayPlan(day);
  const totalStars = Object.values(campaign.stars).reduce((n, s) => n + starCount(s), 0);
  const nextDay = finished ? null : plan?.hasContent ? day : (nextContentDay(day - 1) ?? LAST_DAY + 1);
  const resuming = episode?.mode === 'campaign' && episode.setup.day === day;

  return (
    <ScreenFrame
      title="Campaign"
      subtitle={`${totalStars} Stars · ${campaign.perks.length} perk${campaign.perks.length === 1 ? '' : 's'} · ${campaign.deck.length}-card deck`}
      onBack={() => go('title')}
      wide
      actions={
        <Button size="sm" onClick={() => setDeckOpen(true)}>
          View deck
        </Button>
      }
    >
      <section className="camp-now" aria-label="Next up">
        {finished ? (
          <div>
            <h2 className="sec-title">Campaign complete</h2>
            <p>
              You finished the season with {totalStars} of 90 Stars. Days without content were skipped (
              {campaign.skipped.length}).
            </p>
          </div>
        ) : plan?.hasContent ? (
          <>
            <div>
              <p className="camp-now__eyebrow">Next episode</p>
              <h2 className="camp-now__title">
                Day {day} · {plan.newRules || `Act ${ROMAN[plan.act]}`}
              </h2>
              <p className="muted">
                Lead {plan.leadTarget} · Cover ≤{plan.coverThreshold} · Bonus: {plan.bonusObjective}
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              iconEnd={<UiIcon name="play" />}
              onClick={() =>
                resuming ? go(episode?.state.phase === 'over' ? 'debrief' : 'table') : openBriefing('campaign', day)
              }
            >
              {resuming ? 'Resume' : 'Briefing'}
            </Button>
          </>
        ) : (
          <>
            <div>
              <p className="camp-now__eyebrow">Day {day}</p>
              <h2 className="camp-now__title">Not yet written</h2>
              <p className="muted">
                {nextDay && nextDay <= LAST_DAY
                  ? `The next written day is Day ${nextDay}. Skip ahead; on skipped perk days you still pick a perk.`
                  : 'No more written days. Skip to the end of the season.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setSkipOpen(true)}
              iconEnd={<UiIcon name="chevron-right" />}
            >
              {nextDay && nextDay <= LAST_DAY ? `Skip to Day ${nextDay}` : 'Skip to the end'}
            </Button>
          </>
        )}
      </section>

      <div className="acts">
        {([1, 2, 3] as const).map((act) => {
          const days = gameData.days.filter((d) => d.act === act);
          const actStars = days.reduce(
            (n, d) => n + (campaign.stars[d.day] ? starCount(campaign.stars[d.day] as never) : 0),
            0,
          );
          return (
            <section key={act} className="act" aria-labelledby={`act-${act}`}>
              <div className="act__art" aria-hidden="true">
                <ActArt act={act} />
              </div>
              <header className="act__head">
                <h2 id={`act-${act}`} className="act__title">
                  Act {ROMAN[act]} <span>{days[0]?.actTitle}</span>
                </h2>
                <span className="act__stars">{actStars}/30 ★</span>
              </header>
              <ol className="day-map">
                {days.map((d) => {
                  const st = campaign.stars[d.day];
                  const status =
                    d.day < day || finished
                      ? campaign.skipped.includes(d.day)
                        ? 'skipped'
                        : 'done'
                      : d.day === day
                        ? 'current'
                        : 'future';
                  return (
                    <li
                      key={d.day}
                      className="map-day"
                      data-status={status}
                      data-content={d.hasContent || undefined}
                      aria-current={status === 'current' ? 'step' : undefined}
                    >
                      <span className="map-day__n display">{d.day}</span>
                      <span className="map-day__marks">
                        {isRuleDay(d.day) && (
                          <span title={`Rule day: ${d.newRules}`} className="mark mark--rule">
                            <UiIcon name="book" />
                            <span className="sr-only">Rule day: {d.newRules}.</span>
                          </span>
                        )}
                        {d.perkUnlock && (
                          <span title="Perk unlock" className="mark mark--perk">
                            <PerkEmblem branch="ANALYST" />
                            <span className="sr-only">Perk unlock.</span>
                          </span>
                        )}
                        {FLASHBACK_DAYS.has(d.day) && (
                          <span title="Flashback" className="mark mark--flash">
                            <SpiralGlyph />
                            <span className="sr-only">Flashback.</span>
                          </span>
                        )}
                        {d.debrief && (
                          <span title={d.debrief} className="mark mark--debrief">
                            ★<span className="sr-only">{d.debrief}.</span>
                          </span>
                        )}
                      </span>
                      {st ? (
                        <StarRow size="sm" earned={starCount(st)} total={3} />
                      ) : status === 'skipped' ? (
                        <span className="map-day__note">Skipped</span>
                      ) : !d.hasContent ? (
                        <span className="map-day__note">Not yet written</span>
                      ) : status === 'current' ? (
                        <Badge tone="accent" solid>
                          Next
                        </Badge>
                      ) : (
                        <span className="map-day__note">{d.newRules || 'Written'}</span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
      {!finished && nextDay !== null && (
        <SkipDialog
          key={`${day}-${nextDay}`}
          open={skipOpen}
          onClose={() => setSkipOpen(false)}
          from={day}
          to={nextDay}
        />
      )}
      <Dialog open={deckOpen} onClose={() => setDeckOpen(false)} title="Your campaign deck" size="lg">
        <ul className="card-grid" style={{ '--card-w': '130px' } as CSSProperties}>
          {campaign.deck.map((id) => (
            <li key={id}>
              <PlayerCardView card={playerCard(id)} size="sm" />
            </li>
          ))}
        </ul>
        {campaign.perks.length > 0 && (
          <>
            <h3 className="mini-head deck-perks-head">Perks</h3>
            <ul className="plain-list">
              {campaign.perks.map((p) => (
                <li key={p}>
                  <strong>{perksById.get(p)?.name}</strong> — {perksById.get(p)?.text}
                </li>
              ))}
            </ul>
          </>
        )}
        {campaign.retired.length > 0 && (
          <p className="muted">Retired: {campaign.retired.map((id) => playerCard(id).name).join(', ')}.</p>
        )}
      </Dialog>
    </ScreenFrame>
  );
}
