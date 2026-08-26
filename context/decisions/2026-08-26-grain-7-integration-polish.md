# grain-7: Integration & polish

## Decision

Wired all 10 Color Study analysis cards (grains 4-6:
`SemanticRolesCard`/`DistributionCard`/`ContrastCheckerCard`/`UsageGuideCard`/
`WebsitePreviewCard`/`PresentationPreviewCard`/`DesignTokenCard`/
`PairingGuideCard`/`GradientCard`/`ChartColorsCard`) into `ColorStudy`'s
`.color-study__grid`, each fed `palette={colors}` - the same live palette
prop the pre-existing wheel/harmony/shades tiles already consume, so a
palette/base-color/lock change flows to every card on the very next render
(M-5) with no extra state or memoization layer.

Fixed one visual seam this grain's Boundary called out: `CardShell`
(`colorStudy/CardShell.css`)'s `.color-study-card` already duplicated every
other `.color-study__tile` shell property (border, border-radius, background,
padding, box-sizing, break-inside) but was missing `margin-bottom:
var(--space-5)` - the property that spaces tiles stacked in the same CSS
multi-column. Once the 10 cards were actually wired in, this showed up as
cards touching edge-to-edge within a column. Added the one missing
declaration (reusing the existing `--space-5` token, no new value) rather
than introducing a second wrapper - see design-spec's
`components/color-study/base.md` "grain-7 결정 사항" section.

Each of the 10 cards mounts as a **direct child** of `.color-study__grid`,
*not* additionally wrapped in `.color-study__tile` - `CardShell` is already a
complete tile shell, so a second wrapper would double the border/background
per card. `.color-study__tile` remains scoped to the 3 widgets that don't
have their own shell (ColorWheel/HarmonyExplorer/Shades).

## Why

- **No new CSS class for card spacing.** Adding `margin-bottom` directly to
  the pre-existing `.color-study-card` rule (rather than, say, a
  `.color-study__grid > *` catch-all) keeps `.color-study__tile`'s own rule
  body untouched, which matters because `ColorStudy.test.tsx`'s M-3
  source-level test (`extractRuleBody(css, '.color-study__tile {')`) pins
  that exact rule's border/radius declarations. Touching `.color-study__tile`
  itself risked breaking that pre-existing, still-valid regression test for
  no benefit.

## Pre-existing test fallout (ColorGenerator.test.tsx)

Wiring the 10 cards in means the live palette's hex values (e.g. the brand
color, or any regenerated/edited slot) can now legitimately appear in more
than one place on screen at once - once in the palette swatch list, and
again wherever a card happens to surface that same role/slot color (e.g.
`SemanticRolesCard`'s Primary role, `DesignTokenCard`'s token list,
`PairingGuideCard`, `GradientCard`). 15 pre-existing `ColorGenerator.test.tsx`
assertions used unscoped `screen.getByText('<hex>')`, which throws
`getMultipleElementsFoundError` the moment that hex is no longer unique in
the document - not because the app is broken, but because the test's "this
hex is unique on screen" assumption is now outdated by design (M-4: the
analysis cards are *supposed* to surface the same palette colors elsewhere).

This falls outside grain-7's literal file Boundary
(`ColorStudy.tsx/css, colorStudy/* wiring only`), but fixing it was
unavoidable to meet this grain's own Done-When ("full npm test/build/lint
pass") - there is no way to satisfy M-4/M-5 without every card rendering the
live palette's hex text somewhere. Treated this as the "pre-existing test is
genuinely testing now-outdated behavior" case: rescoped each assertion to
`within(screen.getByRole('list', { name: 'Generated 5-color palette' }))`
(the palette swatch list itself) instead of an unscoped document-wide query.
This does not change any assertion's intent - every fixed test still checks
the exact same hex appears in the exact same palette swatch it always
checked; it just no longer accidentally matches the newly-added Color Study
cards' independent copies of that same value. No assertion values, test
cases, or pass/fail conditions were relaxed.
