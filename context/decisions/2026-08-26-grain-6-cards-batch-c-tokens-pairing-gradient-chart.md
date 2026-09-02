# grain-6: Cards batch C — tokens/pairing/gradient/chart

## Decision

Built `DesignTokenCard`, `PairingGuideCard`, `GradientCard`, `ChartColorsCard`
under `src/components/colorStudy/`, following the exact `CardShell` +
recompute-on-render + empty-palette-guard contract grain-4/5 already
established. `PairingGuideCard`, `GradientCard`, `ChartColorsCard` render
grain-3's existing `getColorPairings`/`getGradientSuggestions`/
`getChartColorSeries` (src/lib/colorPairing.ts, colorGradients.ts,
chartColors.ts) directly - no new color math needed.

`DesignTokenCard` (spec card 7, "Design token output") had no matching
grain-3 lib function - grain-3's own decision record explicitly deferred it
to a "UI-facing grain". Since this grain's Boundary is
`src/components/colorStudy/*` only, the token-mapping logic lives in a new
`src/components/colorStudy/designTokens.ts` (not `src/lib/`) - `getDesignTokens(palette)`
maps `getColorRoles`' 10 roles onto `--color-{role}: #hex;` declarations.
Registered both as a Design Spec Extension of `color-study`
(`design-spec/components/color-study/tokens-pairing-gradient-chart.md`).

## Why

- **Token naming: `--color-{role}`, not the PRD's literal `brand-primary-500`
  example.** The PRD's card-7 bullet lists `brand-primary-500`,
  `brand-primary-100`, `surface-primary`, `text-primary`, `border-subtle` as
  illustrative examples of "beyond hex" token output, but that set mixes a
  numeric-scale convention (`-500`/`-100`) this codebase has never used
  anywhere (`src/index.css` has no scaled color tokens, only single-value
  semantic ones: `--color-accent`, `--color-border-focus`,
  `--color-action-bg`, `--color-status-success`, etc.) with role names that
  don't match `getColorRoles`' actual 10 roles 1:1. Inventing a fabricated
  500/100 shade pair not derivable from `getColorRoles`'s output would
  misrepresent the palette's real computed values. Chose `--color-{role}`
  instead - the exact single-value-token shape this project's own
  `src/index.css` already uses - so "token names match project format"
  (this grain's Done-When) is satisfied by literally reusing the project's
  real naming convention rather than copying the PRD's example verbatim.
  Recorded as the "project format" reference for future grains touching this
  card.

- **`designTokens.ts` lives in `src/components/colorStudy/`, not `src/lib/`.**
  Every other card this grain touches reuses a grain-3 `src/lib/*` function
  as-is. `getDesignTokens` is genuinely new logic, and this grain's Boundary
  is explicitly `src/components/colorStudy/*` - adding a new `src/lib/`
  module would exceed it. Keeping it a thin, pure, independently-tested
  function co-located with the card that consumes it (mirrors how
  `CardShell` already lives alongside the cards it wraps) avoids a
  boundary violation while still keeping the mapping logic out of the
  component's JSX body.

- **No new Token Group entry for the rendered `--color-{role}` strings.**
  These are screen *content* describing the user's generated palette (the
  same status `SemanticRolesCard`'s hex codes and `GradientCard`'s
  `linear-gradient(...)` CSS strings already have), not this project's own
  Design Spec tokens - `policy/recording.md`'s Token 기록 section governs
  the project's actual reusable CSS custom properties, not per-render
  derived data. Registering them as Design Spec Tokens would also violate
  `recording.md`'s "Token 이름은 Component 이름을 포함하지 않는다" /
  reusability rule, since a `color-primary` "token" here is really one
  palette's derived value, not a project-wide design token.

## Audit

Every token referenced by the new CSS (`DesignTokenCard.css`,
`PairingGuideCard.css`, `GradientCard.css`, `ChartColorsCard.css`) already
exists in `src/index.css` (`--space-4`/`-8`/`-9`, `--radius-control`,
`--border-width-default`, `--color-border-default`,
`--color-text-primary`/`-secondary`, `--font-mono`/`-text`,
`--text-mono-sm`/`--text-body-sm`/`-md`, `--weight-mono-regular`,
`--weight-text-regular`/`-medium`/`-semibold`, `--leading-mono`/`-text`,
`--tracking-mono`/`-text`, `--content-padding-sm`, `--element-gap-md`/`-xs`)
and is already registered under `color-study`'s existing Token Group
declarations - no new raw design value introduced. `overflow-wrap`/
`min-width` are implementation settings per `policy/coding.md`, not Design
Spec entries.
