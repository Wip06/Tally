# Tally — Score Counter

Small 100% offline PWA (Progressive Web App) for keeping score for several teams at once — handy for board games, card games, sports with friends, etc. No account to create, no server: everything is stored locally in the browser.

**Live demo**: https://wip06.github.io/Tally/

## Features

- **Two types of elements**, both created from the home page and mixed freely in the same grid:
  - **Score counters** — as many teams as you want, with customizable name and color.
  - **Timers** — a standalone Pomodoro-style circular countdown, with optional teams and scoring.
- Three scoring modes, selectable per counter (or per timer, if it has teams):
  - **Tap +1**: tap the score to increment it (−1 button to correct).
  - **Free**: manual entry, supports quick math like `+5`, `-3`, `*2`.
  - **Tennis-Padel**: real point ladder (0/15/30/40/Ad), games, sets, and who's serving.
- **Leader on top**: the team with the best score moves to the top of the list (and stays pinned to the top of the screen while scrolling on mobile). Ties don't dethrone the current leader.
- **Themes**: 7 color themes (Frappé, Feutre, Terrain, Arcade, Braise, Carnet, Contraste) picked live from the app settings (gear in the header, or from any counter's settings). Team colors follow the theme; custom colors are kept. The choice is stored on the device.
- **Backup**: copy all counters, history and theme as text, then paste it into another install to restore everything (new home-screen icon, new phone…).
- **Undo**: an alert with a button to cancel the last score action.
- **Score target**: set a goal per counter; reaching it triggers a confetti celebration.
- **Match history**: past games are logged when scores are reset. Tap a game to see its detail: ranking, each team's final score, duration, scoring mode and target.
- Reset scores, add/remove teams and counters/timers.
- **Works offline** once loaded (service worker + local cache).
- **Installable** on mobile or desktop as a real app (Add to Home Screen).
- No sign-up, no data sent anywhere: everything stays in the device's `localStorage`.

## Tech stack

HTML / CSS / TypeScript, no framework, no runtime dependency, and no JavaScript in the repo. [esbuild](https://esbuild.github.io/) compiles `src/` into `dist/` (not versioned), which GitHub Actions deploys to GitHub Pages.

```
index.html          Page structure
styles.css          Themes (CSS variables per [data-theme]) and responsive layout
manifest.json       PWA manifest (name, icons, colors)
icon.svg            App icon (source of the PNG icons next to it)
scripts/build.ts    Build: compiles src/ and copies the static files into dist/

src/
  main.ts           Entry point: wires everything up
  types.ts          Data model (counters, teams, history)
  constants.ts      Storage keys, tunables
  themes.ts         Themes: team colors, app icon, current theme (UI colors live in styles.css)
  color.ts          Contrast helper (dark or light text on a team color)
  store.ts          localStorage persistence + data operations
  scoring.ts        Pure logic: free-mode math, tennis scoring, leader ranking
  routes.ts         Hash routing helpers
  session.ts        Ephemeral UI state (which counter is open)
  pwa.ts            Install prompt + service worker registration
  ui/               Views and components (home, detail, timer, teams, modals…)
  sw/               Service worker (offline cache)
  boot/             Theme applied before first paint (inlined into index.html at build time)
```

### Development

Requires Node 24+ (it runs `scripts/build.ts` directly).

```sh
npm install
npm run dev        # builds into dist/, rebuilds on change and serves it on a local port
npm run check      # type-check (tsc) + build
```

### Deployment

Every push to `main` runs `.github/workflows/deploy.yml`: type-check, build, then publish `dist/` to GitHub Pages. In the repo settings, **Pages → Build and deployment → Source** must be set to **GitHub Actions**.

Bump `CACHE_NAME` in `src/sw/service-worker.ts` with each release so installed apps pick up the new version.
