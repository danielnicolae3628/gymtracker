# Iron Log — Gym Progress Tracker

A lightweight, offline-first gym progress tracker, now built with React,
TypeScript, and Vite.

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

```bash
npm install
npm run dev
```

Then open the printed `http://localhost:8934` URL.

### Build for production

```bash
npm run build
npm run preview
```

`npm run build` type-checks with `tsc` and outputs static files to `dist/`,
which can be hosted anywhere (no server-side code required).

## Project structure

```
src/
  lib/            data types, default exercises, date/math helpers
  store/          React context providers (app data + toasts), localStorage persistence
  components/     one component per tab, plus the line chart and exercise select
  App.tsx         tab navigation and layout
  main.tsx        React entry point
```

## Estimated 1RM

Progress charts use the Epley formula: `1RM ≈ weight × (1 + reps / 30)`.
