# Indigo Storm — Web App Implementation Plan

A fully rules-enforced, single-file web version of Indigo Storm that runs entirely in the browser (no network requests) and can be hosted on GitHub Pages or any static host — or opened straight from disk.

---

## 1. Goals and constraints

|                                         |                                                                                                                                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Plays the real game**                 | Every rule in `../Indigo Storm.md` is enforced by a pure TypeScript rules engine. The UI can only submit actions the engine says are legal.                                  |
| **Same content as the paper prototype** | Card data comes from the same workbooks (`../Indigo Storm - Cards.xlsx`, `../Indigo Storm - Episode Plan.xlsx`), exported to JSON at build time. One source of truth.        |
| **Fully local**                         | No `fetch`/XHR/WebSocket at runtime. All data, art and fonts are bundled. The production build is one self-contained `index.html` that works from `file://`.                 |
| **Deployable**                          | Static output, relative asset paths, GitHub Pages workflow included.                                                                                                         |
| **Modern stack**                        | Latest stable versions (Nov 2026): Vite 8, React 19.3, TypeScript 7 (native `tsc`), Vitest 5, Biome 2.6, Zustand 5. Node ≥ 22.12.                                            |
| **Spoiler-safe repo**                   | Placeholder story is used unless `../spoilers/Indigo Storm - Story.xlsx` exists (same rule as `make_print.py`). The app never shows story text before the player reaches it. |

Non-goals for v1: multiplayer, accounts, server, analytics, mobile-phone layout (tablet and desktop are targets; phones should be usable but not optimized).

## 2. Stack

- **Build:** Vite 8 (Rolldown) + `@vitejs/plugin-react` 6 + `vite-plugin-singlefile` 2 (inlines JS/CSS/fonts into `index.html`). `base: './'`.
- **Language:** TypeScript 7, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, ES2024 target, ESM only. `tsc --noEmit` for type checking.
- **UI:** React 19 (function components, hooks, `useSyncExternalStore` via Zustand 5). No component library; a small in-house design system in `src/ui/`.
- **State:** Zustand store wraps the engine. Engine state is immutable plain data; the engine returns new state + events.
- **Styling:** Plain CSS with custom properties (design tokens), CSS nesting, container queries, `@layer`. No CSS-in-JS runtime.
- **Fonts:** `@fontsource-variable/inter` (body) and `@fontsource-variable/oswald` (display), inlined.
- **Lint/format:** Biome 2.6 (typescript-eslint does not support TS 7 yet).
- **Tests:** Vitest 5 (engine unit + property tests; component tests in `happy-dom` with Testing Library).
- **Data export:** `scripts/export-data.ts` run with Node's built-in TypeScript type-stripping (Node ≥ 22.18), reading the workbooks with ExcelJS.

## 3. Repository layout

```
web/
  PLAN.md                 this file
  package.json            scripts: dev, build, preview, test, typecheck, lint, format, data, check
  index.html
  vite.config.ts
  tsconfig.json
  biome.json
  scripts/
    export-data.ts        workbooks -> src/data/game-data.json
  src/
    main.tsx              app entry
    data/
      game-data.json      GENERATED (committed) — all cards, rules, story, plan, jump-ins
      types.ts            data schema types (shared by engine + UI)
      index.ts            typed accessors (cardsById, threatsForDay, …)
      objectives.ts       Bonus Objective codes per day (validated against plan text in tests)
      twists.ts           Episode Twist codes per day
    engine/               PURE TypeScript — no DOM, no React, no Date.now(), no Math.random()
      types.ts            GameState, Action, Decision, GameEvent, …
      rng.ts              seeded PRNG (sfc32 / mulberry32) with serializable state
      setup.ts            build an episode from data + campaign/jump-in state
      engine.ts           legalActions(), apply(), the turn/phase machine
      rules/              tuck.ts, abilities.ts, clears.ts, pressure.ts, perks.ts, end.ts, …
      objectives.ts       Bonus Objective evaluators (event-log based)
      twists.ts           Episode Twist modifiers
      campaign.ts         post-episode flow: awaken, stars, perk unlock, cut to 12, save
      bot.ts              simple greedy policy (tests + "hint" button)
      __tests__/
    state/
      store.ts            Zustand store: current screen, campaign, episode state, UI selection
      persistence.ts      localStorage autosave (versioned), export/import save file
    ui/
      styles/             tokens.css, base.css, layout.css
      art/                SVG icons (suits, dice, tracks), backgrounds, logo
      cards/              <Card> renderers for every card type (+ zoom/inspect)
      table/              the play screen: scene row, hand, tracks, perks, log, prompts
      screens/            Title, DaySelect, Briefing, Debrief, Cut, CampaignMap, Rulebook, Settings
      components/         Button, Dialog, Tooltip, Tabs, Toast, KeyHint, …
      dev/                CardGallery (dev-only route: every card in the data)
.github/workflows/pages.yml   (repo root) build web/ and deploy to GitHub Pages
```

## 4. Data pipeline

`npm run data` reads the workbooks and writes `src/data/game-data.json` (committed so the app builds without Python/Excel). Shape:

```ts
interface GameData {
  version: string; // content hash
  playerCards: PlayerCard[]; // Player Cards sheet (CORE, PROTO, day cards, Awakened)
  threats: ThreatCard[]; // Threat Cards sheet
  jumpIns: JumpIn[]; // Jump-In Setups sheet
  rules: RuleCard[]; // Rule Cards sheet
  story: StoryCard[]; // spoilers/ Story Cards if present, else placeholder sheet
  storySource: 'spoilers' | 'placeholder';
  days: DayPlan[]; // Episode Plan rows (all 30)
}
```

- Parse "Sim Effect" strings into structured effects (`{op:'draw', n:1}` …) at export time, so the engine never parses strings. Unknown ops fail the export loudly.
- Rewards/Pressure/Expiry text ("+2 Lead, -1 Exposure") parsed into `{lead, exposure, draw}`; Pressure containing "Blocker" → `blocker: true`; Rules Text containing "Cannot be Vanished" → `noVanish: true`; Awakening Trigger → structured trigger.
- `days[n].hasContent` = the day has player cards and Threats (currently Days 1, 6, 11, 16, 21, 26).
- Bonus Objectives and Episode Twists stay as text in the data; `objectives.ts` / `twists.ts` map each day to a machine code, and a test asserts every day with content has a code and that the text still matches (so editing the workbook text without updating the code is caught).

## 5. Rules engine

### 5.1 Principles

- `apply(state, action) → { state, events }` is pure and deterministic given the state (which includes the RNG state). Illegal actions throw `IllegalActionError`.
- `legalActions(state)` enumerates every legal action, including targets; the UI builds its affordances from it.
- Hidden information lives in state but the UI only reads it through `view(state)` (`PlayerView`), which hides deck order and face-down Threats.
- Everything is serializable JSON (for autosave and replays). A full episode can be replayed from `{seed, setup, actions[]}`.

### 5.2 Episode state machine

```
setup ──► (Cloned Credentials choice if unlocked) ──► turn loop:
  PLAY    up to `playsPerTurn` (2) card plays; free perk actions allowed; "End plays" only when plays are done
          (or when the hand is empty)
  PRESSURE resolved slot by slot, left → right, Pursuer last; may raise decisions (Ally Cover, …)
  DRAW    draw 2
  (repeat)
end: Objective Secured | Cover Blown | Out of Time | Scene Cleared  → EPISODE_OVER
```

`state.pending: Decision | null` — when non-null the only legal actions are its answers. Decisions: `allyCover`, `reorderTop` (peek / Satellite Overwrite), `chooseCard` (Cloned Credentials), `kineticTarget`, `confirmHardenedResolve` (auto-yes allowed via setting).

### 5.3 Actions

```ts
type Action =
  | {
      type: 'play';
      cardUid: string;
      mode: 'tuck' | 'ability' | 'deploy' | 'decrypt' | 'improvisedWeapon' | 'sleeperInstinct';
      slot?: number;
      slot2?: number;
      moveFrom?: number;
    }
  | { type: 'perk'; perk: PerkId; slot?: number } // free actions in the PLAY step
  | { type: 'endPlays' } // proceed to PRESSURE (only when allowed)
  | { type: 'decide'; choice: unknown }; // answers state.pending
```

### 5.4 Rules clarifications (authoritative for the engine)

These pin down wording the paper rules leave loose. Anything not listed follows `../Indigo Storm.md` and the Rule Cards.

1. **Plays.** Each turn you play exactly 2 cards (1 if you hold only 1). A play is one card from hand used one way: _tuck_ (Training/Conditioned/Awakened card under a face-up Threat whose preferred or alternate suit matches the card's suit), _ability_ (any Training/Conditioned/Awakened card; it may have no effect — that is still a legal play), _deploy_ (Gear/Ally), or _decrypt_ (a Recon card on a face-down Threat). A Training card can always be played for its ability, so a legal play always exists.
2. **Counting.** A Threat's symbols = tucked cards (1 each, of their suit) + every Ally symbol in play that matches its preferred or alternate suit. Power = tucked cards' Power (minus Pursuer suit penalties, minimum 0 each) + bonus Power from abilities/Gear. A Threat clears the moment both requirements are met; multiple clears resolve left to right.
3. **Clean Clear:** every tucked card is the preferred suit, and the preferred-suit symbols (cards + Allies) alone meet the symbol requirement — or a `clean_next` effect is active. Breach clears are never Clean.
4. **Clearing:** claim Reward, then Clean bonus, then (Two-Phase) place the Countermeasure in the same slot, otherwise refill from the top of the Threat Deck. A Threat entering the row gets its Timer Die; an Encrypted Threat enters face-down (no die until decrypted).
5. **Abilities:** `draw N`; `exposure ±N`; `lead +N`; `stall N` (+N to a die on a face-up Threat or Pursuer); `cancel_pressure` (a face-up Threat's Pressure does not resolve this turn — its timer still ticks; Strikes are not Pressure); `add_power N:Suit` (+N Power to a face-up Threat whose preferred/alternate suit is Suit); `breach P` (clear outright a face-up non-Pursuer Threat needing 1 symbol and ≤ P Power); `swap` (a non-Pursuer Scene Row Threat goes to the bottom of the Threat Deck, cards under it are discarded, the top card enters); `peek N` (look at the top N Threats and reorder them); `move_card` (move one tucked card to another face-up Threat whose preferred/alternate suit matches it); `clean_next` (the next clear this turn is Clean).
6. **Decrypt:** flip the face-down Threat, place its die; if Recon is its preferred/alternate suit the Recon card is tucked (and may clear it), otherwise discarded.
7. **Gear:** passive `power_bonus Suit N`: each card of that suit you tuck gets +N Power.
8. **Allies / Ally Cover:** when a Pressure effect, an Expiry effect or a Strike would apply and you have an Ally in play, you are asked whether to discard an Ally to cancel that one effect entirely.
9. **Blockers:** while a face-up Blocker is in the Scene Row, Lead cannot increase.
10. **Pressure step:** for each slot left to right (Pursuer last): skip face-down Threats; apply Pressure unless cancelled; then tick its die — at 0 a Threat escapes (Expiry, discard with tucked cards, refill) and a Pursuer Strikes (Strike, reset to Hunt). Episode end is checked after every change.
11. **Tracks:** Lead and Exposure never go below 0. Reaching the Lead target ends the episode immediately (Objective Secured); reaching the redline ends it (Cover Blown).
12. **Out of Time:** after the PLAY step, if both draw pile and hand are empty the episode ends without a Pressure step. **Scene Cleared:** Scene Row (including Pursuer) and Threat Deck all empty → +1 Lead, then end.
13. **Stars:** Objective (Lead target reached), Cover (final Exposure ≤ the day's threshold and not Cover Blown), Bonus (the day's objective evaluator, from the event log).
14. **Conditioned Cards:** the trigger is checked when the card is played (in any mode). If met, the Awakened Card replaces it for that play, its Awakening bonus applies and the flashback is shown. Otherwise it awakens during cleanup.
15. **Perks** (each once per episode, only those unlocked; free actions unless stated):
    - _Vanish_ — PLAY step: discard a face-up non-Pursuer Threat (unless it says "Cannot be Vanished"); no Reward; refill.
    - _Cloned Credentials_ — setup: choose 1 card from your deck to start in hand (then draw to 4).
    - _False Trail_ — PLAY step: for the rest of this turn ignore up to 2 Exposure you would gain and gain +1 Lead the first time it absorbs any.
    - _Sleeper Instinct_ — when you play a Stealth card for its ability, also tuck it under a Threat.
    - _Satellite Overwrite_ — PLAY step: look at the top 4 Threats, discard up to 2, reorder the rest.
    - _Contingency Plan_ — PLAY step: draw 2.
    - _Pattern Recognition_ — automatic: when you clear a Threat with ≥ 3 excess Power, draw 1 (first time only).
    - _Master Decryptor_ — PLAY step, before your first play: this turn every card counts as any suit (tuck anywhere as the Threat's preferred suit; any card decrypts).
    - _Adrenaline Surge_ — PLAY step: skip this turn's Pressure step entirely.
    - _Improvised Weapon_ — a play mode: tuck a card as the Threat's preferred suit with double Power.
    - _Hardened Resolve_ — automatic (asks first): when Exposure would reach the redline, it stops 1 below.
    - _Kinetic Momentum_ — when you clear a Threat with Force cards under it and excess Power, choose another face-up Threat to receive the excess as bonus Power.
16. **Decided during QA:** a Two-Phase Threat that escapes, is swapped away or is Vanished voids its Countermeasure; Pursuer suit penalties apply to a card's printed suit even when it counts as another suit; before a Conditioned Card is played the UI never reveals its Awakened Card (labels say "it will awaken"); "decrypt every Encrypted Threat" is met when none entered; hints never use hidden information.
17. **Episode Twists** (by code): `stealth_clean_lead` (Stealth Clean Clears +1 Lead), `four_slots`, `no_abilities`, `extra_opening_card`, `timers_minus_one`, `alarm_raised` (start +1 Exposure, Clean bonus becomes −2 Exposure).

### 5.5 Campaign and prototype modes

- **Prototype mode (v1 focus):** pick any day with content; the Jump-In deck and perks are applied; play; see the debrief. Nothing persists except stats.
- **Campaign mode:** Day 1 → 30 in order (days without content show "Not yet written" and can be skipped in a dev setting). Persisted: 12-card deck, retired cards, unlocked perks, Stars per day, flashbacks seen.
- **Post-episode flow:** Outro → Flashback awakening (if any) → Stars → Act Debrief tier (Days 10/20/30) → Perk unlock (perk days) → Cut: choose 3 of 15 to retire → save.

### 5.6 Engine tests

- One test file per rule area with hand-built states (clearing, clean, encrypted, pursuers, two-phase, conditioned, each perk, each ability, each twist, end conditions, stars).
- Property tests: random legal play-outs for every day × many seeds never throw, conserve cards (every card is in exactly one zone), keep tracks in range, end within 8 turns (+ draws).
- Bot parity: the greedy bot's Objective/Cover rates on each prototype day land within ±12 points of `../indigo_sim.py` (informative, not a hard requirement for v1).

## 6. User interface

### 6.1 Visual direction

"Midnight dossier": deep indigo night background with a subtle storm gradient and faint topographic/scanline texture; cards as clean white dossier sheets with bold colored headers (same layout language as the print cards, so paper and screen match); electric cyan accents for interactive highlights; suit colors Recon teal `#1F7A8C`, Stealth indigo `#4B3B9A`, Force crimson `#B83227`. Suits always carry a shape icon (eye, crescent, bolt) so color is never the only signal. Display font Oswald (condensed caps), body Inter.

Basic art (all SVG, generated in code): logo wordmark, suit icons, die faces, track pips, card backs per type, threat-type badges (encrypted lock, pursuer crosshair, two-phase lock, countermeasure shield), act title cards with simple geometric storm illustrations, Star icons.

### 6.2 Screens

1. **Title** — Continue, New Campaign, Prototype Days, How to Play, Settings, Import/Export save.
2. **Day select (prototype)** — six day tiles with mechanic name, difficulty, best Stars.
3. **Briefing** — Intro card(s) and, on rule days, the Rule Cards as a flippable carousel; Jump-In summary; the day's three Star conditions; "Begin".
4. **Table** (main screen) — see 6.3.
5. **Debrief** — Outro, Flashback reveal, Stars earned with animation, Act Debrief tier text, perk unlock picker, then **Cut** (choose 3 cards to retire with a clear preview of the 12 you keep).
6. **Campaign map** — 30-day grid in three acts with Stars, rule days and perk days marked.
7. **Rulebook** — every Rule Card unlocked so far, plus a searchable glossary and the quick reference.
8. **Settings** — animation speed, reduce motion, text size, high-contrast suits, confirm-before-ending-plays, auto-answer prompts (e.g. always decline Ally Cover for 1-point effects), reset data.

### 6.3 Table layout (desktop ≥ 1200 px; tablet ≥ 900 px stacks the side panel below)

```
┌ Day 21 · Act III ─ Turn 3/8 ─ Plays 1/2 ─────────────────── [Rulebook] [Menu] ┐
│ LEAD  ●●●●○○○○  target 8          EXPOSURE ●●○○○│○  cover ≤2  redline 6     │
├──────────────────────────────────────────────────────────────┬────────────────┤
│  Threat Deck (7)   SCENE ROW                                  │ STARS          │
│  [back]   [slot 1]   [slot 2]   [slot 3]   [Pursuer slot 4]   │ ☐ Objective    │
│           tucked fan + "2/2 ◆  5/8 ⚡" meter + timer die       │ ☐ Cover        │
├──────────────────────────────────────────────────────────────┤ ☐ Bonus …      │
│  IN PLAY: Gear / Allies                                       │ PERKS (used ✓) │
├──────────────────────────────────────────────────────────────┤ LOG (aria-live)│
│  HAND  [card] [card] [card] [card]      Draw pile 7 · Discard 4 [End plays ▶] │
└──────────────────────────────────────────────────────────────┴────────────────┘
```

- **Select → target → confirm:** selecting a hand card highlights every legal target (slots glow; the ability button shows what it will do; Deploy zone highlights). Each legal action is shown as a labeled option ("Tuck under Roadblock: 2/2 symbols, 8/8 Power → CLEARS (Clean)"). Projected results come from running `apply` on a copy.
- Drag-and-drop with pointer events as an alternative to clicking; full keyboard play (1–6 select card, ←/→ choose target, Enter confirm, Esc cancel, P perks, R rulebook, ? shortcuts).
- Prompts (Ally Cover etc.) appear as focused, non-blocking side sheets with the exact effect being prevented.
- Animations: card moves via the View Transitions API (fallback: CSS transforms); track changes pulse; dice roll down; clears burst; all disabled by reduce-motion.
- Hover/long-press any card to inspect it full size.
- Log panel narrates every engine event in plain language.

### 6.4 Accessibility

Semantic buttons and landmarks, visible focus (moved to each screen's heading on navigation), `aria-live="polite"` log, all info available as text, suit icons + color, WCAG AA contrast, respects `prefers-reduced-motion` and `prefers-color-scheme` (the default theme follows the system; dark, light and high-contrast can be chosen).

## 7. Persistence

- `localStorage` key `indigo-storm/v1`: settings, campaign state, in-progress episode (`{seed, setup, actions[]}` replayed on load), prototype best results.
- Export/Import save as a `.json` download/upload (File API, no network). Versioned with migrations.

## 8. Deployment

- `npm run build` → `web/dist/index.html` (single file, also works by double-click).
- `.github/workflows/pages.yml`: on push to `main`, set up Node 24, `npm ci`, `npm run check`, `npm run build`, upload `web/dist` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`. Repo Settings → Pages → Source: GitHub Actions.
- Works on any static host (Netlify, Cloudflare Pages, itch.io HTML upload) as-is.

## 9. Workstreams and sequencing

| Phase | Workstream                                                            | Owner                | Touches                                                                                         |
| ----- | --------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| 0     | Plan, scaffold, toolchain, data export, data types, CI                | lead session         | everything outside `src/engine`, `src/ui`                                                       |
| 1a    | Rules engine + tests + bot                                            | sub-session "engine" | `src/engine/**`, `src/data/objectives.ts`, `src/data/twists.ts`                                 |
| 1b    | Design system, art, card renderers, gallery                           | sub-session "design" | `src/ui/styles/**`, `src/ui/art/**`, `src/ui/cards/**`, `src/ui/components/**`, `src/ui/dev/**` |
| 2     | Screens, table, store, persistence, flow wiring                       | sub-session "app"    | `src/ui/table/**`, `src/ui/screens/**`, `src/state/**`, `src/main.tsx`, `src/App.tsx`           |
| 3     | Independent verification (rules fidelity, play-throughs, a11y, build) | sub-session "QA"     | read-only + report; fixes go back to owners                                                     |
| 4     | Fix pass, polish, docs (README, deploy guide)                         | lead + owners        | —                                                                                               |

Rules for sub-sessions: stay inside your directories; don't run git (the lead commits); run `npm run check` (typecheck + lint + tests) before reporting; report what's done, what's left, and any rule you had to interpret.

## 10. Definition of done (v1)

- All six prototype days are playable start to finish in the browser with every rule enforced, including all perks, twists codes, Bonus Objectives and the post-episode flow.
- `npm run check` passes; property tests run 1,000+ random games per day without errors.
- `npm run build` produces one `index.html` (< 2 MB) with zero network requests at runtime (verified by a test that scans the bundle for `fetch(`/`XMLHttpRequest`/`WebSocket` and by loading it from `file://`).
- Keyboard-only play works; reduce-motion is honored.
- GitHub Pages workflow is in place and documented.
