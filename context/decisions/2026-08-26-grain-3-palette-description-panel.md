# grain-3: left-panel PaletteDescription panel + ModeSelector/RecentPalettes removal

## Decision

1. Deleted `ModeSelector.tsx`/`.css` and `RecentPalettes.tsx`/`.css`/
   `.test.tsx` outright, rather than keeping them mounted elsewhere or
   behind a flag. The card explicitly says to remove both wholesale
   ("Harmony 선택기 버튼들과 Recent Palettes 목록을 완전히 제거"), and no
   other component imports either, so keeping the files would just be dead
   code.
2. Treated this as a genuine capability removal, not a markup relocation:
   - `mode` (generation mode) is now a fixed `DEFAULT_MODE` constant in
     `ColorGenerator.tsx` - there is no remaining UI to change it.
   - `ColorGenerator` no longer calls `recentPalettes.ts`'s
     `loadRecentPalettes()`/`saveRecentPalette()` at all - with the list UI
     gone, continuing to write to that store would be a write-only side
     effect nothing in the app can ever read back.
   Both are flagged `(assumption — needs confirmation)` in
   `ColorGenerator.tsx`'s class doc comment, per this project's convention
   for unconfirmed product-facing assumptions - a human should confirm
   these are intended losses, not just accepted as "obviously fine to drop".
   `src/lib/recentPalettes.ts` itself is untouched (out of this grain's
   `src/components` + `App.tsx` boundary) and keeps its own unit tests.
3. New `PaletteDescription` component (`src/components/PaletteDescription.tsx`)
   takes `name`/`description`/`keywords` as props (mirrors
   MoodTag/AestheticMatch/VibeKeywords's "dumb, presentational" pattern) -
   `ColorGenerator` computes them via `getPaletteName`/`getPaletteDescription`
   (grain-2) and reuses the *same* `vibeKeywords` memo the right-side
   `VibeKeywords` already renders, rather than recomputing keywords a second
   time, so the two panels can never disagree.
4. `PaletteDescription.css` reuses existing tokens only - no new Token
   *values* were introduced. `--font-display`/`--text-display-lg`/etc. are
   the exact set `App.css`'s `.app__intro h1` already uses; `--space-5`/
   `--element-gap-md`/`--element-gap-xs` are the existing 8px-multiple/
   element-gap scale. This job's own design-spec had no `typography`/
   `spacing` Token Groups registered yet (only `content-copy`, from
   grain-2), so both were added (scoped to only what this grain references,
   per `b9n8xNHzejD2`'s precedent in this same project) and a
   `palette-description` Component was recorded - see
   `design-spec/components/palette-description/base.md`,
   `design-spec/token-groups/typography/base.md`,
   `design-spec/token-groups/spacing/base.md`, and the audit trail appended
   to `design-spec/audit/2026-08-26.md`.
5. Updated `src/lib/accentBoundary.test.ts` (outside this grain's nominal
   `src/components`/`App.tsx` file boundary, but a direct, unavoidable
   consequence of deleting `ModeSelector.css`): that suite's "single accent
   location guard" existed specifically to guard the selected ModeSelector
   chip as the sole sanctioned exception to the grayscale-only UI chrome
   rule. With ModeSelector deleted, `--color-action-bg-strong` has zero
   chrome consumers left (verified by grep before deleting the file) - the
   guard now asserts neither accent token is painted onto any chrome
   element at all, rather than carving out a since-removed exception.
   Treated as "pre-existing test that encoded now-outdated behavior" per
   the implementer skill's test-modification rules, not left red.

## Why

- Reusing the mood/vibe lookups' existing outputs (rather than deriving new
  copy) for `PaletteDescription` keeps one source of truth per axis, same
  rationale as grain-2's own decision record.
- Deleting rather than orphaning ModeSelector/RecentPalettes avoids leaving
  unreachable code and an unreachable-but-still-green test suite section
  (`ColorGenerator.test.tsx` previously had ~15 tests exercising UI paths
  that no longer exist) - dead tests that can never fail are worse than no
  tests.
- Flagging the mode/recent-palette capability loss as an explicit assumption
  (rather than silently dropping it, or blocking the grain to ask) follows
  this project's established pattern (see `src/lib/palette.ts`'s many
  `(assumption — needs confirmation)` tags) and the grain's own instruction
  to do exactly that for the mode-selector removal.

## Rejected alternatives

- Keeping `ModeSelector` mounted somewhere else (e.g. inside `ColorStudy` or
  a settings menu) instead of deleting it - rejected: out of scope: the
  card says remove it, not relocate it, and no such destination was
  specified.
- Keeping `recentPalettes` state/persistence calls in `ColorGenerator` "in
  case a future grain re-adds the list" - rejected: per engineering
  standards, don't add speculative code paths; a future grain can re-wire
  `recentPalettes.ts` (untouched) if the list ever comes back.
- Leaving `accentBoundary.test.ts` alone and accepting the resulting test
  failure as a "pre-existing failure out of scope" - rejected: the failure
  is not pre-existing, it is directly and unavoidably caused by this
  grain's own required file deletion (`ModeSelector.css`), so it is this
  grain's responsibility to fix, not backlog.
