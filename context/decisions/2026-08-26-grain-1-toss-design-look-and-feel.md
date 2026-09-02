# grain-1 (this job): Toss 디자인 look-and-feel reskin

## Decision

1. Retinted the single sanctioned accent (`--color-accent`, consumed only via
   `--color-action-bg-strong` on the selected `ModeSelector` chip per
   `accentBoundary.test.ts`) from the iOS system blue (`#007aff` light /
   `#0a84ff` dark) to Toss's brand blue `#3182f6`, in both the light and dark
   theme blocks (kept identical across themes for a single consistent brand
   color, rather than inventing a separate dark-mode tint).
2. Retinted `--color-status-error` (the only status color actually consumed,
   via `--color-state-error` on `ColorInput`/`PaletteSwatch` error states)
   from iOS system red to Toss's `#f04452` (light) / `#ff5b6a` (dark).
   `--color-status-success`/`--color-status-warning` were left untouched —
   grepping the codebase confirmed neither token is consumed by any
   component, so retinting them would not be a "confirmed decision" per
   `policy/coding.md` and was out of scope.
3. Replaced the light-theme (and its `:root` fallback mirror) neutral scale
   — `--color-text-primary`, `--color-text-secondary`,
   `--border-subtle`/`--color-border-default` — from the translucent iOS
   gray system (`rgba(0,0,0,0.85)` etc.) with Toss's own solid gray scale
   (`#191f28` / `#4e5968` / `#e5e8eb`), and `--color-system-bg-secondary`
   from `#f2f2f7` to Toss's `#f2f4f6`. Dark-theme neutrals were deliberately
   left as-is (see "Rejected alternatives").
4. Widened the entire `radius` scale (`--radius-control` 8→12px,
   `--radius-card` 12→16px, `--radius-container` 20→28px) — Toss's cards and
   controls read noticeably rounder than the prior iOS-derived scale.
   `--radius-pill` (999px) was already maximally round and is unchanged.
5. Switched the `font-display`/`font-text`/`font-rounded` stacks to lead with
   `"Pretendard"` (loaded via a jsdelivr CDN `<link>` in `index.html`, with
   the pre-existing `-apple-system`/`"Apple SD Gothic Neo"`/`"Malgun
   Gothic"`/system stack kept as an offline fallback) — Pretendard is the
   typeface Toss's own product UI uses.
6. Applied the pre-existing-but-never-consumed `--shadow-subtle` token to
   `.palette-swatch__color` (the main generated-color tile), softened to a
   more diffused Toss-style shadow
   (`0 2px 8px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)`) in place of
   the tighter iOS card shadow it replaced.

## Why

- The project's existing "Deference" architecture (see
  `accentBoundary.test.ts`) deliberately restricts color to a single sanctioned
  accent location and keeps all other chrome grayscale. Re-theming the *value*
  of that one accent (and the values of the grayscale tokens it sits beside)
  is exactly the mechanism the architecture offers for a brand-tone change —
  no test needed to change, no chrome CSS file needed to touch, because every
  component already consumes these values through `var()`.
- Contrast was re-verified by hand for every swapped pair before committing
  the values (not just trusted by eye): Toss Blue mixed 82% toward black
  (the existing `--color-action-bg-strong` formula) measures ~5.21:1 against
  white text; Toss Gray900/700 measure ~16.56:1/~7.11:1 against the new
  white/`#f2f4f6` backgrounds; Toss Red measures ~6.96:1/~5.64:1 against the
  dark theme's near-black backgrounds. All comfortably clear the project's
  WCAG AA (4.5:1) bar enforced by `contrast.test.ts`.
- Pretendard (not a literal license of Toss's proprietary "Toss Product
  Sans") is the closest legitimate, freely-licensed approximation and is
  itself what a large share of Korean product UIs — including ones styled
  after Toss — actually ship; loading it via CDN with a same-shape system
  fallback keeps the app functional offline without vendoring a font file.

## Rejected alternatives

- Re-theming the dark-theme neutral gray scale (background/text/border) to a
  hand-guessed "Toss dark mode" palette — rejected. The assignment's explicit
  ask (§3) only calls out the light-mode background; inventing dark-theme
  gray values without a concrete reference risks an unverifiable, arbitrary
  result and a wider blast radius for zero requested payoff. Only the
  brand-identity tokens (accent, status-error) were carried into dark mode,
  since those are simple, low-risk, single-value swaps with re-verified
  contrast.
- Bundling/self-hosting the Pretendard font file — rejected for this grain's
  scope; a CDN `<link>` matches how the rest of the app already reaches
  external resources (none currently, but no build tooling exists yet for
  font subsetting/self-hosting) and degrades gracefully via the fallback
  stack if the CDN is unreachable.
- Creating a new `shadow` Token Group for `--shadow-subtle` — rejected;
  it is applied at exactly one call site in this grain, so a dedicated Token
  Group (meant for a reusable *scale*) would be premature. Recorded here
  instead, per `ai-protocol.md` §6 / `engineering.md` §7.
