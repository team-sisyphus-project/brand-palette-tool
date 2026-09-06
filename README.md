# Color Palette Generator

A frontend tool that takes a brand's main color (HEX/RGB) as input and
instantly auto-generates a 5-color secondary palette using HSL calculation
algorithms.

## Stack

- Vite + React + TypeScript
- No database/cache (pure frontend, static SPA)

## Local Run Procedure (Green-field)

Prerequisites: Node.js 18+ (20+ recommended), npm.

Three commands, from a clean checkout of this repository:

```bash
npm ci                    # install exactly what package-lock.json pins
npm run build             # type check + production build into dist/
PORT=8080 npm run start   # serve dist/ on http://localhost:8080
```

`http://localhost:8080/` then returns the generator's first screen with
HTTP 200 and the title `Brand Color Palette Generator`; the hashed assets
that page references return 200 as well.

`PORT` is optional for a local run: omit it and `start` listens on 4173.
Any valid port is honoured as given, and an unusable value (non-numeric, or
outside 1–65535) falls back to the default instead of failing the boot.

For development with hot reload, run `npm run dev` instead of
`build` + `start`. It reads the same `PORT`, defaulting to 5173.

### Database, Migrations, Seed, Accounts

There are none of these. This is a static frontend:

- **No database, no cache.** `DATABASE_URL` and `REDIS_URL` are never read,
  so the app starts identically whether or not the platform injects them.
- **No migrations.** The repository contains no migration directory, tooling,
  or command — there is nothing to run before or after `build`.
- **No seed.** No seed step, no seed data, no fixtures to load.
- **No accounts and no dummy credentials.** There is no login; every screen is
  reachable from `/` without authentication.

Palette state lives in the browser for the lifetime of the page. Nothing is
persisted server-side, so a green-field run and a hundredth run behave the
same.

## Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `PORT` | no | 5173 (`dev`) / 4173 (`start`) | Port the server listens on. Injected by the platform in deployment. |
| `ALLOWED_HOSTS` | no | accept any host | Comma-separated `Host` allow-list for the dev/preview server. |

No secrets are required, and none are baked into the client bundle.

### Why `ALLOWED_HOSTS` defaults to "any"

Vite rejects requests whose `Host` header is not on its allow-list
(DNS-rebinding protection). This app runs behind the platform's TLS
terminator, which forwards the *public* hostname — assigned at runtime and
therefore unknowable at build time — so the default accepts any host and lets
the proxy own hostname routing. When the hostname is known, narrow it:

```bash
ALLOWED_HOSTS=palette.example.com PORT=8080 npm run start
```

Requests with any other `Host` then get a 403.

## Run Shape

| Aspect | Value |
|---|---|
| Model | build-static — `build` emits a static bundle, the runtime serves that directory |
| Project location | repository root (`package.json`, `index.html`, `vite.config.ts` all live here) |
| Build command | `npm run build` (`tsc -b && vite build`) |
| Output directory | `dist/` (Vite's default, not overridden) |
| Listening port | `$PORT` |
| Ports exposed | one — the same server returns the HTML and every asset |

The repository ships no `preview.toml`. Every field such a manifest could
carry is the value auto-detection already derives from the standard Vite
layout above, so committing one would add a second source of truth for the
run shape without changing what happens. The reasoning, and the manifest
variants that were tried and rejected, are recorded in
`context/decisions/2026-09-06-grain-2-no-preview-manifest.md`.

If the build command or the output directory ever stops being the Vite
default, add the manifest at that point — not before.

## Serving Notes

- The server binds `0.0.0.0` on `PORT`, so both loopback (local preview) and
  container-IP (deployed health check) requests reach it.
- Plain HTTP only. TLS is terminated upstream; the app issues no HTTPS
  redirects and hardcodes no absolute URLs.
- `start` uses `strictPort`: if `PORT` is already taken the process exits with
  an error instead of quietly moving to another port the proxy cannot reach.
- Client-side routes fall back to `index.html`, so deep links load the app.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server (HMR) on `PORT` |
| `npm run build` | Type check + production build (`dist/`) |
| `npm run start` | Serves the `dist/` build output on `PORT` (deployment / local verification) |
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
