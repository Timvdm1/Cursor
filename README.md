# Cursor Starter

A minimal **Vite + React + TypeScript** starter app, scaffolded to bootstrap and
demonstrate a working Cursor Cloud Agent development environment.

## Requirements

- Node.js 20+ (this repo is developed and tested on Node 22)
- npm 10+

## Getting started

```bash
npm install       # install dependencies
npm run dev       # start the dev server on http://localhost:5173
```

## Scripts

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the Vite dev server (port 5173)         |
| `npm run build`     | Type-check and build a production bundle       |
| `npm run preview`   | Serve the production build (port 4173)         |
| `npm run lint`      | Run ESLint                                     |
| `npm run typecheck` | Type-check with `tsc`                          |
| `npm test`          | Run the Vitest unit tests                      |

## Project structure

```
.
├── index.html              # Vite entry HTML
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # UI: interactive greeting + counter demo
│   ├── greeting.ts         # Pure, unit-tested helper
│   ├── index.css           # Styling
│   ├── App.test.tsx        # Component tests
│   └── greeting.test.ts    # Unit tests
└── .cursor/environment.json # Cloud Agent environment config
```

## Cloud Agent environment

`.cursor/environment.json` tells Cursor Cloud Agents how to prepare this repo:
it installs dependencies with `npm install` and runs the dev server as a
persistent terminal, so a fresh agent can immediately run and test the app.
