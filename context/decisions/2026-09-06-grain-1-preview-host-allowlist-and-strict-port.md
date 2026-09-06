# Preview host allow-list and strict port

Date: 2026-09-06
Grain: grain-1 — Verify and harden the green-field run path

## Context

Vite 5.4.12+ rejects any request whose `Host` header is not on
`server.allowedHosts` / `preview.allowedHosts` (DNS-rebinding protection).
`npm run start` returned `Blocked request. This host (...) is not allowed.`
for every proxied `Host`, so the app was only reachable as `localhost` —
behind the platform's TLS terminator it would never have served a first
screen. Verified by curl against a running preview before the change.

## Decision

1. `allowedHosts` defaults to `true` (accept any host), overridable through
   an `ALLOWED_HOSTS` env var that takes a comma-separated list.
2. `preview.strictPort` stays enabled.
3. Port/allow-list resolution lives in `preview-config.ts` (pure functions),
   imported by `vite.config.ts`.

## Why

1. The public hostname is assigned by the platform at runtime, so no build-time
   list can enumerate it. Vite's host check protects a developer's machine from
   DNS rebinding; here the app is a static SPA with no origin-privileged data
   and hostname routing is the proxy's job. `ALLOWED_HOSTS` keeps the tighter
   posture available wherever the hostname *is* known (verified: allowed host
   200, other host 403).
2. A silent port shift produces a process the proxy cannot reach — a healthy
   process failing health checks with no signal. Failing loudly on a taken port
   is the diagnosable failure.
3. Importing `vite.config.ts` from a test pulls esbuild into jsdom, which
   crashes on an environment invariant. A dependency-free module makes the
   resolution logic testable without loading Vite.

## Rejected

- **Hardcoding a hostname list** — the platform domain is unknown at build time;
  the list would be wrong on the first deploy.
- **`allowedHosts` via `preview.toml` / CLI flags only** — auto-detection may
  run `vite preview` itself, so the setting has to live in `vite.config.ts` to
  hold regardless of how the server is launched.
- **Dropping `strictPort`** — trades a loud, fixable startup error for a silent
  unreachable app.
- **Keeping `${PORT:-4173}` shell expansion in npm scripts** — it duplicated the
  port logic already in `vite.config.ts` and only worked under a POSIX shell.
