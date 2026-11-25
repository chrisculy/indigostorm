# Indigo Storm rules engine

Pure TypeScript, no DOM/React/Date/Math.random. All state is plain JSON (safe to `structuredClone`,
`JSON.stringify`, autosave and replay). Import everything from `src/engine/index.ts`.

## Starting an episode

```ts
import { createEpisode, prototypeSetup, campaignSetup, view } from '../engine/index.ts';

const setup = prototypeSetup(11, seed); // Jump-In deck + perks + the day's 3 cards (Day 1: Core + Day 1)
// or: campaignSetup(campaign, seed)              // campaign deck + unlocked perks + the day's 3 cards
let state = createEpisode(setup); // shuffles, deals, draws 4 — or stops at Cloned Credentials
```

`EpisodeSetup = { day, deck: string[], perks: PerkId[], seed, twist? }`. Save `{ setup, actions[] }` and
rebuild with `replay(setup, actions)` — the engine is deterministic.

## The loop

```ts
const actions = legalActions(state); // every legal action, with concrete targets
const { state: next, events } = apply(state, a); // pure; throws IllegalActionError if `a` is not legal
```

- `state.phase`: `'setup' | 'play' | 'pressure' | 'draw' | 'over'`. Only `'play'` (and decisions) wait for input;
  Pressure → Draw → next turn run automatically inside `apply`.
- `state.pending`: a `Decision` or `null`. While non-null, the only legal actions are `{ type: 'decide', choice }`.
- A turn: **2 plays** (1 if the hand runs out) + any free perk actions, then **`{ type: 'endPlays' }`**, which is
  never automatic (perks like Vanish / False Trail / Adrenaline Surge are used after the plays). When
  `legalActions` is just `[endPlays]` the UI may submit it automatically (setting).
- `state.result` is set when `phase === 'over'`: `{ reason, turn, lead, exposure, stars, starCount, sceneCleared }`.

### Actions

| Action                                                                | Meaning                                                                                                                                                                                        |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{type:'play', cardUid, mode:'tuck', slot}`                           | Tuck under a face-up Threat (suit = its preferred/alternate suit; any suit under Master Decryptor)                                                                                             |
| `{type:'play', cardUid, mode:'ability', slot?, moveFrom?, moveCard?}` | Use the card's ability. `slot` = target for stall / cancel / add_power / breach / swap; move_card uses `moveFrom` + `moveCard` → `slot`. Omitted target = "play for no effect" (always legal). |
| `{type:'play', cardUid, mode:'deploy'}`                               | Gear / Ally                                                                                                                                                                                    |
| `{type:'play', cardUid, mode:'decrypt', slot}`                        | Recon card (any card under Master Decryptor) on a face-down Threat                                                                                                                             |
| `{type:'play', cardUid, mode:'improvisedWeapon', slot}`               | Perk: tuck as the preferred suit, double Power                                                                                                                                                 |
| `{type:'play', cardUid, mode:'sleeperInstinct', slot?, slot2}`        | Perk: ability (target `slot`) then tuck under `slot2`                                                                                                                                          |
| `{type:'perk', perk, slot?}`                                          | Free perk actions: vanish (slot), falseTrail, satelliteOverwrite, contingencyPlan, masterDecryptor (before the first play), adrenalineSurge                                                    |
| `{type:'endPlays'}`                                                   | Go to Pressure (legal once 2 plays are made or the hand is empty)                                                                                                                              |
| `{type:'decide', choice}`                                             | Answer `state.pending`                                                                                                                                                                         |

Slots are indices into `state.slots` (Pursuer = last slot, `state.pursuerSlot`). Card uids are card ids.

### Decisions (`state.pending.kind` → `choice`)

| kind                                                    | choice                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| `chooseCard` (Cloned Credentials, setup)                | a card id from `options`, or `null` to skip                   |
| `reorderTop` (peek)                                     | the `cards` in their new order, top first                     |
| `satellite`                                             | `{ discard: ids (≤ maxDiscard), order: the rest, top first }` |
| `allyCover` (Pressure / Expiry / Strike about to apply) | an Ally id from `allies` to defeat, or `null` to take it      |
| `kineticTarget`                                         | a slot from `options`, or `null` to keep the perk             |
| `confirmHardenedResolve`                                | `true` (stop at redline − 1) or `false`                       |

`decisionChoices(decision)` lists every valid choice (it is what `legalActions` returns while pending).

## Building UI affordances

- Group `legalActions(state)` by `cardUid` → per card, its modes and targets (`playActionsFor(state, uid)` does
  one card). Highlight slots that appear as `slot` / `slot2`.
- Label every option with `describeAction(state, action)` (e.g. "Tuck Muscle Memory under Roadblock",
  "Awaken Recurring Dream → Remembered Training: …" when a Conditioned card's trigger is met).
- `previewAction(state, action)` → `{ lead, exposure, cardsDrawn, clears[{slot, threatId, clean}], slots[meters],
  ends, decision, hidden }`. It runs on a lookahead copy and never leaks hidden info: draws are counted, refills
  are not simulated, decrypts return `hidden: true`.
- Render from `view(state)` (a `PlayerView`): hand, counts of hidden piles, `slots[]` with
  `state: 'empty' | 'faceDown' | 'faceUp'`, symbols/Power meters, `cleanIfCleared`, dice; `threatDeckKnownTop`
  (seen through peek / Satellite), `threatDeckTopEncrypted`, perks `{unlocked, used, available, usableNow}`,
  `modifiers`, `bonusObjective {text, status, progress}`, `pending`, `log`, `result`.
- **Flashback spoilers:** a Conditioned card's Awakened card is secret until played (Rule Card D16-R1).
  `willAwaken(state, uid)` says a play would awaken it; `describeAction` then reads "… — it will awaken" and
  `previewAction` returns `{ hidden: true, awakens: true }`. Legal plays are computed from the Conditioned card
  itself. Do not display `effectiveCard(state, uid)` (it names the Awakened card); the `awakened` event after the
  play reveals it. `slotCounts(state, slot)` gives live counts.

## Rule notes

- **Clean Clear** (PLAN 5.4 #3): every tucked card counts as the preferred suit AND the preferred-suit symbols
  (tucked cards + Ally symbols) alone meet the symbol requirement — or a `clean_next` effect is active. Breach
  clears are never Clean.
- Improvised Weapon / Master Decryptor tucks count as the Threat's preferred suit for everything except Pursuer
  suit penalties, which use the card's printed suit.
- A Two-Phase Threat that escapes or is swapped / Vanished away voids its Countermeasure (`state.voidThreats`).

## Events

`apply` returns the `GameEvent`s it produced (also appended to `state.log`). `describeEvent(e)` gives a
plain-language log line. Events never carry hidden info (a face-down Threat entering has `threatId: null`).
Useful ones for animation: `drew`, `tucked`, `cleared`, `lead` / `exposure` (with `delta`, `value`, `src`),
`threatEntered`, `timerTick`, `escaped`, `strike`, `allyCover`, `awakened` (with `flashback` text), `episodeEnded`.

## Bonus Objectives and Twists

`src/data/objectives.ts` maps every day to `{ code, params }`; `objectiveProgress(state)` /
`evaluateObjective(obj, state)` give `{ status: 'pending' | 'met' | 'failed', progress }`.
`src/data/twists.ts` maps twist days to codes; `twistSummaries` has player-facing text.

## Campaign flow

```ts
let campaign = newCampaign(); // Day 1, Core deck
campaign = skipToNextContentDay(campaign); // days without content (skipDay(c, perk?) one at a time)
let s = createEpisode(campaignSetup(campaign, seed));
// … play …
const debrief = debriefEpisode(campaign, s); // flashbacks (in play + cleanup awakenings), stars,
// perkOptions, the 15 cards, retireCount, actDebrief
campaign = completeDay(campaign, debrief, { retire: [a, b, c], perk }); // validates; cut to 12; day + 1
```

`CampaignState` is plain JSON: `{ mode, day, deck, retired, perks, stars, flashbacksSeen, skipped }`.

## Hints and the bot

`suggestAction(state)` returns the greedy bot's action (also answers decisions). It looks ahead two plays plus
the Pressure step on hypothetical copies, so it never peeks at hidden cards.
