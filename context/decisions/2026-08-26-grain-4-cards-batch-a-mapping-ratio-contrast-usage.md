# grain-4: Cards batch A — mapping/ratio/contrast/usage

## Decision

Built `SemanticRolesCard`, `DistributionCard`, `ContrastCheckerCard`, and
`UsageGuideCard` under `src/components/colorStudy/`, each a self-contained
rounded card tile (own `CardShell` wrapper) that takes a `palette: PaletteColor[]`
prop and renders whatever grain-3's pure functions
(`getColorRoles`/`getColorDistribution`/`getContrastCombinations`/`getUsageGuide`)
compute for it on every render — no local memoization, no cached copy, so a
`palette` prop change (or, upstream, a lock toggle that changes the resolved
palette) always reflects immediately (spec M-5).

## Why

- **Self-contained tile shell (`CardShell`), not reuse of `ColorStudy.css`'s
  `.color-study__tile`.** This grain's Boundary is `src/components/colorStudy/*`
  only; `ColorStudy.tsx`/`.css` (which already wraps 3 other widgets in
  `.color-study__tile`) is out of scope. `CardShell` mirrors that same tile
  shell's token set exactly (`--radius-card`, `--color-border-default`,
  `--color-bg-surface`, `--space-5` padding — see
  design-spec/components/color-study/base.md's "Tile shell" entry) rather than
  inventing a second visual language, so integrating these cards later reads
  as "the same tile shape" even though the CSS lives in a different file.
  **Rejected**: importing `ColorStudy.css` directly from this folder — would
  create a same-boundary-violating implicit dependency on a file this grain
  isn't allowed to touch, and ties this folder's compile unit to another
  component's stylesheet for no benefit over duplicating ~15 lines of
  token-only CSS.
  **Follow-up for the wiring grain**: once these cards render inside
  `ColorStudy`'s `.color-study__grid`, the grid's existing per-child
  `.color-study__tile` wrapper (in `ColorStudy.tsx`) must NOT also wrap these
  cards — that would double the rounded-border chrome. Either drop the
  `.color-study__tile` wrapper for card-shaped children, or have `CardShell`
  render without its own border and let the grid supply it. Left as an open
  call for whichever grain does that wiring (out of this grain's scope).

- **No `--color-state-warning` token for the AA contrast grade badge.** The
  Design Spec / `src/index.css` only pair a "state" token to success and
  error (`--color-state-success[-bg]`, `--color-state-error[-bg]`) — there is
  a raw `--color-status-warning` but no derived state pairing. Since AA is
  itself a WCAG *pass* (not a failure), `ContrastCheckerCard`'s AA badge
  reuses the same neutral `--color-text-secondary`/`--color-bg-muted` tokens
  the card's own body copy already uses, rather than introducing a new raw
  color value the day-of audit would have to register as an Orphan.
  **Rejected**: adding a new `--color-state-warning` token for a single badge
  state in one card — a 3-way severity scale is a real, reusable design
  decision (it would presumably also apply to other warning-shaped UI later)
  that deserves its own Token Group registration exercise, not a
  one-off value invented mid-implementation of an unrelated card.

## Audit

Every token referenced by the new CSS (`CardShell.css`,
`SemanticRolesCard.css`, `DistributionCard.css`, `ContrastCheckerCard.css`,
`UsageGuideCard.css`) already exists in `src/index.css` and is already
registered/reused per the existing 2026-08-26 audit pass (radius/spacing/
border/color/typography Token Groups) — no new raw design value introduced,
so no Orphan/불일치 entry is required beyond the note above about
`--color-state-warning` not existing (a gap, not a mismatch — nothing in code
here claims that token exists).
