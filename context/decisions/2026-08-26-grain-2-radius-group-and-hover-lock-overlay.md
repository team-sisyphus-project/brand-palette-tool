# grain-2: radius Token Group creation + hover-only lock overlay approach

## Decision

1. Made `PaletteSwatch`'s color square noticeably rounder by switching
   `.palette-swatch__color`'s `border-radius` from `--radius-card` (12px) to
   the pre-existing-but-previously-unused `--radius-container` (20px) token,
   instead of bumping `--radius-card`'s value in place or inventing a new
   token.
2. Registered a new `radius` Token Group in the Design Spec
   (`design-spec/token-groups/radius/base.md`) with all four existing radius
   tokens, and retroactively declared it on `color-study` (its
   `harmony-explorer` Extension already used `radius-control`/`radius-card`
   before this Token Group existed), per `policy/updating.md`'s "add a dimension"
   procedure.
3. Moved the lock toggle button from an always-visible row below the swatch
   to an absolutely-positioned overlay inside `.palette-swatch__preview`,
   hidden via `opacity: 0` by default and revealed on `:hover` (of the whole
   preview) or `:focus-visible` (the button itself) — no new CSS
   `transition` was added (toggles instantly).

## Why

- `--radius-card` is shared with `HarmonyExplorer.css`'s
  `.harmony-explorer__swatch`, which is out of this grain's scope
  (`PaletteSwatch` presentation only). Changing `--radius-card`'s value would
  have silently rounded that swatch too (`policy/coding.md`'s "no contamination").
  `--radius-container` already existed in `src/index.css`'s radius scale,
  unused anywhere, and its value (20px) reads as a clearly rounder step up
  from `--radius-card` — reusing it needed no new Design Spec value, only a
  new Token Group registration for the scale itself.
- `radius` had been an open Orphan since grain-3 (see
  `design-spec/audit/2026-08-25.md`) because no grain had directly referenced
  it as its own subject before. This grain does, so per `policy/audit.md`
  ("if an Orphan is inside the work scope, correct it") it was now in scope to resolve.
- A hover/focus-revealed overlay (vs. an always-visible row) directly
  matches the assignment's "activate the lock button only on mouse hover" requirement,
  and keyboard accessibility (`:focus-visible`) keeps the same control
  reachable and visible via Tab without a mouse, matching this project's
  existing focus-ring convention (`ModeSelector`/`ThemeToggle`/
  `HarmonyExplorer` all use `:focus-visible` + `--border-width-focus`/
  `--color-border-focus`).

## Rejected alternatives

- Bumping `--radius-card`'s value directly — rejected because it would have
  changed `HarmonyExplorer`'s swatch too (out of scope).
- Introducing a brand-new `--radius-swatch`-style token — rejected because
  `--radius-container` already existed, unused, at a value that fits; adding
  a new token would have duplicated an existing value in the same scale.
- Adding a CSS `transition` for the opacity toggle — rejected (for now) to
  avoid opening a new `transition` Token Group dimension with no other
  precedent anywhere in the codebase; the toggle is instant instead.
