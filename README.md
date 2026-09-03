# Color Palette Generator

A frontend tool that takes a brand's main color (HEX/RGB) as input and
instantly auto-generates a 5-color secondary palette using HSL calculation
algorithms.

## Stack

- Vite + React + TypeScript
- No database/cache (pure frontend, static SPA)

## Local Run Procedure (Green-field)

Prerequisites: Node.js 18+ (20+ recommended), npm.

```bash
npm install
npm run dev
```

- `npm run dev` starts the Vite dev server, binding it to the `PORT`
  environment variable (defaults to 5173 if unset).
- There are no migrations, seed data, or dummy accounts — this is a static
  frontend that does not use a database.

## Build / Production Preview

```bash
npm run build   # generates static output in dist/
PORT=4173 npm run start   # serves dist/ at 0.0.0.0:$PORT
```

`start` requires the `PORT` environment variable, matching the production
runtime contract. The development server defaults to port 5173 when `PORT` is
unset.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server (HMR) |
| `npm run build` | Type check + production build (`dist/`) |
| `npm run start` | Production static server for `dist/`, bound to `0.0.0.0:$PORT` |
| `npm run lint` | ESLint check |
| `npm run test` | Runs the unit test suite (Vitest) |

## Project Status

- Entering a HEX (`#3366ff`) or RGB (`51, 102, 255`) value instantly
  auto-generates a 5-color palette (the brand main color slot is locked by
  default).
- Each slot can be individually locked/unlocked; when regenerating, locked
  slots stay fixed while the remaining slots are recalculated.
- Each slot's color can be edited directly via the native color picker, and
  editing a slot automatically locks it.
- Five generation modes (Muted / Bright / Contrast / Monotone / Brightness)
  can be selected via buttons. Without AI, each mode produces a different
  palette using only HSL conversion rules, and locked slots remain fixed when
  switching modes.
