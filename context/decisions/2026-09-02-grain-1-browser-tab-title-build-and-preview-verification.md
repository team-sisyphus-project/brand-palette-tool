# Decision: browser tab title change verified via production build + local preview (no source changes)

**Date:** 2026-09-02
**Grain:** grain-1 — verify the English tab title via build and local preview

## What was decided

This grain performed build + local-preview verification only, per its
Boundary ("build/local preview execution and artifact verification scope
(no source code changes)"). No source files were touched. Verification steps and results:

1. `npm install` (node_modules was absent in this worktree) followed by
   `npm run build` (`tsc -b && vite build`) — exited 0. Output:
   `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js`.
2. Checked `dist/index.html` directly: `<title>Brand Color Palette
   Generator</title>` — exact match to the target string from the prior
   `2026-09-02-grain-1-browser-tab-title-english-story-draft.md` decision's
   "Measure" section. `<html lang="ko">` confirmed unchanged (out of scope
   per that same story draft and this grain's Boundary).
3. Started `npm run start` (`vite preview --host 0.0.0.0 --port 4173
   --strictPort`) in the background, then `curl -s http://localhost:4173/`
   — the HTTP response body's `<title>` tag is exactly `Brand Color Palette
   Generator`, matching the built `dist/index.html`. Server was stopped
   after verification.
4. Checked `$GENOSIS_SPEC_PATH` (design-spec): only `audit/2026-09-02.md`
   exists, already logged as covering this exact change ("this work (grain-1) is a copy
   change to `index.html`'s `<title>` text... not a change that falls into
   the design-token category"). No Token/Component record applies — this
   grain introduced no new design token, so no `recording.md`-format
   Token/Component/Variant entry was added to the Design Spec; this
   decision file is the record of the verification result instead.

## Why

- Both DoneWhen conditions (`npm run build` exit 0; served `<title>` ===
  `Brand Color Palette Generator`) were checked directly against command
  output/HTTP response rather than inferred, per engineering.md's "Tests
  drive design" / evidence-over-opinion standard.
- `recording.md`'s Token/Component/Variant format doesn't have a slot for
  "verified an existing copy change" (it's scoped to color/typography/
  spacing/radius/shadow/border design tokens and their components) — this
  grain made no such decision, so recording the verification here in
  `context/decisions/` (the general engineering decision log) rather than
  forcing an artificial Token Group entry follows `recording.md`'s own
  scoping rule ("if a Token fits no Token Group... do not force it in").

## What was rejected

- Re-editing `index.html`'s title or `lang` attribute: explicitly out of
  scope for this grain (title text and `lang="ko"` were already handled by
  the prior grain that produced the story-draft decision; this grain only
  verifies the build/runtime artifact).
- Adding a Design Spec Token/Component entry for this verification:
  rejected — no design token or component was created or changed, only a
  pre-existing copy value was confirmed present in the build output and
  server response.

## Result

- `npm run build`: **PASS** (exit 0)
- Local preview `<title>`: **PASS** — `Brand Color Palette Generator`
  (exact match, both in `dist/index.html` and the live HTTP response)
