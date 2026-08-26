# grain-1: ThemeToggle placement + dedicated page-background token

## Decision

1. Moved `ThemeToggle` out of `App`'s header and into `ColorGenerator`'s
   preview/color panel (`panel-preview` / `.color-generator__preview`),
   rendered unconditionally in a right-aligned top row
   (`.color-generator__theme-toggle-row`) so it anchors to that panel's
   top-right corner in both the pre-generate (empty preview) and
   post-generate (result) states. `theme` / `onToggleTheme` are threaded
   down as optional `ColorGeneratorProps` (default `theme = 'light'`,
   `onToggleTheme` a no-op) — App still owns the `useTheme()` state; it just
   hands it to `ColorGenerator` instead of rendering `ThemeToggle` itself.
2. Added a new `--color-bg-page` color token (light: `#ffffff`) that `body`'s
   background now reads from, instead of `--color-system-bg-secondary`
   directly. Deliberately kept separate from `--color-bg-muted` (which stays
   `--color-system-bg-secondary`, unchanged) so a future muted-surface value
   change can't silently affect the page background. Dark/OS-preference
   values are untouched — `--color-bg-page` only has an explicit override in
   `:root[data-theme='light']`; everywhere else it falls through to its
   `:root` default of `var(--color-system-bg-secondary)`.

## Why

- The grain's Do explicitly scopes this to layout/composition + color
  tokens, with `ThemeToggle`'s own visual design and `theme.ts` logic out of
  bounds — a prop-threading move (no new toggle markup/behavior) plus a
  narrowly-scoped new token both fit that boundary cleanly.
- Making `theme`/`onToggleTheme` optional on `ColorGeneratorProps` (rather
  than required) avoided rewriting ~70 pre-existing
  `render(<ColorGenerator />)` call sites in `ColorGenerator.test.tsx` that
  don't exercise theming — those tests are unaffected by this grain's scope
  and per `engineering.md` §3 shouldn't be touched for an unrelated reason.
  `App` still always passes real values, so production behavior is fully
  wired.
- A dedicated `--color-bg-page` token (vs. just hardcoding `#ffffff` in the
  `body` rule, or reusing `--color-bg-muted`) keeps the "pure white page
  background" requirement expressed as a semantic token per
  `policy/recording.md`'s naming rules, and keeps it independently
  overridable from the muted-surface token other components
  (MoodTag/PaletteSwatch) already depend on — see
  `design-spec/token-groups/color/base.md` and
  `design-spec/audit/2026-08-26.md`.

## Rejected alternatives

- Hardcoding `background: #ffffff` directly on the light theme's `body`
  rule: works, but leaves the design value untracked by the Design Spec and
  indistinguishable from a hardcoded literal on audit.
- Reusing `--color-bg-muted` for the page background and just changing its
  light value to `#ffffff`: rejected — `--color-bg-muted` already backs
  `MoodTag`/`PaletteSwatch` chrome (`#f2f2f7` in light), and changing it
  would be an unrequested, out-of-scope visual change to those components.
