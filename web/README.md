# Indigo Storm — Web App

A rules-enforced, single-page web version of Indigo Storm. Everything runs in the browser: no server, no network requests, and the production build is a single `index.html` that also works when opened straight from disk.

## Quick start

Requires **Node.js 22.18+** (Node 24 LTS recommended).

```bash
cd web
npm install
npm run dev        # http://localhost:5173 with hot reload
```

| Command           | What it does                                                                        |
| ----------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`     | Development server                                                                  |
| `npm run build`   | Production build → `dist/index.html` (one self-contained file)                      |
| `npm run preview` | Serve the production build locally                                                  |
| `npm run data`    | Re-export the workbooks into `src/data/game-data.json`                              |
| `npm run check`   | Type check (tsc 7) + lint/format check (Biome) + tests (Vitest)                     |
| `npm test`        | Tests only                                                                          |
| `npm run format`  | Auto-fix formatting and safe lint issues                                            |
| `npm run e2e`     | Build, then play through Days 1, 16, 21, 26 and a campaign start in headless Chrome |

`npm run e2e` drives your installed Google Chrome (found automatically on macOS, Windows and Linux); set `CHROME=/path/to/chrome` to use a different browser binary.

## Changing cards and numbers

The workbooks in the repo root stay the single source of truth for the simulator, the print-and-play PDFs and this app.

1. Edit `Indigo Storm - Cards.xlsx` or `Indigo Storm - Episode Plan.xlsx`.
2. Run `npm run data`. It validates everything (unknown effects, missing cards, broken pairings, wrong deck sizes) and fails with a clear list if something is off.
3. Run `npm run check`. A test fails if a Bonus Objective or Episode Twist text changed without its rule code changing (see `src/data/objectives.ts` and `src/data/twists.ts`).
4. Commit the updated `src/data/game-data.json` along with the workbooks.

New ability types (a new "Sim Effect" op) need engine support in `src/engine/` and a parser case in `scripts/export-data.ts`.

**Story and spoilers:** if `spoilers/Indigo Storm - Story.xlsx` exists, its "Story Cards" sheet is used instead of the placeholder story, so it will be **bundled into the built app**. Don't publish a build made from the real story until you want it public.

## How it's built

```
src/
  data/      game-data.json (generated), schema types, Bonus Objective and Twist codes
  engine/    pure, deterministic rules engine (no DOM) — see src/engine/README.md
  state/     Zustand store, hash router, settings, localStorage persistence
  ui/
    styles/  design tokens and base styles (dark, light, high-contrast; reduced motion)
    art/     inline SVG art (logo, suit icons, dice, badges, card backs, act scenes)
    cards/   card renderers for every card type — see src/ui/README.md
    components/  Button, Dialog, SideSheet, Track, Toast, …
    table/   the play screen
    screens/ Title, Day Select, Briefing, Debrief/Cut, Campaign Map, Rulebook, Settings, …
    dev/     card gallery (open #gallery)
```

- **Rules engine:** `apply(state, action)` is pure and deterministic (seeded RNG in state), `legalActions(state)` lists every legal move, and `view(state)` removes hidden information. The UI can only submit legal actions. An episode is saved as `{setup, actions}` and rebuilt with `replay`, so saves are tiny and exact.
- **No network:** fonts, art and data are inlined; a strict Content-Security-Policy blocks all connections, and a test fails if the source uses `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` or `sendBeacon`.
- **Saves:** `localStorage` key `indigo-storm/v1`, with export/import to a `.json` file from the Title screen.
- **Dev gallery:** `#gallery` shows every card, back, rule card and component; options in the hash, e.g. `#gallery&theme=light&size=lg&only=threats`.

Full design and rule interpretations: [`PLAN.md`](PLAN.md).

## Deploying

The build is static and uses relative paths, so it works from any folder or subpath.

### GitHub Pages (workflow included)

1. Push the repo to GitHub.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the "Deploy web app to GitHub Pages" workflow manually). The workflow in `.github/workflows/pages.yml` installs, runs `npm run check`, builds, and publishes `web/dist`.

The site appears at `https://<user>.github.io/<repo>/`.

### Other hosts

Upload `web/dist/index.html` anywhere static: Netlify or Cloudflare Pages (build command `npm run build`, base directory `web`, publish directory `web/dist`), itch.io (upload the HTML file as an HTML game), or just send the file to someone; it opens offline.
