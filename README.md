# Tally — Score Counter

Small 100% offline PWA (Progressive Web App) for keeping score for several teams at once — handy for board games, card games, sports with friends, etc. No account to create, no server: everything is stored locally in the browser.

**Live demo**: https://wip06.github.io/Tally/

## Features

- **Several counters in parallel**, all visible on the home page.
- For each counter: as many teams as you want, with **customizable name and color**.
- Two scoring modes, selectable per counter:
  - **Tap +1**: tap the score to increment it (−1 button to correct).
  - **Free**: manual score entry.
- Reset scores, add/remove teams and counters.
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
