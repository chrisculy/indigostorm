// The play screen. Builds every affordance from engine legalActions (via state/derive.ts) and
// submits actions through the store, which applies them with the engine.

import './table.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dayPlan } from '../../data/index.ts';
import { type Action, actionKey, isLegal, NOMINAL_TURNS } from '../../engine/index.ts';
import {
  canEndPlays,
  legalOf,
  type Option,
  onlyEndPlaysLeft,
  optionsFor,
  playableCards,
  viewOf,
} from '../../state/derive.ts';
import { motionEnabled } from '../../state/settings.ts';
import { gameStore, useGame } from '../../state/store.ts';
import { UiIcon } from '../art/index.ts';
import { Badge, Button, Dialog, IconButton, Track, useToast } from '../components/index.ts';
import { RulebookContent } from '../screens/Rulebook.tsx';
import { InPlay, SceneRow, ThreatDeckPile } from './Board.tsx';
import { CommandPanel } from './Command.tsx';
import { TableContext, type TableCtl } from './context.ts';
import { DecisionSheet } from './Decision.tsx';
import { DragGhost, type DropTarget, useCardDrag } from './drag.tsx';
import { Hand, Piles } from './Hand.tsx';
import { InspectProvider } from './inspect.tsx';
import { withTransition } from './motion.ts';
import { ConfirmEndDialog, EndBanner, FlashbackDialog, MenuDialog, ShortcutsDialog } from './Overlays.tsx';
import { LogPanel, PerksPanel, StarsPanel } from './Side.tsx';
import { MID_LAYOUT, useMediaQuery } from './useMedia.ts';

const ROMAN = ['', 'I', 'II', 'III'];

function isTyping(el: Element | null): boolean {
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
}
const modalOpen = () => !!document.querySelector('dialog.dialog[open]');

function focusAmong(selector: string, dir: number) {
  const els = [...document.querySelectorAll<HTMLElement>(selector)];
  if (els.length === 0) return;
  const i = els.indexOf(document.activeElement as HTMLElement);
  const next = els[(i + dir + els.length) % els.length] ?? els[0];
  next?.focus();
}

function isUsable(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement) || el === document.body || !el.isConnected) return false;
  return !(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true';
}

/**
 * Where keyboard focus goes after the table changed under it (a play, End plays, a decision, a
 * flashback): End plays when that is all that is left, else the hand card that took the played card's
 * place (or the first playable one), else End plays, else the table heading. Never <body>.
 */
function focusTableTarget(handIndex: number): void {
  const st = gameStore().getState().episode?.state;
  const end = document.querySelector<HTMLElement>('.end-plays');
  if (st && onlyEndPlaysLeft(st) && isUsable(end)) {
    end.focus();
    return;
  }
  const hand = [...document.querySelectorAll<HTMLElement>('.hand .card')];
  const playable = hand.filter((el) => el.getAttribute('aria-disabled') !== 'true');
  const at = handIndex >= 0 ? hand[Math.min(handIndex, hand.length - 1)] : undefined;
  const pick = (at && playable.includes(at) ? at : playable[0]) ?? (isUsable(end) ? end : null) ?? hand[0];
  if (pick) pick.focus();
  else document.querySelector<HTMLElement>('[data-screen-heading]')?.focus();
}

export function Table() {
  const episode = useGame((s) => s.episode);
  if (!episode) return null;
  return (
    <InspectProvider>
      <TableInner />
    </InspectProvider>
  );
}

function TableInner() {
  const episode = useGame((s) => s.episode);
  const ui = useGame((s) => s.ui);
  const settings = useGame((s) => s.settings);
  const act = useGame((s) => s.act);
  const select = useGame((s) => s.select);
  const setTargetSlot = useGame((s) => s.setTargetSlot);
  const arm = useGame((s) => s.arm);
  const requestHint = useGame((s) => s.requestHint);
  const go = useGame((s) => s.go);
  const lastEvents = useGame((s) => s.lastEvents);
  const eventSeq = useGame((s) => s.eventSeq);
  const flashbacks = useGame((s) => s.flashbackQueue.length);
  const [rulebook, setRulebook] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [hideBanner, setHideBanner] = useState(false);

  const state = episode?.state;
  if (!state) throw new Error('No episode');
  const v = viewOf(state);
  const plan = dayPlan(v.day);
  const over = v.phase === 'over';
  const locked = over || !!v.pending || v.phase !== 'play';
  const options = useMemo(() => optionsFor(state, ui.selection), [state, ui.selection]);
  const visible = useMemo(
    () => (ui.targetSlot === null ? options : options.filter((o) => o.slots.includes(ui.targetSlot as number))),
    [options, ui.targetSlot],
  );
  const kineticSlots = v.pending?.kind === 'kineticTarget' ? v.pending.options : [];
  const targetSlots = useMemo(
    () => new Set<number>([...options.flatMap((o) => o.slots), ...kineticSlots]),
    [options, kineticSlots],
  );
  const deployTarget = options.some((o) => o.deploy);
  const playable = useMemo(() => playableCards(state), [state]);
  const hintKey = ui.hint ? actionKey(ui.hint) : null;
  const hoverOption = ui.hoverKey ? (options.find((o) => o.key === ui.hoverKey) ?? null) : null;
  const burstSlots = useMemo(
    () => new Set(lastEvents.flatMap((e) => (e.type === 'cleared' ? [e.slot] : []))),
    [lastEvents],
  );
  const motion = motionEnabled(settings);
  const midLayout = useMediaQuery(MID_LAYOUT);

  /** The last action sent from the table, for focus management afterwards. */
  const lastAction = useRef<{ type: Action['type']; handIndex: number } | null>(null);
  const perform = useCallback(
    (a: Action) => {
      withTransition(motion, () => {
        // A queued click (e.g. a double click) may no longer be legal: drop it quietly.
        const now = gameStore().getState().episode?.state;
        if (now && isLegal(now, a)) {
          lastAction.current = { type: a.type, handIndex: a.type === 'play' ? now.hand.indexOf(a.cardUid) : -1 };
          act(a);
        }
      });
    },
    [act, motion],
  );

  const choose = useCallback(
    (o: Option) => {
      if (settings.confirmPlays && ui.armedKey !== o.key) {
        arm(o.key);
        return;
      }
      perform(o.action);
    },
    [settings.confirmPlays, ui.armedKey, arm, perform],
  );

  const clickSlot = useCallback(
    (slot: number) => {
      if (v.pending?.kind === 'kineticTarget' && v.pending.options.includes(slot)) {
        perform({ type: 'decide', choice: slot });
        return;
      }
      if (!targetSlots.has(slot)) return;
      const forSlot = options.filter((o) => o.slots.includes(slot));
      // Prefer the obvious single option; tuck + ability on one slot needs a choice.
      if (forSlot.length === 1 && forSlot[0]) choose(forSlot[0]);
      else setTargetSlot(slot);
    },
    [v.pending, targetSlots, options, choose, setTargetSlot, perform],
  );

  const clickDeploy = useCallback(() => {
    const o = options.find((x) => x.deploy);
    if (o) choose(o);
  }, [options, choose]);

  const doEndPlays = useCallback(() => {
    setConfirmEnd(false);
    perform({ type: 'endPlays' });
  }, [perform]);

  const endPlays = useCallback(() => {
    if (!canEndPlays(state) || locked) return;
    if (settings.confirmEndPlays) setConfirmEnd(true);
    else doEndPlays();
  }, [state, locked, settings.confirmEndPlays, doEndPlays]);

  const hintNow = useCallback(() => {
    const a = requestHint();
    if (!a) return;
    // Bring the hinted control into view / focus for keyboard users.
    requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>('.option[data-hint]') ??
        document.querySelector<HTMLElement>('.end-plays[data-hint]') ??
        document.querySelector<HTMLElement>('.perk[data-hint] button');
      el?.focus();
    });
  }, [requestHint]);

  const drag = useCardDrag({
    canDrag: (uid) => !locked && playable.has(uid),
    onStart: (uid) => select({ kind: 'card', uid }),
    onDrop: (uid, target: DropTarget) => {
      const opts = optionsFor(state, { kind: 'card', uid });
      const pick =
        target.kind === 'deploy'
          ? opts.filter((o) => o.deploy)
          : opts.filter((o) => o.slots.includes(target.slot) && o.verb !== 'ability' && o.verb !== 'sleeper');
      const any = target.kind === 'slot' ? opts.filter((o) => o.slots.includes(target.slot)) : pick;
      const list = pick.length ? pick : any;
      if (list.length === 1 && list[0]) choose(list[0]);
      else if (list.length > 1 && target.kind === 'slot') setTargetSlot(target.slot);
    },
  });

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(document.activeElement) || modalOpen()) return;
      const k = e.key;
      if (k === '?') {
        e.preventDefault();
        setShortcuts(true);
        return;
      }
      if (k === 'r' || k === 'R') {
        e.preventDefault();
        setRulebook(true);
        return;
      }
      if (over) return;
      if (k === 'Escape') {
        if (ui.armedKey) arm(null);
        else if (ui.targetSlot !== null) setTargetSlot(null);
        else if (ui.selection) select(null);
        return;
      }
      if (v.pending) return;
      if (/^[1-9]$/.test(k)) {
        const uid = v.hand[Number(k) - 1];
        if (!uid) return;
        e.preventDefault();
        const sel = ui.selection;
        select(sel?.kind === 'card' && sel.uid === uid ? null : { kind: 'card', uid });
        return;
      }
      if (k === 'e' || k === 'E') {
        e.preventDefault();
        endPlays();
        return;
      }
      if (k === 'h' || k === 'H') {
        e.preventDefault();
        hintNow();
        return;
      }
      if (k === 'Enter' && ui.armedKey) {
        const o = options.find((x) => x.key === ui.armedKey);
        if (o) {
          e.preventDefault();
          perform(o.action);
        }
        return;
      }
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        const dir = k === 'ArrowLeft' ? -1 : 1;
        if (targetSlots.size > 0 || deployTarget) {
          e.preventDefault();
          focusAmong('.slot[data-target] .card, .inplay[data-target]', dir);
        } else if (!(document.activeElement as HTMLElement | null)?.closest('[role="tablist"]')) {
          e.preventDefault();
          focusAmong('.hand .card', dir);
        }
        return;
      }
      if (k === 'ArrowUp' || k === 'ArrowDown') {
        if (document.querySelector('.option')) {
          e.preventDefault();
          focusAmong('.option', k === 'ArrowUp' ? -1 : 1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [over, ui, v, options, targetSlots, deployTarget, select, arm, setTargetSlot, endPlays, hintNow, perform]);

  // A fresh banner for each finished episode.
  useEffect(() => {
    if (!over) setHideBanner(false);
  }, [over]);

  // The End banner replaces the episode's toasts (Pressure summaries etc.): they would cover it.
  const toast = useToast();
  useEffect(() => {
    if (over) toast.clear('episode');
  }, [over, toast]);

  // Focus after the table changes: a play removes the focused option/card, End plays disables its
  // button, a decision closes its sheet. Put focus somewhere useful instead of letting it fall to
  // <body>. Sheets, dialogs and the End banner manage their own focus.
  const pendingNow = !!v.pending;
  const prevPending = useRef(pendingNow);
  const mounted = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the game moved on (eventSeq / flashbacks / pending)
  useEffect(() => {
    const decided = prevPending.current && !pendingNow;
    prevPending.current = pendingNow;
    if (!mounted.current) {
      mounted.current = true; // entering the table: the screen heading gets focus (App)
      return;
    }
    const id = requestAnimationFrame(() => {
      if (document.querySelector('dialog[open]') || gameStore().getState().episode?.state.phase !== 'play') return;
      const last = lastAction.current;
      const forced = decided || last?.type === 'endPlays';
      if (!forced && isUsable(document.activeElement)) return;
      lastAction.current = null;
      focusTableTarget(last?.type === 'play' ? last.handIndex : -1);
    });
    return () => cancelAnimationFrame(id);
  }, [eventSeq, flashbacks, pendingNow]);

  const ctl: TableCtl = {
    state,
    v,
    options,
    visible,
    targetSlots,
    deployTarget,
    playable,
    hintKey,
    hint: ui.hint,
    hoverOption,
    burstSlots,
    eventSeq,
    choose,
    perform,
    clickSlot,
    clickDeploy,
    endPlays,
    hintNow,
    openRulebook: () => setRulebook(true),
    locked,
  };

  const legalCount = legalOf(state).length;
  return (
    <TableContext.Provider value={ctl}>
      <div
        className="table"
        data-mid={midLayout || undefined}
        data-over={over || undefined}
        data-dragging={drag.drag ? '' : undefined}
      >
        <header className="topbar">
          <h1 className="topbar__day" tabIndex={-1} data-screen-heading="">
            <span className="topbar__dayno display">Day {v.day}</span>{' '}
            <span className="topbar__act">
              Act {ROMAN[plan.act]} · {plan.actTitle}
            </span>
          </h1>
          <dl className="topbar__stats">
            <div>
              <dt>Turn</dt>
              <dd className="num">
                {Math.max(1, v.turn)}
                <small>/{NOMINAL_TURNS}</small>
              </dd>
            </div>
            <div>
              <dt>Plays</dt>
              <dd>
                <span className="play-pips" role="img" aria-label={`${v.playsUsed} of ${v.playsPerTurn} plays used`}>
                  {Array.from({ length: v.playsPerTurn }, (_, i) => `play-${i}`).map((k, i) => (
                    <span key={k} data-used={i < v.playsUsed || undefined} />
                  ))}
                </span>
              </dd>
            </div>
          </dl>
          <div className="topbar__mode">
            {episode?.mode === 'prototype' ? (
              <Badge tone="neutral">Prototype</Badge>
            ) : (
              <Badge tone="accent">Campaign</Badge>
            )}
          </div>
          <div className="topbar__tools">
            {over && hideBanner && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => go('debrief')}
                iconEnd={<UiIcon name="chevron-right" />}
              >
                Debrief
              </Button>
            )}
            <Button variant="ghost" size="sm" icon={<UiIcon name="book" />} onClick={() => setRulebook(true)} kbd="R">
              Rulebook
            </Button>
            <IconButton
              label="Keyboard shortcuts (?)"
              icon={<span aria-hidden="true">?</span>}
              onClick={() => setShortcuts(true)}
            />
            <IconButton label="Menu" icon={<UiIcon name="menu" />} onClick={() => setMenu(true)} />
          </div>
        </header>

        <section className="tracks" aria-label="Tracks">
          <Track kind="lead" value={v.lead} max={v.leadTarget} target={v.leadTarget} compact={midLayout} />
          <Track
            kind="exposure"
            value={v.exposure}
            max={v.redline}
            threshold={v.coverThreshold}
            redline={v.redline}
            compact={midLayout}
          />
        </section>

        <main className="board" id="main" aria-label="Table">
          <div className="board__row">
            <ThreatDeckPile />
            <SceneRow />
          </div>
          <InPlay />
        </main>

        <section className="handrow" aria-label="Hand and orders">
          <Piles />
          <Hand onDragStart={drag.onPointerDown} consumeClick={drag.consumeClick} />
          {!midLayout && <CommandPanel />}
        </section>

        <aside className="side" aria-label="Episode status">
          {midLayout && <CommandPanel />}
          <StarsPanel />
          <PerksPanel />
          <LogPanel />
        </aside>

        {over && !hideBanner && flashbacks === 0 && (
          <EndBanner v={v} onDebrief={() => go('debrief')} onHide={() => setHideBanner(true)} />
        )}
        <span className="sr-only" aria-live="polite">
          {legalCount === 0 && !over ? 'Resolving…' : ''}
        </span>
      </div>
      <DragGhost drag={drag.drag} />
      <DecisionSheet />
      <FlashbackDialog />
      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />
      <MenuDialog
        open={menu}
        onClose={() => setMenu(false)}
        onRulebook={() => setRulebook(true)}
        onShortcuts={() => setShortcuts(true)}
      />
      <ConfirmEndDialog open={confirmEnd} v={v} onConfirm={doEndPlays} onClose={() => setConfirmEnd(false)} />
      <Dialog open={rulebook} onClose={() => setRulebook(false)} title="Rulebook" size="full">
        {rulebook && <RulebookContent autoFocus />}
      </Dialog>
    </TableContext.Provider>
  );
}
