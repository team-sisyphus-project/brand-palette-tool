# No run manifest — auto-detection resolves this repo unambiguously

Date: 2026-09-06
Grain: grain-2 — Declare the run shape if detection is ambiguous

## Context

`preview.toml` is an escape hatch for projects auto-detection reads wrong:
monorepo subdirectories, non-default build/run commands, custom output
directories, or frameworks whose markers are ambiguous (React Router v8
Framework Mode being the documented example). The conventions are explicit
that most projects need none and that a stale manifest breaks the run path,
so the manifest has to earn its place.

Verified against this repo, from a clean `rm -rf dist` state:

| Detection input | Value here | Ambiguous? |
|---|---|---|
| Framework marker | `vite` (no `next`, `react-scripts`, `@react-router/dev`, no `react-router*` at all) | no |
| Project location | repo root — `package.json`, `index.html`, `vite.config.ts` all at root | no |
| Build script | standard `build` → `tsc -b && vite build`, exits 0 | no |
| Output directory | Vite default `dist/` (no `build.outDir` / `root` / `base` override in `vite.config.ts`) | no |
| Datastores / required env | none — no DB, no cache, no app-supplied keys | no |

That is exactly the row `stack-frontend-react.md` lists as the auto-detected
Vite case: `vite` dependency → `build` script → served from `dist/`.

Both serve shapes a detector could pick were then exercised against the
freshly built `dist/`:

- **build-static** (runtime serves the directory itself): plain static server
  over `dist/` → `/` 200 with `<title>Brand Color Palette Generator</title>`,
  hashed CSS asset 200.
- **server** (`npm start` → `vite preview`, if the `start` script tips a
  detector that way): `PORT=4310` → `/` 200, hashed JS asset 200, unknown
  `Host` header 200, and `/some/route` falls back to `index.html` 200.

## Decision

Ship no `preview.toml`. Auto-detection is left to resolve the repo as a
root-level Vite build-static app serving `dist/`.

## Why

1. **Nothing to override.** A manifest is only read as a correction, and every
   field it could carry (`target`, `[build].command`, `[serve].static_dir`)
   would restate the framework default that detection already derives. A file
   that says what would happen anyway adds a second source of truth for the
   run shape without changing behaviour.
2. **It is the documented failure mode.** `preview-toml.md` warns that a
   manifest drifting out of sync with the build command or output directory
   breaks the run path, and that a TOML syntax error rejects the manifest
   *without* falling back to detection. Committing one here converts a working
   zero-config path into one with two ways to fail.
3. **Verified, not assumed.** The app is confirmed to come up on `$PORT` and
   serve its first screen under either shape a detector might choose, so the
   preview does not depend on which one it picks.

## Rejected

- **`model = "build-static"` + `[build].command` + `[serve].static_dir = "dist"`** —
  the manifest this grain was scoped to add. Every value in it is the detected
  default; it buys no behaviour and takes on the drift and syntax-rejection
  risks above.
- **`model = "server"` + `[serve].command = "npm start"`** — pins the app to
  `vite preview`, a dev-oriented server that needs `vite` (a devDependency)
  present at runtime, to serve bytes a static directory serves on its own.
  It also drops the static path's simplicity for no gain, since deep-link
  fallback is moot in an app with no client-side router.
- **An `[env]` block** — there are no required keys. `PORT` is injected by the
  platform and `ALLOWED_HOSTS` (grain-1) is optional by design; declaring
  either as `required = true` would make the app fail to boot on a
  configuration that is meant to be the default.
