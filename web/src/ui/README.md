# Indigo Storm UI kit

Design system, art and card renderers for the web app. Visual direction: **Midnight dossier** (PLAN.md §6.1):
deep indigo night, white dossier-sheet cards with bold colored headers (same information hierarchy and colors as
`make_print.py`), electric cyan only for interaction. The signature motif is the **storm isobar** (wobbling contour
rings around a storm eye): page texture, every card back, the logo mark and the act scenes.

Review everything at **`index.html#gallery`** (dev gallery). Parameters can follow the hash:
`#gallery&theme=light&motion=reduced&size=lg&only=threats` (`theme` = dark | light | contrast, `motion` = full |
reduced, `size` = sm | md | lg | xl, `only` = one section id: brand, color, type, icons, player, threats, states,
sizes, backs, rules, story, components).

```
ui/
  styles/      index.css (layer order + imports), tokens.css, base.css, fonts.css
  art/         SVG React components (icons, dice, logo, card backs, act scenes) + isobar generator
  cards/       card renderers (+ cards.css)
  components/  basic components (+ components.css)
  dev/         CardGallery (#gallery)
```

Global CSS is imported once in `main.tsx` (`ui/styles/index.css`). Card and component CSS is imported by their
`index.ts`, so importing from `ui/cards` / `ui/components` brings the styles along. All kit CSS lives in cascade
layers `reset, tokens, base, components, cards, gallery`; **unlayered app CSS always wins**, so screens can
override anything without specificity fights.

---

## Design tokens (`styles/tokens.css`)

Use the semantic tokens in app code; raw palette tokens are for the kit itself.

| Group      | Tokens                                                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces   | `--bg`, `--bg-deep`, `--surface-1` (translucent panel), `--surface-2` (raised/hover), `--surface-solid` (dialogs, sheets), `--surface-raised`, `--border`, `--border-strong`                                                                                |
| Text       | `--text`, `--text-muted`, `--text-faint` (decorative only, not for essential text)                                                                                                                                                                          |
| Accent     | `--accent` (cyan, interactive), `--accent-strong`, `--accent-ink` (text on accent fills), `--focus-ring`                                                                                                                                                    |
| Status     | `--danger`, `--success`, `--warning`, `--star`                                                                                                                                                                                                              |
| Tracks     | `--lead` / `--exposure` (on paper), `--lead-bright` / `--exposure-bright` (on the night background)                                                                                                                                                         |
| Suits      | `--suit-recon`, `--suit-stealth`, `--suit-force` (active value; swaps to high contrast automatically), `--suit-*-base`, `--suit-*-hc`, `--suit-*-bright` (icons/text on night)                                                                              |
| Card types | `--type-threat`, `--type-encrypted`, `--type-pursuer`, `--type-twophase`, `--type-countermeasure`, `--type-gear`, `--type-ally`, `--type-rule`, `--type-story`, `--type-jumpin`                                                                             |
| Paper      | `--paper`, `--paper-2`, `--paper-3`, `--ink`, `--ink-2`, `--ink-muted` (card faces)                                                                                                                                                                         |
| Type       | `--font-body` (Inter), `--font-display` (Oswald), `--fs-2xs … --fs-4xl` (1.25 scale from 16px), `--lh-tight/snug/body`, `--tracking-display`, `--tracking-caps`, `--fw-*`. Utility classes: `.display` (Oswald caps), `.num` (tabular numerals), `.sr-only` |
| Space      | `--space-0 … --space-8` (0, 4, 8, 12, 16, 24, 32, 48, 64 px)                                                                                                                                                                                                |
| Radii      | `--radius-xs/sm/md/lg/xl/pill`                                                                                                                                                                                                                              |
| Elevation  | `--shadow-1 … --shadow-4`, `--glow-accent`, `--glow-accent-soft`, `--glow-gold`                                                                                                                                                                             |
| Motion     | `--dur-instant/fast/base/slow/slower`, `--ease-out/in/in-out/spring`, `--lift` (card hover lift). All durations collapse to ~0 under reduced motion, so **always use the tokens** for transitions and animations.                                           |
| Z layers   | `--z-base`, `--z-raised`, `--z-card-hover`, `--z-card-selected`, `--z-sticky`, `--z-sheet`, `--z-dialog`, `--z-toast`, `--z-tooltip`                                                                                                                        |
| Cards      | `--card-w` (set on any container to rescale every card inside that has no explicit size), `--card-w-xs/sm/md/lg/xl` (72/120/180/240/340 px), `--card-ratio` (63 / 88)                                                                                       |

### Root attributes (set on `<html>`)

| Attribute                                    | Effect                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| _(none)_                                     | Dark by default; light when `prefers-color-scheme: light`.                                                                           |
| `data-theme="dark" \| "light" \| "contrast"` | Explicit theme. `contrast` = black background, white text, yellow focus ring, HC suits, outlined cards.                              |
| `data-suits="hc"`                            | High-contrast suit colors only (Settings → "High-contrast suits"). Also on with `prefers-contrast: more` unless `data-suits="base"`. |
| `data-motion="reduced" \| "full"`            | Force reduced motion on/off. Default follows `prefers-reduced-motion`.                                                               |
| `data-speed="fast" \| "instant"`             | Animation speed (Settings): halves the `--dur-*` tokens, or collapses them like reduced motion. Reduced motion always wins.          |

---

## Cards (`ui/cards`)

All card views are **props-driven** (no game logic) and share `CardStateProps`:

| Prop                                                                           | Meaning                                                                                                                       |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `size`                                                                         | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'fluid'` (default `md`; reading cards default `lg`). `fluid` fills the parent width. |
| `selected`                                                                     | Lift + cyan glow + check mark. On clickable cards also sets `aria-pressed`.                                                   |
| `highlighted`                                                                  | Legal target: dashed pulsing cyan outline; adds "Legal target." to the accessible name.                                       |
| `disabled`                                                                     | Desaturated + hatched; `aria-disabled`, still focusable (so it can be inspected); clicks are swallowed.                       |
| `dimmed`                                                                       | De-emphasized (not relevant to the current choice).                                                                           |
| `onClick`                                                                      | Makes the card a `<button>`. Without it the card is `role="img"` with the full summary as its name.                           |
| `onContextMenu`, `onKeyDown`, `onFocus`, `onBlur`, `onPointerEnter/Leave/Down` | Passed through (hover/long-press inspect, drag start).                                                                        |
| `aria-label`, `ariaHint`                                                       | Override the generated name, or append a hint (e.g. "Press Enter to tuck here.").                                             |
| `focusable`                                                                    | Tab stop on a non-clickable card (e.g. focus-to-inspect).                                                                     |
| `id`, `className`, `style`                                                     | As usual.                                                                                                                     |

Every card is a CSS **inline-size container**: everything inside is sized in `cqi`, so the card scales like a picture.
Below 150 px wide (xs/sm) a card switches to a glanceable mini layout (name, power seal + suit, requirement, timer; text
hidden). Long text steps down one or two type sizes automatically (density buckets by text length); the full text is
always in the accessible name and in `<CardInspect>`.

| Component                                                                             | Props                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<PlayerCardView card>`                                                               | `card: PlayerCard`, `hideFlashback?` (hide Awakened flashback text). Training/Conditioned/Awakened: power seal, suit, ability, Conditioned trigger box, Awakening bonus + flashback teaser. Gear: emblem + "+N Power per <suit> card" + ongoing text. Ally: symbol chips + Ally Cover note.                                                                                                                                                     |
| `<ThreatCardView card>`                                                               | `card: ThreatCard`, plus live state: `progress?: {symbols, symbolsNeeded, power, powerNeeded, wouldBeClean?}` (hollow/filled symbol chips, "5/8" Power, bar, green "ready" ring, Clean tag), `die?: number` (Timer/Hunt die on the corner), `faceDown?` (renders the Encrypted back, reveals nothing), `tuckedCount?` (stack of card edges + "N tucked"; reserves layout space below the card), `cancelled?` (stamp + struck-through Pressure). |
| `<CardBack kind>`                                                                     | `kind: 'operative' \| 'threat' \| 'encrypted' \| 'briefing' \| 'outro' \| 'flashback' \| 'countermeasure' \| 'jumpin'`, `showNote?` (default true), `count?` (deck size badge).                                                                                                                                                                                                                                                                 |
| `<RuleCardView rule>`                                                                 | `rule: RuleCard`, `side?` (controlled `'front' \| 'back'`), `defaultSide?`, `onSideChange?`, `flipButton?` (default true). 3D flip; hidden side is `inert`.                                                                                                                                                                                                                                                                                     |
| `<StoryCardView story>`                                                               | `story: StoryCard`, `plan?: DayPlan` (Intro: Lead target/start, Exposure/redline, the three Stars, Twist; Outro: perk unlock, debrief, "Record today's Stars…"), `hasPursuer?`.                                                                                                                                                                                                                                                                 |
| `<JumpInView jumpIn>`                                                                 | `jumpIn: JumpIn` — 12-card deck (suit icon, power, name) and unlocked perks with branch emblems.                                                                                                                                                                                                                                                                                                                                                |
| `<CardInspect open onClose title>`                                                    | `children` = the card at `size="xl"`, `text?` (transcript beside it), `actions?` (footer buttons). Modal `Dialog`.                                                                                                                                                                                                                                                                                                                              |
| `<CardFrame>`                                                                         | The shared shell, if you need a new card type: `kind`, `accent`, `label`, `under?`, `overlay?`, `watermark?`, `data?` + `CardStateProps`.                                                                                                                                                                                                                                                                                                       |
| `playerCardSummary(card)`, `threatCardSummary(card, live?)`                           | The spoken summaries (also good for logs and the inspect transcript).                                                                                                                                                                                                                                                                                                                                                                           |
| `SuitChip`, `CardBand`, `CardFoot`, `RichText`, `pretty`, `stampLabel`, `THREAT_TYPE` | Building blocks and helpers. `RichText` renders workbook text (caps lines → headings, `1.` steps, `-` bullets).                                                                                                                                                                                                                                                                                                                                 |

---

## Art (`ui/art`)

All inline SVG in `currentColor` unless noted. Every graphic takes `title?` (accessible name; omit = decorative,
`aria-hidden`), `size?` (default `1em`), `className?`, `style?`.

| Component                                                                       | Notes                                                                                                                              |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `Logo` `variant: 'full' \| 'stacked' \| 'mark'`                                 | Storm-eye mark with lightning + "INDIGO STORM". Type uses currentColor; override `--logo-field`, `--logo-rings`, `--logo-bolt`.    |
| `SuitIcon suit`                                                                 | Recon eye, Stealth crescent, Force bolt.                                                                                           |
| `DieFace value variant: 'timer' \| 'hunt'`                                      | Pips 1–6, numeral otherwise. Named "Timer die showing 3" unless `title` or `decorative`.                                           |
| `ThreatGlyph kind`                                                              | `threat` (hazard), `encrypted` (lock), `pursuer` (crosshair), `twophase` (chain), `countermeasure` (shield), `blocker` (no-entry). |
| `PerkEmblem branch`                                                             | GHOST (dissolving diamond + crescent), ANALYST (hex network), OPERATIVE (shield chevrons).                                         |
| `StarIcon filled`, `Pip state`                                                  | Pip states: `empty`, `filled`, `target`, `threshold`, `redline` (distinct shapes).                                                 |
| `LeadIcon`, `ExposureIcon`, `DrawIcon`, `GearGlyph`, `AllyGlyph`, `SpiralGlyph` | Track/class glyphs.                                                                                                                |
| `UiIcon name`                                                                   | close, chevron-left/right, flip, info, check, zoom, sun, moon, contrast, menu, book, play.                                         |
| `CardBackArt kind`, `BACKS`                                                     | Full-bleed back illustrations (colors match `make_print.py`).                                                                      |
| `ActIllustration act: 1 \| 2 \| 3`                                              | 16:9 scenes for the campaign map: city in the rain, the facility, burn notice.                                                     |
| `isobarPaths(options)`                                                          | Deterministic isobar ring generator (seeded) for new art.                                                                          |

---

## Components (`ui/components`)

| Component                     | Props / notes                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                      | `variant: primary \| secondary \| ghost \| danger`, `size: sm \| md \| lg`, `icon`, `iconEnd`, `kbd` (key hint), `block`, `ref`, all button attributes. Defaults to `type="button"`.                                                                                                                                                                                      |
| `IconButton`                  | `label` (required accessible name), `icon`, `variant`, `size`, `tooltip` (default true: label shown on hover/focus).                                                                                                                                                                                                                                                      |
| `Dialog`                      | Native modal `<dialog>`: `open`, `onClose` (Esc, close button, backdrop), `title`, `hideTitle`, `description`, `footer`, `size: sm \| md \| lg \| full`, `initialFocus`. Browser handles focus trap + focus return.                                                                                                                                                       |
| `SideSheet`                   | Non-modal prompt panel (table stays usable): `open`, `title`, `context` (small line above title), `actions`, `onDismiss` (omit for prompts that must be answered), `side`. Moves focus in (`[data-autofocus]` first, else the first action button) and back out (only to an element that still exists); `focusKey` re-focuses when a new prompt replaces the current one. |
| `Tooltip`                     | `content`, one focusable child, `placement: top \| bottom`, `describe` (aria-describedby). Hover/focus; Esc dismisses.                                                                                                                                                                                                                                                    |
| `Tabs`                        | `items: {id, label, content, disabled?}[]`, `label`, `value`/`defaultValue`/`onChange`. Roving focus with ←/→/Home/End.                                                                                                                                                                                                                                                   |
| `ToastProvider`, `useToast()` | `push({message, title?, tone?: info \| success \| warning \| danger, duration?, scope?})` → id; `dismiss(id)`; `clear(scope?)`. Top-center stack below the screen bar (`--toast-top`), max 3. Polite live region; hover pauses for at most 8 s in total.                                                                                                                  |
| `LiveRegion`                  | `message`, `politeness` — visually hidden announcer (use for the game log narration).                                                                                                                                                                                                                                                                                     |
| `Track`                       | `kind: lead \| exposure`, `value`, `max`, `target?`, `threshold?` (Cover zone), `redline?`, `label?`, `compact?`. Native `<meter>` with full `aria-valuetext`; value pulses on change (red when it's bad news).                                                                                                                                                           |
| `StarRow`                     | `stars?: {label, earned, detail?}[]` or `earned`/`total`, `showLabels`, `animate` (staggered pop), `size: sm \| md \| lg`.                                                                                                                                                                                                                                                |
| `Badge`                       | `tone: neutral \| accent \| recon \| stealth \| force \| lead \| exposure \| success \| warning \| danger`, `icon`, `solid`.                                                                                                                                                                                                                                              |
| `Kbd`                         | `<Kbd>Enter</Kbd>` or `<Kbd keys={['Shift', '?']} />`.                                                                                                                                                                                                                                                                                                                    |
| `Segmented`                   | Radio-group segmented control: `label`, `options: {value, label, icon?}[]`, `value`, `onChange`, `size`. (Settings: animation speed, text size, theme.)                                                                                                                                                                                                                   |
| `Switch`                      | `checked`, `onChange`, `label`, `description` (`role="switch"`).                                                                                                                                                                                                                                                                                                          |

---

## Notes for the app

- **Spoilers:** the gallery hides story text and Awakened flashback text when `gameData.storySource === 'spoilers'`.
  In the game, render Awakened cards with `hideFlashback` until the flashback has been seen.
- **Table slots:** give each Scene Row slot `size="fluid"` cards (or set `--card-w` on the row) so the row scales with
  its container. A tucked stack and the Timer die extend outside the card box; `tuckedCount` reserves bottom margin.
- **Keyboard:** clickable cards are real buttons. Use `aria-pressed` (via `selected`) for hand selection, `highlighted`
  - `ariaHint` for targets, and `CardInspect` for zoom (hover/long-press is up to the table).
- **Motion:** use `--dur-*`/`--ease-*` tokens for anything you animate so `data-motion="reduced"` works everywhere.
  Entrance animations (die drop, stamp, dialog) are short and keyed to mount; the die drop replays whenever `die`
  changes.
- **No network:** all art is inline SVG/CSS; the page texture is a data-URI mask. Keep it that way (CSP).
