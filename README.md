# Color Palette Generator

A frontend tool that takes a brand's main color (HEX/RGB) as input and
instantly auto-generates a 5-color secondary palette using HSL calculation
algorithms.

## Stack

- Vite + React + TypeScript
- No database/cache (pure frontend, static SPA)

## Local Run Procedure (Green-field)

Prerequisites: Node.js 18+ (20+ recommended), npm.

From a clean checkout:

```bash
npm ci                    # install exactly what package-lock.json pins
npm run build             # type check + production build into dist/
PORT=8080 npm run start   # serve dist/ on http://localhost:8080
```

`http://localhost:8080/` then returns the generator's first screen with
HTTP 200.

For development with hot reload, use `npm run dev` instead of
`build` + `start` (it serves on `PORT`, defaulting to 5173).

- There are no migrations, seed data, or dummy accounts — this is a static
  frontend that uses no database or cache. `DATABASE_URL` / `REDIS_URL` are
  not read.

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
