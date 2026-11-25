import { type CSSProperties, useMemo, useState } from 'react';
import { coreDeck, dayPlan, gameData, perksById, playerCard, storyForDay, threatsForDay } from '../../data/index.ts';
import { objectiveForDay } from '../../data/objectives.ts';
import { twistForDay, twistSummaries } from '../../data/twists.ts';
import type { JumpIn, PerkId } from '../../data/types.ts';
import { dayCards } from '../../engine/index.ts';
import { briefingRules } from '../../state/derive.ts';
import { useGame, useHideFlashback } from '../../state/store.ts';
import { PerkEmblem, SuitIcon, UiIcon } from '../art/index.ts';
import { JumpInView, PlayerCardView, RuleCardView, StoryCardView } from '../cards/index.ts';
import { Badge, Button, Dialog, StarRow } from '../components/index.ts';
import { ScreenFrame } from './ScreenFrame.tsx';

const ROMAN = ['', 'I', 'II', 'III'];

/** The 12-card deck and perks (Day 1 Core deck, or the campaign deck). */
function DeckList({ ids, perks }: { ids: string[]; perks: PerkId[] }) {
  return (
    <div className="deck-list">
      <h3 className="mini-head">Your {ids.length}-card deck</h3>
      <ul className="deck-list__cards">
        {ids.map((id) => {
          const c = playerCard(id);
          return (
            <li key={id}>
              {c.suit ? (
                <SuitIcon suit={c.suit} className={`suit-${c.suit.toLowerCase()}-bright`} />
              ) : (
                <span aria-hidden="true">·</span>
              )}
              <span className="num deck-list__pow">{c.suit ? c.power : '–'}</span>
              <span>{c.name}</span>
              {c.cls !== 'Training' && <span className="muted deck-list__cls">{c.cls}</span>}
            </li>
          );
        })}
      </ul>
      <h3 className="mini-head">Perks</h3>
      {perks.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        <ul className="deck-list__perks">
          {perks.map((p) => (
            <li key={p}>
              <PerkEmblem branch={perksById.get(p)?.branch ?? 'GHOST'} /> {perksById.get(p)?.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BriefingScreen() {
  const b = useGame((s) => s.briefing);
  const hideFlashback = useHideFlashback();
  const campaign = useGame((s) => s.campaign);
  const episode = useGame((s) => s.episode);
  const begin = useGame((s) => s.beginEpisode);
  const markRulesSeen = useGame((s) => s.markRulesSeen);
  const go = useGame((s) => s.go);
  const [ruleIdx, setRuleIdx] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const day = b?.day ?? 1;
  const plan = dayPlan(day);

  const deckInfo = useMemo((): JumpIn => {
    if (b?.mode === 'campaign' && campaign)
      return { day, deck: campaign.deck, perks: campaign.perks, notes: 'Your campaign deck.' };
    const j = gameData.jumpIns.find((x) => x.day === day);
    return j ?? { day, deck: coreDeck().map((c) => c.id), perks: [], notes: 'The Core deck. No perks yet.' };
  }, [b?.mode, campaign, day]);
  const rules = useMemo(() => briefingRules(day, deckInfo.perks), [day, deckInfo.perks]);
  const isJumpIn = b?.mode !== 'campaign' && gameData.jumpIns.some((x) => x.day === day);
  const stories = storyForDay(day).filter((s) => s.type === 'Intro');
  const hasPursuer = threatsForDay(day).some((t) => t.type === 'Pursuer');
  const twist = twistForDay(day);
  const newCards = dayCards(day);
  if (!b) return null;
  const rule = rules[Math.min(ruleIdx, rules.length - 1)];

  const start = () => {
    markRulesSeen(rules.map((r) => r.id));
    if (episode && episode.state.phase !== 'over') setConfirm(true);
    else begin();
  };

  return (
    <ScreenFrame
      title={`Day ${day} briefing`}
      subtitle={`Act ${ROMAN[plan.act]} · ${plan.actTitle}${plan.newRules ? ` · New: ${plan.newRules}` : ''}`}
      onBack={() => go(b.mode === 'campaign' ? 'campaign' : 'days')}
      wide
      actions={
        <Button variant="primary" onClick={start} iconEnd={<UiIcon name="play" />}>
          Begin episode
        </Button>
      }
    >
      <div className="briefing">
        <section className="briefing__col" aria-labelledby="brief-intro">
          <h2 id="brief-intro" className="sec-title">
            Intro
          </h2>
          {stories.map((s) => (
            <StoryCardView key={s.id} story={s} plan={plan} hasPursuer={hasPursuer} size="fluid" />
          ))}
          <div className="brief-box">
            <h3 className="mini-head">Today's Stars</h3>
            <StarRow
              showLabels
              size="md"
              stars={[
                { label: 'Objective', earned: false, detail: `Reach ${plan.leadTarget} Lead` },
                {
                  label: 'Cover',
                  earned: false,
                  detail: `Finish at Exposure ${plan.coverThreshold} or less (redline ${plan.redline})`,
                },
                { label: 'Bonus', earned: false, detail: objectiveForDay(day).text },
              ]}
            />
            {twist && (
              <p className="brief-twist">
                <Badge tone="warning" solid>
                  Twist
                </Badge>{' '}
                {twistSummaries[twist]}
              </p>
            )}
            <p className="muted brief-start">
              Start: Lead {plan.startLead}, Exposure {plan.startExposure}
              {twist === 'alarm_raised' ? ' (+1 from the twist)' : ''}.
            </p>
          </div>
        </section>

        <section className="briefing__col briefing__rules" aria-labelledby="brief-rules">
          <h2 id="brief-rules" className="sec-title">
            Rule Cards{' '}
            {rules.length > 0 && (
              <span className="muted">
                {Math.min(ruleIdx, rules.length - 1) + 1} of {rules.length}
              </span>
            )}
          </h2>
          {rule ? (
            <>
              <div className="rule-stage" style={{ '--card-w': '100%' } as CSSProperties}>
                <RuleCardView key={rule.id} rule={rule} size="fluid" />
              </div>
              <div className="carousel-nav">
                <Button
                  size="sm"
                  icon={<UiIcon name="chevron-left" />}
                  disabled={ruleIdx === 0}
                  onClick={() => setRuleIdx((i) => Math.max(0, i - 1))}
                >
                  Previous
                </Button>
                <ol className="carousel-dots" aria-label="Rule Cards">
                  {rules.map((r, i) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        aria-label={`Rule Card ${i + 1}: ${r.title}`}
                        aria-current={i === ruleIdx || undefined}
                        onClick={() => setRuleIdx(i)}
                      />
                    </li>
                  ))}
                </ol>
                <Button
                  size="sm"
                  iconEnd={<UiIcon name="chevron-right" />}
                  disabled={ruleIdx >= rules.length - 1}
                  onClick={() => setRuleIdx((i) => Math.min(rules.length - 1, i + 1))}
                >
                  Next
                </Button>
              </div>
              <p className="muted carousel-hint">Use the flip button on a card to read its back.</p>
            </>
          ) : (
            <p className="muted">No new rules today.</p>
          )}
        </section>

        <section className="briefing__col" aria-labelledby="brief-deck">
          <h2 id="brief-deck" className="sec-title">
            {b.mode === 'campaign' ? 'Your deck' : 'Jump-In'}
          </h2>
          {isJumpIn ? (
            <JumpInView jumpIn={deckInfo} size="fluid" />
          ) : (
            <DeckList ids={deckInfo.deck} perks={deckInfo.perks} />
          )}
          <h3 className="mini-head brief-new">Today's new cards (shuffled in)</h3>
          <ul className="new-cards">
            {newCards.map((id) => (
              <li key={id}>
                <PlayerCardView card={playerCard(id)} size="fluid" hideFlashback={hideFlashback(id)} />
              </li>
            ))}
          </ul>
          <Button variant="primary" size="lg" block onClick={start} iconEnd={<UiIcon name="play" />}>
            Begin episode
          </Button>
        </section>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Replace the episode in progress?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirm(false);
                begin();
              }}
            >
              Begin anyway
            </Button>
          </>
        }
      >
        <p>
          You have an unfinished episode (Day {episode?.setup.day}, {episode?.mode}). Beginning this one discards it.
        </p>
      </Dialog>
    </ScreenFrame>
  );
}
