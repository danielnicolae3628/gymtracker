# Iron Log — Gym Progress Tracker

A lightweight, offline-first gym progress tracker. No build step, no
dependencies, no account — just open `index.html` in a browser.

## Features

- **Log** — pick a date and exercise, add sets (weight × reps, optional RPE),
  save them into that day's session. Automatic PR detection.
- **History** — browse past workouts by day, expand to see every set, delete
  entries, filter by exercise name.
- **Progress** — per-exercise chart (estimated 1RM, top weight, or session
  volume) with a stats summary and a full log table. Plus a simple
  bodyweight tracker with its own chart.
- **Exercises** — manage your exercise list (name, category, unit), seeded
  with a sensible default set covering all major muscle groups.
- **Data** — export/import a full JSON backup, or clear everything and start
  fresh.

All data is stored in the browser's `localStorage` — nothing is sent
anywhere. Export a backup (Data tab) if you want to move it between browsers
or devices, or keep it safe before clearing site data.

## Running it

No server needed — just open `index.html` directly:

```bash
start index.html
```

Or serve it locally if you prefer (e.g. for testing on a phone on the same
network):

```bash
npx serve .
```

## Estimated 1RM

Progress charts use the Epley formula: `1RM ≈ weight × (1 + reps / 30)`.
