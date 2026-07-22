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
- **Undo**: an alert with a button to cancel the last score action.
- **Score target**: set a goal per counter; reaching it triggers a confetti celebration.
- **Match history**: past games (winner, final score) are logged when scores are reset.
- Reset scores, add/remove teams and counters/timers.
- **Works offline** once loaded (service worker + local cache).
- **Installable** on mobile or desktop as a real app (Add to Home Screen).
- No sign-up, no data sent anywhere: everything stays in the device's `localStorage`.

## Tech stack

Vanilla HTML / CSS / JavaScript, no framework, no build step, no external dependency. Everything fits in a handful of files:

```
index.html      Page structure
styles.css      Theme (Catppuccin Frappé) and responsive layout
app.js          Application logic (state, rendering, interactions)
manifest.json   PWA manifest (name, icons, colors)
sw.js           Service worker (offline cache)
icon.svg        App icon
```
