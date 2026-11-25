// Side panel: Star conditions with live progress, perks, and the narrated event log.

import { useEffect, useMemo, useRef, useState } from 'react';
import { perksById } from '../../data/index.ts';
import { twistSummaries } from '../../data/twists.ts';
import type { PerkId } from '../../data/types.ts';
import { describeEvent, type GameEvent } from '../../engine/index.ts';
import { useGame } from '../../state/store.ts';
import { PerkEmblem, StarIcon } from '../art/index.ts';
import { Badge, Button, LiveRegion } from '../components/index.ts';
import { useTable } from './context.ts';

function StarLine({ label, detail, status }: { label: string; detail: string; status: 'met' | 'failed' | 'pending' }) {
  return (
    <li className="star-line" data-status={status}>
      <StarIcon filled={status === 'met'} className="star-line__icon" />
      <span className="star-line__text">
        <span className="star-line__label">
          {label}
          <span className="sr-only">
            {status === 'met' ? ' (on track)' : status === 'failed' ? ' (missed)' : ' (not yet)'}
          </span>
        </span>
        <span className="star-line__detail">{detail}</span>
      </span>
    </li>
  );
}

export function StarsPanel() {
  const { v } = useTable();
  const over = v.phase === 'over' && v.result;
  const objective: 'met' | 'failed' | 'pending' = over
    ? v.result?.stars.objective
      ? 'met'
      : 'failed'
    : v.lead >= v.leadTarget
      ? 'met'
      : 'pending';
  const cover: 'met' | 'failed' | 'pending' = over
    ? v.result?.stars.cover
      ? 'met'
      : 'failed'
    : v.exposure <= v.coverThreshold
      ? 'met'
      : 'pending';
  const bonus = over ? (v.result?.stars.bonus ? 'met' : 'failed') : v.bonusObjective.status;
  return (
    <section className="side-sec" aria-labelledby="stars-h">
      <h2 id="stars-h" className="side-head">
        Stars
      </h2>
      <ul className="star-lines">
        <StarLine label="Objective" detail={`Reach ${v.leadTarget} Lead · now ${v.lead}`} status={objective} />
        <StarLine
          label="Cover"
          detail={`Finish at Exposure ${v.coverThreshold} or less · now ${v.exposure}`}
          status={cover}
        />
        <StarLine label="Bonus" detail={`${v.bonusObjective.text} ${v.bonusObjective.progress}`} status={bonus} />
      </ul>
      {v.twist && (
        <p className="twist">
          <Badge tone="warning" solid>
            Twist
          </Badge>{' '}
          {twistSummaries[v.twist]}
        </p>
      )}
    </section>
  );
}

const PERK_TIMING: Partial<Record<PerkId, string>> = {
  clonedCredentials: 'Setup',
  sleeperInstinct: 'Play mode',
  improvisedWeapon: 'Play mode',
  patternRecognition: 'Automatic',
  hardenedResolve: 'Automatic',
  kineticMomentum: 'Automatic',
};

export function PerksPanel() {
  const t = useTable();
  const { v } = t;
  const select = useGame((s) => s.select);
  const sel = useGame((s) => s.ui.selection);
  if (v.perks.unlocked.length === 0) return null;
  const activatePerk = (p: PerkId) => {
    const acts = t.state && v.perks.usableNow.includes(p);
    if (!acts) return;
    if (p === 'vanish') {
      select(sel?.kind === 'perk' && sel.perk === p ? null : { kind: 'perk', perk: p });
      return;
    }
    t.perform({ type: 'perk', perk: p });
  };
  return (
    <section className="side-sec" aria-labelledby="perks-h">
      <h2 id="perks-h" className="side-head">
        Perks
      </h2>
      <ul className="perks">
        {v.perks.unlocked.map((p) => {
          const info = perksById.get(p);
          const used = v.perks.used.includes(p);
          const usable = v.perks.usableNow.includes(p) && !t.locked;
          const hinted = t.hint?.type === 'perk' && t.hint.perk === p;
          const active = sel?.kind === 'perk' && sel.perk === p;
          return (
            <li key={p} className="perk" data-used={used || undefined} data-hint={hinted || undefined}>
              <PerkEmblem branch={info?.branch ?? 'GHOST'} className="perk__emblem" />
              <span className="perk__text">
                <span className="perk__name">{info?.name ?? p}</span>
                <span className="perk__desc">{info?.text}</span>
              </span>
              {used ? (
                <Badge tone="neutral">Used</Badge>
              ) : usable ? (
                <Button
                  size="sm"
                  variant={active ? 'primary' : 'secondary'}
                  onClick={() => activatePerk(p)}
                  aria-label={`Use ${info?.name ?? p}`}
                  aria-pressed={p === 'vanish' ? active : undefined}
                >
                  {p === 'vanish' ? (active ? 'Choose' : 'Use…') : 'Use'}
                </Button>
              ) : (
                <span className="perk__timing">{PERK_TIMING[p] ?? 'Ready'}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function tone(e: GameEvent): string | undefined {
  switch (e.type) {
    case 'cleared':
    case 'sceneCleared':
      return 'good';
    case 'escaped':
    case 'strike':
      return 'bad';
    case 'lead':
      return e.delta > 0 ? 'good' : e.delta < 0 ? 'bad' : undefined;
    case 'exposure':
      return e.delta > 0 ? 'bad' : e.delta < 0 ? 'good' : undefined;
    case 'turnStarted':
    case 'episodeEnded':
      return 'head';
    case 'awakened':
      return 'flash';
    default:
      return undefined;
  }
}

const QUIET = new Set<GameEvent['type']>(['played', 'pressureStep', 'abilityUsed']);

export function LogPanel() {
  const { v } = useTable();
  const lastEvents = useGame((s) => s.lastEvents);
  const seq = useGame((s) => s.eventSeq);
  const listRef = useRef<HTMLOListElement>(null);
  const [toggle, setToggle] = useState(false);
  const lines = useMemo(() => v.log.slice(-250).map((e, i) => ({ e, i, text: describeEvent(e) })), [v.log]);
  useEffect(() => {
    const el = listRef.current;
    if (el && lines.length) el.scrollTop = el.scrollHeight;
  }, [lines.length]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-announce on every action (seq)
  useEffect(() => setToggle((x) => !x), [seq]);
  const narration = lastEvents
    .filter((e) => !QUIET.has(e.type))
    .map(describeEvent)
    .join(' ');
  return (
    <section className="side-sec side-sec--log" aria-labelledby="log-h">
      <h2 id="log-h" className="side-head">
        Log
      </h2>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be reachable by keyboard */}
      <ol className="log" ref={listRef} aria-label="Event log" tabIndex={0}>
        {lines.map(({ e, i, text }) => (
          <li key={i} data-tone={tone(e)}>
            {text}
          </li>
        ))}
      </ol>
      <LiveRegion message={narration ? `${narration}${toggle ? '' : ' '}` : ''} />
    </section>
  );
}
