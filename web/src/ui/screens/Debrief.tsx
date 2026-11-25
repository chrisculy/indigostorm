import { type CSSProperties, useMemo, useState } from 'react';
import { dayPlan, perksById, playerCard, storyForDay } from '../../data/index.ts';
import { objectiveForDay } from '../../data/objectives.ts';
import type { PerkId, Suit } from '../../data/types.ts';
import { endReasonText, type Flashback } from '../../engine/index.ts';
import { cutError, debriefOf, debriefTier } from '../../state/derive.ts';
import { useGame, useHideFlashback } from '../../state/store.ts';
import { PerkEmblem, SuitIcon, UiIcon } from '../art/index.ts';
import { PlayerCardView, StoryCardView } from '../cards/index.ts';
import { Badge, Button, StarRow } from '../components/index.ts';
import { ScreenFrame } from './ScreenFrame.tsx';

type Step = 'outro' | 'flashback' | 'stars' | 'act' | 'perk' | 'cut';
const STEP_LABEL: Record<Step, string> = {
  outro: 'Outro',
  flashback: 'Flashback',
  stars: 'Stars',
  act: 'Act debrief',
  perk: 'Perk',
  cut: 'Cut to 12',
};

function FlashbackReveal({ f, index }: { f: Flashback; index: number }) {
  const seen = useGame((s) => s.flashbacksSeen.includes(f.awakened));
  const markSeen = useGame((s) => s.markFlashbackSeen);
  const [revealed, setRevealed] = useState(false);
  const shown = revealed || seen;
  return (
    <article className="fb-reveal" data-shown={shown || undefined}>
      <div className="fb-reveal__cards">
        <PlayerCardView card={playerCard(f.conditioned)} size="md" dimmed={shown} />
        <UiIcon name="chevron-right" className="fb-reveal__arrow" />
        <PlayerCardView card={playerCard(f.awakened)} size="md" hideFlashback={!shown} />
      </div>
      <div className="fb-reveal__text">
        <p className="fb-reveal__eyebrow">
          Flashback {index + 1} · {f.duringPlay ? 'awakened during play' : 'awakens at the end of the episode'}
        </p>
        <h3>
          {playerCard(f.conditioned).name} → {playerCard(f.awakened).name}
        </h3>
        {shown ? (
          <blockquote className="flashback__quote">{f.text || 'A memory surfaces…'}</blockquote>
        ) : (
          <Button
            variant="primary"
            onClick={() => {
              setRevealed(true);
              markSeen(f.awakened);
            }}
          >
            Read the flashback
          </Button>
        )}
        <p className="muted">From now on the Awakened card is an ordinary card in your deck.</p>
      </div>
    </article>
  );
}

const SUIT_ORDER: (Suit | 'Other')[] = ['Recon', 'Stealth', 'Force', 'Other'];

function Cut({
  cards,
  count,
  retire,
  setRetire,
  required,
}: {
  cards: string[];
  count: number;
  retire: string[];
  setRetire: (r: string[]) => void;
  required: boolean;
}) {
  const hide = useHideFlashback();
  const toggle = (id: string) =>
    setRetire(retire.includes(id) ? retire.filter((x) => x !== id) : retire.length < count ? [...retire, id] : retire);
  const kept = cards.filter((c) => !retire.includes(c));
  const groups = SUIT_ORDER.map((s) => ({
    s,
    ids: kept.filter((id) => (playerCard(id).suit ?? 'Other') === s),
  })).filter((g) => g.ids.length > 0);
  return (
    <div className="cut">
      <div className="cut__pick">
        <p className="cut__count" aria-live="polite">
          <strong>
            Retire {retire.length}/{count}
          </strong>{' '}
          {required ? '— required to continue.' : '— optional practice in prototype mode.'}
        </p>
        <ul className="cut-grid" style={{ '--card-w': '150px' } as CSSProperties}>
          {cards.map((id) => {
            const on = retire.includes(id);
            return (
              <li key={id} className="cut-card" data-retired={on || undefined}>
                <PlayerCardView
                  card={playerCard(id)}
                  size="fluid"
                  hideFlashback={hide(id)}
                  selected={on}
                  disabled={!on && retire.length >= count}
                  onClick={() => toggle(id)}
                  ariaHint={on ? 'Marked to retire. Press to keep it.' : 'Press to retire it.'}
                />
                {on && <span className="cut-card__stamp">Retire</span>}
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="cut__keep" aria-label="Deck you keep">
        <h3 className="mini-head">
          You keep {kept.length} card{kept.length === 1 ? '' : 's'}
        </h3>
        {groups.map((g) => (
          <div key={g.s} className="keep-group">
            <p className="keep-group__head">
              {g.s !== 'Other' && <SuitIcon suit={g.s} className={`suit-${g.s.toLowerCase()}-bright`} />}{' '}
              {g.s === 'Other' ? 'Gear & Allies' : g.s} <span className="muted">({g.ids.length})</span>
            </p>
            <ul>
              {g.ids.map((id) => {
                const c = playerCard(id);
                return (
                  <li key={id}>
                    <span className="keep-pow num">{c.cls === 'Gear' || c.cls === 'Ally' ? c.cls[0] : c.power}</span>{' '}
                    {c.name}
                    {c.cls === 'Awakened' && <Badge tone="stealth">Awakened</Badge>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </aside>
    </div>
  );
}

export function DebriefScreen() {
  const episode = useGame((s) => s.episode);
  const campaign = useGame((s) => s.campaign);
  const finish = useGame((s) => s.finishDebrief);
  const go = useGame((s) => s.go);
  const [stepIdx, setStepIdx] = useState(0);
  const [perk, setPerk] = useState<PerkId | null>(null);
  const [retire, setRetire] = useState<string[]>([]);
  const state = episode?.state;
  const mode = episode?.mode ?? 'prototype';
  const debrief = useMemo(
    () => (state && state.phase === 'over' ? debriefOf(mode, state, campaign) : null),
    [state, mode, campaign],
  );
  if (!state || !debrief) return null;
  const plan = dayPlan(debrief.day);
  const steps: Step[] = ['outro'];
  if (debrief.flashbacks.length) steps.push('flashback');
  steps.push('stars');
  if (debrief.actDebrief) steps.push('act');
  if (debrief.perkOptions.length) steps.push('perk');
  steps.push('cut');
  const step = steps[Math.min(stepIdx, steps.length - 1)] as Step;
  const last = stepIdx >= steps.length - 1;
  const required = mode === 'campaign';
  const err = cutError(debrief.cards, retire, debrief.retireCount);
  const outros = storyForDay(debrief.day).filter((s) => s.type === 'Outro');
  const r = debrief.result;

  const next = () => setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  const done = (skipCut: boolean) => {
    finish({ retire: skipCut ? [] : retire, perk: debrief.perkOptions.length ? perk : null });
  };
  const canNext = step !== 'perk' || perk !== null;

  return (
    <ScreenFrame
      title={`Day ${debrief.day} debrief`}
      subtitle={`${endReasonText(r.reason)} on turn ${r.turn} · Lead ${r.lead}, Exposure ${r.exposure}`}
      onBack={() => go('table')}
      backLabel="Table"
      wide
    >
      <ol className="stepper" aria-label="Debrief steps">
        {steps.map((s, i) => (
          <li
            key={s}
            data-state={i < stepIdx ? 'done' : i === stepIdx ? 'current' : 'todo'}
            aria-current={i === stepIdx ? 'step' : undefined}
          >
            <span className="stepper__n">{i < stepIdx ? '✓' : i + 1}</span>
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>

      <section className="debrief-step" aria-live="polite">
        {step === 'outro' && (
          <div className="debrief-outro">
            {outros.length ? (
              outros.map((s) => <StoryCardView key={s.id} story={s} plan={plan} size="lg" />)
            ) : (
              <p className="muted">No Outro card for this day.</p>
            )}
          </div>
        )}
        {step === 'flashback' && (
          <div className="fb-list">
            {debrief.flashbacks.map((f, i) => (
              <FlashbackReveal key={f.awakened} f={f} index={i} />
            ))}
          </div>
        )}
        {step === 'stars' && (
          <div className="debrief-stars">
            <StarRow
              animate
              showLabels
              size="lg"
              stars={[
                {
                  label: 'Objective',
                  earned: debrief.stars.objective,
                  detail: `Reach ${plan.leadTarget} Lead (you: ${r.lead})`,
                },
                {
                  label: 'Cover',
                  earned: debrief.stars.cover,
                  detail: `Finish at Exposure ${plan.coverThreshold} or less (you: ${r.exposure})`,
                },
                { label: 'Bonus', earned: debrief.stars.bonus, detail: objectiveForDay(debrief.day).text },
              ]}
            />
            <p className="debrief-stars__total display">{debrief.starCount} / 3 Stars</p>
            {mode === 'prototype' && <p className="muted">Your best result for each prototype day is kept.</p>}
          </div>
        )}
        {step === 'act' && debrief.actDebrief && (
          <div className="debrief-act">
            <h2 className="sec-title">
              {debrief.actDebrief.kind === 'epilogue' ? 'Epilogue' : `Act ${debrief.actDebrief.act} debrief`}
            </h2>
            <p className="display debrief-stars__total">
              {debrief.actDebrief.stars} / {debrief.actDebrief.maxStars} Stars
            </p>
            <p>
              Read tier {debrief.actDebrief && debriefTier(debrief.actDebrief.stars, debrief.actDebrief.maxStars)} of 3
              on the {debrief.actDebrief.kind === 'epilogue' ? 'Epilogue' : 'Outro'} card. Tiers are flavor only and
              never change the story that follows.
            </p>
          </div>
        )}
        {step === 'perk' && (
          <div className="debrief-perk">
            <p>Choose one Clearance Perk to unlock for the rest of the campaign.</p>
            <fieldset className="perk-pick">
              <legend className="sr-only">Perk to unlock</legend>
              {debrief.perkOptions.map((p) => {
                const info = perksById.get(p);
                return (
                  <label key={p} className="perk-option" data-checked={perk === p || undefined}>
                    <input
                      type="radio"
                      name="perk-unlock"
                      className="sr-only"
                      checked={perk === p}
                      onChange={() => setPerk(p)}
                    />
                    <PerkEmblem branch={info?.branch ?? 'GHOST'} className="perk-option__emblem" />
                    <span>
                      <strong>{info?.name}</strong>
                      <span className="perk-option__branch">{info?.branch}</span>
                      <span className="perk-option__text">{info?.text}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          </div>
        )}
        {step === 'cut' && (
          <Cut
            cards={debrief.cards}
            count={debrief.retireCount}
            retire={retire}
            setRetire={setRetire}
            required={required}
          />
        )}
      </section>

      <footer className="debrief-foot">
        {stepIdx > 0 && (
          <Button
            variant="ghost"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            icon={<UiIcon name="chevron-left" />}
          >
            Back
          </Button>
        )}
        <span className="debrief-foot__spacer" />
        {!last && (
          <Button
            variant="primary"
            size="lg"
            onClick={next}
            disabled={!canNext}
            iconEnd={<UiIcon name="chevron-right" />}
          >
            {step === 'perk' && !perk ? 'Choose a perk' : 'Next'}
          </Button>
        )}
        {last && !required && (
          <>
            <Button size="lg" onClick={() => done(true)}>
              Skip the cut
            </Button>
            <Button variant="primary" size="lg" disabled={!!err} onClick={() => done(false)} title={err ?? undefined}>
              Finish
            </Button>
          </>
        )}
        {last && required && (
          <Button
            variant="primary"
            size="lg"
            disabled={!!err}
            onClick={() => done(false)}
            iconEnd={<UiIcon name="check" />}
          >
            {err ?? 'Confirm the cut and continue'}
          </Button>
        )}
      </footer>
    </ScreenFrame>
  );
}
